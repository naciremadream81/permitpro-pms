# Enum Dictionary

Every enumerated value in the system with its business meaning. Source of truth: [prisma/schema.prisma](../../prisma/schema.prisma) and [lib/validations.ts](../../lib/validations.ts).

---

## PermitStatus — where the package stands with the county

The externally-visible lifecycle. Nine values.

| Value | Display | Meaning | Court |
|-------|---------|---------|-------|
| `New` | New | Package created, assembly not finished | Our court |
| `Submitted` | Submitted | Filed with the county, awaiting intake | With jurisdiction |
| `InReview` | In Review | County plan review in progress | With jurisdiction |
| `RevisionsNeeded` | Revisions Needed | County returned comments requiring correction | Our court |
| `Approved` | Approved | County approved; permit not yet issued | Our court |
| `Issued` | Issued | Permit issued, work may begin | Fieldwork |
| `Inspections` | Inspections | Inspection cycle underway | Fieldwork |
| `FinaledClosed` | Finaled / Closed | All inspections passed, permit closed | Closing |
| `Canceled` | Canceled | Abandoned or withdrawn | Closing |

**Default:** `New`.
**Notes:** `Canceled` is absent from the permits-list filter dropdown but present on the permit detail editor. `RevisionsNeeded` is defined and mapped but **never set by any code path** — the review send-back action leaves status untouched. `Approved` is excluded from stall detection.

---

## InternalStage — where the package stands with *us*

The internal workflow position, tracked separately from the county-facing status. This is what the readiness gate and the review workflow actually manipulate.

| Value | Display | Meaning |
|-------|---------|---------|
| `InProgress` | In Progress | Being worked; also the state a sent-back package returns to |
| `WaitingOnContractorDocs` | Waiting On Contractor Docs | Blocked pending contractor paperwork |
| `WaitingOnCounty` | Waiting On County | Set automatically on submission to the county |
| `WaitingOnBilling` | Waiting On Billing | Blocked pending billing action |
| `ReadyToSubmit` | Ready To Submit | **Passed internal review** — the only state from which "Submit to county" works |
| `ReadyToClose` | Ready To Close | Work complete, awaiting closeout |

**Default:** `InProgress`. Nullable.
**Set automatically by:** review approval → `ReadyToSubmit`; review assignment and send-back → `InProgress`; county submission → `WaitingOnCounty`.

---

## BillingStatus

| Value | Display | Meaning |
|-------|---------|---------|
| `NotSent` | Not Sent | Not yet handed to billing |
| `SentToBilling` | Sent to Billing | Handed off |
| `Billed` | Billed | Invoice issued |
| `Paid` | Paid | Payment received |

**Default:** `NotSent`. A "Send to Billing" task is auto-created when status becomes `Approved` — **but only via `POST /api/permits/{id}/status`**, which the permit detail UI does not call.

---

## PermitType — the nine work categories

| Value | Display | Notes |
|-------|---------|-------|
| `Building` | Building | |
| `Electrical` | Electrical | |
| `Plumbing` | Plumbing | |
| `Mechanical` | Mechanical | |
| `Roofing` | Roofing | |
| `HVAC` | HVAC | |
| `Structural` | Structural | |
| `MobileHome` | **Mobile home** | Only value with an explicit display mapping |
| `Other` | Other | |

Drives which jurisdiction requirements apply to a package's checklist. The contractor specialties checkbox list mirrors these but spells it `Mobile home` and omits `Other`.

---

## DocumentCategory — how permit documents are classified

| Value | Meaning |
|-------|---------|
| `Application` | County application forms |
| `Plans` | Drawings and site plans |
| `Specifications` | Written specs |
| `Engineering` | Sealed engineering documents |
| `Photos` | Site photographs |
| `Correspondence` | Letters and email with the county |
| `Inspection` | Inspection reports and results |
| `Certificate` | Certificates (occupancy, completion) |
| `Other` | Uncategorized |

