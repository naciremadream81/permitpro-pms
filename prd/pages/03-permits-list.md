# Permits List

> **Route:** `/permits`
> **Module:** Permits
> **Access:** All roles
> **Source:** [app/permits/page.tsx](../../app/permits/page.tsx)

## Overview

The full permit register — every package in the system, searchable and filterable, 20 per page. This is where coordinators go to find a specific package or to pick up unassigned work, and where the Operations Board's notices and legend links land.

## Layout

```
┌─ Permits ──────────────────── [New permit] ─┐   ← description reflects active filter
│                                              │
│ [search…                ] [status ▾] [Filter]│   ← GET form
│                                              │
│ [Court/Stalled/Filtered banner]  Clear filter│   ← only when a filter is active
│                                              │
│ REGISTER — 47 PERMITS                        │
│ No. │ Project │ Customer │ Contractor │ Type │ Status │ Billing │ Opened
│ …                                            │
│                                              │
│ Page 1 of 3          [← Previous] [Next →]   │
└──────────────────────────────────────────────┘
```

## Fields

### Search & filter bar (native GET form — filters are URL state, shareable and bookmarkable)

| Field | Type | Options | Notes |
|-------|------|---------|-------|
| Search | Search input | free text | Matches **any** of: project name, project address, permit number, customer name, contractor company name. Substring, case-insensitive for ASCII |
| Status | Select | All statuses, New, Submitted, In review, Revisions needed, Approved, Issued, Inspections, Finaled / closed | **`Canceled` is deliberately absent from the dropdown** — canceled packages can only be reached by URL |
| Filter | Submit button | — | Submits the GET form |

Active `stalled` and `court` filters are carried through the form as hidden inputs so searching doesn't drop them.

### URL parameters

| Param | Values | Effect | Precedence |
|-------|--------|--------|-----------|
| `search` | string | Multi-field substring search | Always applied |
| `status` | PermitStatus | Exact status match | **Highest** — wins over `court` |
| `court` | `us` \| `contractor` \| `county` \| `field` \| `closed` | Status-set match | Only when no `status` and not `stalled` |
| `stalled` | `1` \| `true` | Not closed/canceled/approved AND idle 3+ days | **Overrides both** `status` and `court` |
| `permitType` | PermitType | Exact match | Applied independently — **no UI control exists for this** |
| `billingStatus` | BillingStatus | Exact match | Applied independently — **no UI control exists for this** |
| `page` | integer | 1-based page | Default 1 |

### Register table

| Column | Format | Notes |
|--------|--------|-------|
| No. | Link | `permitNumber`, or first 8 chars of the ID uppercased with an ellipsis when unassigned |
| Project | Bold + sub-line | Project name over project address |
| Customer | Text | Customer name |
| Contractor | Text | Contractor company name |
| Type | Text | Permit type, display-formatted (`MobileHome` → "Mobile home") |
| Status | Badge | Color-coded permit status |
| Billing | Badge | Color-coded billing status |
| Opened | Date | `openedDate`, short format e.g. "Mar 3, 2026" |

No column is sortable. Sort is fixed at `openedDate` descending.

## Interactions

### Page load
Runs two parallel queries — a paginated `findMany` and a matching `count` — built from the URL parameters. Page size is **20**.

### Search / filter
- **Trigger:** Submit the form
- **Behavior:** Full page navigation with the new query string. Server re-queries. Filters are additive: search AND status/court/stalled AND type AND billing.
- **Special rule:** When `stalled` is active, the status filter is ignored entirely (the stall clause already constrains status to a set).

### Filter banners
Two mutually-exclusive banner variants explain what's being filtered and offer "Clear filter" → `/permits`:

- **Court banner** — shows the court label, plus the literal status list being queried, e.g. *"Showing packages where the ball is with the contractor (New, Revisions Needed, Approved, Issued, Inspections)"*
- **Stalled / Filtered banner** — "Showing stalled packages only" or "Showing {Status} packages only"

### Pagination
Previous/Next buttons preserve every active filter. Rendered only when `totalPages > 1`. Page indicator always shows, with a minimum of "Page 1 of 1".

### Empty state
A single full-width row: "No permits match the current filters."

## API Dependencies

Server-side Prisma queries in the page component — no HTTP calls. (A separate `GET /api/permits` exists with the same filter surface, used by the review queue and the AI validator.)

## Page Relationships

- **From:** "Permits" nav item; Operations Board (`?stalled=1`, `?court=…`, empty-state "Browse all permits"); Reports rows link straight to detail, not here
- **To:** `/permits/{id}` (No. column), `/permits/new` (header button), `/permits` (clear filter)
- **Data coupling:** None beyond reading package state.

## Business Rules

- **The `contractor` court filter is imprecise here, by design.** This list query has no per-package task data, so filtering by "with contractor" falls back to querying the union of `us` and `field` statuses. The banner is explicit about this, listing the actual statuses matched. The result is a **superset** of what the Operations Board shows in its contractor group. See [lib/court.ts](../../lib/court.ts).
- **`Canceled` packages are reachable but not discoverable.** Absent from the status dropdown; only `?status=Canceled` or the `closed` court surfaces them.
- **`permitType` and `billingStatus` filters are implemented server-side but have no UI.** Reachable only by hand-editing the URL. `[TBC]` — whether controls were dropped in a redesign or never built.
- **Page size is fixed at 20** with no user control.
