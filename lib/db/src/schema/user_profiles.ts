import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  // Single shared profile for now (no auth). Use "default" as the key.
  profileKey: text("profile_key").notNull().unique().default("default"),
  sex: text("sex", { enum: ["male", "female"] }).notNull(),
  age: integer("age").notNull(),
  heightCm: integer("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  activityLevel: text("activity_level", {
    enum: ["sedentary", "light", "moderate", "active", "very_active"],
  }).notNull(),
  goal: text("goal", { enum: ["lose", "maintain", "gain"] }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  id: true,
  updatedAt: true,
});

export const selectUserProfileSchema = createSelectSchema(userProfilesTable);

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
