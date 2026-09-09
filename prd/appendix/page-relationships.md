# Page Relationships

## Navigation structure

The app shell ([app-layout.tsx](../../components/layout/app-layout.tsx)) provides a band header with a desktop nav row, a mobile drawer, and a globally-present AI assistant widget. Nav definitions live in [lib/nav-config.ts](../../lib/nav-config.ts).

### Main navigation — all roles

| Label | Route |
|-------|-------|
| Board | `/dashboard` |
| Permits | `/permits` |
| Customers | `/customers` |
| Contractors | `/contractors` |
| Review Queue | `/review-queue` |
| Reports | `/reports` |

### Administration — rendered only when `role === 'admin'`

| Label | Route |
|-------|-------|
| Counties | `/admin/counties` |
| Jurisdictions | `/admin/jurisdictions` |
| Export Profiles | `/admin/export-profiles` |
| Settings | `/settings` |

On desktop the four admin items collapse into a single **Admin** link (to `/admin/counties`) plus a separate **Settings** link. In the mobile drawer they appear as a collapsible "Administration" section.

> **Hiding the nav is not access control.** Only `/settings` and `/admin/export-profiles` verify the role in the page itself. `/admin/counties`, `/admin/counties/[countyCode]`, `/admin/counties/permit-types`, `/admin/jurisdictions`, `/admin/jurisdictions/new`, and `/admin/jurisdictions/[id]` render fully for any signed-in user who types the URL.

---

## Route map

```
/                          → redirect: /dashboard (session) or /login
/login                     → /dashboard on success
│
/dashboard ────────────────┬→ /permits/{id}              (work list rows, reviewer queue)
                           ├→ /permits/new               (header, empty state)
                           ├→ /permits                   (empty state)
                           ├→ /permits?court={court}     (distribution legend)
                           ├→ /permits?stalled=1         (stalled notice)
                           ├→ /contractors?compliance=expiring
                           ├→ /review-queue?comments=open  ⚠️ param ignored
                           └→ /review-queue              (reviewer link)

/permits ──────────────────┬→ /permits/{id}
                           └→ /permits/new
/permits/new ──────────────→ /permits/{id}  (on create)
/permits/{id} ─────────────┬→ /customers/{id}
                           ├→ /contractors/{id}
                           └→ /api/documents/{id}/download

/customers ────────────────┬→ /customers/{id}
                           └→ /customers/new
/customers/new ────────────→ /customers/{id}
/customers/{id} ───────────→ /permits/{id}   (per linked package)

/contractors ──────────────┬→ /contractors/{id}
                           └→ /contractors/new
/contractors/new ──────────→ /contractors/{id}
/contractors/{id} ─────────→ /permits/{id}   (per linked package)

/review-queue ─────────────→ /permits/{id}   ("Open →")

/reports ──────────────────┬→ /permits/{id}     (pipeline, stalled rows)
                           └→ /contractors/{id} (compliance rows)

/settings                    (leaf — admin only)

/admin/counties ───────────┬→ /admin/counties/{countyCode}
                           └→ /admin/counties/permit-types
/admin/counties/{code} ────→ /admin/counties   (back)
/admin/counties/permit-types (leaf)

/admin/jurisdictions ──────┬→ /admin/jurisdictions/new
                           └→ /admin/jurisdictions/{id}
/admin/jurisdictions/new ──→ /admin/jurisdictions/{id}
/admin/jurisdictions/{id} ─→ /admin/jurisdictions  (back)

/admin/export-profiles ────┬→ /admin/export-profiles/new   ❌ 404
                           └→ /admin/export-profiles/{id}  ❌ 404
```

---

## Parameters passed between pages

| From | To | Parameter | Consumed? |
|------|----|-----------|-----------|
| Dashboard stalled notice | `/permits` | `stalled=1` | ✅ Yes — overrides status and court filters |
| Dashboard distribution legend | `/permits` | `court={us\|contractor\|county\|field\|closed}` | ✅ Yes — but `contractor` resolves to a superset |
| Dashboard compliance notice | `/contractors` | `compliance=expiring` | ✅ Yes |
| Dashboard comments notice | `/review-queue` | `comments=open` | ❌ **No — silently ignored** |
| Permits list pagination | `/permits` | `page`, plus all active filters | ✅ Yes |
| Reports Export button | `/api/reports/{type}` | `format=csv` | ❌ **No — returns JSON** |
| Review queue mount | `/api/permits` | `internalStage=ReadyToSubmit&limit=100` | ✅ Yes |

