# Operations Board

> **Route:** `/dashboard`
> **Module:** Operations Board (the application home)
> **Access:** All roles — content varies significantly by role
> **Source:** [app/dashboard/page.tsx](../../app/dashboard/page.tsx), [lib/court.ts](../../lib/court.ts)

## Overview

The attention-first home screen. Rather than showing metrics, it answers one question: *what needs my attention, and how long has it been waiting?* Work is grouped by **who holds the ball** and every row leads with a day counter, so a package that has gone quiet is visually loud.

This is the screen a coordinator lives on. It redirects to `/login` if there is no session, and is one of only three pages that verifies the session itself.

## Layout

Top to bottom:

```
┌─ Operations Board ─────────────── [+ New Permit] ─┐   ← header; button hidden for reviewers
│                                                    │
│ NOTICES — REQUIRES ACTION                          │   ← only if any notice is non-zero
│ [Stalled ] 4 packages with no activity in 3+ days 4→│
│ [Expiring] 2 contractor compliance docs …        2→│
│ [Comments] 7 review comments remain unresolved   7→│
│                                                    │
│ ┌ Active pipeline — 23 packages by court ───────┐ │
│ │ ███████████░░░░░░░░░░▓▓▓▓▓▓▒▒▒▒                │ │   ← proportional stacked bar
│ │ ■ 8 our court  ■ 5 with contractor  ■ 7 …     │ │   ← clickable legend
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ▌8  Our court   Revisions to return, intakes …    │   ← one group per court
│ days held │ Package │ Customer/Contractor │ Stage │ Next action
│    12     │ …       │ …                   │ …     │ …
│     3     │ …       │ …                   │ …     │ …
│                                                    │
│ ▌5  With contractor  Waiting on the contractor …  │
│ …                                                  │
└────────────────────────────────────────────────────┘
  Contractor compliance: …            PermitPro PMS · Operations Board
```

## The "ball in court" model

A presentation-only classification (no schema field) mapping permit status onto who owes the next action:

| Court | Label | Derived from status | Days counter label |
|-------|-------|--------------------|--------------------|
| `us` | Our court | `New`, `RevisionsNeeded`, `Approved` | days held |
| `contractor` | With contractor | *No status of its own* — see below | days waiting |
| `county` | With jurisdiction | `Submitted`, `InReview` | days out |
| `field` | Fieldwork | `Issued`, `Inspections` | days open |
| `closed` | Closing | `FinaledClosed`, `Canceled` | days |

**The contractor court is inferred, not stored.** A package whose status alone would put it in `us` or `field`, but which still has at least one incomplete task, is reassigned to `contractor` — the reasoning being that an open task means someone outside the office owes an action. `county` and `closed` are never reassigned this way.

This inference requires per-package task data, which the org-wide distribution counts don't have (they come from a status-only aggregate). The bar therefore runs a second aggregate — packages in `us`/`field` statuses that have an open task — and moves that slice out of the origin buckets into `contractor`, so the bar matches the grouped list below it.

## Fields

### Notices (conditional — only rendered when the count is non-zero)

| Notice | Condition | Threshold | Links to |
|--------|-----------|-----------|----------|
| Stalled | Packages not `FinaledClosed`/`Canceled`/`Approved` whose `lastActivityAt` (or `openedDate` when null) is older than the threshold | **3 days** | `/permits?stalled=1` |
| Expiring | Non-superseded contractor documents with `expirationDate` before the cutoff | **30 days** | `/contractors?compliance=expiring` |
| Comments | Review comments where `isResolved = false`, counted across all packages | any | `/review-queue?comments=open` |

When all three are clear the entire section is omitted.

### Distribution bar

| Element | Behavior |
|---------|----------|
| Stacked bar | One segment per non-empty court, `flex-grow` proportional to count, `closed` excluded. Labeled for screen readers as `"Our court: 8, With contractor: 5, …"` |
| Legend | One link per court → `/permits?court={court}` |
| Total | `N packages` — sum of all active (non-closed) courts |

Hidden entirely when the active total is zero.

### Work list columns

| Column | Width | Mobile | Content |
|--------|-------|--------|---------|
| Days counter | 80px | Shown | Large numeral + court-specific label. Turns red (`text-urgent`) when stalled |
| Package | 1.7fr | Shown | Permit number (or first 8 chars of ID, uppercased) / project name / address — jurisdiction |
| Customer / Contractor | 1fr | Hidden | Customer name over contractor company |
| Stage | 150px | Hidden | Status badge |
| Next action | 1.2fr | Hidden | Next open task name, or a court-derived fallback |

