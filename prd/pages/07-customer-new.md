# New Customer

> **Route:** `/customers/new`
> **Module:** Customers
> **Access:** Renders for all signed-in users
> **Source:** [app/customers/new/page.tsx](../../app/customers/new/page.tsx)

## Overview

Create a customer record — the paying party for a permit. Only the name is mandatory; everything else is contact detail that can be filled in later.

## Fields

| # | Field | Type | Required | Placeholder | Business meaning |
|---|-------|------|----------|-------------|------------------|
| 1 | Name | Text | **Yes** | `Enter customer name` | Company or individual paying for the permit |
| 2 | Contact Name | Text | No | `Enter contact person name` | Day-to-day human contact |
| 3 | Phone | Tel | No | `(555) 123-4567` | Format is a hint only — not validated |
| 4 | Email | Email | No | `customer@example.com` | Validated as an email when non-empty; empty string is accepted |
| 5 | Main Address | Text | No | `123 Main Street, City, State ZIP` | Billing/mailing address — distinct from a permit's project address |
| 6 | Notes | Textarea | No | `Additional notes about the customer...` | Free-form |

## Interactions

### Submit
`POST /api/customers` with the form values. On success, navigate to the new customer's detail page. Validation is browser-native plus server-side Zod (`customerSchema`); errors surface in a banner.

### Cancel
Returns to `/customers` with no unsaved-changes warning.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| Create customer | POST | `/api/customers` | Submit | Auth only — no role check |

## Page Relationships

- **From:** `/customers` header button
- **To:** `/customers/{id}` on success; `/customers` on cancel

## Business Rules

- **No duplicate detection.** Nothing warns that a customer of the same name already exists, so this form plus the New Permit find-or-create flow are two independent paths to creating duplicates.
- **Email accepts empty string explicitly.** The Zod schema is `email().optional().or(literal(''))` — a blank field is valid, but a malformed address is rejected.
- **Phone is entirely unvalidated.** Any string is stored.
