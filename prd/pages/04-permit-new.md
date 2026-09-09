# New Permit

> **Route:** `/permits/new`
> **Module:** Permits
> **Access:** Renders for all signed-in users; reviewers reach it only by direct URL (the buttons are hidden for them)
> **Source:** [app/permits/new/page.tsx](../../app/permits/new/page.tsx)

## Overview

Intake form for a new permit package. Deliberately lightweight — it captures who and what, not the full picture. Jurisdiction linking, documents, checklist, and tasks all happen afterward on the detail screen.

Its most notable behavior is **find-or-create on the customer**: the coordinator types a customer name as free text rather than picking from a list, and the system reuses a matching customer or silently creates one.

## Layout

A single-column card, `Permit Information`, with a Cancel link in the page header. Fields in order: Customer Name, Contractor, Project Name, Project Address, Permit Type, County, Jurisdiction Notes, Target Issue Date, Billing Notes, then the submit row.

## Fields

| # | Field | Type | Required | Default | Options / Placeholder | Business meaning |
|---|-------|------|----------|---------|----------------------|------------------|
| 1 | Customer Name | Text | **Yes** | — | `Enter customer name (e.g., ABC Development LLC)` | Property owner or developer paying for the permit. Find-or-create — help text says "A new customer will be created if one doesn't exist" |
| 2 | Contractor | Select | **Yes** | — | Loaded from `/api/contractors` | The licensed contractor pulling the permit. **Must already exist** — no inline creation |
| 3 | Project Name | Text | **Yes** | — | `e.g., Office Building Renovation` | Human label for the job |
| 4 | Project Address | Text | **Yes** | — | `e.g., 123 Main Street, City, State ZIP` | Job site. Feeds the parcel lookup on the detail screen, and is a **readiness blocker** if empty |
| 5 | Permit Type | Select | **Yes** | `Building` | Building, Electrical, Plumbing, Mechanical, Roofing, HVAC, Structural, Mobile home, Other | Drives which county requirements apply to the checklist |
| 6 | County | Select | No | — | All 67 Florida county names | **Free-text county label only — this does NOT link a jurisdiction.** See Business Rules |
| 7 | Jurisdiction Notes | Textarea (3 rows) | No | — | `Any special requirements or notes about the jurisdiction...` | Local quirks worth remembering |
| 8 | Target Issue Date | Date | No | — | — | Goal date. Absence produces a readiness *warning* |
| 9 | Billing Notes | Textarea (2 rows) | No | — | `Any notes for the billing department...` | Handoff note for billing |

### Hidden defaults submitted with every new package

| Field | Value |
|-------|-------|
| `status` | `New` |
| `internalStage` | `InProgress` |
| `billingStatus` | `NotSent` |

## Interactions

### Page load
Fetches `/api/contractors` to populate the contractor dropdown. While in flight the whole form is replaced by "Loading form data...". A failure sets "Failed to load contractors" but still reveals the form — with an empty, unusable contractor select.

### Submit — a three-step sequence
1. **Resolve the customer.**
   - Reject empty/whitespace names client-side.
   - `GET /api/customers?search={name}` and look for a **case-insensitive exact** name match.
   - Match found → reuse that customer's ID.
   - No match → `POST /api/customers` with just the name.
   - **If the search fails for any reason** (non-OK response, network error), log a warning and create the customer directly. The rationale is resilience — a failed lookup shouldn't block intake — but see Business Rules for the consequence.
2. **Create the package.** `POST /api/permits` with the resolved `customerId` plus the form fields. Optional fields are omitted rather than sent empty. `targetIssueDate` is converted from `YYYY-MM-DD` to a full ISO datetime.
3. **Redirect** to `/permits/{newId}` and refresh.

### Validation
Entirely browser-native (`required` attributes) plus the empty-customer-name guard. The server re-validates with Zod (`permitPackageSchema`) and returns 400 with details on failure.

### Error handling
Any thrown error surfaces its message in a red block at the top of the form and clears the loading state so the user can retry. **A partial failure is possible** — see Business Rules.

### Cancel
Header link to `/permits`. No unsaved-changes warning.

## API Dependencies

| API | Method | Path | Trigger | Key params | Notes |
|-----|--------|------|---------|-----------|-------|
| List contractors | GET | `/api/contractors` | Page load | — | Populates the dropdown |
| Search customers | GET | `/api/customers?search=` | Submit step 1 | `search` | Failure is tolerated and falls through to create |
| Create customer | POST | `/api/customers` | Submit step 1, when no match | `name` | Only the name is set; all other customer fields stay empty |
| Create permit | POST | `/api/permits` | Submit step 2 | Full package payload | Returns the new package; server also writes an activity log, sets `lastActivityAt`, and generates the checklist **if a jurisdiction is linked** |

## Page Relationships

- **From:** `/permits` header button; Operations Board header button and empty state
- **To:** `/permits/{id}` on success; `/permits` on cancel

## Business Rules

- **Selecting a County here does not enable the checklist.** The `county` field is a legacy free-text label. Checklist generation requires a linked `jurisdictionId`, which this form never sets. **Every package created here starts with no checklist**, and the coordinator must set "County / Jurisdiction" on the detail screen to generate one. This is the single most consequential gap in the intake flow — see [G3](../appendix/gaps-and-open-questions.md#g3--new-permit-form-cannot-link-a-jurisdiction).
- **Customer find-or-create can silently duplicate.** The match is case-insensitive but otherwise exact, so "ABC Development LLC" and "ABC Development, LLC" become two customers. More significantly, when the *search* call fails the code creates unconditionally — so a transient error produces a duplicate customer rather than an error message.
- **Auto-created customers are name-only.** No contact, phone, email, or address. Someone must fill those in later on the customer detail screen.
- **Contractors must pre-exist.** A coordinator taking in a job from a new contractor must leave this form, create the contractor, and start over. There is no inline creation and no unsaved-state preservation.
- **Step 2 can fail after step 1 succeeded.** If customer creation works but package creation fails, the orphan customer remains. There is no transaction spanning the two calls and no cleanup.
