# Firebase Migration Plan — PermitPro PMS

_Drafted 2026-06-12. Goal: move off the Raspberry Pi / Docker / Cloudflare-tunnel setup onto
Firebase hosting + services at free-to-low monthly cost._

## Current stack (what has to move)

| Piece | Today | Firebase-era target |
|---|---|---|
| Compute (Next.js 14 SSR) | Docker on the Pi, port 3000, Cloudflare tunnel | **Firebase App Hosting** (built for Next.js; runs on Cloud Run) |
| Database | SQLite file via Prisma (`/app/data/dev.db`) | **Decision needed** — see options below |
| Auth | NextAuth v5 credentials + bcrypt against the `User` table | Keep NextAuth initially (works on App Hosting); Firebase Auth optional later |
| Document files | Local disk `storage/permits/{id}/` via `lib/storage.ts` (`STORAGE_ROOT`) | **Cloud Storage for Firebase** — swap the adapter in `lib/storage.ts` |
| Cron/none | — | n/a |

## Cost reality (Firebase, June 2026)

- **App Hosting requires the Blaze plan** (pay-as-you-go) — there is no Spark-plan path for
  Next.js SSR. Blaze includes monthly no-cost allowances; an internal tool with a handful of
  daily users lands at **$0–$2/month** (Cloud Run free tier: ~2M requests/mo; Cloud Build free
  minutes cover deploys). A budget alert at $5 makes surprises impossible.
- **Firestore** free quota: 50k reads / 20k writes per day, 1 GiB storage — far above this app's usage.
- **Cloud Storage**: ~5 GB effectively free; permit PDFs at this volume ≈ cents.
- **Firebase Auth**: free at this scale.
- **Cloud SQL (managed Postgres on Google)**: **not** low-cost — ~$10–15/mo minimum. Avoid.

## The database decision (the only real fork)

**Option 1 — Keep Prisma, free hosted Postgres (recommended).**
Switch `prisma/schema.prisma` provider `sqlite → postgresql`, regenerate an init migration,
point `DATABASE_URL` at a free Postgres (Supabase free tier — already connected as an MCP
service on this machine — or Neon free tier). Code changes: nearly zero (Prisma abstracts it);
the entire query layer, NextAuth, seeds, and reports keep working.
- Cost: $0 (Supabase free: 500 MB, pauses after ~1 week of *no* traffic — daily use prevents it;
  Neon free: 0.5 GB, autosuspend is transparent).
- Effort: ~half a day including data migration (SQLite → Postgres via script).
- Trade-off: one non-Firebase service in the stack.

**Option 2 — All-in Firebase: rewrite data layer on Firestore.**
Replace Prisma with the Firebase Admin SDK across ~20 models and every page/API route
(dashboard groupBys, registers, review queue, vault, reports). Auth moves to Firebase Auth.
- Cost: $0.
- Effort: weeks, touches every data path, loses relational queries (joins/groupBy must be
  denormalized or computed in app code).
- Only worth it if "100% Firebase" matters more than the effort.

**Also worth knowing:** the absolute cheapest/easiest Next.js path is Vercel Hobby (free) +
Supabase free — both already connected as MCP services here. If Firebase isn't a hard
requirement, that combination needs no Blaze plan at all. The plan below assumes Firebase
as requested.

## Migration sequence (Option 1)

1. **Prereqs (one-time, needs Sean):**
   - `npm i -g firebase-tools` (the installed `/usr/local/bin/firebase` is an x86 binary —
     broken on this ARM host: "exec format error").
   - `firebase login`, create the Firebase project, enable Blaze, set a $5 budget alert.
   - Create the free Postgres (Supabase project or Neon) and grab the connection string.
2. **Database:** change provider to `postgresql`, create a fresh init migration
   (`prisma migrate diff` from empty → schema), apply to the hosted DB, port data
   (script: read SQLite with python3/better-sqlite3-in-Docker, insert via Prisma).
3. **Files:** ✅ Cloud Storage driver implemented behind `lib/storage.ts` (env-switched
   `STORAGE_DRIVER=local|gcs`; `gcs` requires `GCS_BUCKET` + ADC). Local driver remains the
   dev default. Still TODO: create the bucket and migrate existing `storage/permits/*` objects.
4. **App Hosting:** connect the GitHub repo in the Firebase console, `apphosting.yaml`
   (scaffolded in repo root) carries env vars/secrets (`DATABASE_URL`, `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL`, storage bucket). Note: App Hosting builds from GitHub — the repo must be
   pushed to a GitHub remote it can read.
5. **Cutover:** deploy, smoke-test (login, registers, board, document upload/download,
   appraiser lookup), then point DNS / retire the Cloudflare tunnel + Pi container.
6. **Optional later:** swap NextAuth → Firebase Auth; that's independent of hosting.

## Status

- [x] Plan + cost assessment (this doc)
- [x] `apphosting.yaml` scaffold at repo root
- [x] Sean picked **Option 1** (free Postgres now; all-Firebase is a later roadmap item)
- [x] Production SQLite snapshotted from the Docker container
      (`data/prod-snapshot-2026-06-12.db`, gitignored)
