import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const pois = pgTable("pois", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  description: text("description"),
  amenities: text("amenities").array(),
  hours: text("hours"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  fromLat: decimal("from_lat", { precision: 10, scale: 8 }).notNull(),
  fromLng: decimal("from_lng", { precision: 11, scale: 8 }).notNull(),
  toLat: decimal("to_lat", { precision: 10, scale: 8 }).notNull(),
  toLng: decimal("to_lng", { precision: 11, scale: 8 }).notNull(),
  distance: decimal("distance", { precision: 8, scale: 2 }),
  duration: integer("duration"),
  instructions: text("instructions").array(),
  geometry: text("geometry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPOISchema = createInsertSchema(pois).pick({
  name: true,
  category: true,
  latitude: true,
  longitude: true,
  description: true,
  amenities: true,
  hours: true,
});

export const insertRouteSchema = createInsertSchema(routes).pick({
  fromLat: true,
  fromLng: true,
  toLat: true,
  toLng: true,
  distance: true,
  duration: true,
  instructions: true,
  geometry: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPOI = z.infer<typeof insertPOISchema>;
export type POI = typeof pois.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;
