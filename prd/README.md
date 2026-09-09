# PermitPro PMS — Product Requirements Document

> **Reverse-engineered from source** on 2026-09-08
> **Branch:** `work/ui-capabilities` · **Commit:** `4537826`
> **Stack:** Next.js 16 (App Router) · React 19 · PostgreSQL via Prisma 6 · NextAuth v5 (JWT)

---

## System Overview

PermitPro PMS is an internal operations system for a **permit expediting firm** — a business that assembles, submits, and shepherds construction permit applications through Florida county building departments on behalf of contractors and their customers.

The firm's core problem is that every one of Florida's 67 counties wants a different pile of paperwork for the same job, and a package submitted with anything missing gets bounced — costing days or weeks. PermitPro addresses this by making the county's requirements **data** rather than tribal knowledge: an administrator configures each county's document requirements per permit type, and the system generates a per-package checklist automatically. Coordinators then work that checklist, an internal reviewer signs the package off, and only then can it be submitted to the county.

The system's organizing idea is **"ball in court"** — every active package is classified by who currently owes the next action (us, the contractor, the county, or field inspectors). The home screen is not a dashboard of vanity metrics but a work queue sorted by how long each package has been sitting, so nothing goes quiet unnoticed.

A secondary concern is **contractor compliance**. A contractor whose license or insurance has lapsed cannot legally pull a permit, so the system maintains a document vault per contractor with expiry tracking, and hard-blocks submission of any package whose contractor is out of compliance.

### Primary users

| Role | Population | What they do |
|------|-----------|--------------|
| **Coordinator** | Majority of users | Own packages end to end: intake, assemble documents, work the county checklist, chase contractors, submit, track to issuance |
| **Reviewer** | Small QA team | Internal quality gate — review assembled packages, approve or send back with correction notes |
| **Admin** | Firm operations lead | Everything a coordinator can do, plus: configure counties and requirements, assign reviewers, manage users, override the readiness gate, waive checklist items |

---

## Module Overview

| Module | Pages | Core functionality |
|--------|-------|--------------------|
| **Authentication** | Login | Email/password sign-in, JWT session, role carried in token |
| **Operations Board** | Board | Attention-first home: notices, pipeline distribution by court, work list grouped by court |
| **Permits** | List, New, Detail | The core entity — create packages, work checklists, upload documents, manage tasks, run review, submit to county |
| **Customers** | List, New, Detail | Customer directory and their linked packages |
| **Contractors** | List, New, Detail | Contractor directory, compliance document vault, expiry tracking |
| **Review** | Review Queue | Cross-package reviewer work queue with lanes |
| **Reports** | Reports | Four operational reports plus saved views |
| **Administration** | Counties, County detail, Permit types, Jurisdictions, Jurisdiction detail, New jurisdiction, Export profiles | Configure the requirement catalog that drives checklist generation |
| **Settings** | Settings | User management (admin only) |

---

## Page Inventory

| # | Page | Route | Module | Access | Doc |
|---|------|-------|--------|--------|-----|
| 1 | Login | `/login` | Auth | Public | [→](./pages/01-login.md) |
| 2 | Operations Board | `/dashboard` | Board | All roles | [→](./pages/02-operations-board.md) |
| 3 | Permits list | `/permits` | Permits | All roles | [→](./pages/03-permits-list.md) |
| 4 | New permit | `/permits/new` | Permits | All roles* | [→](./pages/04-permit-new.md) |
| 5 | Permit detail | `/permits/[id]` | Permits | All roles | [→](./pages/05-permit-detail.md) |
| 6 | Customers list | `/customers` | Customers | All roles | [→](./pages/06-customers-list.md) |
| 7 | New customer | `/customers/new` | Customers | All roles* | [→](./pages/07-customer-new.md) |
| 8 | Customer detail | `/customers/[id]` | Customers | All roles | [→](./pages/08-customer-detail.md) |
| 9 | Contractors list | `/contractors` | Contractors | All roles | [→](./pages/09-contractors-list.md) |
| 10 | New contractor | `/contractors/new` | Contractors | All roles* | [→](./pages/10-contractor-new.md) |
| 11 | Contractor detail | `/contractors/[id]` | Contractors | All roles | [→](./pages/11-contractor-detail.md) |
| 12 | Review queue | `/review-queue` | Review | All roles | [→](./pages/12-review-queue.md) |
| 13 | Reports | `/reports` | Reports | All roles | [→](./pages/13-reports.md) |
| 14 | Settings — Users | `/settings` | Settings | **Admin only** | [→](./pages/14-settings-users.md) |
| 15 | Counties | `/admin/counties` | Admin | Admin nav | [→](./pages/15-admin-counties.md) |
| 16 | County detail | `/admin/counties/[countyCode]` | Admin | Admin nav | [→](./pages/16-admin-county-detail.md) |
| 17 | Permit types | `/admin/counties/permit-types` | Admin | Admin nav | [→](./pages/17-admin-permit-types.md) |
| 18 | Jurisdictions | `/admin/jurisdictions` | Admin | Admin nav | [→](./pages/18-admin-jurisdictions.md) |
| 19 | New jurisdiction | `/admin/jurisdictions/new` | Admin | Admin nav | [→](./pages/19-admin-jurisdiction-new.md) |
| 20 | Jurisdiction detail | `/admin/jurisdictions/[id]` | Admin | Admin nav | [→](./pages/20-admin-jurisdiction-detail.md) |
| 21 | Export profiles | `/admin/export-profiles` | Admin | **Admin only** | [→](./pages/21-admin-export-profiles.md) |