> ⚠️ The permit detail upload dropdown offers a **`Permit`** option that is not in this enum (selecting it fails server validation) and omits **`Engineering`** and **`Photos`**, which are. See [G4](./gaps-and-open-questions.md#g4--document-category-dropdown-does-not-match-the-enum).

---

## DocumentStatus

| Value | Meaning |
|-------|---------|
| `Pending` | Uploaded, not yet verified |
| `Verified` | Confirmed acceptable |
| `Rejected` | Rejected, needs replacement |

**Default:** `Pending`. **Bulk-transitioned:** review approval flips every `Pending` document on the package to `Verified` in one transaction. `Rejected` has no UI path.

---

## ChecklistItemStatus

| Value | Display | Meaning | Counts as complete? |
|-------|---------|---------|--------------------|
| `PENDING` | Pending | No document attached | No |
| `UPLOADED` | Uploaded | Document attached, awaiting verification | **Yes** |
| `VERIFIED` | Verified | Reviewer confirmed | **Yes** |
| `REJECTED` | Rejected | Reviewer rejected | No |
| `WAIVED` | Waived | Admin waived with a reason | **Yes** |
| `NOT_APPLICABLE` | Not Applicable | Doesn't apply to this package | **Yes** |

**Default:** `PENDING`.
**Completion definition:** `UPLOADED | VERIFIED | WAIVED | NOT_APPLICABLE`. This definition is duplicated in three files ([checklist-engine](../../lib/checklist-engine.ts), [readiness-engine](../../lib/readiness-engine.ts), [snapshot-job](../../lib/snapshot-job.ts)) which carry comments requiring them to stay aligned.
**No UI produces `REJECTED` or `NOT_APPLICABLE`.** `WAIVED` is admin-only and API-only.

---

## ContractorDocType — the five compliance vault slots

| Value | Display | Blocks submission when |
|-------|---------|------------------------|
| `LICENSE` | Contractor License | **Expired** |
| `WORKERS_COMP` | Workers Compensation | **Expired, or expiring within 7 days** |
| `LIABILITY` | Liability Insurance | **Expired, or expiring within 7 days** |
| `W9` | W-9 | Never |
| `OTHER` | Other | Never |

## ContractorDocStatus

| Value | Meaning |
|-------|---------|
| `ACTIVE` | Current |
| `EXPIRED` | Past expiration |
| `PENDING_REVIEW` | Awaiting verification |

**Default:** `ACTIVE`. The vault UI computes a separate display status (`valid` / `expiring_soon` / `expired` / `unknown`) from the API rather than reading this field.

---

## ReviewStatus

| Value | Display | Meaning | Sets package stage to |
|-------|---------|---------|----------------------|
| `ASSIGNED` | Assigned | Reviewer assigned, not started | `InProgress` |
| `IN_REVIEW` | In Review | Actively reviewing | — |
| `APPROVED` | Approved | Passed | **`ReadyToSubmit`** |
| `SENT_BACK` | Sent Back | Returned with corrections | `InProgress` |

**Default:** `ASSIGNED`. Review-queue lanes: "In review" = `ASSIGNED|IN_REVIEW`; "Completed" = `APPROVED|SENT_BACK` (so sent-back work appears in two lanes).

---

## TaskStatus

| Value | Display |
|-------|---------|
| `NotStarted` | Not Started |
| `InProgress` | In Progress |
| `Waiting` | Waiting |
| `Completed` | Completed |

**Default:** `NotStarted`. Any status other than `Completed` counts as an "open task", which is what moves a package into the **contractor** court on the Operations Board.

---

## Court — ball-in-court (presentation only, no schema field)

| Value | Label | Description | Days label |
|-------|-------|-------------|-----------|
| `us` | Our court | Revisions to return, intakes to assemble, approvals to action | days held |
| `contractor` | With contractor | Waiting on the contractor — open tasks outstanding | days waiting |
| `county` | With jurisdiction | Submitted or in plan review — watch for comment cycles | days out |
| `field` | Fieldwork | Issued — inspections in progress | days open |
| `closed` | Closing | Finaled or canceled — confirm billing and archive | days |

Defined in [lib/court.ts](../../lib/court.ts). `contractor` has no statuses of its own — it is inferred from `us`/`field` plus an open task.

---

## UserRole

| Value | Meaning |
|-------|---------|
| `admin` | Full access, including the exclusive powers |
| `coordinator` | **Default.** Owns packages and documents |
| `reviewer` | Reviews packages; read-only on most else |
| `user` | **Legacy** — silently normalized to `coordinator` |

The Settings UI can only create `admin` and `user` — **not `reviewer`**. See [G10](./gaps-and-open-questions.md#g10--settings-cannot-create-a-reviewer-account).

---

## ActivityType — 23 audit trail event types

| Group | Values |
|-------|--------|
| **Status / stage** | `StatusChange`, `StageChange`, `BillingStatusChange`, `FieldUpdated` |
| **Documents** | `DocumentUploaded`, `DocumentVerified`, `DocumentRejected`, `ContractorDocumentUploaded` |
| **Tasks** | `TaskCreated`, `TaskCompleted` |
| **Checklist** | `ChecklistGenerated`, `ChecklistItemUpdated`, `ChecklistItemWaived` |
| **Review** | `ReviewAssigned`, `ReviewStarted`, `ReviewApproved`, `ReviewSentBack`, `CommentAdded`, `CommentResolved` |
| **Gate** | `ReadinessBlocked`, `ReadinessOverridden` |
| **Export** | `PackageExported` |
| **Notes** | `NoteAdded` |

The permit detail screen shows the 50 most recent, unfiltered.

---

## NotificationType — 12 types, none delivered

| Group | Values |
|-------|--------|
| **Contractor license** | `CONTRACTOR_LICENSE_EXPIRING_30D`, `CONTRACTOR_LICENSE_EXPIRING_7D`, `CONTRACTOR_LICENSE_EXPIRED` |
| **Contractor insurance** | `CONTRACTOR_INSURANCE_EXPIRING_60D`, `CONTRACTOR_INSURANCE_EXPIRING_30D`, `CONTRACTOR_INSURANCE_EXPIRED` |
| **Package** | `PACKAGE_STALLED` |
| **Review** | `REVIEW_ASSIGNED`, `REVIEW_SENT_BACK`, `REVIEW_APPROVED` |
| **Other** | `EXPORT_READY`, `CHECKLIST_ITEM_WAIVED` |

**Statuses:** `PENDING`, `SENT`, `READ`, `DISMISSED`. **Channels:** `IN_APP`, `EMAIL`.

> ⚠️ **The entire notification system is schema-only.** No code creates, sends, or displays a `NotificationEvent`. See [G15](./gaps-and-open-questions.md#g15--the-notification-system-is-entirely-unimplemented).

---

## ReportType

| Value | Report | Built? |
|-------|--------|--------|
| `PACKAGE_PIPELINE` | Package Pipeline | ✅ |
| `STALLED_PACKAGES` | Stalled Packages | ✅ |
| `CONTRACTOR_COMPLIANCE` | Contractor Compliance | ✅ |
| `REVIEW_PERFORMANCE` | Review Performance | ✅ |
| `DOCUMENT_QUALITY` | — | ❌ Not implemented |
| `SUBMISSION_VOLUME` | — | ❌ Not implemented |

---

## Supporting enums

**ExportStatus:** `GENERATED` (only value ever written), `DOWNLOADED`, `SUBMITTED`.

**ChangeAction** (requirement audit): `CREATED`, `UPDATED`, `DELETED`, `ACTIVATED`, `DEACTIVATED`, `RESTORED`.

**SeedBatchStatus:** `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`.

**DocumentTemplateStatus:** `DRAFT`, `ACTIVE`, `ARCHIVED` — the whole `DocumentTemplate` model (fillable forms with `{{merge.field}}` substitution) has **no UI or API**.

**Task priority** (a plain string column, not an enum): `low`, `medium`, `high`. Form default is `medium`.

**Preferred contact method** (plain string): `phone`, `email`, `text`.

---

## Thresholds and magic numbers

| Constant | Value | Where | Used for |
|----------|-------|-------|----------|
| Stall threshold | **3 days** | Board, permits list, reports default, snapshot | Stalled detection — hardcoded in 4 places |
| Compliance warning | **30 days** | Board, contractors list, compliance report, readiness | Expiring-soon window |
| Insurance blocking | **7 days** | Readiness engine | Workers comp / liability block submission this close to expiry |
| License warning | **30 days** | Readiness engine | Warning only, never blocks pre-expiry |
| Seed threshold | **9 requirements** | Counties admin | County counts as "Seeded" |
| Max file size | **50 MB** | Storage layer | Per upload |
| Page size (lists) | **20** | Permits, customers, contractors | Register pagination |
| Page size (API default) | **50** | `/api/permits` | |
| Board work list cap | **25** | Operations Board | Raised from 8 so court groups aren't truncated |
| Activity log display | **50** | Permit detail | Most recent entries |
| Ready-to-submit cap | **100** | Review queue | |
| Bulk operation cap | **100** | `/api/permits/bulk` | Package IDs per call |
| Send-back note minimum | **5 chars** | Review action | Server-enforced |
| Waiver reason minimum | **10 chars** | Checklist waive | Server-enforced |
| Password minimum | **6 chars** | User schema | |
| Report idle colors | 3 / 7 days | Pipeline report | Amber / red |
| Report idle colors | 14 days | Stalled report | Red |
