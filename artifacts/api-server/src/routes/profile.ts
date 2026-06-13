import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userProfilesTable, insertUserProfileSchema } from "@workspace/db";

const router = Router();

const PROFILE_KEY = "default";

// GET /api/profile
router.get("/profile", async (_req, res) => {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.profileKey, PROFILE_KEY))
    .limit(1);

  if (!profile) {
    res.status(404).json({ error: "No profile found" });
    return;
  }

  res.json(profile);
});

// PUT /api/profile
router.put("/profile", async (req, res) => {
  const body = insertUserProfileSchema.omit({ profileKey: true }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body", details: body.error.issues });
    return;
  }

  const values = { ...body.data, profileKey: PROFILE_KEY, updatedAt: new Date() };

  const [upserted] = await db
    .insert(userProfilesTable)
    .values(values)
    .onConflictDoUpdate({
      target: userProfilesTable.profileKey,
      set: values,
    })
    .returning();

  res.json(upserted);
});

export default router;
