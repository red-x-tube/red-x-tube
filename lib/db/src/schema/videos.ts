import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  section: text("section").notNull().default("home"), // legacy, kept for migration
  sections: text("sections").array().notNull().default(["home"]), // multi-section support
  mediaType: text("media_type").notNull().default("video"), // 'video' | 'image' | 'text'
  categoryId: integer("category_id"),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  textContent: text("text_content"),
  thumbnailUrl: text("thumbnail_url"),
  description: text("description"),
  viewCount: integer("view_count").notNull().default(0),
  unlockRequired: boolean("unlock_required").notNull().default(false),
  adsUnlockEnabled: boolean("ads_unlock_enabled").notNull().default(false),
  monetagAdsLink: text("monetag_ads_link"),
  monetagLinks: text("monetag_links").array(),
  adsRequired: integer("ads_required"),
  monetagZoneId: text("monetag_zone_id"),
  adsgramBlockId: text("adsgram_block_id"),
  adTimerDuration: integer("ad_timer_duration"),
  isPinned: boolean("is_pinned").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  blocks: jsonb("blocks").$type<ContentBlock[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, viewCount: true, createdAt: true });
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videosTable.$inferSelect;

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string }
  | { type: "video"; url: string };
