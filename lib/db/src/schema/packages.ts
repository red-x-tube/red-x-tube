import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("⭐"),
  priceBdt: integer("price_bdt").notNull().default(0),
  priceGbp: text("price_gbp").notNull().default("0"),
  durationValue: integer("duration_value").notNull().default(1),
  durationUnit: text("duration_unit").notNull().default("month"),
  features: text("features").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("local"),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("💳"),
  logoUrl: text("logo_url"),
  numberOrAddress: text("number_or_address").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const siteSettingsTable = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});
