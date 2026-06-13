import { pgTable, serial, text, real, bigint, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const foodEntriesTable = pgTable("food_entries", {
  id: serial("id").primaryKey(),
  entryId: text("entry_id").notNull().unique(),
  date: text("date").notNull(), // YYYY-MM-DD local date
  name: text("name").notNull(),
  brand: text("brand"),
  servingG: integer("serving_g").notNull(),
  caloriesPer100g: real("calories_per_100g").notNull(),
  proteinPer100g: real("protein_per_100g").notNull(),
  carbsPer100g: real("carbs_per_100g").notNull(),
  fatPer100g: real("fat_per_100g").notNull(),
  fiberPer100g: real("fiber_per_100g"),
  addedAt: bigint("added_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFoodEntrySchema = createInsertSchema(foodEntriesTable).omit({
  id: true,
  createdAt: true,
});

export const selectFoodEntrySchema = createSelectSchema(foodEntriesTable);

export type InsertFoodEntry = z.infer<typeof insertFoodEntrySchema>;
export type FoodEntry = typeof foodEntriesTable.$inferSelect;
