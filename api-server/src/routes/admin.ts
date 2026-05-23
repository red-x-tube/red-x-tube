import { Router, type IRouter } from "express";
import { db, categoriesTable, videosTable, socialLinksTable } from "@workspace/db";
import { count, sum, eq } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { adminSessions } from "../lib/sessions";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "redxtube-secret";

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = generateToken();
  adminSessions.add(token);

  res.cookie("admin_token", token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });

  req.log.info("Admin logged in");
  res.json({ success: true });
});

router.post("/admin/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.admin_token;
  if (token) {
    adminSessions.delete(token);
  }
  res.clearCookie("admin_token");
  res.json({ success: true });
});

router.get("/admin/verify", async (req, res): Promise<void> => {
  const token = req.cookies?.admin_token;
  if (!token || !adminSessions.has(token)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ success: true });
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [totalRow] = await db.select({ total: count() }).from(videosTable);
  const [homeRow] = await db
    .select({ total: count() })
    .from(videosTable)
    .where(eq(videosTable.section, "home"));
  const [freeRow] = await db
    .select({ total: count() })
    .from(videosTable)
    .where(eq(videosTable.section, "free"));
  const [paidRow] = await db
    .select({ total: count() })
    .from(videosTable)
    .where(eq(videosTable.section, "paid"));
  const [viewsRow] = await db.select({ total: sum(videosTable.viewCount) }).from(videosTable);
  const [catRow] = await db.select({ total: count() }).from(categoriesTable);
  const [linkRow] = await db.select({ total: count() }).from(socialLinksTable);

  res.json({
    totalVideos: Number(totalRow?.total ?? 0),
    homeCount: Number(homeRow?.total ?? 0),
    freeCount: Number(freeRow?.total ?? 0),
    paidCount: Number(paidRow?.total ?? 0),
    totalViews: Number(viewsRow?.total ?? 0),
    categoryCount: Number(catRow?.total ?? 0),
    socialLinkCount: Number(linkRow?.total ?? 0),
  });
});

export default router;
