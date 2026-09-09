# Permit Detail

> **Route:** `/permits/[id]`
> **Module:** Permits
> **Access:** All roles — controls vary by role
> **Source:** [app/permits/[id]/page.tsx](../../app/permits/[id]/page.tsx), [permit-detail-client.tsx](../../app/permits/[id]/permit-detail-client.tsx)

## Overview

The system's primary workspace. Everything about one permit package lives here: its facts, the county's document checklist, the internal review, the parcel record, tasks, documents, the audit trail, and an AI package check. A coordinator assembles a package here; a reviewer signs it off here; a coordinator submits it to the county from here.

Returns 404 if the ID doesn't resolve.

## Layout

Eight stacked full-width sections, each led by a ruled header. No tabs — it is one long scroll.

```
┌─ PERMIT-2026-0142 ──────────────────────────────┐
│ Riverside Plaza Renovation      [Issued][Billed]│  ← header: number / name / address + badges
│ 1420 Riverside Dr, Tampa FL                     │
├─────────────────────────────────────────────────┤
│ OVERVIEW                                        │  1. facts, inline-editable
│ Customer · Contractor · Type · Permit No.       │
│ Status · Billing · Opened · Target · County     │
│ Jurisdiction Notes · Billing Notes              │
├─────────────────────────────────────────────────┤
│ COUNTY CHECKLIST  67% complete    [Regenerate]  │  2. generated from requirements
├─────────────────────────────────────────────────┤
│ REVIEW  [IN REVIEW]          [Submit to county] │  3. internal QA gate
├─────────────────────────────────────────────────┤
│ PROPERTY — APPRAISER ROLL                       │  4. FL parcel lookup
├─────────────────────────────────────────────────┤
│ TASKS                              [Add Task]   │  5.
├─────────────────────────────────────────────────┤
│ DOCUMENTS (7)   [Download All as ZIP] [Upload]  │  6.
├─────────────────────────────────────────────────┤
│ ACTIVITY LOG                                    │  7. last 50 entries
├─────────────────────────────────────────────────┤
│ AI PACKAGE CHECK                   [Run Check]  │  8.
└─────────────────────────────────────────────────┘
```

## Fields

### Section 1 — Overview

Two-column grid. Each editable field shows its value with a ghost **Edit** button; clicking swaps in an input plus Save/Cancel. One field at a time.

| Field | Type | Editable | Options | Notes |
|-------|------|----------|---------|-------|
| Customer | Link | No | — | → `/customers/{id}` |
| Contractor | Link | No | — | → `/contractors/{id}` |
| Permit Type | Select | **Yes** | 9 permit types | Changing it does **not** auto-resync the checklist — use Regenerate |
| Permit Number | Text | **Yes** | — | County-assigned. Shows "Not assigned" when empty |
| Status | Select | **Yes** | All 9 statuses **including `Canceled`** | ⚠️ Writes via generic PATCH — bypasses the readiness gate. See Business Rules |
| Billing Status | Select | **Yes** | Not Sent, Sent to Billing, Billed, Paid | |
| Opened Date | Date | No | — | Read-only, set at creation |
| Target Issue Date | Date | **Yes** | — | Empty → "Not set"; absence is a readiness warning |
| County / Jurisdiction | Select | **Yes** | Active FL jurisdictions as `Name (CODE)` | **This is what enables the checklist.** Sets `jurisdictionId` |
| Jurisdiction Notes | Textarea | **Yes** | — | Full-width |
| Billing Notes | Textarea | **Yes** | — | Full-width |

### Section 2 — County Checklist

Header shows `{n}% complete` when items exist, and a **Regenerate** button (disabled when no jurisdiction is linked).

| Per-item element | Content |
|------------------|---------|
| Document name | From the requirement |
| `Required` chip | When `requirement.isRequired` |
| `Blocks gate` chip | When `requirement.isMandatoryForSubmission` — warns that this item blocks review |
| Category + linked file | Category name; if a document is attached, its filename as a download link |
| Status pill | PENDING / UPLOADED / VERIFIED / REJECTED / WAIVED / NOT APPLICABLE |
| "Link doc…" select | Attach an already-uploaded package document. Only rendered when the package has documents |
| Upload / Replace | File picker that uploads and links in one action |

Four empty/blocked states: no jurisdiction ("pick a county in the Overview above"), loading, no matching requirements, or the item list.

