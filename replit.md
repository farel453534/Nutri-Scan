# NutriScan

Application iOS de suivi nutritionnel avec scan de codes-barres, calcul automatique des objectifs via Mifflin-St Jeor, calendrier journalier et journalisation des repas.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/nutriscan run dev` — run the Expo app (mobile)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to PostgreSQL (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, expo-router 6, React Native
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Storage (app): AsyncStorage (local, no backend required)

## Where things live

- `artifacts/nutriscan/` — Expo/React Native app (iOS/Android)
  - `app/(tabs)/` — 4 tabs: Tableau de bord, Scanner, Calendrier, Journal
  - `app/profile.tsx` — profil utilisateur (taille, poids, âge)
  - `context/FoodLogContext.tsx` — state management + Mifflin-St Jeor goal calc
  - `constants/colors.ts` — thème noir & blanc (light + dark)
- `artifacts/api-server/` — Express API server
  - `src/routes/entries.ts` — CRUD food entries
  - `src/routes/profile.ts` — get/upsert user profile
- `lib/db/src/schema/` — Drizzle schema: `food_entries`, `user_profiles`
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for codegen)
- `lib/api-zod/` — Zod schemas (generated)
- `lib/api-client-react/` — React Query hooks (generated)

## Architecture decisions

- The Expo app uses **AsyncStorage** (local device storage) by default — no backend needed to run the app.
- The Express API + PostgreSQL are provided for Railway/cloud deployment if sync or multi-device support is needed.
- Nutritional goals use the **Mifflin-St Jeor** formula (BMR × activity multiplier ± goal adjustment). Macros: protein 1.8g/kg (2.2g gain), fat 0.9g/kg, carbs fill remaining calories.
- Dates use **local timezone** (not UTC) to avoid day-rollover bugs.
- Theme is pure **black & white** — no color accents except muted grays for macro bars.

## Product

- **Tableau de bord** — anneau calorique, barres macros, repas du jour
- **Scanner** — scan code-barres (Open Food Facts API) + recherche textuelle
- **Calendrier** — vue mensuelle, dots sur jours avec repas, détail par jour
- **Journal** — log journalier avec navigation par date
- **Profil** — saisie taille/poids/âge/sexe/activité/objectif → objectifs recalculés automatiquement

## Railway Deployment

1. Push repo to GitHub (Git panel in Replit sidebar)
2. New Railway project → Deploy from GitHub
3. Add PostgreSQL service → `DATABASE_URL` auto-linked
4. Service settings:
   - Build: `npm install -g pnpm && pnpm install && pnpm --filter @workspace/api-server run build`
   - Start: `node artifacts/api-server/dist/index.mjs`
5. Push DB schema: `pnpm --filter @workspace/db run push` (with Railway DATABASE_URL)
6. Env vars: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `PORT=8080`

## User preferences

- Thème noir et blanc (B&W, pas de couleurs vives)
- Langue française partout dans l'UI
- Dates en heure locale (pas UTC)

## Gotchas

- `expo-camera` must stay at `^17.0.10` — v18+ breaks with Expo SDK 54
- Never use `new Date().toISOString()` for local dates — use `localDateString()` from FoodLogContext
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- `pnpm run typecheck:libs` before leaf artifact checks if lib packages changed