- [x] Postgres schema migration generated: `supabase/migrations/20260612211348_init_permitpro_schema.sql`
      (23 tables, via scratch Prisma CLI in /tmp — repo CLI blocked by root-owned node_modules).
      **Filename version `20260612211348` matches the row already in the remote
      `supabase_migrations.schema_migrations` (applied via MCP as `init_permitpro_schema`)**, so
      `supabase db push` treats it as already applied and will NOT re-run the DDL. Do not rename
      it to a different version — that would make `db push` re-run the schema and fail on duplicate
      types/tables. If history ever diverges, reconcile with
      `supabase migration repair --status applied 20260612211348` rather than force-pushing.
- [x] Production data exported as FK-ordered Postgres inserts: `supabase/data/*.sql`
      (6,430 rows; **gitignored — contains PII + password hashes**;
      regenerate with `scripts/export-sqlite-to-postgres.py`)
- [x] Supabase project created (Sean chose fresh over restoring "permitmanager"):
      **permitpro-pms** `vcbdaheduzqshbadpsgz`, us-east-1, free tier ($0/mo confirmed)
- [x] Schema applied (migration `init_permitpro_schema`, 23 tables + enums + FKs)
- [x] Operational data loaded and verified (132 rows: users, customers, contractors,
      67 jurisdictions, packages, tasks, activity, documents, permit types, templates)
- [x] Requirements catalog loaded (3,149 + 3,149 rows verified). Notes: the direct
      `db.*.supabase.co` host is IPv6-only (unreachable from the Pi) — use the session
      pooler at **aws-1**-us-east-1.pooler.supabase.com; loader is
      `scripts/load-postgres-data.mjs` (needs `pg` via NODE_PATH, batches 200/query)
- [x] Prisma switched to `postgresql` with client generated to a repo-local path
      (`lib/generated/prisma`, gitignored) because `node_modules/.prisma` is root-owned;
      all `@prisma/client` imports rewritten to `@/lib/generated/prisma`. This also
      removes the volatile `/tmp/prisma-engines` dependency — engines ship in the output dir
- [x] `.env.local` cut over to the Supabase pooler URL; old SQLite line kept commented
      for rollback. App verified against Supabase: board, registers, admin counties
      (67 jurisdictions + full requirements catalog render), auth path executes
      (NB: **the DB carries production users** — log in with the production admin
      password, not the dev-seed `admin123`)
- [x] Cloud Storage **driver** implemented in `lib/storage.ts` — env-switched
      `STORAGE_DRIVER=local|gcs`; the SDK is externalized via `next.config.mjs` webpack config
      so local builds work without `@google-cloud/storage` installed, and it's added to
      `package.json` (installed by App Hosting at deploy). The GCS bucket itself + object
      migration are still outstanding (see below).

## What's left (hosting cutover — needs Sean)

> **Step-by-step instructions: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** — copy-pasteable
> commands for everything below.

The Supabase database migration is **done**; the database half of this plan is complete. The
remaining work is moving compute + files onto Firebase. None of it is in code I can finish here
— it needs Firebase account/console actions and a live bucket.

1. **Firebase project setup** (account actions):
   - Reinstall the CLI: `npm i -g firebase-tools` (the `/usr/local/bin/firebase` binary is x86 —
     "exec format error" on this ARM Pi).
   - `firebase login`, create the Firebase project, enable **Blaze**, set a **$5 budget alert**.
2. **Cloud Storage bucket + secrets** (so document upload/download survives on Cloud Run):
   - Create the bucket (or use the default `<project-id>.appspot.com`).
   - In `apphosting.yaml`, replace `GCS_BUCKET` (and `NEXTAUTH_URL`) placeholders with real values.
     `STORAGE_DRIVER=gcs` is already set there.
   - Set secrets: `firebase apphosting:secrets:set NEXTAUTH_SECRET` and `... DATABASE_URL`
     (the Supabase pooler URL). Grant the App Hosting service account `roles/storage.objectAdmin`
     on the bucket (provides the ADC the driver relies on).
   - Migrate existing objects: the legacy files live under the old Pi `storage/permits/*`
     (DB `storagePath` values are relative keys like `permits/{id}/{file}`, so they map 1:1 to
     GCS object keys). Upload them to the bucket preserving those keys, e.g.
     `gsutil -m cp -r storage/permits gs://<bucket>/permits`. (Note: the seed/demo permits
     reference files that were never copied off the Docker host — only real uploaded docs matter.)
3. **App Hosting deploy + cutover**:
   - Connect the GitHub repo (it's now pushed — see PR branch) to App Hosting in the console.
   - Deploy; smoke-test login, board/registers, **document upload + download** (verifies the GCS
     driver end-to-end — this is the part that can't be tested locally), appraiser lookup.
   - Point DNS / retire the Cloudflare tunnel + Pi container.
- [ ] Roadmap (later): incremental move to 100% Firebase (Firestore + Firebase Auth)
