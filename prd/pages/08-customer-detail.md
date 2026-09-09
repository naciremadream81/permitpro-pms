# Customer Detail

> **Route:** `/customers/[id]`
> **Module:** Customers
> **Access:** All roles
> **Source:** [app/customers/[id]/page.tsx](../../app/customers/[id]/page.tsx), [customer-detail-client.tsx](../../app/customers/[id]/customer-detail-client.tsx)

## Overview

One customer's record and every permit package linked to them. Contact details are edited inline, one field at a time — the same pattern as the permit detail screen. Returns 404 for an unknown ID.

## Layout

```
┌─ Acme Development LLC ──────────────────┐
│ CUSTOMER INFORMATION                    │  ← inline-editable fields
│ Name · Contact · Phone · Email          │
│ Main Address · Notes                    │
├─────────────────────────────────────────┤
│ PERMIT PACKAGES (6)                     │  ← newest first
│ Project │ Contractor │ Type │ Status │ Opened
└─────────────────────────────────────────┘
```

## Fields

### Customer information (all inline-editable)

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | |
| Contact Name | Text | |
| Phone | Tel | Placeholder `(555) 123-4567`; unvalidated |
| Email | Email | |
| Main Address | Text | |
| Notes | Textarea | |

### Permit packages table

Each linked package shows project name (link to the package), contractor company, permit type, status badge, and opened date. Ordered by `openedDate` descending.

## Interactions

### Page load
Server component fetches the customer with all linked permit packages, each including its contractor's ID and company name, ordered newest first.

### Edit a field
Click Edit → input replaces the value → Save PATCHes `/api/customers/{id}` with just that field → re-fetch. Cancel discards.

### Open a package
Any project name links to `/permits/{id}`.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| Update customer | PATCH | `/api/customers/{id}` | Save an inline field | Auth + `update` on `customer` enforced |
| Delete customer | DELETE | `/api/customers/{id}` | — | Endpoint exists (**admin only**); `[TBC]` whether the UI exposes it |

## Page Relationships

- **From:** `/customers` register; permit detail "Customer" link
- **To:** `/permits/{id}` for each linked package
- **Data coupling:** Deleting a customer cascades to their permit packages (`onDelete: Cascade` on `PermitPackage.customer`) — a destructive relationship worth flagging to anyone exposing the delete action.

## Business Rules

- **Deleting a customer deletes all their permit packages.** The schema cascades, so this is not a soft reference — it destroys permit history, documents metadata, checklists, tasks, and activity logs for every package. Restricted to admins at the API.
- **The package list is unpaginated.** Every linked package renders; a customer with a long history produces a long page.
