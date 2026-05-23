import { Router, type IRouter } from "express";
import { db, categoriesTable, videosTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.createdAt);

  const withCounts = await Promise.all(
    rows.map(async (cat) => {
      const [row] = await db
        .select({ total: count() })
        .from(videosTable)
        .where(eq(videosTable.categoryId, cat.id));
      return {
        ...cat,
        videoCount: Number(row?.total ?? 0),
        createdAt: cat.createdAt.toISOString(),
      };
    }),
  );

  res.json(withCounts);
});

router.post("/categories", async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cat] = await db.insert(categoriesTable).values(parsed.data).returning();
  res.status(201).json({ ...cat, videoCount: 0, createdAt: cat.createdAt.toISOString() });
});

router.patch("/categories/:id", async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateCategoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [cat] = await db
    .update(categoriesTable)
    .set(body.data)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();

  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const [row] = await db
    .select({ total: count() })
    .from(videosTable)
    .where(eq(videosTable.categoryId, cat.id));

  res.json({ ...cat, videoCount: Number(row?.total ?? 0), createdAt: cat.createdAt.toISOString() });
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cat] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, params.data.id))
    .returning();

  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
