import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, foodEntriesTable, insertFoodEntrySchema } from "@workspace/db";

const router = Router();

// GET /api/entries?date=YYYY-MM-DD
router.get("/entries", async (req, res) => {
  const { date } = req.query;

  const rows = date
    ? await db
        .select()
        .from(foodEntriesTable)
        .where(eq(foodEntriesTable.date, String(date)))
        .orderBy(foodEntriesTable.addedAt)
    : await db.select().from(foodEntriesTable).orderBy(foodEntriesTable.addedAt);

  res.json(rows);
});

// POST /api/entries
router.post("/entries", async (req, res) => {
  const parsed = insertFoodEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }

  const [created] = await db
    .insert(foodEntriesTable)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: foodEntriesTable.entryId,
      set: parsed.data,
    })
    .returning();

  res.status(201).json(created);
});

// DELETE /api/entries/:entryId
router.delete("/entries/:entryId", async (req, res) => {
  const { entryId } = req.params;

  await db
    .delete(foodEntriesTable)
    .where(eq(foodEntriesTable.entryId, entryId));

  res.status(204).send();
});

export default router;