---

## Data coupling — where one screen's action changes another

### `lastActivityAt` — the system's heartbeat

Denormalized onto `PermitPackage` and touched by nearly every mutation: status change, stage change, checklist item update, export, bulk operation, review assignment, review action, submission.

**Read by:** the Operations Board (row ordering, day counters, stall notice), the permits list (`?stalled=1`), the Pipeline report (`daysIdle`, sort order), the Stalled report, and the nightly snapshot job.

**Consequence:** any edit anywhere reorders the Operations Board and can clear a stalled flag — including edits that don't represent real progress.

### Review approval — a wide, atomic change

Approving a review in **one transaction**:
1. Assignment → `APPROVED` with `completedAt`
2. **Every `Pending` document on the package → `Verified`**
3. **Every `UPLOADED` checklist item → `VERIFIED`**
4. Package `internalStage` → `ReadyToSubmit`

**Visible on:** permit detail (document badges and checklist pills flip together), review queue (row moves from "In review" to "Completed" and the package appears in "Ready to submit"), Operations Board (stage badge), Pipeline report (checklist %, `inReview` chip clears), and the next snapshot's `verifiedDocPct`.

### Contractor vault → readiness across many packages

Uploading or renewing a compliance document on `/contractors/{id}` can **immediately unblock the readiness gate for every package assigned to that contractor**, and changes the Operations Board compliance notice, the contractors list `?compliance=expiring` filter, and the Contractor Compliance report.

This is the only cross-entity unblock in the system: a coordinator stuck on a permit must go fix a contractor record.

### Requirement catalog → checklist generation

`/admin/counties/{code}` and `/admin/jurisdictions/{id}` both edit `Requirement` rows, which are the **upstream source of every checklist item**.

- Adding a requirement affects **new** packages immediately, and **existing** packages only after someone clicks Regenerate on each one
- Deactivating a requirement stops future generation but leaves existing checklist items intact
- **Flipping `isMandatoryForSubmission` on retroactively blocks the readiness gate** for every package missing that document — with no warning about how many packages are affected and no way to see them

### Jurisdiction linking — the checklist enabler

Setting "County / Jurisdiction" on the permit detail screen sets `jurisdictionId`, which:
1. Triggers a checklist re-fetch (the PATCH handler syncs items server-side)
2. Clears the `MISSING_JURISDICTION` readiness blocker
3. Changes which export profile the ZIP download resolves to

Because the New Permit form cannot set this, **every package requires this step before it can progress**.

### Cascade deletes

| Deleting | Cascades to |
|----------|-------------|
| `Customer` | **All their permit packages** → and from each: documents, tasks, activity logs, checklist items, review assignments, export logs, snapshots |
| `Contractor` | **All their permit packages** (same fan-out), plus their vault documents |
| `PermitPackage` | Documents, tasks, activity logs, checklist items, review assignments, export logs, snapshots |
| `Jurisdiction` | Its requirements |
| `Requirement` | Its change logs |
| `ReviewAssignment` | Its comments |

Both customer and contractor deletes are admin-only at the API, but the blast radius is large and irreversible — deleting one contractor can destroy the permit history of dozens of jobs.

### Blocked deletes

`PermitDocument.uploadedBy` and `ReviewComment.authorId` are **required relations without cascade**, so deleting a `User` who has uploaded a document or authored a comment fails at the database level. The Settings UI offers Delete unconditionally and would surface a raw error.

---

## Orphaned and dead paths

| Path | Issue |
|------|-------|
| `/admin/export-profiles/new` | Linked from two buttons — **route does not exist** |
| `/admin/export-profiles/{id}` | Linked from every row's Edit — **route does not exist** |
| `/api/permits/{id}/status` | The gated status endpoint — **no UI calls it** |
| `/api/permits/bulk` | Bulk operations — **no UI calls it** |
| `/api/review-comments/{id}` | Resolve a comment — **no UI calls it**, yet unresolved comments block readiness |
| `/api/review-assignments/{id}/comments` POST | Create a comment — **no UI calls it** |
| `/api/documents/{id}/verify` | Verify a document — **no UI calls it** |
| `/api/tasks/{id}` DELETE | **No UI calls it** |
| `/api/permits/{id}/readiness` | Read-only readiness check — **no UI calls it** |
| `NotificationEvent` | 12 notification types, full model — **nothing writes or reads it** |
| `DocumentTemplate` | Merge-field form templates — **no UI or API at all** |
| `PackageSnapshot` | Written nightly — **nothing reads it** |
