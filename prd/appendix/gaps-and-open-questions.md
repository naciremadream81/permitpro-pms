# Gaps & Open Questions

Divergences between what the code implies and what it does, found while reverse-engineering. Each is a factual observation with its source; the product judgment about whether it matters is left to the reader.

Severity reflects **business impact**, not code quality.

| # | Finding | Severity |
|---|---------|----------|
| [G1](#g1--permission-matrix-is-not-enforced-on-most-write-routes) | Permission matrix not enforced on most write routes | **High** |
| [G2](#g2--the-status-dropdown-bypasses-the-readiness-gate-and-its-automation) | Status dropdown bypasses the readiness gate | **High** |
| [G3](#g3--new-permit-form-cannot-link-a-jurisdiction) | New Permit cannot link a jurisdiction | **High** |
| [G4](#g4--document-category-dropdown-does-not-match-the-enum) | Document category dropdown offers an invalid value | Medium |
| [G5](#g5--customers-list-has-no-search-or-pagination-controls) | Customers/contractors lists unreachable past row 20 | **High** |
| [G6](#g6--vault-renewals-never-mark-the-prior-document-superseded) | Vault renewals never supersede the prior document | Medium |
| [G7](#g7--review-queue-ignores-the-commentsopen-filter-it-is-linked-with) | Review queue ignores `?comments=open` | Low |
| [G8](#g8--report-csv-export-is-not-implemented) | Report CSV export returns JSON | Medium |
| [G9](#g9--saved-views-persist-no-filters-columns-or-sort) | Saved views persist nothing | Medium |
| [G10](#g10--settings-cannot-create-a-reviewer-account) | Settings cannot create a reviewer | **High** |
| [G11](#g11--county-detail-hardcodes-isadmin--true) | County detail hardcodes `isAdmin = true` | Medium |
| [G12](#g12--custom-permit-types-cannot-be-used-anywhere) | Custom permit types are unusable | Medium |
| [G13](#g13--jurisdiction-county-code-conventions-conflict) | County code conventions conflict | Medium |
| [G14](#g14--export-profile-createedit-pages-do-not-exist) | Export profile create/edit pages 404 | **High** |
| [G15](#g15--the-notification-system-is-entirely-unimplemented) | Notification system unimplemented | Medium |
| [G16](#g16--daily-snapshots-are-captured-but-never-read) | Daily snapshots never read | Low |
| [G17](#g17--review-comments-can-never-be-resolved-through-the-ui) | Review comments can never be resolved | **High** |
| [G18](#g18--revisionsneeded-status-is-never-set) | `RevisionsNeeded` never set | Low |
| [G19](#g19--six-pages-render-real-data-with-no-session-check) | Six pages render real data with no session check | **Critical** |
| [G20](#g20--changing-permit-type-does-not-resync-the-checklist) | Permit type change doesn't resync checklist | Medium |

---

## G1 — Permission matrix is not enforced on most write routes

[lib/permissions.ts](../../lib/permissions.ts) defines a careful resource × action → roles matrix, and [lib/auth-helpers.ts](../../lib/auth-helpers.ts) provides `requirePermission()`, `requireAdmin()`, and friends to enforce it. **Most core write endpoints call neither.** They check `getSession()` for a session and proceed regardless of role.

**Not enforced** (session only): `POST /api/permits`, `PATCH /api/permits/{id}`, `DELETE /api/permits/{id}`, `POST /api/permits/{id}/documents`, `POST /api/permits/{id}/tasks`, `POST/GET /api/permits/{id}/checklist`, `POST /api/customers`, `POST /api/contractors`, `PATCH /api/tasks/{id}`, `POST /api/documents/{id}/verify`, all `/api/admin/permit-types` routes, all `/api/reports/*` routes.

**Enforced:** `/api/permits/bulk`, `/api/permits/{id}/submit`, `/api/permits/{id}/status`, `/api/permits/{id}/review`, `/api/permits/{id}/checklist/{itemId}`, `/api/users/*`, `/api/jurisdictions/{id}`, `/api/requirements/{id}`, `/api/export-profiles/{id}`, `/api/contractor-documents/{id}`, `/api/review-comments/{id}`, `/api/customers/{id}`, `/api/contractors/{id}`.

**Effect:** a `reviewer` — whose documented role is read-plus-review — can create permits, edit any field on any package, upload documents, create tasks, and create customers and contractors through the API. The UI hides the buttons; nothing else stops them. `DELETE /api/permits/{id}` is documented admin-only and is callable by any authenticated user.

**Open question:** was the matrix introduced as a later refactor that only reached some routes? The enforced set correlates with the newer Phase-1/Phase-2 features (review, checklist, jurisdictions), suggesting the older CRUD routes predate it.

---

## G2 — The Status dropdown bypasses the readiness gate and its automation

Two endpoints can change a package's status:

| | `PATCH /api/permits/{id}` | `POST /api/permits/{id}/status` |
|---|---|---|
| Readiness gate on `→ ReadyToSubmit` | ❌ None | ✅ Enforced |
| Admin override with required reason | ❌ | ✅ |
| `StageChange` logged separately | ❌ | ✅ |
| Auto-creates "Send to Billing" on `Approved` | ❌ | ✅ |
| **Called by the UI** | ✅ **Yes** | ❌ **Never** |

The permit detail Status dropdown ([permit-detail-client.tsx](../../app/permits/[id]/permit-detail-client.tsx), `saveField`) uses the generic PATCH. So the gated endpoint — with all its business rules — is dead code, and a coordinator can set any status including `Submitted`, `Approved`, or `Canceled` with no checks and no automation.

**Effect:** the readiness gate only actually gates the *review assignment* path (`POST .../review`). The `internalStage`-based gate it was built for is reachable only through an endpoint nothing calls. The "Send to Billing" task automation never fires.

---

## G3 — New Permit form cannot link a jurisdiction

The intake form ([app/permits/new/page.tsx](../../app/permits/new/page.tsx)) has a County dropdown populated from [lib/florida-counties.ts](../../lib/florida-counties.ts) that writes the **free-text `county` field**. Checklist generation requires `jurisdictionId`, and the form never sets it — `POST /api/permits` only calls `generateChecklist()` when `jurisdictionId` is present.

**Effect:** every package created through the UI starts with **no checklist**. The coordinator must open the new package and set "County / Jurisdiction" in Overview to generate one. Nothing on the intake form indicates this, and nothing flags packages sitting without a jurisdiction.

The schema comments mark `county` as "Legacy free-text county — kept for display if no jurisdiction linked", confirming the intended direction; the intake form was not migrated.

---

## G4 — Document category dropdown does not match the enum

Permit detail upload dropdown offers: Application, Plans, Specifications, Correspondence, **Permit**, Inspection, Certificate, Other.

`DocumentCategory` enum contains: Application, Plans, Specifications, **Engineering**, **Photos**, Correspondence, Inspection, Certificate, Other.

**Effect:** selecting **Permit** fails server-side Zod validation with a 400 — the upload appears to fail for no clear reason. **Engineering** and **Photos** cannot be selected at all from this form, despite being valid and despite requirements being categorizable as either (the requirement editors offer the full correct list).

Note the checklist-driven upload path is unaffected — it uses the requirement's own category.

---

## G5 — Customers list has no search or pagination controls

[app/customers/page.tsx](../../app/customers/page.tsx) implements `search` and `page` server-side, computes `totalPages`, and renders **neither a search box nor pagination controls**. Sort is alphabetical, page size 20.

**Effect:** with more than 20 customers, everyone after roughly "B" is unreachable through the UI. The only workaround is typing `?search=` or `?page=` into the address bar.

[app/contractors/page.tsx](../../app/contractors/page.tsx) has the same missing pagination (it does have a search box).

The permits list, by contrast, has both. **Open question:** were these controls lost in the ruled-sections UI refactor visible in recent commits?

---

## G6 — Vault renewals never mark the prior document superseded

`ContractorDocument.isSuperseded` exists with the comment "Marks previous version as superseded when renewed", and `PATCH /api/contractor-documents/{id}` accepts it. **No code path ever sets it.** The upload flow ([vault-panel.tsx](../../components/contractors/vault-panel.tsx)) posts a new document and re-fetches.

The panel builds its five slots with `documents.find(d => d.type === type)` over the non-superseded set — **the first match, not the newest**. After a renewal, two active documents of the same type exist and the slot may display either.

**Effect:** the readiness engine also uses `.find()` on non-superseded documents ordered by `uploadedAt desc`, so it does favor the newest — meaning the gate and the UI can disagree about which document is current. A renewed-but-not-superseded expired document may still be what the vault card displays.

---

## G7 — Review queue ignores the `?comments=open` filter it is linked with

The Operations Board's unresolved-comments notice links to `/review-queue?comments=open`. [app/review-queue/page.tsx](../../app/review-queue/page.tsx) never reads `searchParams`.

**Effect:** clicking the notice lands on the default "In review" lane with no comment filter. Combined with [G17](#g17--review-comments-can-never-be-resolved-through-the-ui), a user following the notice has no way to find or clear the comments it counted.

---

## G8 — Report CSV export is not implemented

The Reports header renders `<a href="/api/reports/{activeTab}?format=csv" download>`. None of the four report routes reads a `format` parameter or sets a CSV content type.

**Effect:** clicking Export downloads a `.csv`-named file containing the JSON API response.

---

## G9 — Saved views persist no filters, columns, or sort

`SavedReport` has `filters`, `columns`, `sortBy`, and `sortOrder` columns. The save call in [app/reports/page.tsx](../../app/reports/page.tsx) hardcodes `filters: '{}'` and `columns: '[]'` and omits sort entirely. Loading a saved view only switches to that report's tab.

**Effect:** a "saved view" is a named bookmark for a report type. Since the reports have almost no filter UI to begin with (see the unused pipeline filters), there is currently nothing to save.

`isShared` is stored and shown via a different icon but **nothing filters on it** — `GET /api/reports/saved` returns the caller's own list either way, so sharing has no effect.

---

## G10 — Settings cannot create a reviewer account

[settings-client.tsx](../../app/settings/settings-client.tsx) types role as `'user' | 'admin'` and its dropdown offers only those two. The system's actual roles are `admin`, `coordinator`, and `reviewer`; `'user'` is legacy and normalizes to `coordinator`.

**Effect:** **reviewer accounts cannot be provisioned through the UI.** Since the review workflow requires assigning a reviewer, and the reviewer dropdown on the permit screen filters users to `role === 'reviewer' || role === 'admin'`, a firm setting this up from scratch can only assign admins as reviewers. The entire review feature is partially unreachable without direct database access.

---

## G11 — County detail hardcodes `isAdmin = true`

[app/admin/counties/[countyCode]/page.tsx](../../app/admin/counties/[countyCode]/page.tsx) line 321:

```
const isAdmin = true // TODO: wire to session.user.role
```

**Effect:** every admin-gated control on the county requirement editor — including per-version Restore — renders for any signed-in user who navigates to the URL. The underlying APIs do enforce the admin permission, so actions fail with 403 rather than succeeding. The impact is a misleading UI presenting controls that cannot work, not a privilege escalation.

---

## G12 — Custom permit types cannot be used anywhere

`PermitTypeDefinition` supports admin-created custom permit types with `isBuiltIn: false`, managed at `/admin/counties/permit-types`.

Every permit-type selector in the app — New Permit, permit detail, both requirement editors — is a **hardcoded array of the nine enum values**. And `PermitPackage.permitType` is a database enum column, so a custom value could not be stored even if offered.

**Effect:** creating a custom permit type has no observable effect anywhere. Deactivating a built-in type likewise doesn't remove it from any dropdown.

---

## G13 — Jurisdiction county-code conventions conflict

Three conventions coexist:

| Source | Convention | Example |
|--------|-----------|---------|
| `/admin/counties` (hardcoded, 67 entries) | 3-letter codes | `HIL`, `STJ`, `STL` |
| `/admin/jurisdictions/new` placeholder | Full name uppercase | `HILLSBOROUGH` (11 chars — **exceeds the 10-char max**) |
| [lib/florida-counties.ts](../../lib/florida-counties.ts) (New Permit dropdown) | Names, no codes | `Saint Johns`, `Saint Lucie` |

The counties page also spells them `St. Johns` / `St. Lucie` where the shared constant uses `Saint Johns` / `Saint Lucie`.

**Effect:** a jurisdiction created by hand following the placeholder gets a code the counties page cannot match, so the county still shows as **Unseeded** despite having requirements. And a package's free-text `county` from intake may not string-match any jurisdiction name.

---

## G14 — Export profile create/edit pages do not exist

`app/admin/export-profiles/` contains only `page.tsx`. That page links to `/admin/export-profiles/new` (from two buttons) and `/admin/export-profiles/{id}` (from every row's Edit). **Both 404.**

**Effect:** export profiles can only be created or modified by calling the API directly or seeding the database. The full CRUD API exists and is admin-gated; only the UI is missing. Until a profile exists, every ZIP export falls back to a flat layout with default naming.

---

## G15 — The notification system is entirely unimplemented

`NotificationEvent` is fully modeled: 12 typed events covering license and insurance expiry at multiple horizons, stalled packages, all four review transitions, export-ready, and checklist waivers; four statuses; two channels (`IN_APP`, `EMAIL`); a `scheduledFor` field for future delivery; and a `User.notifications` relation.

**No code creates, reads, sends, or displays a notification.** There is no bell icon, no notification list, and no email integration.

**Effect:** every alert in the system is **pull, not push** — the Operations Board notices, the contractors compliance filter, and the reports. A contractor's insurance can lapse and block submissions with nobody informed until someone looks at the right screen. Reviewers are not told they've been assigned; coordinators are not told a package was sent back.

---

## G16 — Daily snapshots are captured but never read

`POST /api/cron/snapshot` (secret-protected, idempotent) writes one `PackageSnapshot` per non-closed package per day, capturing status, stage, checklist %, verified-document %, days in stage, document count, and open comment count. The model is described as "Daily operational state capture for trend analytics".

**Nothing queries `PackageSnapshot`.** No report, no chart, no API endpoint.

**Effect:** the table grows daily with no consumer. The two unbuilt report types (`DOCUMENT_QUALITY`, `SUBMISSION_VOLUME`) are the obvious intended consumers.

---

## G17 — Review comments can never be resolved through the UI

`ReviewComment.isResolved` exists and `PATCH /api/review-comments/{id}` sets it, gated on `resolve_comment` (admin/coordinator). **No UI calls it.** The permit detail screen renders comments read-only; the review queue only counts them.

This matters because unresolved comments are a **readiness blocker**: `evaluateReadiness()` blocks with `OPEN_REVIEW_COMMENTS` when the most recent `SENT_BACK` assignment has any unresolved comment.

**Effect:** a sent-back package is **permanently blocked from re-entering review** through normal use. Send-back always creates a comment from the note, that comment can never be resolved, and its existence blocks the next assignment. The only escapes are an admin readiness override or direct API calls.

This is arguably the most consequential functional gap: it means the correction loop — send back, fix, resubmit — cannot complete.

---

## G18 — `RevisionsNeeded` status is never set

The status exists, has a badge color, and maps to the `us` court. The review send-back action sets `internalStage: 'InProgress'` and leaves `status` untouched.

**Effect:** a sent-back package keeps whatever status it had, so the permits list and Operations Board cannot distinguish it from one never reviewed. Its intended meaning — "county returned comments" vs. the internal send-back — is `[TBC]`; both readings are plausible and neither is implemented.

---

## G19 — Six pages render real data with no session check

**Verified by inspection of all 22 page components.**

Middleware ([middleware.ts](../../middleware.ts)) deliberately does not guard pages — loading Prisma in the Edge runtime is not viable — and returns `NextResponse.next()` for every non-public, non-API request. Its own comment states: *"For protected pages, authentication is checked in the page component itself."*

Only **four** page components actually do that:

| Page | Check |
|------|-------|
| `/` | Session → redirect to `/dashboard` or `/login` |
| `/dashboard` | Session, else `/login` |
| `/settings` | Session + `role === 'admin'`, else `/dashboard` |
| `/admin/export-profiles` | Session + `role === 'admin'`, else `/dashboard` |

**Six pages are server components that query Prisma directly and render the results, with no session check of any kind:**

| Page | Data rendered without authentication |
|------|--------------------------------------|
| `/permits` | Full permit register — project names, addresses, customer and contractor names, statuses, permit numbers |
| `/permits/[id]` | Complete package: customer and contractor detail, documents with uploader identities, tasks, and 50 activity-log entries |
| `/customers` | Customer directory — names, contacts, emails, phones |
| `/customers/[id]` | One customer plus all their permit packages |
| `/contractors` | Contractor directory — companies, license numbers, emails, phones |
| `/contractors/[id]` | One contractor plus all their permit packages |

Because these fetch server-side rather than through the APIs, **the API session checks never come into play** — there is nothing between an unauthenticated request and the rendered data.

A further seven pages (`/permits/new`, `/customers/new`, `/contractors/new`, `/reports`, `/review-queue`, and the four `/admin/counties` + `/admin/jurisdictions` screens) are client components with no page-level check. These are less severe — they render an empty shell because their `fetch` calls receive 401 — but they still present a full authenticated-looking UI to an anonymous visitor rather than redirecting.

**Effect:** customer names, contractor license numbers, project addresses, and permit histories are readable by anyone who can reach the deployment, without credentials.

**Not determined:** whether the actual deployment places authentication in front of the app (Cloud Run IAM, an identity-aware proxy, or Firebase App Hosting configuration) that compensates for this. The `trustHost: true` setting and the apphosting/Cloud Run references in the codebase indicate a proxied deployment, so a compensating control is plausible — but nothing in the application code provides one. **This should be verified against the live deployment before it is treated as either exploitable or safe.**

## G20 — Changing permit type does not resync the checklist

[lib/checklist-engine.ts](../../lib/checklist-engine.ts) exports both `generateChecklist()` (additive, idempotent) and `syncChecklist()` (prunes `PENDING` items whose requirement no longer applies, then adds new ones). The permit detail Regenerate button calls the **additive** one.

**Effect:** changing a package's permit type from Roofing to Building adds the Building requirements and **leaves every Roofing item in place**, including mandatory ones that now block the readiness gate for documents the job doesn't need. The fix requires manually waiving them (admin-only, API-only per [G4 context](#g4--document-category-dropdown-does-not-match-the-enum)) or an admin gate override.

`syncChecklist()` is never called from anywhere.

---

## Cross-cutting observations

**Duplicated thresholds.** The 3-day stall rule is hardcoded in four files; the 30-day compliance window in four. A policy change requires finding all of them.

**Duplicated checklist-completion logic.** Defined identically in three files, each carrying a comment insisting the others stay aligned — an invariant maintained by comment rather than by code.

**Two requirement editors, different capabilities.** `/admin/counties/{code}` has grouping, inline editing, version history, and restore. `/admin/jurisdictions/{id}` has none of those but can create, toggle, and delete. Same underlying data, two independently-built screens.

**Schema is ahead of the UI.** `DocumentTemplate` (merge-field forms), `NotificationEvent`, `PackageSnapshot`, document version groups, `ExportLog.downloadedAt`/`SUBMITTED`, and two report types are all modeled with no consumer. The database anticipates roughly a phase more product than exists.

**External dependencies are unauthenticated and browser-side.** The property panel calls the ArcGIS geocoder and the Florida cadastral layer directly from the browser on every view, with no key, no caching, no persistence, and no rate limiting.
