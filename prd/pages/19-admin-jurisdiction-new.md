# New Jurisdiction

> **Route:** `/admin/jurisdictions/new`
> **Module:** Administration
> **Access:** Reachable by any signed-in user; the create API is **admin only**
> **Source:** [app/admin/jurisdictions/new/page.tsx](../../app/admin/jurisdictions/new/page.tsx)

## Overview

Creates a jurisdiction record — the container that requirements hang off and that permit packages link to in order to get a checklist. A jurisdiction is created empty; requirements are added afterward on the detail screen, or in bulk via the county seeder.

## Fields

| # | Field | Type | Required | Default | Placeholder | Notes |
|---|-------|------|----------|---------|-------------|-------|
| 1 | Name | Text | **Yes** | — | `Hillsborough County` | Display name used throughout the app |
| 2 | County Code | Text | **Yes** | — | `HILLSBOROUGH` | **Unique**, max 10 characters |
| 3 | State | Text | Yes | `FL` | — | Exactly 2 characters |
| 4 | Notes | Textarea | No | — | — | Local quirks, contacts, filing notes |

## Interactions

### Submit
`POST /api/jurisdictions`. Requires the `create` permission on `jurisdiction` (admin). Zod validates name presence, code presence and length, and the two-character state. A duplicate `countyCode` fails on the unique constraint.

### On success
Navigates to the jurisdiction list or the new record's detail page so requirements can be added.

## API Dependencies

| API | Method | Path | Notes |
|-----|--------|------|-------|
| Create jurisdiction | POST | `/api/jurisdictions` | **Admin only** — returns 403 otherwise |

## Page Relationships

- **From:** `/admin/jurisdictions` header button
- **To:** `/admin/jurisdictions/{id}` to add requirements

## Business Rules

- **The county-code placeholder contradicts the rest of the system.** It suggests `HILLSBOROUGH` (11 characters — which would in fact fail the 10-character maximum), while `/admin/counties` and the seed data use three-letter codes like `HIL`. Codes entered by hand here won't match what the counties screen looks up, so the county will still show as Unseeded. See [G13](../appendix/gaps-and-open-questions.md#g13--jurisdiction-county-code-conventions-conflict).
- **A new jurisdiction generates an empty checklist.** Linking a package to it produces zero items and a readiness *warning* ("No mandatory checklist items found. Verify the jurisdiction requirements are configured") rather than a blocker — so a package can pass the gate on an unconfigured county.
- **Nothing prevents creating a second jurisdiction for the same county** under a different code.
- **Non-Florida states are accepted.** The field defaults to `FL` and validates only length, but the counties admin screen and the New Permit county dropdown are Florida-only, so a non-FL jurisdiction would be invisible in both.
