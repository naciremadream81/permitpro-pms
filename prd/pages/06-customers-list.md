# Customers List

> **Route:** `/customers`
> **Module:** Customers
> **Access:** All roles
> **Source:** [app/customers/page.tsx](../../app/customers/page.tsx)

## Overview

The customer directory — the property owners and developers who pay for permits. A thin register: four columns, alphabetical, click a name to open the record.

## Layout

```
┌─ Customers ─────────────── [New Customer] ─┐
│ All customers                               │
│                                             │
│ REGISTER — 84 CUSTOMERS                     │
│ Name │ Contact │ Email │ Phone              │
│ …                                           │
└─────────────────────────────────────────────┘
```

## Fields

### Register table

| Column | Format | Notes |
|--------|--------|-------|
| Name | Bold link | → `/customers/{id}` |
| Contact | Text | `contactName`, em dash when empty |
| Email | Text | em dash when empty |
| Phone | Text | em dash when empty |

No column is sortable; sort is fixed alphabetical by name.

### URL parameters

| Param | Effect | UI control? |
|-------|--------|-------------|
| `search` | Substring match on name, contact name, or email | **None — no search box is rendered** |
| `page` | 1-based page, 20 per page | **None — no pagination controls are rendered** |

## Interactions

### Page load
Two parallel Prisma queries — a paginated `findMany` ordered by name ascending, and a matching `count`. Page size 20.

### Search
Implemented server-side but **unreachable from the UI**. `?search=Acme` works if typed into the address bar.

### Pagination
Computed server-side (`totalPages` is calculated) but **no controls are rendered** and the total count line does not indicate more pages exist.

### Empty state
None. With no customers the table renders headers over an empty body.

## API Dependencies

Server-side Prisma only. A parallel `GET /api/customers` exists and is used by the New Permit form's find-or-create.

## Page Relationships

- **From:** "Customers" nav item
- **To:** `/customers/{id}`, `/customers/new`

## Business Rules

- **Only the first 20 customers are reachable.** Sorting is alphabetical and neither search nor pagination has a control, so with more than 20 customers everyone from roughly "B" onward is unreachable through the UI. This is the most severe of the three list-page regressions — see [G5](../appendix/gaps-and-open-questions.md#g5--customers-list-has-no-search-or-pagination-controls).
- **No package count is shown.** The register doesn't indicate how many permits a customer has, so there's no way to spot the auto-created name-only duplicates that the New Permit flow can produce.
