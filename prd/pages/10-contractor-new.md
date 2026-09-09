# New Contractor

> **Route:** `/contractors/new`
> **Module:** Contractors
> **Access:** Renders for all signed-in users
> **Source:** [app/contractors/new/page.tsx](../../app/contractors/new/page.tsx)

## Overview

Create a contractor record. Two fields carry real weight beyond contact detail: **specialties**, which is the only multi-select on the form and is mandatory, and the two **expiration dates**, which are the legacy compliance mechanism now largely superseded by the document vault on the detail screen.

## Fields

| # | Field | Type | Required | Options / Placeholder | Business meaning |
|---|-------|------|----------|----------------------|------------------|
| 1 | Company Name | Text | **Yes** | `Enter company name` | Licensed contracting business |
| 2 | License Number | Text | No | `Enter license number` | State contractor license |
| 3 | Phone | Tel | No | `(555) 555-5555` | Unvalidated |
| 4 | Email | Email | No | `contractor@example.com` | |
| 5 | Address | Text | No | `Enter address` | Business address |
| 6 | Preferred Contact Method | Select | No | (blank), Phone, Email, Text | How this contractor prefers to be chased |
| 7 | Specialties | Checkbox group | **Yes — at least one** | Building, Electrical, Plumbing, Mechanical, Roofing, HVAC, Structural, Mobile home | Which permit types this contractor handles |
| 8 | Other specialty | Text | No | `Enter other specialty (optional)` | Appended to the specialties list |
| 9 | Workers Comp Expiration Date | Date | No | — | **Legacy** — see Business Rules |
| 10 | Liability Expiration Date | Date | No | — | **Legacy** — see Business Rules |
| 11 | Notes | Textarea | No | `Add any additional notes about this contractor...` | Free-form |

## Interactions

### Submit
1. Client-side guard: at least one specialty (checkbox or "other") must be present, else "Please select at least one specialty".
2. Selected specialties plus any "other" value are joined into a **single comma-separated string**.
3. `POST /api/contractors`. On success, navigate to the new contractor's detail page.

### Cancel
Returns to `/contractors`.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| Create contractor | POST | `/api/contractors` | Submit | Auth only — no role check |

## Page Relationships

- **From:** `/contractors` header button
- **To:** `/contractors/{id}` on success; `/contractors` on cancel
- **Note:** A coordinator who discovers mid-intake that the contractor doesn't exist must abandon the New Permit form, come here, then start intake over. There is no return path that preserves the in-progress permit.

## Business Rules

- **Specialties are stored as one comma-separated string, not a relation.** So they cannot be filtered or joined reliably, and "Mobile home" here does not match the `MobileHome` enum value used by permit types. The list is described in source as "matching permit types" but omits `Other` and uses a different spelling for mobile homes.
- **The two expiration date fields are a superseded mechanism.** The schema marks them "Legacy flat expiry fields — now superseded by ContractorDocument vault". The readiness engine only consults them **as a fallback when the contractor has no `LICENSE` document in the vault at all** — and even then it checks them against the 7-day insurance blocking window. Filling them in is therefore not equivalent to uploading vault documents, and the form gives no hint of that.
- **No duplicate detection** on company name or license number, despite `licenseNumber` being indexed.
- **A contractor created here starts with an empty document vault**, so any package assigned to them will pass the readiness contractor checks trivially — there are no expiry dates to fail against. Compliance blocking only begins once documents are uploaded.
