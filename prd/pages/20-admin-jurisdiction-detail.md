# Jurisdiction Detail — Requirements

> **Route:** `/admin/jurisdictions/[id]`
> **Module:** Administration
> **Access:** Reachable by any signed-in user; the write APIs are **admin only**
> **Source:** [app/admin/jurisdictions/[id]/page.tsx](../../app/admin/jurisdictions/[id]/page.tsx)

## Overview

The second requirement editor. Functionally parallel to [County Detail](./16-admin-county-detail.md) but reached by jurisdiction ID rather than county code, and without that screen's version-history and restore features. This is the simpler, older of the two paths to the same catalog.

## Layout

```
┌─ ← Jurisdictions ──────────── [+ Add Requirement] ─┐
│ Hillsborough County                                │
│ HIL · FL · Active                                  │
│                                                    │
│ [Error banner, when present]                       │
│                                                    │
│ NEW REQUIREMENT                                    │
│ Document Name *  [                    ]            │
│ Category [▾]     Applies to Permit Types [checks]  │
│ Required ☑  Blocks gate ☑  Order [0]               │
│ Description [        ]  Help Text [        ]       │
│ [Save] [Cancel]                                    │
│                                                    │
│ [Requirements list — toggle / delete per row]      │
└────────────────────────────────────────────────────┘
```

## Fields

### Header
Jurisdiction name, then `{code} · {state} · Active|Inactive` with the status colored green or red.

### New requirement form

| Field | Type | Required | Default | Options |
|-------|------|----------|---------|---------|
| Document Name | Text | **Yes** | — | Placeholder `Site Plan` |
| Category | Select | Yes | `Application` | Application, Plans, Specifications, Engineering, Photos, Correspondence, Inspection, Certificate, Other |
| Applies to Permit Types | Checkbox group | Yes | `All types` | "All types" → `["*"]`, or any of the 9 permit types. Checking "All types" clears the individual selections; unchecking it empties the list |
| Required | Checkbox | — | checked | |
| Blocks gate | Checkbox | — | checked | `isMandatoryForSubmission` |
| Description | Text | No | — | |
| Help Text | Text | No | — | |
| Order | Number | No | 0 | |

### Requirement rows
Each row exposes an active toggle and a delete action.

## Interactions

### Page load
`GET /api/jurisdictions/{id}`, which includes the jurisdiction's requirements. Shows "Loading…", or "Jurisdiction not found" if the record doesn't resolve.

### Add a requirement
`POST /api/jurisdictions/{id}/requirements`, permit types JSON-stringified. On success the form resets and closes and the jurisdiction re-fetches. On failure the API error renders in a banner.

### Toggle active
`PATCH /api/requirements/{id}` with the inverted `isActive`.

### Delete
Confirm — "Remove this requirement? If packages reference it, it will be deactivated instead." — then `DELETE /api/requirements/{id}`. The confirm text accurately describes the API's soft-delete behavior.

### Back
Button returns to `/admin/jurisdictions`.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| Get jurisdiction | GET | `/api/jurisdictions/{id}` | Mount, after any mutation | Includes requirements |
| Create requirement | POST | `/api/jurisdictions/{id}/requirements` | Add | **Admin** |
| Update requirement | PATCH | `/api/requirements/{id}` | Toggle | **Admin**; writes a change log |
| Delete requirement | DELETE | `/api/requirements/{id}` | Delete | **Admin**; deactivates if referenced |

## Page Relationships

- **From:** `/admin/jurisdictions` "Manage" link
- **To:** `/admin/jurisdictions` (back)
- **Sibling:** [County Detail](./16-admin-county-detail.md) edits the same requirements via `/admin/counties/{code}`

## Business Rules

- **No version history or restore here.** Requirement changes made on this screen still write `RequirementChangeLog` rows (the API does that regardless), but this screen provides no way to view or restore them — that only exists on the county detail screen. **Same data, two editors, different capabilities.**
- **No inline editing.** A requirement can be created, activated, deactivated, or deleted here, but not edited. Changing a document name or category requires the county detail screen.
- **Requirements are a flat list**, not grouped by permit type as on the county screen.
- **The uniqueness constraint is on `(jurisdictionId, documentName, permitTypes)`** — so the same document name can be added twice if it is scoped to different permit-type sets, which is intentional but easy to do accidentally when one entry is `["*"]`.
- **Everything said in [County Detail](./16-admin-county-detail.md#business-rules) about downstream impact applies equally**: edits do not retroactively update existing packages, and tightening `Blocks gate` can immediately strand packages that were previously ready for review.
