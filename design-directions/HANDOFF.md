# Redesign Handoff — Unigrid / Heritage Teal

_Last updated: 2026-06-12. State: Phases 0–3 complete; Phase 4 partially complete (see below)._

## Where things stand

The PermitPro redesign (Direction D "Unigrid", Heritage Teal palette — chosen by Sean over
directions A/B/C and three other palettes) is **implemented across the entire app** and verified
in the dev server, light and dark. `npx tsc --noEmit` is clean. All raw Tailwind palette classes
(`gray-*`, `blue-*`, `emerald-*`, …) are gone repo-wide — grep for
`-(gray|blue|red|green|yellow|amber|emerald|violet|orange|purple)-[0-9]` to confirm before
assuming otherwise.

Authoritative docs:
- **`DESIGN.md`** (repo root) — the current system: tokens, rules, component patterns. Trust this,
  not memories of the old Stripe-teal system.
- **`design-directions/README.md`** — full decision log (4 directions, 4 palettes, phase notes).
- Mockups: `d-unigrid.html` (layout), `d-unigrid-colors.html` (palette switcher).

## Key implementation facts

- **Tokens:** `app/globals.css` — existing names (`canvas/ink/accent/status-*`) re-pointed to
  Heritage Teal; added `--band-*`, `--court-*`, `--urgent`; all radius tokens = 0;
  `borderRadius.DEFAULT` is also 0 in `tailwind.config.ts`. `lib/**` is in Tailwind `content`
  (needed for `bg-court-*` classes in `lib/court.ts`).
- **Shell:** `components/layout/band-header.tsx` (teal masthead + top nav) replaced the sidebar;
  `app-layout.tsx` is vertical band+main; `mobile-nav.tsx` renders drawer only (desktop div
  removed); old `components/layout/header.tsx` was **deleted**.
- **Court grouping:** `lib/court.ts` — `statusToCourt()` presentation mapping
  (us / county / field / closed). Used by the Operations Board (`app/dashboard/page.tsx`).
- **Fonts:** Archivo via `next/font/google` with `axes: ["wdth"]` in `app/layout.tsx`;
  `font-sans` = Archivo-first. Wordmark uses `[font-stretch:115%]`.
- **Primitives:** Button (square/uppercase), StatusBadge (solid square chips via
  `getStatusColor` in `lib/utils.ts`), CardTitle/CardHeader (ruled uppercase section headers),
  PageHeader (extrabold uppercase + 2px ink rule).

## Dev environment quirks (this Raspberry Pi host)

- `node_modules` was installed from the Alpine Docker container → musl binaries, partly
  **root-owned**. Host `prisma generate` fails with EACCES. Workarounds in place:
  - Native query engine staged at `/tmp/prisma-engines/libquery_engine-linux-arm64-openssl-3.0.x.so.node`
    (copied from `~/.cache/prisma/master/81e4af…/linux-arm64-openssl-3.0.x/libquery-engine`).
    **/tmp is volatile** — re-copy after reboot, or fix permanently:
    `sudo chown -R archie:archie node_modules/@prisma node_modules/.prisma && npx prisma generate`.
  - `prisma/schema.prisma` generator now has
    `binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]` (keeps Docker working).
  - `better-sqlite3` is musl-built → unusable on host; use `python3` + sqlite3 for direct DB work.
- **Port 3000** is the production Docker container (`next-server`, uid 1001) — don't kill it.
  `.claude/launch.json` has `autoPort: true`; dev server lands on a random port.
- **Host dev DB:** `.env.local` (gitignored) → `DATABASE_URL=file:…/data/dev-local.db`, migrated
  via SQL files + seeded. Logins: admin@permitco.com/admin123, user@permitco.com/user123.
- `preview_screenshot` frequently times out on this machine; verify via `preview_eval`
  (DOM + computed styles) instead.

## Done in Phase 4 (2026-06-12, later same day)

- ✅ **Production build passes** (`npx next build`, exit 0). Two gotchas for reruns: don't build
  while the dev server is running (they share `.next` and page-data collection fails with
  `PageNotFoundError`), and ESLint runs during build (pre-existing `react-hooks/exhaustive-deps`
  warnings remain — warnings only, not errors).
- ✅ **Court-filtered permits list**: `/permits?court=us|county|field|closed` via
  `courtToStatuses()`/`isCourt()` in `lib/court.ts`; filter notice + header description on the
  permits page; the board's distribution legend now links to these views. Verified at runtime.

## Added after the redesign (2026-06-12 evening)

- **FL property appraiser lookup** on permit detail: `lib/property.ts` (ported from
  `~/codebase/package-tracking`, the user's other permit app — ArcGIS World Geocoder +
  FL Statewide Cadastral layer, no API keys) + `components/permits/property-panel.tsx`.
  On-demand display only; **persisting the parcel needs a schema field**, blocked until the
  Prisma chown fix (see quirks above). Verified live: error path + real Tampa parcel.
- **Firebase migration plan**: `docs/FIREBASE_MIGRATION.md` + `apphosting.yaml` scaffold.
  Recommended path: App Hosting (Blaze ~$0) + free hosted Postgres (keep Prisma) + Cloud
  Storage driver behind `lib/storage.ts`. Blocked on Sean: database option choice + Firebase
  project/Blaze setup. Local `firebase` CLI binary is x86 — broken on this ARM host;
  reinstall with `npm i -g firebase-tools`.

## Remaining work

1. **Structural polish of card-based screens** — admin pages (counties, jurisdictions,
   export-profiles), settings, reports, and the detail clients (permit/contractor/customer) are
   fully tokenized but still card-shaped. Converting to ruled full-width sections (like the
   permits register) is cosmetic, screen-by-screen, independently shippable.
2. **"With contractor" court** — `lib/court.ts` deliberately omits it; needs a signal from open
   tasks/missing required docs, not status. Wire into the board's grouping + distribution bar.
3. **List virtualization** — only if registers ever drop pagination (20/page now; not needed).
4. **Git** — all redesign work is uncommitted on `main` (plus pre-existing modified
   `.env.example`, `app/review-queue/page.tsx`, `docker-compose.yml` from before this session).
   Nothing has been committed or pushed; ask Sean how he wants it committed.
5. **Docker image rebuild** — the running container on port 3000 still serves the old UI;
   rebuild/deploy when Sean is ready to ship.
6. **Pre-existing lint warnings** — `react-hooks/exhaustive-deps` in admin counties/jurisdictions
   pages and vault-panel (predate the redesign).
