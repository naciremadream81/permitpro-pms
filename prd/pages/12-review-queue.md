# Review Queue

> **Route:** `/review-queue`
> **Module:** Review
> **Access:** All roles — action buttons are role-gated
> **Source:** [app/review-queue/page.tsx](../../app/review-queue/page.tsx)

## Overview

The cross-package review workspace. Where the permit detail screen handles review for *one* package, this screen is the reviewer's inbox: every assignment across the firm, organized into lanes, with start/approve/send-back actions inline so a reviewer can work a batch without opening each package.

It also carries the **Ready to submit** lane, which is a coordinator's queue rather than a reviewer's — packages that passed review and are waiting to go to the county.

## Layout

```
┌─ Review queue ─────────────────────────────────┐
│ 5 in review · 3 ready to submit                │
│                                                │
│ IN REVIEW 5 │ READY TO SUBMIT 3 │ SENT BACK 2 │ COMPLETED 9 │ ALL 14
│ ─────────────                                  │  ← tablist
│                                                │
│  12   Riverside Plaza Renovation [IN REVIEW]   │
│ days  Building · Hillsborough · Acme Dev       │
│ assig Due Mar 12 · 💬 2 open comments          │
│       Reviewer: Dana Cole                      │
│                        [Approve][Send back] Open →
│  ─────────────────────────────────────────────  │
│  …                                             │
└────────────────────────────────────────────────┘
```

## Fields

### Lane tabs

| Lane | Source | Matches |
|------|--------|---------|
| **In review** | Assignments | Status `ASSIGNED` or `IN_REVIEW` |
| **Ready to submit** | **Packages** — not assignments | `internalStage = ReadyToSubmit` |
| **Sent back** | Assignments | Status `SENT_BACK` |
| **Completed** | Assignments | Status `APPROVED` **or `SENT_BACK`** |
| **All** | Assignments | Everything |

Each tab shows a count when non-zero. Default lane is **In review**.

### Assignment row

| Element | Content | Notes |
|---------|---------|-------|
| Days counter | Days since `assignedAt` | Turns red when the assignment is overdue |
| Project name | Package project name | |
| Status badge | Assignment status | |
| `Overdue` chip | — | When `dueDate` is in the past |
| Meta line | Permit type · jurisdiction (or county, or "No jurisdiction") · customer name | |
| Due date | `Due {date}` | Bold red when overdue |
| Open comments | `💬 N open comment(s)` | Count of unresolved comments on this assignment; amber |
| Reviewer | `Reviewer: {name}` | |
| Actions | Start / Approve / Send back | Role- and status-gated |
| Open → | Link to the package | |

### Ready-to-submit row

| Element | Content |
|---------|---------|
| Project name | With a green `Ready to submit` chip |
| Meta line | Permit type · jurisdiction · customer |
| Actions | **Submit to county** (admin/coordinator only) |
| Open → | Link to the package |

## Interactions

### Page load
Fetches the session (for the role), then two lists in parallel:
- `GET /api/review-queue` — all assignments with reviewer, package, and comments
- `GET /api/permits?internalStage=ReadyToSubmit&limit=100` — the ready-to-submit lane

Shows "Loading review queue…" with `role="status"` while in flight.

### Switch lane
Pure client-side filter over the already-loaded assignments. No refetch.

### Start review
`POST /api/permits/{packageId}/review` with `{action: 'start'}`. Visible to admin and reviewer when the assignment is `ASSIGNED`.

### Approve
Same endpoint with `{action: 'approve'}`. Visible when the assignment is `IN_REVIEW`. Triggers the full approval transaction — all `Pending` documents become `Verified`, all `UPLOADED` checklist items become `VERIFIED`, and the package moves to `ReadyToSubmit`.

### Send back
- **Trigger:** Send back button
- **Behavior:** A native `window.prompt()` asks for the reason, requiring **5+ characters**; anything shorter (or a cancel) aborts silently with no feedback
- **Effect:** Assignment `SENT_BACK`, the note becomes a review comment, package returns to `InProgress`

### Submit to county
`POST /api/permits/{packageId}/submit`. Only in the ready-to-submit lane, only for admin/coordinator.

### Error handling
All four actions surface failures via a native `alert()` carrying the API's error message.

### Empty lanes
A green check with contextual copy — "Nothing ready to submit / Packages appear here once their review is approved." or "Queue is clear / No reviews in this lane."

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| Session | GET | `/api/auth/session` | Mount | Reads role for conditional actions |
| Review queue | GET | `/api/review-queue` | Mount, after every action | Accepts a `status` param, unused here |
| Ready packages | GET | `/api/permits?internalStage=ReadyToSubmit&limit=100` | Mount, after every action | |
| Review action | POST | `/api/permits/{id}/review` | Start, approve, send back | |
| Submit | POST | `/api/permits/{id}/submit` | Submit to county | |

## Page Relationships

- **From:** "Review Queue" nav item; Operations Board comments notice (`?comments=open`); reviewer's "Open review queue →"
- **To:** `/permits/{id}` via any "Open →"

## Business Rules

- **The `?comments=open` parameter is ignored.** The Operations Board's unresolved-comments notice links here with that query string, but this page never reads it — the user lands on the default "In review" lane with no comment filter applied. See [G7](../appendix/gaps-and-open-questions.md#g7--review-queue-ignores-the-commentsopen-filter-it-is-linked-with).
- **The "Completed" lane double-counts sent-back work.** Its predicate matches `APPROVED` **or `SENT_BACK`**, so every sent-back assignment appears in both the "Sent back" and "Completed" lanes, and the "All" count does not equal the sum of the other lanes.
- **The whole queue is firm-wide, not per-reviewer.** A reviewer sees every assignment including colleagues', and the reviewer name is shown on each row. Filtering to one's own work is not possible here — the Operations Board is the personal view.
- **Send back uses a browser prompt.** No inline textarea, no character counter, and a too-short reason fails silently. The permit detail screen's equivalent has a proper textarea with a disabled-until-valid button.
- **Actions do not verify the acting reviewer owns the assignment** on the client — the API enforces it, allowing admins to act on anything and reviewers only on their own assignments.
- **The ready-to-submit lane caps at 100 packages.**
