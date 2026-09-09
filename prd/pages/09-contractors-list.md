# Contractors List

> **Route:** `/contractors`
> **Module:** Contractors
> **Access:** All roles
> **Source:** [app/contractors/page.tsx](../../app/contractors/page.tsx)

## Overview

The contractor directory, and the landing point for the Operations Board's compliance alert. Contractors are the licensed parties who actually pull permits, so their license and insurance status gates whether a package can be submitted at all.

## Layout

```
┌─ Contractors ──────────── [New Contractor] ─┐
│ All contractors                              │  ← or the compliance-filter description
│                                              │
│ [search company, license, email…] [Search]   │
│                                              │
│ [Expiring] Compliance docs expiring …  Clear │  ← only with ?compliance=expiring
│                                              │
│ REGISTER — 31 CONTRACTORS                    │
│ Company │ License │ Email │ Phone            │
│ …                                            │
└──────────────────────────────────────────────┘
```

## Fields

### Search bar (native GET form)

| Field | Type | Notes |
|-------|------|-------|
| Search | Search input | Matches company name, license number, or email — substring, explicitly case-insensitive (`mode: 'insensitive'`) |
| Search | Submit button | |

An active `compliance` filter is carried as a hidden input so searching preserves it.

### URL parameters

| Param | Values | Effect | UI control? |
|-------|--------|--------|-------------|
| `search` | string | Multi-field substring search | Yes |
| `compliance` | `expiring` | Contractors having at least one non-superseded document expiring within **30 days** | No — arrives from the Operations Board notice |
| `page` | integer | 1-based, 20 per page | **None — no pagination controls rendered** |

### Register table

| Column | Format | Notes |
|--------|--------|-------|
| Company | Bold link | → `/contractors/{id}` |
| License | Text | `licenseNumber`, em dash when empty |
| Email | Text | em dash when empty |
| Phone | Text | em dash when empty |

Sort is fixed alphabetical by company name.

## Interactions

### Page load
Paginated `findMany` plus matching `count`, page size 20, ordered by company name.

### Search
Full page navigation with the new query string.

### Compliance filter
When `?compliance=expiring` is present, a warning banner explains the filter and offers "Clear filter" → `/contractors`. The query uses a relation filter — contractors with `some` non-superseded document whose `expirationDate` is before now + 30 days.

### Empty state
Context-aware: "No contractors match the expiring compliance filter." or "No contractors found."

## API Dependencies

Server-side Prisma only. `GET /api/contractors` exists separately and feeds the New Permit form's dropdown.

## Page Relationships

- **From:** "Contractors" nav item; Operations Board compliance notice (`?compliance=expiring`)
- **To:** `/contractors/{id}`, `/contractors/new`

## Business Rules

- **The compliance filter catches already-expired documents too.** The predicate is `expirationDate < now + 30 days`, which is true for anything expired. So "expiring within 30 days" actually means "expired or expiring within 30 days" — arguably the more useful behavior, but the label understates it.
- **Superseded documents are excluded.** When a renewal is uploaded the prior version is marked `isSuperseded`, so a renewed contractor drops off the filter correctly.
- **The register shows no compliance status.** Ironically, the page you land on from a compliance alert has no column indicating which contractors are non-compliant — you must open each record. The Contractor Compliance report is the screen that actually shows this.
- **Pagination controls are missing** (as on the Customers list), so only the first 20 contractors are reachable. See [G5](../appendix/gaps-and-open-questions.md#g5--customers-list-has-no-search-or-pagination-controls).
