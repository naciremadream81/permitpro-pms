# Reports

> **Route:** `/reports`
> **Module:** Reports
> **Access:** All roles
> **Source:** [app/reports/page.tsx](../../app/reports/page.tsx)

## Overview

Four operational reports behind a tab bar, with a saved-views sidebar for bookmarking a report configuration. This is the analytical counterpart to the Operations Board — where the board shows *your* work, reports show the firm's.

## Layout

```
┌─ Reports ──────────────── [Refresh] [Export] ─┐
│ Operational analytics and compliance tracking  │
│                                                │
│ ┌────────────────────────────┐ ┌ SAVED VIEWS ┐│
│ │ Pipeline│Stalled│Compliance│ │ Save Current││
│ │ ─────────                  │ │ [name…]     ││
│ │                            │ │ □ Share     ││
│ │ 📊 PACKAGE PIPELINE        │ │ [Save View] ││
│ │ All active packages …      │ │             ││
│ │ ─────────────────────────  │ │ Saved Views ││
│ │ 23 active packages         │ │ 🔖 Q1 stall ││
│ │ [sortable table]           │ │ 🔖 My pipe  ││
│ └────────────────────────────┘ └─────────────┘│
└────────────────────────────────────────────────┘
```

## Reports

### 1. Package Pipeline
*All active packages with operational metrics.* Ordered longest-idle first by the API.

| Column | Sortable | Notes |
|--------|----------|-------|
| Project | Yes | Link to the package; an `In Review` chip appears when an assignment is active |
| Type | Yes | |
| Status | Yes | Badge |
| Stage | Yes | `internalStage`, em dash when null |
| Jurisdiction | Yes | |
| Coordinator | Yes | em dash when unassigned |
| Idle (days) | Yes | **Red at ≥7, amber at ≥3** |
| Checklist | Yes | Progress bar + percentage; bar turns green at 100% |
| Contractor | Yes | Compliance badge: Compliant / Expiring / Expired |

API accepts filters `coordinatorId`, `jurisdictionId`, `permitType`, `stage` — **none have UI controls**.

### 2. Stalled Packages
*Packages with no recent activity.*

| Control | Options | Default |
|---------|---------|---------|
| Idle threshold | 3d / 5d / 7d / 14d buttons | **3d** |

Columns: Project (link), Type, Status, Customer, Coordinator, Idle (days) — **red at ≥14, amber below** — and Last Activity. A red count reads "{n} stalled".

### 3. Contractor Compliance
*License and insurance expiry status.* One row per contractor, alphabetical.

Summary line: "{n} expired · {n} expiring soon · {n} total contractors".

| Column | Notes |
|--------|-------|
| Company | Link to the contractor; license number beneath |
| Status | Overall roll-up: Compliant / Expiring / Expired / **Incomplete** |
| License | Per-document badge, plus "{n}d left" when ≤30 days |
| Workers Comp | Same |
| Liability | Same |
| W9 | Badge only — no expiry tracked |
| Active Pkgs | Count of non-closed packages |

Per-document statuses: `valid`, `expiring` (within **30 days**), `expired`, `missing`. Not sortable.

### 4. Review Performance
*Per-reviewer approval and SLA metrics.* Computed from `APPROVED` and `SENT_BACK` assignments only.

| Column | Meaning | Thresholds |
|--------|---------|-----------|
| Reviewer | Name + email | |
| Total | Completed assignments | |
| Approved | Count | green |
| Sent Back | Count | amber |
| Approval Rate | % approved | **green ≥80, amber ≥60, red below** |
| Avg Hours | Mean review duration | em dash when unavailable |
| SLA % | % completed by due date | green ≥80, else amber; em dash when no due dates were set |
| Avg Comments | Mean comments per review | |

Not sortable.

## Fields — Saved Views sidebar

| Field | Type | Notes |
|-------|------|-------|
| View name | Text | Required to enable Save |
| Share with team | Checkbox | Sets `isShared` |
| Save View | Button | Persists name, share flag, and the **report type only** |
| Saved list | List | Bookmark icon (filled when shared) + name + report type; hover reveals a delete button |

## Interactions

### Tab switch
Swaps the rendered report component. Each fetches its own data on mount; a skeleton loader shows while in flight.

### Sort (Pipeline and Stalled only)
Click a header to sort client-side over already-fetched rows; clicking the active column flips direction. Nulls sort last regardless of direction.

### Change stalled threshold
Re-fetches `/api/reports/stalled?days={n}`.

### Refresh
Bumps a key that remounts the active report, forcing a re-fetch.

### Export
An anchor to `/api/reports/{activeTab}?format=csv` with a `download` attribute. **No report route implements `format`** — this downloads JSON, not CSV. See [G8](../appendix/gaps-and-open-questions.md#g8--report-csv-export-is-not-implemented).

### Save / load / delete a view
Save posts name, share flag, and report type. Loading one only **switches to that report's tab** and refreshes. Delete removes it immediately from the list.

## API Dependencies

| API | Method | Path | Notes |
|-----|--------|------|-------|
| Pipeline | GET | `/api/reports/pipeline` | Accepts 4 unused filters |
| Stalled | GET | `/api/reports/stalled?days=` | Default 3 |
| Contractor compliance | GET | `/api/reports/contractor-compliance` | 30-day warn window |
| Review performance | GET | `/api/reports/review-performance` | |
| List saved reports | GET | `/api/reports/saved` | |
| Create saved report | POST | `/api/reports/saved` | |
| Delete saved report | DELETE | `/api/reports/saved/{id}` | |

## Page Relationships

- **From:** "Reports" nav item
- **To:** `/permits/{id}` (Pipeline, Stalled), `/contractors/{id}` (Compliance)

## Business Rules

- **Saved views save almost nothing.** Despite a schema designed for it (`filters`, `columns`, `sortBy`, `sortOrder` on `SavedReport`), the save call hardcodes `filters: '{}'` and `columns: '[]'` and sends no sort. Loading a view therefore just switches tabs — the name is a label for a report type, not a saved configuration. See [G9](../appendix/gaps-and-open-questions.md#g9--saved-views-persist-no-filters-columns-or-sort).
- **All four reports are visible to every role**, including per-reviewer performance metrics — a reviewer can see colleagues' approval rates and SLA compliance. `[TBC]` whether that is intended.
- **`isShared` has no effect on visibility.** `GET /api/reports/saved` returns the caller's list; the flag is stored and displayed via a different icon but nothing filters on it.
- **Two report types are defined but not built.** The `ReportType` enum includes `DOCUMENT_QUALITY` and `SUBMISSION_VOLUME`, and `PackageSnapshot` captures daily trend data (checklist %, verified-doc %, days in stage, open comments) that **no report reads**. The nightly snapshot job is populating a table nothing consumes.
- **Idle-day color thresholds differ between reports** — Pipeline warns at 3 and alarms at 7; Stalled alarms at 14. Both differ from the board's single 3-day stall rule.
- **Sorting is client-side over the fetched page**, so it reorders only what was returned, not the full dataset.
