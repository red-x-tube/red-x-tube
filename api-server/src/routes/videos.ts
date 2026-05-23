import { Router, type IRouter } from "express";
import { db, videosTable, categoriesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { ContentBlock } from "@workspace/db";
import {
  ListVideosQueryParams,
  CreateVideoBody,
  GetVideoParams,
  GetVideoBySlugParams,
  UpdateVideoParams,
  UpdateVideoBody,
  DeleteVideoParams,
  IncrementVideoViewParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function generateUniqueSlug(): Promise<string> {
  for (let attempts = 0; attempts < 20; attempts++) {
    const candidate = generateSlug();
    const [existing] = await db
      .select({ id: videosTable.id })
      .from(videosTable)
      .where(eq(videosTable.slug, candidate));
    if (!existing) return candidate;
  }
  // Fallback: timestamp-based
  return Date.now().toString(36);
}

function deriveMediaType(
  blocks: ContentBlock[] | null | undefined,
  fallback: string | null | undefined,
): string {
  if (blocks && blocks.length > 0) {
    if (blocks.some((b) => b.type === "video")) return "video";
    if (blocks.some((b) => b.type === "image")) return "image";
    return "text";
  }
  return fallback ?? "video";
}

async function serializeVideo(v: typeof videosTable.$inferSelect) {
  let categoryName: string | null = null;
  if (v.categoryId) {
    const [cat] = await db
      .select({ name: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, v.categoryId));
    categoryName = cat?.name ?? null;
  }
  return {
    ...v,
    sections: v.sections ?? [v.section],
    monetagLinks: v.monetagLinks ?? null,
    adsRequired: v.adsRequired ?? null,
    adsgramBlockId: v.adsgramBlockId ?? null,
    isPinned: v.isPinned ?? false,
    displayOrder: v.displayOrder ?? 0,
    categoryName,
    createdAt: v.createdAt.toISOString(),
  };
}

router.get("/videos", async (req, res): Promise<void> => {
  const query = ListVideosQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.section) {
    conditions.push(sql`${query.data.section} = ANY(${videosTable.sections})`);
  }
  if (query.data.categoryId !== undefined && query.data.categoryId !== null) {
    conditions.push(eq(videosTable.categoryId, query.data.categoryId));
  }

  const rows =
    conditions.length > 0
      ? await db.select().from(videosTable).where(and(...conditions))
      : await db.select().from(videosTable);

  // Sort: pinned first, then by displayOrder ASC, then by createdAt DESC
  rows.sort((a, b) => {
    if ((b.isPinned ? 1 : 0) !== (a.isPinned ? 1 : 0)) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    if ((a.displayOrder ?? 0) !== (b.displayOrder ?? 0)) return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const serialized = await Promise.all(rows.map(serializeVideo));
  res.json(serialized);
});

router.post("/videos", async (req, res): Promise<void> => {
  const parsed = CreateVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const blocks = (parsed.data.blocks ?? null) as ContentBlock[] | null;
  const sections = parsed.data.sections ?? ["home"];
  const monetagLinks = (parsed.data.monetagLinks as string[] | null | undefined) ?? null;
  const adsRequired = parsed.data.adsRequired ?? null;

  // Determine slug: use provided slug (stripped/normalized), or auto-generate
  let slug: string;
  const rawSlug = parsed.data.slug?.trim().replace(/\s+/g, "-").toLowerCase();
  if (rawSlug) {
    // Check uniqueness
    const [existing] = await db
      .select({ id: videosTable.id })
      .from(videosTable)
      .where(eq(videosTable.slug, rawSlug));
    if (existing) {
      res.status(409).json({ error: `Slug "${rawSlug}" is already taken. Please choose a different one.` });
      return;
    }
    slug = rawSlug;
  } else {
    slug = await generateUniqueSlug();
  }

  const data = {
    ...parsed.data,
    slug,
    section: sections[0],
    sections,
    mediaType: deriveMediaType(blocks, parsed.data.mediaType),
    blocks,
    monetagLinks,
    adsRequired,
    adsgramBlockId: (parsed.data as any).adsgramBlockId ?? null,
    isPinned: (parsed.data as any).isPinned ?? false,
    displayOrder: (parsed.data as any).displayOrder ?? 0,
    unlockRequired: parsed.data.adsUnlockEnabled ?? false,
    adsUnlockEnabled: parsed.data.adsUnlockEnabled ?? false,
  };

  const [video] = await db.insert(videosTable).values(data).returning();
  res.status(201).json(await serializeVideo(video));
});

router.get("/videos/by-slug/:slug", async (req, res): Promise<void> => {
  const params = GetVideoBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [video] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.slug, params.data.slug));
  if (!video) { res.status(404).json({ error: "Post not found" }); return; }
  res.json(await serializeVideo(video));
});

router.get("/videos/:id", async (req, res): Promise<void> => {
  const params = GetVideoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [video] = await db.select().from(videosTable).where(eq(videosTable.id, params.data.id));
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }
  res.json(await serializeVideo(video));
});

router.patch("/videos/:id", async (req, res): Promise<void> => {
  const params = UpdateVideoParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const body = UpdateVideoBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const blocks = (body.data.blocks ?? undefined) as ContentBlock[] | null | undefined;
  const updateData: Record<string, unknown> = { ...body.data };

  // Handle slug update
  if (body.data.slug !== undefined) {
    const rawSlug = body.data.slug?.trim().replace(/\s+/g, "-").toLowerCase();
    if (rawSlug) {
      const [existing] = await db
        .select({ id: videosTable.id })
        .from(videosTable)
        .where(eq(videosTable.slug, rawSlug));
      if (existing && existing.id !== params.data.id) {
        res.status(409).json({ error: `Slug "${rawSlug}" is already taken.` });
        return;
      }
      updateData.slug = rawSlug;
    } else {
      delete updateData.slug;
    }
  }

  if (body.data.adsUnlockEnabled !== undefined) updateData.unlockRequired = body.data.adsUnlockEnabled;
  if (body.data.sections?.length) updateData.section = body.data.sections[0];
  if ((body.data as any).adsgramBlockId !== undefined) updateData.adsgramBlockId = (body.data as any).adsgramBlockId;
  if ((body.data as any).isPinned !== undefined) updateData.isPinned = (body.data as any).isPinned;
  if ((body.data as any).displayOrder !== undefined) updateData.displayOrder = Number((body.data as any).displayOrder);
  if (blocks !== undefined) {
    updateData.blocks = blocks;
    if (blocks) updateData.mediaType = deriveMediaType(blocks, body.data.mediaType);
  }
  if (body.data.monetagLinks !== undefined) updateData.monetagLinks = body.data.monetagLinks as string[] | null;
  if (body.data.adsRequired !== undefined) updateData.adsRequired = body.data.adsRequired;

  const [video] = await db.update(videosTable).set(updateData).where(eq(videosTable.id, params.data.id)).returning();
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }
  res.json(await serializeVideo(video));
});

router.delete("/videos/:id", async (req, res): Promise<void> => {
  const params = DeleteVideoParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [video] = await db.delete(videosTable).where(eq(videosTable.id, params.data.id)).returning();
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }
  res.sendStatus(204);
});

router.patch("/videos/:id/view", async (req, res): Promise<void> => {
  const params = IncrementVideoViewParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [video] = await db
    .update(videosTable)
    .set({ viewCount: sql`${videosTable.viewCount} + 1` })
    .where(eq(videosTable.id, params.data.id))
    .returning();
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }
  res.json(await serializeVideo(video));
});

export default router;
