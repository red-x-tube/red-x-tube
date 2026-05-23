import { Router, type IRouter } from "express";
import { db, videoCallGirlsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { adminSessions } from "../lib/sessions";

const router: IRouter = Router();

function requireAdmin(req: any, res: any, next: any) {
  const token = req.cookies?.admin_token;
  if (!token || !adminSessions.has(token)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.get("/video-call-girls", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(videoCallGirlsTable)
    .orderBy(asc(videoCallGirlsTable.sortOrder), asc(videoCallGirlsTable.id));
  res.json(rows);
});

router.get("/admin/video-call-girls", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(videoCallGirlsTable)
    .orderBy(asc(videoCallGirlsTable.sortOrder), asc(videoCallGirlsTable.id));
  res.json(rows);
});

router.post("/admin/video-call-girls", requireAdmin, async (req, res): Promise<void> => {
  const { name, imageUrl, age, serviceTime, isOnline, sortOrder } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [row] = await db.insert(videoCallGirlsTable).values({
    name,
    imageUrl: imageUrl || null,
    age: Number(age) || 22,
    serviceTime: serviceTime || "10:00 AM - 10:00 PM",
    isOnline: isOnline === true || isOnline === "true",
    sortOrder: Number(sortOrder) || 0,
  }).returning();
  res.status(201).json(row);
});

router.put("/admin/video-call-girls/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, imageUrl, age, serviceTime, isOnline, sortOrder } = req.body;
  const [row] = await db.update(videoCallGirlsTable).set({
    ...(name !== undefined && { name }),
    ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
    ...(age !== undefined && { age: Number(age) }),
    ...(serviceTime !== undefined && { serviceTime }),
    ...(isOnline !== undefined && { isOnline: isOnline === true || isOnline === "true" }),
    ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
  }).where(eq(videoCallGirlsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/video-call-girls/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(videoCallGirlsTable).where(eq(videoCallGirlsTable.id, id));
  res.json({ success: true });
});

export default router;
