# API Inventory

All 49 route files under `app/api/`. **Auth** column: `Session` = authenticated only, no role check; `Permission` = the permission matrix is enforced via `enforce()`; `Admin` = admin required; `Secret` = shared-secret header.

> ⚠️ **Read the [G1 finding](./gaps-and-open-questions.md#g1--permission-matrix-is-not-enforced-on-most-write-routes) before treating this table as the security model.** Most core write endpoints are `Session` only, meaning a `reviewer` can perform coordinator-only actions through the API.

---

## Authentication

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET/POST | `/api/auth/[...nextauth]` | Public | NextAuth handlers — sign-in, sign-out, session |

`GET /api/auth/session` is used by the permit detail and review queue screens to read the caller's role for conditional UI.

---

## Permits

| Method | Path | Auth | Params / Body | Notes |
|--------|------|------|---------------|-------|
| GET | `/api/permits` | Session | `search`, `status`, `internalStage`, `permitType`, `county`, `billingStatus`, `customerId`, `contractorId`, `page`, `limit` (default 50) | Returns `{data, pagination}`. Includes next open task per package |
| POST | `/api/permits` | **Session** | `permitPackageSchema` | ⚠️ No role check. Creates package, logs activity, sets `lastActivityAt`, generates the checklist **only if `jurisdictionId` is set** |
| GET | `/api/permits/{id}` | Session | — | Full package with customer, contractor, jurisdiction, documents, tasks, activity logs |
| PATCH | `/api/permits/{id}` | **Session** | Partial package | ⚠️ No role check. **The inline-edit path — bypasses the readiness gate and all status automation** |
| DELETE | `/api/permits/{id}` | Session | — | ⚠️ Matrix says admin-only; not enforced |
| POST | `/api/permits/{id}/status` | **Permission** | `permitStatusUpdateSchema` | **The gated status path.** Enforces readiness on `→ ReadyToSubmit`, requires admin + reason to override, logs status and stage separately, auto-creates the "Send to Billing" task on `Approved`. **No UI calls this** |
| POST | `/api/permits/{id}/submit` | **Permission** (`submit_review`) | — | Requires `internalStage = ReadyToSubmit` else 422. Sets `Submitted` / `WaitingOnCounty` |
| GET | `/api/permits/{id}/readiness` | Session | — | Returns `{isReady, blockers[], warnings[], checklistPct}` without mutating |
| POST | `/api/permits/bulk` | **Permission** (`bulk`) | `reassign_coordinator` \| `update_stage` \| `add_task`, max 100 IDs | Writes one activity log per affected package. **No UI calls this** |

## Permit checklist

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/permits/{id}/checklist` | Session | Items with requirement and document, plus `completionPct` |
| POST | `/api/permits/{id}/checklist` | Session | Generates from active jurisdiction requirements matching the permit type. Idempotent |
| PATCH | `/api/permits/{id}/checklist/{itemId}` | **Permission** | `update` on `checklist` for normal edits; **`waive_item` (admin) when `status=WAIVED` or `waiverReason` present** (min 10 chars). Touches `lastActivityAt` |

## Permit documents

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/permits/{id}/documents` | Session | Returns flat `data` plus `grouped` by category |
| POST | `/api/permits/{id}/documents` | **Session** | multipart: `file`, `category`, `notes`, `isRequired`, `isNewVersion`, `parentDocumentId`. ⚠️ No role check. 50 MB cap, magic-byte validation, auto version tag (`v2`, `v3`…) |
| GET | `/api/permits/{id}/documents/download-all` | Session | Streams a ZIP via the export engine; writes an `ExportLog` + `PackageExported` activity |

## Permit tasks & review

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/permits/{id}/tasks` | Session | |
| POST | `/api/permits/{id}/tasks` | **Session** | ⚠️ No role check |
| GET | `/api/permits/{id}/review` | Session | Assignments with reviewer, comments, and comment documents |
| POST | `/api/permits/{id}/review` | **Permission** | Two modes — see below |

### `POST /api/permits/{id}/review` — the review state machine

**Assign mode** (body has `reviewerId`): requires `assign_reviewer` (**admin**). Runs `evaluateReadiness()`; **422 with `{blockers, warnings}`** when not ready. `overrideReadiness: true` additionally requires `override_readiness` (admin) and writes a `ReadinessOverridden` log with the reason and blockers. Creates the assignment as `ASSIGNED` and sets stage `InProgress`.

**Action mode** (body has `action`): `start` | `approve` | `send_back`. A reviewer may act only on their own active assignment; an admin on any.
- `start` → `IN_REVIEW`, stamps `startedAt`
- `approve` → one transaction: assignment `APPROVED`; **all `Pending` documents → `Verified`**; **all `UPLOADED` checklist items → `VERIFIED`**; package stage → `ReadyToSubmit`
- `send_back` → requires a note of 5+ chars (400 otherwise); assignment `SENT_BACK`; **the note becomes a `ReviewComment`**; stage → `InProgress`

---

## Documents (global)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/documents/{id}` | Session | |
| PATCH | `/api/documents/{id}` | Permission | Category, notes, `isRequired`, `isVerified`, status |
| DELETE | `/api/documents/{id}` | Permission | |
| GET | `/api/documents/{id}/download` | Session | Attachment download |
| GET | `/api/documents/{id}/preview` | Session | Inline preview |
| POST | `/api/documents/{id}/verify` | Session | `{isVerified, notes}` — reviewers may verify. **No UI calls this** |

## Tasks (global)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| PATCH | `/api/tasks/{id}` | Session | Used by the permit detail inline status select |
| DELETE | `/api/tasks/{id}` | Session | **No UI calls this** |

---

## Customers & Contractors

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/customers` | Session | `search` param — used by the New Permit find-or-create |
| POST | `/api/customers` | **Session** | ⚠️ No role check |
| GET | `/api/customers/{id}` | Session | |
| PATCH | `/api/customers/{id}` | Permission | |
| DELETE | `/api/customers/{id}` | Permission (**admin**) | ⚠️ **Cascades to all the customer's permit packages** |
| GET | `/api/contractors` | Session | Feeds the New Permit dropdown |
| POST | `/api/contractors` | **Session** | ⚠️ No role check |
| GET | `/api/contractors/{id}` | Session | |
| PATCH | `/api/contractors/{id}` | Permission | |
| DELETE | `/api/contractors/{id}` | Permission (**admin**) | ⚠️ **Cascades to all the contractor's permit packages** |

## Contractor compliance vault

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/contractors/{id}/documents` | Permission | Returns documents with a **computed `expiryStatus`** (`valid`/`expiring_soon`/`expired`/`unknown`) |
| POST | `/api/contractors/{id}/documents` | Permission | multipart: `file`, `type`, `documentName`, `issueDate`, `expirationDate`. ⚠️ Does **not** mark the prior document superseded |
| GET | `/api/contractor-documents/{id}` | Permission | |
| PATCH | `/api/contractor-documents/{id}` | Permission | Name, dates, status, `isVerified`, notes, `isSuperseded` |
| DELETE | `/api/contractor-documents/{id}` | Permission (**admin**) | |

---

## Jurisdictions & Requirements

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/jurisdictions` | Session | `state`, `isActive`. Includes requirement + package counts |
| POST | `/api/jurisdictions` | Permission (**admin**) | |
| GET | `/api/jurisdictions/{id}` | Session | Includes requirements |
| PATCH | `/api/jurisdictions/{id}` | Permission (**admin**) | Hand-written partial schema to avoid Zod re-applying defaults |
| DELETE | `/api/jurisdictions/{id}` | Permission (**admin**) | |
| GET | `/api/jurisdictions/{id}/requirements` | Session | |
| POST | `/api/jurisdictions/{id}/requirements` | Permission (**admin**) | Unique on `(jurisdictionId, documentName, permitTypes)` |
| PATCH | `/api/requirements/{id}` | Permission (**admin**) | Writes a `RequirementChangeLog` **per changed field**, each with a full JSON snapshot |
| DELETE | `/api/requirements/{id}` | Permission (**admin**) | **Deactivates instead of deleting when checklist items reference it** |
| GET | `/api/requirements/{id}/history` | Session | Change log for the version drawer |
| POST | `/api/requirements/{id}/restore` | Session | Restores from a snapshot |

## Administration

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/admin/counties/seed` | **Admin** (explicit `role !== 'admin'` → 403) | Creates a `SeedBatch`, upserts permit-type definitions, creates missing jurisdictions, inserts requirements, skipping existing. Every insert logged against the batch as `"system"` |
| GET | `/api/admin/permit-types` | Session | |
| POST | `/api/admin/permit-types` | Session | Creates a custom type (`isBuiltIn: false`) |
| PATCH | `/api/admin/permit-types/{id}` | Session | |
| DELETE | `/api/admin/permit-types/{id}` | Session | Custom types only |

## Export profiles

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/export-profiles` | Permission | |
| POST | `/api/export-profiles` | Permission (**admin**) | ⚠️ **No UI calls this — the create page doesn't exist** |
| GET | `/api/export-profiles/{id}` | Permission (**admin**) | ⚠️ No UI |
| PATCH | `/api/export-profiles/{id}` | Permission (**admin**) | ⚠️ No UI. Hand-written partial schema to preserve custom folder layouts |
| DELETE | `/api/export-profiles/{id}` | Permission (**admin**) | ⚠️ No UI |

---

## Review workflow (cross-package)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/review-queue` | Session | All assignments, firm-wide, with reviewer/package/comments. Optional `status` param (unused by the UI) |
| GET | `/api/review-assignments/{id}/comments` | Permission | |
| POST | `/api/review-assignments/{id}/comments` | Permission | `{body, checklistItemId?, documentId?}` — comments can be pinned to an item or document. ⚠️ **No UI creates comments directly** — they only arise as send-back notes |
| PATCH | `/api/review-comments/{id}` | Permission (`resolve_comment` — admin/coordinator) | `{isResolved}`. ⚠️ **No UI calls this**, so unresolved comments can never be cleared, and they are a **readiness blocker** |

---

## Reports

| Method | Path | Auth | Params | Notes |
|--------|------|------|--------|-------|
| GET | `/api/reports/pipeline` | Session | `coordinatorId`, `jurisdictionId`, `permitType`, `stage` | All four filters implemented, **none have UI**. Ordered longest-idle first |
| GET | `/api/reports/stalled` | Session | `days` (default 3) | |
| GET | `/api/reports/contractor-compliance` | Session | — | 30-day warn window; per-document status roll-up |
| GET | `/api/reports/review-performance` | Session | — | From `APPROVED`/`SENT_BACK` assignments: approval rate, avg hours, SLA %, avg comments |
| GET | `/api/reports/saved` | Session | — | |
| POST | `/api/reports/saved` | Session | name, `isShared`, `reportType`, `filters`, `columns` | The UI hardcodes `filters:'{}'` and `columns:'[]'` |
| GET | `/api/reports/saved/{id}` | Session | — | |
| DELETE | `/api/reports/saved/{id}` | Session | — | |

> ⚠️ **No report route reads a `format` parameter.** The Reports "Export" button requests `?format=csv` and receives JSON. See [G8](./gaps-and-open-questions.md#g8--report-csv-export-is-not-implemented).

---

## AI

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/ai/assistant` | Session | `{messages[], useWebSearch?}` → SSE stream. System prompt is a hardcoded site map; optional web search for county permit forms. `maxTokens: 800` |
| POST | `/api/ai/validate` | Session | `{permitId}` → SSE stream reviewing the package for missing documents and next steps |

Both stream `data: {json}\n\n` frames terminated by `data: [DONE]`, and both route through [lib/ai-provider.ts](../../lib/ai-provider.ts), which swaps between Anthropic Claude and Google Gemini on `AI_PROVIDER`.

---

## Scheduled jobs

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/cron/snapshot` | **Secret** — `Authorization: Bearer $CRON_SECRET` | Returns **503** when `CRON_SECRET` is unset (fails closed), **401** on mismatch. Upserts one `PackageSnapshot` per non-closed package per day — idempotent |

The snapshot captures status, stage, checklist %, verified-document %, days in stage, total documents, and open comment count. ⚠️ **Nothing reads this table** — see [G16](./gaps-and-open-questions.md#g16--daily-snapshots-are-captured-but-never-read).

---

## Response conventions

| Shape | Used for |
|-------|----------|
| `{data: T}` | Single resource |
| `{data: T[]}` | Collection |
| `{data: T[], pagination: {page, limit, total, totalPages}}` | Paginated collection (permits only) |
| `{error: string}` | Failure |
| `{error, details}` | Zod validation failure (400) |
| `{error, blockers[], warnings[], checklistPct?}` | Readiness rejection (**422**) |

| Status | Meaning |
|--------|---------|
| 200 / 201 | Success / created |
| 400 | Validation error, or a missing required note/reason |
| 401 | No session |
| 403 | `ForbiddenError` from the permission matrix |
| 404 | Resource not found |
| 422 | **Readiness gate rejection** — the caller is expected to render `blockers` |
| 500 | Unhandled — logged server-side, generic message returned |
| 503 | Cron endpoint not configured |