\* **"All roles\*"** means the page renders for any signed-in user and the API accepts the write from any role, even though the documented permission matrix restricts the action to admin/coordinator. See [Gaps & Open Questions](./appendix/gaps-and-open-questions.md#g1--permission-matrix-is-not-enforced-on-most-write-routes).

---

## Appendices

- **[Enum Dictionary](./appendix/enum-dictionary.md)** — every status, stage, category, and type value with its business meaning
- **[Page Relationships](./appendix/page-relationships.md)** — navigation map and cross-page data coupling
- **[API Inventory](./appendix/api-inventory.md)** — all 49 endpoints with methods, params, and authorization
- **[Gaps & Open Questions](./appendix/gaps-and-open-questions.md)** — dead links, unimplemented features, and divergences found during analysis

---

## Global Notes

### Permission model (as designed)

`lib/permissions.ts` defines a single permission matrix keyed by *resource* × *action* → allowed roles. The intended model:

- **Admin** — everything, including the exclusive powers: assign reviewers, waive checklist items, override the readiness gate, manage users, manage jurisdictions/requirements/export profiles, delete packages
- **Coordinator** — create and manage packages, documents, tasks, customers, contractors; resolve review comments; export; bulk operations
- **Reviewer** — read everything; verify/reject documents; start, approve, and send back reviews

A legacy role string `"user"` is silently normalized to `coordinator`.

> **Important:** this matrix is only actually enforced on a minority of API routes. Most core write endpoints check *authentication* but not *authorization*. See [G1](./appendix/gaps-and-open-questions.md#g1--permission-matrix-is-not-enforced-on-most-write-routes).

### Authentication and route protection

Sign-in is email + password (bcrypt) via NextAuth v5 Credentials provider, with a **JWT session** carrying `id`, `email`, `name`, `role`.

Middleware deliberately does **not** guard pages — it lets everything through, because loading Prisma in the Edge runtime is not viable. Protection therefore happens per-page and per-route.

Only four pages verify a session: `/`, `/dashboard`, `/settings`, and `/admin/export-profiles`. **Six pages query Prisma server-side and render real data with no check at all** — `/permits`, `/permits/[id]`, `/customers`, `/customers/[id]`, `/contractors`, `/contractors/[id]`. Because they fetch server-side, the API session checks never apply. See [G19](./appendix/gaps-and-open-questions.md#g19--six-pages-render-real-data-with-no-session-check) — this is the highest-severity finding in this document and should be verified against the live deployment.

### The readiness gate — the system's central business rule

A package cannot enter review (or transition `internalStage` to `ReadyToSubmit`) unless it passes `evaluateReadiness()`. **Blockers** stop the transition; **warnings** are advisory only.

**Blockers:**
- Project address missing
- No jurisdiction linked
- Any mandatory checklist item still `PENDING` or with no document attached
- Contractor license expired
- Contractor workers-comp or liability insurance expired, **or expiring within 7 days**
- Any unresolved correction comment on the most recent sent-back review

**Warnings:**
- Contractor license expiring within 30 days
- Mandatory document uploaded but not yet verified (verification is the reviewer's job, so this does not block)
- Optional document not verified
- No mandatory checklist items found (suggests the county isn't configured)
- No target issue date set

Only an **admin** may override a blocked gate, and the override is written to the activity log with the reason and the full blocker list.

### Common interaction patterns

- **Optimistic-free refresh** — every mutation is followed by a re-fetch of the affected entity, then `router.refresh()`. No optimistic UI.
- **Inline field editing** — detail screens edit one field at a time: click *Edit*, an input replaces the value, *Save* PATCHes just that field.
- **Destructive actions confirm** — deletes and the bulk county seed use a native `confirm()` dialog.
- **Everything is logged** — 23 distinct activity types write to an append-only `ActivityLog` per package; the permit detail screen shows the 50 most recent entries.
- **`lastActivityAt` is the heartbeat** — denormalized on the package and touched by nearly every mutation. Stall detection, the board's day counters, and the pipeline report all read it.
- **Stall threshold is 3 days**, hardcoded in four separate places (board, permits list, reports default, snapshot job).
- **Compliance warning window is 30 days**; the submission-blocking insurance window is 7 days.
- **List pages page at 20 rows**; the permits API defaults to 50 and accepts up to whatever is asked.
- **Default sort** is `openedDate desc` for registers, `lastActivityAt asc` (longest-idle first) for work queues.

### Storage and file handling

Uploads go through a driver abstraction (`STORAGE_DRIVER=local|gcs`) that returns a driver-agnostic key `permits/{permitId}/{file}`, so the same database values work in both dev and Cloud Run. Limits: **50 MB per file**; allowed extensions `.pdf .jpg .jpeg .png .gif .doc .docx .xls .xlsx .txt`, each **verified by magic-byte signature**, not just by extension or the client-supplied MIME type.

### AI features

Two AI surfaces, both streaming Server-Sent Events, both provider-swappable between Anthropic Claude and Google Gemini via `AI_PROVIDER`:

1. **PermitPro Assistant** — a global chat widget present on every page inside the app shell. Answers app-navigation questions from a hardcoded site map, and can optionally web-search for official county permit forms.
2. **AI Package Check** — a panel at the bottom of the permit detail screen that reviews the specific package for missing documents, checklist gaps, and next steps.
