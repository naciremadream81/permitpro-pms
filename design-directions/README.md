# PermitPro PMS — Design Directions & Decision Log

> **Resuming work? Read [HANDOFF.md](./HANDOFF.md) first** — current state, environment quirks,
> and the remaining Phase 4 list.

Static mockups of the package list / dashboard, one per direction. No app wiring.

- **[compare.html](./compare.html)** — all three side by side (scaled)
- **[a-docket.html](./a-docket.html)** — Direction A: The Docket
- **[b-signal-console.html](./b-signal-console.html)** — Direction B: Signal Console
- **[c-fieldsheet.html](./c-fieldsheet.html)** — Direction C: Fieldsheet
- **[d-unigrid.html](./d-unigrid.html)** — Direction D: Unigrid (added after first review round)
- **[d-unigrid-colors.html](./d-unigrid-colors.html)** — Direction D palette explorations (live switcher: Federal / Heritage Teal / Ink & Ochre / Slate & Signal)

## Phase 0 — Audit summary (June 2026)

Stack reality check: the redesign brief described a Tauri v2 + Vite + Drizzle desktop app; the actual
codebase is **Next.js 14 (App Router) + Prisma + NextAuth + Tailwind 3**. Constraints adapted accordingly.

Current UI: classic sidebar (240px) + page header + `max-w-6xl` centered column of Cards. Every surface
is a Card with a CardTitle; all data lives in tables-inside-cards; statuses are tinted pill badges
(`getStatusColor`). Token system is a warm teal OKLCH palette (hue 195) with Geist Sans/Mono, light +
dark themes. Migration is incomplete: 13 files still use raw `gray-*`/`blue-*` Tailwind defaults
(e.g. `permit-detail-client.tsx` h1 is `text-gray-900`), so the app currently reads as two products.

Density/workflow constraints any direction must respect:

- Permits table: 8 columns (ID, project, customer, contractor, type, status, billing, opened), 20/page.
- Statuses: New, Submitted, InReview, RevisionsNeeded, Approved, Issued, Inspections, FinaledClosed,
  Canceled — plus billing statuses and review-assignment statuses (ASSIGNED, IN_REVIEW, APPROVED, SENT_BACK).
- Attention signals: stall (no activity ≥ 3 days), contractor compliance docs expiring ≤ 30 days,
  unresolved review comments. The dashboard is attention-first by design — keep that.
- Permit detail is the heaviest screen (~1,000 lines: overview, tasks, documents, activity log).
- Three roles (coordinator / reviewer / admin) share one shell; role differences are content-only.
- WCAG 2.1 AA; status color is functional — never color alone.

## Direction summaries

### A — The Docket (civic ledger)
Permit tracking as a beautifully kept public record: warm paper, ruled lines, ink-stamp statuses,
folder-tab navigation, serif display. Reference: gov.uk done with FT/editorial craft.
Fonts: Source Serif 4 / Public Sans / Spline Sans Mono. Accent: stamp red `#9e2b25` on paper `#f7f3ea`.

### B — Signal Console (dispatch terminal)
Dark, dense, keyboard-first operations console: ticker status bar, icon rail, master-detail with a
persistent inspector panel (no page navigation to read a package), bracketed mono status tags,
footer key hints. Reference: Bloomberg terminal / Linear density / flight dispatch.
Fonts: Chivo / Chivo Mono. Signal amber `#ffb454` on `#0c1116`.

### C — Fieldsheet (drafting sheet)
The app as a CAD sheet: framed border, faint grid paper, title block in the footer, condensed
engineering lettering, and — the structural idea — the **pipeline stage strip is the primary
navigation** (status-first, counts + stall flags per stage). Revision triangles ▲ mark stalled rows.
Reference: architectural title blocks / Monograph.
Fonts: Saira Semi Condensed / Saira / IBM Plex Mono. Safety orange `#c14a09` on sheet `#f3f5f7`.