**Day counter semantics differ by court:** `field` and `closed` count from `openedDate` (total age); every other court counts from `lastActivityAt`, falling back to `openedDate`.

**Stalled styling** applies when days ≥ 3 **and** the court is neither `closed` nor `field` — long-running fieldwork and closed packages are not "stalled".

**Next action fallback** when there is no open task: `county` → "Await county response"; `field` → "Coordinate inspections"; `closed` → "—"; otherwise "Review package".

## Interactions

### Page load — role determines the entire query set

Eight queries run in parallel. Three are role-gated:

| Role | Work list source | Extra behavior |
|------|-----------------|----------------|
| **Coordinator** | Packages where `coordinatorId = me`, not closed, oldest-activity first, max 25 | — |
| **Admin** | Same personal query, **plus** a team-wide query of all non-closed packages | If the personal list is empty, falls back to the team list and shows "No packages assigned to you personally — showing the team pipeline." |
| **Reviewer** | *No package list.* Instead loads own `ASSIGNED`/`IN_REVIEW` review assignments, oldest first, max 25 | Renders a "Your review queue" section instead of court groups |

The header description also changes: admin → "Team pipeline grouped by who holds the ball"; reviewer → "Assignments awaiting your review"; coordinator → "Your packages grouped by who holds the ball".

### Grouping and sorting
Packages are grouped by resolved court, then **sorted within each group by day count descending** — the longest-waiting package is always first. Groups render in fixed order: our court → with contractor → with jurisdiction → fieldwork → closing. Empty groups are omitted.

### Navigate to a package
Any row is a link to `/permits/{id}`.

### Empty state (coordinator/admin, no packages)
Shows "Nothing on your board" with two buttons: **+ New Permit** and **Browse all permits**.

### Empty state (reviewer, no assignments)
"You're caught up — no active review assignments."

## API Dependencies

All data is fetched server-side via Prisma in the page component — **no HTTP API calls**. The page is `force-dynamic`, so it re-queries on every request with no caching.

| Query | Purpose |
|-------|---------|
| `permitPackage.count` (stall filter) | Stalled notice |
| `reviewComment.count` (unresolved) | Comments notice |
| `contractorDocument.count` (expiring) | Compliance notice |
| `permitPackage.findMany` (mine) | Work list — coordinator and admin |
| `permitPackage.findMany` (team) | Admin fallback work list |
| `reviewAssignment.findMany` (mine) | Reviewer work list |
| `permitPackage.groupBy` status | Distribution bar |
| `permitPackage.groupBy` status + has-open-task | Contractor-court reassignment for the bar |

## Page Relationships

- **From:** `/login`, `/` root redirect, the "PermitPro" wordmark in the header, the "Board" nav item
- **To:**
  - `/permits/{id}` — any work-list row
  - `/permits/new` — the header button and empty-state button
  - `/permits` — empty-state "Browse all permits"
  - `/permits?court={court}` — distribution legend
  - `/permits?stalled=1` — stalled notice
  - `/contractors?compliance=expiring` — compliance notice
  - `/review-queue?comments=open` — comments notice
  - `/review-queue` — reviewer's "Open review queue →"
- **Data coupling:** Reads `lastActivityAt`, which nearly every mutation elsewhere touches. Any package edit changes this screen's ordering and stall counts on next load.

## Business Rules

- **Work lists cap at 25 rows.** There is no pagination or "show more" — a coordinator with more than 25 open packages sees only the 25 with the oldest activity. The cap was raised from 8 specifically so court groups aren't artificially truncated.
- **Reviewers cannot create permits.** The "+ New Permit" button is hidden for them (though see [G1](../appendix/gaps-and-open-questions.md#g1--permission-matrix-is-not-enforced-on-most-write-routes) — the API would accept it).
- **The `Approved` status is excluded from stall detection** but still lives in the `us` court. An approved package sitting untouched for a week appears in "Our court" with a high day count but does *not* raise the stalled notice.
- **The comments notice counts globally, not per user.** A coordinator sees the firm-wide unresolved comment count, including comments on packages they don't own.
- **The compliance notice counts documents, not contractors.** One contractor with three expiring documents contributes 3.
