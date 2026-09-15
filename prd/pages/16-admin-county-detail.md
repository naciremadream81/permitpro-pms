# County Detail — Requirement Catalog

> **Route:** `/admin/counties/[countyCode]`
> **Module:** Administration
> **Access:** Reachable by any signed-in user; **the page hardcodes admin privileges** — see Business Rules
> **Source:** [app/admin/counties/[countyCode]/page.tsx](../../app/admin/counties/[countyCode]/page.tsx)

## Overview

Where one county's document requirements are actually authored. This is the highest-leverage admin screen in the system: the rows edited here become the checklist items on every permit package filed in this county, and the `Blocks gate` flag set here determines what stops a package from entering review.

Requirements are grouped by the permit types they apply to, edited inline, and every change is version-tracked with a restore path.

## Layout

```
┌─ ← Counties ─────────────────────────────────┐
│ Hillsborough County              [+ Add Req] │
│ HIL · FL · 14 active requirements            │
│                                              │
│ [NEW REQUIREMENT form, when open]            │
│                                              │
│ ALL PERMIT TYPES                             │  ← group
│ Name │ Category │ Req │ Gate │ Order │ ⋯     │
│ Site Plan │ Plans │ ✓ │ ✓ │ 0 │ [edit][hist][del]
│ …                                            │
│                                              │
│ BUILDING                                     │  ← group per permit type
│ …                                            │
│                                              │
│ [Version History drawer, when open]          │
└──────────────────────────────────────────────┘
```

## Fields

### New requirement form

| Field | Type | Required | Default | Options |
|-------|------|----------|---------|---------|
| Document Name | Text | **Yes** | — | Placeholder `e.g. Site Plan` |
| Category | Select | Yes | `Application` | Application, Plans, Specifications, Engineering, Photos, Correspondence, Inspection, Certificate, Other |
| Applies to Permit Types | Checkbox group | Yes | `All types` | "All types" (stored as `["*"]`), or any of the 9 permit types |
| Required | Checkbox | — | checked | Marks the document as expected |
| Blocks gate | Checkbox | — | checked | `isMandatoryForSubmission` — **this is what makes the item block review** |
| Description | Text | No | — | Shown to coordinators |
| Help Text | Text | No | — | Guidance on how to obtain the document |
| Order | Number | No | 0 | Display order within its group |

### Requirement row (inline-editable)

| Element | Behavior |
|---------|----------|
| Document name, category, permit types, flags, order | All editable in place |
| Inactive styling | Deactivated requirements render at 40% opacity |
| Row actions | Revealed on hover: **Edit**, **History**, **Delete/Toggle** |

### Version history drawer

| Element | Content |
|---------|---------|
| Action badge | CREATED / UPDATED / DELETED / ACTIVATED / DEACTIVATED / RESTORED, color-coded |
| Field, old value, new value | For field-level updates |
| Changed by | User ID, or `"system"` for seed operations |
| Timestamp | |
| Restore | Per-entry button — **hidden for `DELETED` entries** |

## Interactions

### Page load
Fetches all FL jurisdictions, finds the one matching the URL's county code, then fetches that jurisdiction's full detail including requirements.

### Add a requirement
`POST /api/jurisdictions/{id}/requirements` with the permit-type array JSON-stringified. Requires the `create` permission on `requirement` (admin). A uniqueness constraint on `(jurisdictionId, documentName, permitTypes)` prevents exact duplicates.

### Edit inline
`PATCH /api/requirements/{id}` with only the changed fields. The update schema deliberately lists every field as optional rather than deriving from `.partial()` — because Zod would otherwise re-apply defaults on each PATCH and silently reactivate soft-deleted requirements or reset catalog order.

### Toggle active
`PATCH /api/requirements/{id}` with `{isActive: !current}`. Deactivating removes the requirement from future checklist generation without touching existing checklist items.

### Delete
Native `confirm()` — "Remove this requirement?" — then `DELETE /api/requirements/{id}`. **The endpoint deactivates instead of deleting when checklist items reference the requirement**, preserving history on live packages.

### View history
`GET /api/requirements/{id}/history` populates the drawer.

### Restore a version
Confirm "Restore this requirement to this previous state?" then `POST /api/requirements/{id}/restore`. Each change log row stores a **full JSON snapshot** of the requirement at that moment, which is what makes restore possible.

### Grouping
Requirements applying to `["*"]` render under "All Permit Types"; the rest are grouped under each permit type they name. A requirement covering three permit types appears in three groups.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| List jurisdictions | GET | `/api/jurisdictions?state=FL` | Mount | To resolve county code → jurisdiction ID |
| Get jurisdiction | GET | `/api/jurisdictions/{id}` | Mount | Includes requirements |
| Create requirement | POST | `/api/jurisdictions/{id}/requirements` | Add | Admin |
| Update requirement | PATCH | `/api/requirements/{id}` | Inline edit, toggle | Admin; writes a change log per field |
| Delete requirement | DELETE | `/api/requirements/{id}` | Delete | Admin; deactivates if referenced |
| Requirement history | GET | `/api/requirements/{id}/history` | History drawer | |
| Restore requirement | POST | `/api/requirements/{id}/restore` | Restore | |

## Page Relationships

- **From:** `/admin/counties` county row
- **To:** `/admin/counties` (back link)
- **Data coupling:** This is the **upstream source of every checklist**. Adding a requirement changes what new packages generate and what a Regenerate produces on existing ones. Changing `isMandatoryForSubmission` changes which packages can pass the readiness gate — potentially blocking packages that were previously ready.

## Business Rules

- **This page grants itself admin privileges unconditionally.** Line 321 reads `const isAdmin = true // TODO: wire to session.user.role`. Every admin-only control — including per-version Restore — renders for any signed-in user who reaches this URL. The underlying API routes do enforce the admin permission, so the actions fail with 403 rather than succeeding; the practical effect is a misleading UI, not a privilege escalation. See [G11](../appendix/gaps-and-open-questions.md#g11--county-detail-hardcodes-isadmin--true).
- **Editing requirements does not retroactively fix existing packages.** Checklist items are snapshots created at generation time. A new requirement appears on an existing package only after someone clicks Regenerate on that package, and there is no bulk regeneration and no notification that packages are now out of date.
- **Deletion is soft when a requirement is in use.** A requirement referenced by any checklist item is deactivated rather than deleted, so live packages keep their history.
- **Every change is fully reversible.** The full-snapshot-per-change design means any requirement can be restored to any prior state — the strongest audit story in the system.
- **`["*"]` is a wildcard, not a permit type.** `requirementAppliesToPermitType()` treats it as matching everything; a malformed `permitTypes` JSON string causes the requirement to silently match nothing.
- **Tightening the gate can strand packages.** Flipping `Blocks gate` on for an existing requirement immediately makes every package missing that document unable to enter review, with no warning of how many are affected.
