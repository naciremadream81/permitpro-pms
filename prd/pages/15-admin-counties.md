# Counties

> **Route:** `/admin/counties`
> **Module:** Administration
> **Access:** Reachable by any signed-in user — the page performs **no role check**; only the nav link is admin-gated
> **Source:** [app/admin/counties/page.tsx](../../app/admin/counties/page.tsx)

## Overview

The requirement-catalog control panel, and the answer to "which of Florida's 67 counties have we actually configured?" Every county is listed whether or not a jurisdiction record exists for it, each labeled by seeding status, so an administrator can see coverage at a glance and bulk-seed the gaps.

This is the entry point to the workflow that makes checklist generation possible.

## Layout

```
┌─ Counties ───── [Permit types] [Seed all counties] ─┐
│                                                     │
│ [Search counties…]                                  │
│ ALL 67 │ SEEDED 12 │ PARTIAL 3 │ UNSEEDED 52        │
│                                                     │
│ Code │ County       │ Status   │ Reqs  │ Pkgs │ →   │
│ HIL  │ Hillsborough │ ●Seeded  │ 14 req│ 8 pkgs│ →  │
│ PIN  │ Pinellas     │ ●Partial │  4 req│ 2 pkgs│ →  │
│ ALA  │ Alachua      │ ○Unseeded│ No req│  —   │ →  │
└─────────────────────────────────────────────────────┘
```

## Fields

### Seeding status — derived, not stored

| Status | Rule | Indicator |
|--------|------|-----------|
| **Seeded** | ≥ **9** active requirements | Green dot |
| **Partial** | 1–8 requirements | Amber dot |
| **Unseeded** | 0 requirements | Grey dot |

The threshold of 9 is the count the standard seed data produces for a county.

### Controls

| Control | Behavior |
|---------|----------|
| Search | Client-side filter over the 67 hardcoded county names |
| Filter tabs | All / Seeded / Partial / Unseeded, each with a count |
| Permit types | Link to `/admin/counties/permit-types` |
| Seed all counties | Bulk seed — see below |

### County row

| Column | Mobile | Content |
|--------|--------|---------|
| Code | Shown | Three-letter county code, monospace |
| County | Shown | County name; status and requirement count collapse into a sub-line on mobile |
| Status | Hidden | Colored dot + label |
| Requirements | Hidden | `{n} req.` or italic "No requirements" |
| Packages | Hidden | `{n} pkgs` or em dash |
| Chevron | Shown | Row is a link to the county detail page |

## Interactions

### Page load
`GET /api/jurisdictions?state=FL`, then joins the result against the **hardcoded 67-county list** by county code. Counties with no jurisdiction record still render, as Unseeded.

### Seed all counties
- **Trigger:** "Seed all counties" button
- **Confirm:** "Seed all 67 Florida counties with standard permit checklists? Existing requirements will not be overwritten."
- **Behavior:** `POST /api/admin/counties/seed`. The endpoint is **admin-gated** (explicit `role !== 'admin'` → 403). It creates a `SeedBatch` audit record, upserts permit-type definitions, creates any missing jurisdictions, and inserts requirements — skipping any that already exist. Every insert writes a `RequirementChangeLog` row attributed to `"system"` and tied to the batch.
- **On success:** Re-fetch, then show a success indicator for 4 seconds.

### Filter and search
Both client-side over the already-loaded set — no refetch.

### Open a county
Row link to `/admin/counties/{code}`.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| List jurisdictions | GET | `/api/jurisdictions?state=FL` | Mount, after seeding | Includes requirement and package counts |
| Seed counties | POST | `/api/admin/counties/seed` | Seed button | **Admin only** (403 otherwise); idempotent |

## Page Relationships

- **From:** "Counties" item in the admin nav
- **To:** `/admin/counties/{countyCode}`, `/admin/counties/permit-types`
- **Data coupling:** Seeding creates jurisdictions and requirements, which immediately changes what `/admin/jurisdictions` lists and what checklist any new package generates.

## Business Rules

- **The county list is hardcoded in this file**, duplicating [lib/florida-counties.ts](../../lib/florida-counties.ts) — and the two disagree. This page uses `St. Johns` / `St. Lucie` with three-letter codes; the shared constant uses `Saint Johns` / `Saint Lucie` with no codes, and it is the shared constant that populates the New Permit form's county dropdown. So the free-text county saved at intake may not string-match the name shown here.
- **Seeding never overwrites.** Safe to re-run; a county already seeded is skipped, and skips are counted on the batch record.
- **The page itself has no role check.** Any signed-in user who navigates directly to `/admin/counties` sees the full screen. The Seed button is present for them too — it simply fails with a 403 when clicked. The nav link is hidden for non-admins, which is the only thing keeping them out.
- **"Seeded" is a heuristic, not a guarantee.** Nine requirements of any kind marks a county green, whether or not they are the right nine for the permit types the firm actually files there.
