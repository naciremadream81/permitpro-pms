# Jurisdictions

> **Route:** `/admin/jurisdictions`
> **Module:** Administration
> **Access:** Reachable by any signed-in user; no page-level role check
> **Source:** [app/admin/jurisdictions/page.tsx](../../app/admin/jurisdictions/page.tsx)

## Overview

The register of jurisdiction records that actually exist in the database — as opposed to `/admin/counties`, which lists all 67 Florida counties whether configured or not. This screen is where a jurisdiction is activated or deactivated, and it is the route into the requirement editor.

## Layout

```
┌─ Jurisdictions ────────── [+ Add Jurisdiction] ─┐
│ Manage counties and their permit document …     │
│                                                 │
│ □ Show inactive                                 │
│                                                 │
│ REGISTER — 12 JURISDICTIONS                     │
│ County │ Code │ State │ Reqs │ Pkgs │ Active │  │
│ Hillsborough │ HIL │ FL │ 14 │ 8 │ ✓ │ Manage →│
└─────────────────────────────────────────────────┘
```

## Fields

| Control | Type | Default | Behavior |
|---------|------|---------|----------|
| Show inactive | Checkbox | unchecked | Unchecked sends `?isActive=true`; checked omits the filter and returns everything |

### Register table

| Column | Content | Notes |
|--------|---------|-------|
| County | Jurisdiction name | Bold |
| Code | `countyCode` | Monospace; unique across the system |
| State | Two-letter code | Defaults to `FL` |
| Requirements | Count | Right-aligned |
| Packages | Count | Right-aligned — how many permits reference this jurisdiction |
| Active | Toggle icon | Green check when active, grey X when not; click toggles |
| Manage | Link | → `/admin/jurisdictions/{id}` |

## Interactions

### Page load
`GET /api/jurisdictions` with `isActive=true` unless "Show inactive" is checked. Re-fetches whenever the checkbox changes.

### Toggle active
`PATCH /api/jurisdictions/{id}` with the inverted `isActive`, then re-fetch. Tooltip reads "Click to deactivate" / "Click to activate".

### Empty state
A map-pin icon with "No jurisdictions configured" and "Add your first jurisdiction to enable checklist generation."

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| List jurisdictions | GET | `/api/jurisdictions?isActive=` | Mount, checkbox change | Includes requirement and package counts |
| Update jurisdiction | PATCH | `/api/jurisdictions/{id}` | Active toggle | **Admin** — `update` on `jurisdiction` |

## Page Relationships

- **From:** "Jurisdictions" item in the admin nav
- **To:** `/admin/jurisdictions/new`, `/admin/jurisdictions/{id}`
- **Overlap:** Functionally overlaps `/admin/counties` — both list jurisdictions and both route into requirement editing, via different detail screens (`/admin/counties/{code}` vs `/admin/jurisdictions/{id}`). Two independently-built paths to the same catalog.

## Business Rules

- **Deactivating a jurisdiction stops new checklist generation but does not touch existing packages.** The checklist engine only queries active jurisdictions' active requirements. Packages already linked keep their checklist items and their `jurisdictionId`.
- **Deactivating removes it from the permit detail picker.** The permit screen loads `?state=FL` without an `isActive` filter — but the checklist engine still requires the requirements to be active, so a package linked to a deactivated jurisdiction will regenerate to an empty checklist.
- **The active toggle is admin-only at the API but always rendered.** A non-admin who reaches this page sees clickable toggles that fail with 403.
- **The `jurisdictionUpdateSchema` is deliberately hand-written rather than derived** from the create schema, because Zod would re-apply the `state: 'FL'` and `isActive: true` defaults on a partial update — silently reactivating a jurisdiction that was only meant to have its notes changed. The code carries an explicit comment about this.
