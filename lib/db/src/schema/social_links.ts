import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const socialLinksTable = pgTable("social_links", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  displayName: text("display_name").notNull(),
  iconName: text("icon_name").notNull(),
  logoUrl: text("logo_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertSocialLinkSchema = createInsertSchema(socialLinksTable).omit({ id: true });
export type InsertSocialLink = z.infer<typeof insertSocialLinkSchema>;
export type SocialLink = typeof socialLinksTable.$inferSelect;
