# Export Profiles

> **Route:** `/admin/export-profiles`
> **Module:** Administration
> **Access:** **Admin only** — enforced in the page component (redirects to `/dashboard`)
> **Source:** [app/admin/export-profiles/page.tsx](../../app/admin/export-profiles/page.tsx), [lib/export-engine.ts](../../lib/export-engine.ts)

## Overview

Manages the templates that control how a permit package is assembled into a ZIP for county submission — folder layout, file naming, and whether a manifest is included. Counties differ in how they want a submission organized, so a profile can be bound to a jurisdiction and becomes the default for its packages.

One of only three pages with a real role check.

## Layout

```
┌─ Export Profiles ─────────────── [+ New Profile] ─┐
│ Jurisdiction-specific ZIP assembly templates      │
│                                                   │
│ REGISTER — 3 PROFILES                             │
│ Profile │ Jurisdiction │ Description │ Exports │  │
│ Hills. Standard [DEFAULT] │ Hillsborough │ … │ 42 exports │ Edit
└───────────────────────────────────────────────────┘
```

## Fields

### Register table

| Column | Content | Notes |
|--------|---------|-------|
| Profile | Name, plus a `DEFAULT` chip | Bold |
| Jurisdiction | Bound jurisdiction name, or em dash for a global profile | |
| Description | Clamped to 2 lines | |
| Exports | Count of `ExportLog` rows using this profile | Usage signal |
| Edit | Link → `/admin/export-profiles/{id}` | **Target does not exist** |

Ordered defaults first, then alphabetically by name.

### Profile data model (not editable through any UI — see Business Rules)

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| Name | Text | — | Profile label; also embedded in the ZIP filename |
| Jurisdiction | Relation | null | Binds the profile to a county; null = global |
| Description | Text | — | |
| Is default | Boolean | false | Auto-selected for matching packages |
| Folder structure | JSON | `[]` | Array of `{folder, categories[]}` rules mapping document categories into ZIP folders |
| File naming pattern | Text | `{category}_{fileName}` | Supports `{category}`, `{fileName}`, `{version}` |
| Include manifest | Boolean | true | Whether to add `MANIFEST.txt` |

### Empty state
A package icon with "No export profiles yet", the line "Create profiles to control how permit packages are zipped for submission", and a "Create first profile" button.

## Interactions

### Page load
Server-side Prisma query for all profiles with their jurisdiction name and export count. Non-admins are redirected to `/dashboard` before anything renders.

### New Profile / Edit
Both are links to routes that **do not exist** — see Business Rules.

### How a profile is actually applied (permit detail → Download All as ZIP)
The export engine resolves a profile in this order:
1. An explicitly passed profile ID
2. The default profile for the package's jurisdiction
3. The global default profile (`jurisdictionId = null`, `isDefault = true`)
4. No profile — flat layout, default naming, manifest included

Then it streams every document into the archive, routing each by category into its folder rule (falling back to the **last** rule when no category matches), sanitizing filenames, and appending a `MANIFEST.txt` containing package, address, customer, contractor + license, jurisdiction, permit type, permit number, export timestamp, profile name, and a per-document line marked `[✓]` when verified. A document missing from storage is recorded as `[!] … MISSING FROM STORAGE` rather than failing the export.

Finally it writes an `ExportLog` row (filename, size, SHA-256 checksum, status `GENERATED`), a `PackageExported` activity entry, and touches `lastActivityAt`.

The ZIP filename is `{ProjectName}_{ProfileName}_{YYYY-MM-DD}.zip` with non-alphanumerics replaced by underscores.

## API Dependencies

Page data is server-side Prisma. The CRUD endpoints exist but have no UI:

| API | Method | Path | Notes |
|-----|--------|------|-------|
| List profiles | GET | `/api/export-profiles` | Admin/coordinator read |
| Create profile | POST | `/api/export-profiles` | **Admin** — no UI calls it |
| Get profile | GET | `/api/export-profiles/{id}` | **Admin** — no UI calls it |
| Update profile | PATCH | `/api/export-profiles/{id}` | **Admin** — no UI calls it |
| Delete profile | DELETE | `/api/export-profiles/{id}` | **Admin** — no UI calls it |

## Page Relationships

- **From:** "Export Profiles" item in the admin nav
- **To:** `/admin/export-profiles/new` and `/admin/export-profiles/{id}` — **both 404**
- **Data coupling:** Profiles are consumed by the permit detail "Download All as ZIP" action. Changing a jurisdiction's default profile changes the ZIP structure for every subsequent export of its packages.

## Business Rules

- **This screen is read-only in practice.** Every button and link on it — "New Profile", "Create first profile", and each row's "Edit" — points to `/admin/export-profiles/new` or `/admin/export-profiles/{id}`, and **neither route exists**; the directory contains only `page.tsx`. Profiles can therefore only be created or modified by calling the API directly or by seeding the database. See [G14](../appendix/gaps-and-open-questions.md#g14--export-profile-createedit-pages-do-not-exist).
- **Nothing enforces a single default.** `isDefault` is a plain boolean with no uniqueness constraint, so multiple defaults can exist for one jurisdiction; the engine's `findFirst` then picks arbitrarily.
- **An unmatched document category lands in the last folder rule**, not in the archive root — so a rule list ending in a specific folder like `05_Certificates` silently becomes the catch-all.
- **`ExportLog.status` tracks `GENERATED` / `DOWNLOADED` / `SUBMITTED`, but only `GENERATED` is ever written.** `downloadedAt` is never set. The submission-tracking capability the schema anticipates is unimplemented.
- **Export requires at least one document** — the engine throws "No documents to export" on an empty package, which surfaces as a generic download failure on the permit screen.
