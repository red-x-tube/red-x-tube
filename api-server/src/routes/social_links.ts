import { Router, type IRouter } from "express";
import { db, socialLinksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateSocialLinkBody,
  UpdateSocialLinkParams,
  UpdateSocialLinkBody,
  DeleteSocialLinkParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/social-links", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(socialLinksTable)
    .orderBy(socialLinksTable.sortOrder);
  res.json(rows);
});

router.post("/social-links", async (req, res): Promise<void> => {
  const parsed = CreateSocialLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = {
    ...parsed.data,
    sortOrder: parsed.data.sortOrder ?? 0,
  };

  const [link] = await db.insert(socialLinksTable).values(data).returning();
  res.status(201).json(link);
});

router.patch("/social-links/:id", async (req, res): Promise<void> => {
  const params = UpdateSocialLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSocialLinkBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [link] = await db
    .update(socialLinksTable)
    .set(body.data)
    .where(eq(socialLinksTable.id, params.data.id))
    .returning();

  if (!link) {
    res.status(404).json({ error: "Social link not found" });
    return;
  }

  res.json(link);
});

router.delete("/social-links/:id", async (req, res): Promise<void> => {
  const params = DeleteSocialLinkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [link] = await db
    .delete(socialLinksTable)
    .where(eq(socialLinksTable.id, params.data.id))
    .returning();

  if (!link) {
    res.status(404).json({ error: "Social link not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