### Section 3 — Review

| Element | Visible to | Condition |
|---------|-----------|-----------|
| Status pill | All | When any assignment exists |
| "Ready to submit" green banner | All | `internalStage = ReadyToSubmit`. Wording differs for those who can vs. can't submit |
| **Submit to county** | admin, coordinator | `internalStage = ReadyToSubmit` |
| Reviewer name + due date | All | When any assignment exists |
| **Start review** | admin, reviewer | Active assignment is `ASSIGNED` |
| **Approve** | admin, reviewer | Active assignment is `IN_REVIEW` |
| **Send back** | admin, reviewer | Any active assignment |
| Send-back note textarea | admin, reviewer | After clicking Send back. **Min 5 characters** before the confirm button enables |
| Send-to-review panel (reviewer select + optional due date) | **admin only** | No active assignment and not already ready to submit |
| Blocker list + "Override & assign anyway" | **admin only** | After a 422 from the assign attempt |
| Review comments list | All | When comments exist |

### Section 4 — Property (Appraiser Roll)

On-demand lookup against the Florida statewide cadastral layer, keyed off the project address. Returns parcel ID, owner, site address, city, ZIP, DOR use code and label, year built, just (market) value, and legal description. Nothing is persisted — this is a live read every time.

Three outcomes: a single confident parcel; a list of candidate addresses to choose from; or a list of candidate parcels (when the geocoder snapped to a street centerline).

### Section 5 — Tasks

Add-task form fields:

| Field | Type | Required | Default | Options |
|-------|------|----------|---------|---------|
| Task Name | Text | **Yes** | — | `e.g., Submit application to county` |
| Description | Textarea (2 rows) | No | — | |
| Assigned To | Text | No | — | **Free text** — "Name or email", not a user picker |
| Due Date | Date | No | — | |
| Priority | Select | No | `medium` | low, medium, high |

Each task row shows name, description, assignee, priority chip, status badge, due date, and an inline status select (Not Started / In Progress / Waiting / Completed) that saves on change.

### Section 6 — Documents

Upload form fields:

| Field | Type | Required | Default | Options |
|-------|------|----------|---------|---------|
| File | File | **Yes** | — | 50 MB max; pdf/jpg/jpeg/png/gif/doc/docx/xls/xlsx/txt, magic-byte verified |
| Category | Select | **Yes** | `Application` | Application, Plans, Specifications, Correspondence, **Permit**, Inspection, Certificate, Other |
| Notes/Labels | Textarea (2 rows) | No | — | |
| Required Document | Checkbox | No | unchecked | |

