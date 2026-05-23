import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const videoCallGirlsTable = pgTable("video_call_girls", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  age: integer("age").notNull().default(22),
  serviceTime: text("service_time").notNull().default("10:00 AM - 10:00 PM"),
  isOnline: boolean("is_online").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VideoCallGirl = typeof videoCallGirlsTable.$inferSelect;