### D — Unigrid (federal modernism / ball-in-court board)
Flat mid-century federal design language — NPS Unigrid / NASA Graphics Standards Manual: black
masthead band, white field, thick rules, solid flat color blocks, big tabular numerals, zero shadows
or rounding. The structural idea: the list is grouped by **who holds the ball** — Our Court /
With Jurisdiction / With Contractor / Fieldwork / Closing — with a flat stacked distribution bar
replacing KPI cards, and a large days-held counter leading each row. The court grouping is a pure
presentation-layer mapping from existing statuses (no data-layer change).
Fonts: Archivo (variable, expanded for display). Black `#121212` + flat ownership solids
(red `#b42318`, blue `#1849a9`, amber `#b54708`, green `#067647`) — white text on all, AA.
Reference: NPS Unigrid brochures / NASA standards manual / Vignelli transit graphics.

**Review round 1 (2026-06-12):** user selected Direction D's *layout* (ball-in-court grouping, band,
flat structure) but was unsure about the palette. Four palette options built in
`d-unigrid-colors.html`:
1. **Federal** — original: pure black band, saturated primary solids.
2. **Heritage Teal** — deep teal band `#123f3b`, warm paper field, clay/teal/ochre/moss ownership
   colors; keeps continuity with the existing PermitPro teal brand.
3. **Ink & Ochre** — warm cream field `#f6f1e7`, brown-black band, earthy terracotta/prussian/ochre/moss.
4. **Slate & Signal** — cool near-monochrome; signal orange reserved exclusively for "our court" /
   urgency, everything else slate neutrals (color = "do we owe action").

**Review round 2 (2026-06-12):** palette **Heritage Teal** selected. Phase 2 implemented in-app:

- Tokens re-pointed to Heritage Teal Unigrid values in `app/globals.css` (existing names kept so
  migrated pages inherit; radii → 0; new `--band-*`, `--court-*`, `--urgent` tokens; dark variant).
- Archivo (variable, wdth axis) added in `app/layout.tsx`; `font-sans` now Archivo-first.
- Primitives flattened: Button (uppercase, square), Badge/StatusBadge (solid chips, near-white text),
  PageHeader (extrabold uppercase + bottom rule). `pp-nav-active` side-stripe removed.
- Shell: sidebar + header replaced by `components/layout/band-header.tsx` (teal masthead band with
  top nav); mobile keeps the drawer. Old `header.tsx` deleted.
- `lib/court.ts`: statusToCourt presentation mapping (us / county / field / closed; "contractor"
  court deferred — needs task/doc signals).
- Dashboard rebuilt as the **Operations Board** (notices ledger, court distribution bar,
  court-grouped rows with days-held counters, reviewer variant).

Flagged data-adjacent tweaks (no schema/data-layer changes): board queries now include each
package's next open task and `take` 8 → 25; `prisma/schema.prisma` generator gained
`binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]` so the client runs on both the host
and the Alpine Docker runtime (host dev also needs the engine in `/tmp/prisma-engines` until
root-owned `node_modules/@prisma` is chown'd and `prisma generate` re-run).

**Phase 3 (2026-06-12):** system applied to every remaining screen — permits list (register
pattern), permit detail, review queue (days-counter rows), contractors (+vault), customers,
reports, all admin pages, settings, and login (band-topped). All legacy raw palette classes
(`gray-*`, `blue-*`, `red-*`, `emerald-*`, …) replaced with tokens repo-wide; tinted pills,
rounded-full chips, white backgrounds, and card shadows removed. `DESIGN.md` rewritten to document
the Unigrid / Heritage Teal system (the old Stripe-teal doc is superseded). Verified per-screen in
the dev server; typecheck clean.

**Status:** Phases 0–3 complete. Remaining (Phase 4): structural polish of admin/detail screens
beyond token migration (they still use the card layout), list virtualization if registers grow
past pagination, and the "with contractor" court signal.