> ⚠️ The category dropdown offers **`Permit`**, which is not a valid `DocumentCategory`, and omits **`Engineering`** and **`Photos`**, which are. Selecting `Permit` fails server-side Zod validation. See [G4](../appendix/gaps-and-open-questions.md#g4--document-category-dropdown-does-not-match-the-enum).

Each document card shows filename, category chip, version tag chip, upload timestamp + uploader, status badge, a Download button, and an editable notes area.

### Section 7 — Activity Log
Flat reverse-chronological list, **capped at 50 entries**, each showing description, timestamp, and user name (or "System"). Read-only, no filtering, no pagination.

### Section 8 — AI Package Check
Collapsible panel. Idle → "Run Check" button. Streams a markdown-ish review (headings, bullets, numbered lists) token by token via SSE. Re-run and collapse controls appear once run. On failure: "Review failed. Check that ANTHROPIC_API_KEY or GOOGLE_AI_API_KEY is set."

## Interactions

### Page load
The server component fetches the package with customer, contractor, jurisdiction, documents (+uploader, newest first), tasks (by status then due date), and the 50 latest activity logs, serializing all dates to ISO strings for the client.

The client then fires four independent requests: active FL jurisdictions for the picker, the checklist, the session (to learn the role), and the user list filtered to reviewers and admins. It also re-fetches the checklist whenever `jurisdictionId` changes.

### Edit a field
Click Edit → input appears (dates converted to `YYYY-MM-DD`) → Save PATCHes `{field: value}` (empty string becomes `null`) → re-fetch the package → exit edit mode. Cancel discards.

### Regenerate the checklist
`POST /api/permits/{id}/checklist` then re-fetch. Idempotent — existing items for the same requirement are never duplicated. Disabled with no jurisdiction.

### Link a document to a checklist item
Selecting from "Link doc…" PATCHes `{documentId, status: 'UPLOADED'}`; choosing the blank option PATCHes `{documentId: null, status: 'PENDING'}`.

### Upload directly into a checklist item
Picks the file → uploads to the package with the **requirement's own category** and an auto note `Checklist: {documentName}` and the requirement's `isRequired` flag → links the new document to the item as `UPLOADED` → refreshes both checklist and package so the Documents section reflects it too.

### Assign a reviewer (admin)
1. `POST /api/permits/{id}/review` with `{reviewerId, dueDate?}`
2. **422 response** → the readiness blockers are rendered as a warning list with an **Override & assign anyway** button
3. Override re-posts with `{overrideReadiness: true, overrideReason: 'Admin override from permit page'}`, which requires the `override_readiness` permission and writes a `ReadinessOverridden` activity entry containing the reason and every blocker
4. Success → assignment created as `ASSIGNED`, package `internalStage` set to `InProgress`, `ReviewAssigned` logged

### Reviewer actions
- **Start** → assignment `IN_REVIEW`, `startedAt` stamped, `ReviewStarted` logged
- **Approve** → a single transaction: assignment `APPROVED` + `completedAt`; **every `Pending` document on the package flips to `Verified`**; **every `UPLOADED` checklist item flips to `VERIFIED`**; package `internalStage` → `ReadyToSubmit`. Then `ReviewApproved` logged with the verified-document count
- **Send back** → requires a note of 5+ characters (server rejects shorter with 400); assignment `SENT_BACK` + `completedAt`; **the note becomes a `ReviewComment`**; package `internalStage` → `InProgress`; `ReviewSentBack` logged

An admin may act on any active assignment; a reviewer only on one assigned to them.

### Submit to county
`POST /api/permits/{id}/submit`. Requires the `submit_review` permission (admin/coordinator) and **`internalStage = ReadyToSubmit`** — otherwise 422 "Package is not ready to submit — it must pass review first". On success: `status` → `Submitted`, `internalStage` → `WaitingOnCounty`, `lastActivityAt` touched, `StatusChange` logged.

### Download all as ZIP
Fetches the archive as a blob, reads the filename from `Content-Disposition`, and triggers a synthetic anchor click. The server assembles it with the export engine: an `ExportProfile` (jurisdiction-specific default, else global default, else flat) controls folder layout and file naming, and a `MANIFEST.txt` lists every document with a verified checkmark. An `ExportLog` row and a `PackageExported` activity entry are written, with a SHA-256 checksum of the archive. Documents missing from storage are noted in the manifest as `[!] … MISSING FROM STORAGE` rather than failing the export.

### Property lookup
Two-step by necessity: the cadastral layer rejects WHERE clauses on address fields, so the address is geocoded to a point (ArcGIS World Geocoder, no key) and then the layer is asked which parcel polygon contains it. When the point misses (geocoders often snap to the street centerline), a ~60 m envelope is searched and the house number from the geocoded address disambiguates; genuinely ambiguous results are handed to the user to pick.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| Get permit | GET | `/api/permits/{id}` | Every refresh after a mutation | |
| Update permit | PATCH | `/api/permits/{id}` | Save any inline field | Auth only — no role check |
| Get checklist | GET | `/api/permits/{id}/checklist` | Mount, jurisdiction change, after any checklist mutation | Returns items + `completionPct` |
| Generate checklist | POST | `/api/permits/{id}/checklist` | Regenerate | Idempotent |
| Update checklist item | PATCH | `/api/permits/{id}/checklist/{itemId}` | Link/unlink, status change | Waiver path is **admin only** |
| Upload document | POST | `/api/permits/{id}/documents` | Upload form, checklist upload | multipart/form-data |
| Update document | PATCH | `/api/documents/{id}` | Save notes | |
| Download document | GET | `/api/documents/{id}/download` | Download button, checklist filename link | |
| Download all | GET | `/api/permits/{id}/documents/download-all` | ZIP button | Streams a ZIP |
| Create task | POST | `/api/permits/{id}/tasks` | Create Task | |
| Update task | PATCH | `/api/tasks/{id}` | Inline status select | |
| List review assignments | GET | `/api/permits/{id}/review` | Mount, after review actions | |
| Assign / act on review | POST | `/api/permits/{id}/review` | Assign, start, approve, send back | 422 carries `blockers` + `warnings` |
| Submit to county | POST | `/api/permits/{id}/submit` | Submit button | |
| Session | GET | `/api/auth/session` | Mount | Reads the role for conditional UI |
| List users | GET | `/api/users` | Mount | **Admin-only endpoint** — fails silently for others, so the reviewer dropdown is simply empty |
| AI validate | POST | `/api/ai/validate` | Run Check | SSE stream |
| List jurisdictions | GET | `/api/jurisdictions?state=FL` | Mount | Picker options |
| ArcGIS geocoder | GET | `geocode.arcgis.com/.../findAddressCandidates` | Property lookup | **External, browser-side, no key** |
| FL cadastral layer | GET | `services9.arcgis.com/.../Florida_Statewide_Cadastral/…/query` | Property lookup | **External, browser-side, no key** |

## Page Relationships

- **From:** Operations Board rows and reviewer queue; `/permits` register; `/customers/{id}` and `/contractors/{id}` package lists; `/review-queue` "Open"; Reports pipeline and stalled rows; `/permits/new` after creation
- **To:** `/customers/{id}`, `/contractors/{id}`, document download endpoints
- **Data coupling:** Mutations here touch `lastActivityAt`, which drives the Operations Board ordering, stall notices, the pipeline/stalled reports, and the nightly snapshot. Approving a review changes both document statuses and checklist statuses at once, which the Reports "verified %" and checklist % both read.

## Business Rules

- **The Status dropdown bypasses the readiness gate.** Inline Status edits go through the generic `PATCH /api/permits/{id}`, not `POST /api/permits/{id}/status` — the endpoint that actually enforces readiness, requires an admin reason for overrides, logs stage changes separately, and auto-creates the "Send to Billing" task on approval. **None of that fires from this screen.** A coordinator can set any status, including `Submitted` or `Canceled`, with no gate and no automation. This is the most significant behavioral divergence found. See [G2](../appendix/gaps-and-open-questions.md#g2--the-status-dropdown-bypasses-the-readiness-gate-and-its-automation).
- **Approval is the verification step.** Documents stay `Pending` through assembly and are bulk-verified on approval. This is why an unverified mandatory document is only a readiness *warning*, not a blocker — verification is downstream of the gate, by design.
- **Send back does not set `RevisionsNeeded`.** It moves `internalStage` to `InProgress` and leaves `status` untouched, so a sent-back package keeps whatever status it had. The `RevisionsNeeded` status exists and maps to the `us` court, but nothing in the review flow assigns it. `[TBC]` — likely intended to be set here.
- **Changing Permit Type does not resync the checklist.** A `syncChecklist()` function exists that prunes no-longer-applicable `PENDING` items and adds new ones, but this screen only ever calls `generateChecklist()` (additive). Switching from Roofing to Building leaves the old roofing items in place. Verified/waived items are never touched by either function.
- **Checklist completion counts an item done once a document is attached**, not once verified — `UPLOADED`, `VERIFIED`, `WAIVED`, and `NOT_APPLICABLE` all count. This definition is duplicated in three places (checklist engine, readiness engine, snapshot job) and the code carries comments insisting they stay aligned.
- **Waiving a checklist item is admin-only and requires a reason of at least 10 characters.** There is no UI for it on this screen — the status pill is display-only and the select only sets UPLOADED/PENDING. Waiving is API-only today.
- **Version tags are derived, not chosen.** Uploading a file whose name and category match an existing document tags it `v2`, `v3`, and so on. A separate explicit versioning path exists in the API (`isNewVersion` + `parentDocumentId` building a `versionGroupId`) but **no UI sends those fields**.
- **Task assignees are free text.** Not linked to `User`, so tasks cannot be queried per assignee reliably and there are no assignee notifications.
- **The reviewer dropdown depends on an admin-only endpoint.** `GET /api/users` requires admin, and the fetch swallows its error — which is harmless only because the send-to-review panel is itself admin-only.
- **Property data is never saved.** Every visit re-queries two external services, both unauthenticated and unthrottled from the browser. Source comments note persistence is pending a schema field.
- **The activity log is capped at 50 entries with no way to see more.** On a long-running package the early history is simply unreachable in the UI.
