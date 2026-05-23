import { Router, type IRouter } from "express";
import { db, categoriesTable, videosTable, socialLinksTable, siteSettingsTable } from "@workspace/db";
import { count, sum, eq } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { adminSessions } from "../lib/sessions";

const router: IRouter = Router();

const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "redxtube-secret";

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function getAdminPassword(): Promise<string> {
  try {
    const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "admin_password"));
    if (row?.value) return row.value;
  } catch { /* fall back to env */ }
  return ENV_ADMIN_PASSWORD;
}

function requireAdmin(req: any, res: any, next: any) {
  const token = req.cookies?.admin_token;
  if (!token || !adminSessions.has(token)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const currentPassword = await getAdminPassword();
  if (parsed.data.password !== currentPassword) {
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

router.post("/admin/change-password", requireAdmin, async (req, res): Promise<void> => {
  const { newPassword } = req.body ?? {};
  if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters" });
    return;
  }
  try {
    await db
      .insert(siteSettingsTable)
      .values({ key: "admin_password", value: newPassword.trim() })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: newPassword.trim() } });
    adminSessions.clear();
    res.clearCookie("admin_token");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to change password");
    res.status(500).json({ error: "Failed to change password" });
  }
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
