# Permit Types

> **Route:** `/admin/counties/permit-types`
> **Module:** Administration
> **Access:** Reachable by any signed-in user; no page-level role check
> **Source:** [app/admin/counties/permit-types/page.tsx](../../app/admin/counties/permit-types/page.tsx)

## Overview

Manages the permit-type vocabulary — the list of work categories (Building, Electrical, Roofing…) that packages are classified by and that requirements are scoped to. Types are split into **built-in** (mirroring the database enum, deactivatable but not deletable) and **custom** (admin-created, fully deletable).

## Layout

```
┌─ Permit Types ──────────────── [+ New Type] ─┐
│                                              │
│ [NEW PERMIT TYPE form, when open]            │
│                                              │
│ BUILT-IN TYPES                               │
│ Building     ● Active   [toggle]             │
│ Electrical   ● Active   [toggle]             │
│ …                                            │
│                                              │
│ CUSTOM TYPES                                 │
│ Dock         ● Active   [toggle] [delete]    │
└──────────────────────────────────────────────┘
```

## Fields

### New permit type form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Code | Text | Yes | Immutable identifier; unique. Matches an enum value or a custom slug |
| Label | Text | Yes | Display name |
| Description | Text | No | |
| Order | Number | No | Display ordering |

### Type row

| Element | Built-in | Custom |
|---------|----------|--------|
| Code + label | Shown | Shown |
| Active toggle | **Yes** | Yes |
| Delete | **No** | Yes |

## Interactions

### Page load
`GET /api/admin/permit-types`.

### Create
`POST /api/admin/permit-types` with `isBuiltIn` false.

### Toggle active
`PATCH /api/admin/permit-types/{id}` with the inverted `isActive`.

### Delete
`DELETE /api/admin/permit-types/{id}` — offered only for custom types.

### Seed
This page also calls `POST /api/admin/counties/seed`, which upserts the built-in type definitions as part of the county seeding batch.

## API Dependencies

| API | Method | Path | Notes |
|-----|--------|------|-------|
| List permit types | GET | `/api/admin/permit-types` | |
| Create permit type | POST | `/api/admin/permit-types` | |
| Update permit type | PATCH | `/api/admin/permit-types/{id}` | |
| Delete permit type | DELETE | `/api/admin/permit-types/{id}` | Custom only |
| Seed counties | POST | `/api/admin/counties/seed` | Upserts built-in definitions |

## Page Relationships

- **From:** `/admin/counties` "Permit types" button
- **To:** Nothing — a leaf page

## Business Rules

- **`PermitTypeDefinition` is a parallel vocabulary, not the source of truth.** The `PermitType` **enum** in the database schema is what `PermitPackage.permitType` actually stores and what requirement matching compares against. This table mirrors and extends it for admin management, but nothing reconciles the two.
- **Custom permit types cannot be used on a permit.** Every permit-type dropdown in the app — New Permit, permit detail, requirement scoping — is a **hardcoded list of the nine enum values**. A custom type created here appears nowhere else, and a package could not store it even if offered, because the column is a database enum. See [G12](../appendix/gaps-and-open-questions.md#g12--custom-permit-types-cannot-be-used-anywhere).
- **Deactivating a built-in type has no effect on those dropdowns either** — they don't consult this table. A deactivated `Roofing` is still fully selectable on a new permit.
- **The practical value of this screen today is the audit trail and labels**, not runtime behavior.
