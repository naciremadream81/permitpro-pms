# Contractor Detail

> **Route:** `/contractors/[id]`
> **Module:** Contractors
> **Access:** All roles
> **Source:** [app/contractors/[id]/page.tsx](../../app/contractors/[id]/page.tsx), [contractor-detail-client.tsx](../../app/contractors/[id]/contractor-detail-client.tsx), [vault-panel.tsx](../../components/contractors/vault-panel.tsx)

## Overview

One contractor's record, their **compliance document vault**, and their linked permit packages. The vault is the important part: it holds the license, insurance, and tax documents whose expiry dates hard-block permit submission, so this is where a coordinator resolves a readiness blocker.

## Layout

```
┌─ Reliable Roofing Inc ──────────────────────────┐
│ CONTRACTOR INFORMATION                          │  ← inline-editable
│ Company · License · Phone · Email · Address     │
│ Preferred contact · Specialties                 │
│ Workers Comp exp. · Liability exp. · Notes      │
├─────────────────────────────────────────────────┤
│ COMPLIANCE VAULT                                │  ← 5 slot cards
│ ┌──────────┐┌──────────┐┌──────────┐            │
│ │ LICENSE  ││WORKERS   ││LIABILITY │            │
│ │ ✓ Valid  ││⚠ Expiring││✗ Expired │            │
│ │Expires…  ││Expires…  ││Expires…  │            │
│ │[Upload   ││[Upload   ││[Upload   │            │
│ │ renewal] ││ renewal] ││ renewal] │            │
│ └──────────┘└──────────┘└──────────┘            │
│ ┌──────────┐┌──────────┐                        │
│ │ W-9      ││ OTHER    │                        │
│ └──────────┘└──────────┘                        │
├─────────────────────────────────────────────────┤
│ PERMIT PACKAGES (12)                            │
│ Project │ Customer │ Type │ Status │ Opened     │
└─────────────────────────────────────────────────┘
```

## Fields

### Contractor information (all inline-editable)

| Field | Type | Options |
|-------|------|---------|
| Company Name | Text | |
| License Number | Text | |
| Phone | Tel | |
| Email | Email | |
| Address | Text | |
| Preferred Contact Method | Select | (blank), Phone, Email, Text |
| Specialties | Text | Free text, placeholder `e.g., Electrical, Plumbing, HVAC` — **not the checkbox group used at creation** |
| Workers Comp Expiration Date | Date | Legacy field |
| Liability Expiration Date | Date | Legacy field |
| Notes | Textarea | |

### Compliance vault — five fixed slots

One card per document type, each showing the **current (non-superseded)** document for that type:

| Slot | Label | Blocks submission when |
|------|-------|------------------------|
| `LICENSE` | Contractor License | Expired |
| `WORKERS_COMP` | Workers Compensation | Expired **or expiring within 7 days** |
| `LIABILITY` | Liability Insurance | Expired **or expiring within 7 days** |
| `W9` | W-9 | Never — tracked for reporting only |
| `OTHER` | Other | Never |

| Card element | Behavior |
|--------------|----------|
| Expiry status | `Valid` (green check) / `Expiring Soon` (amber warning) / `Expired` (red X) / `No date set` (grey clock). Card border and text take the matching color |
| Document name | Filename, truncated |
| Expiry line | `Expires {date}`, colored by status |
| `Mark verified` link | Shown only when the document exists and is unverified |
| `✓ Verified` | Shown once verified |
| Upload button | Label is `Upload` when the slot is empty, `Upload renewal` when occupied |

Empty slots read "Not on file".

### Upload modal

| Field | Type | Required | Accepts |
|-------|------|----------|---------|
| File | File | **Yes** | `.pdf,.jpg,.jpeg,.png` — narrower than the 10 types the storage layer permits |
| Issue Date | Date | No | |
| Expiration Date | Date | No | |

The document name is taken automatically from the filename; there is no field for it.

### Permit packages table
Project name (link), customer name, permit type, status badge, opened date. Ordered newest first.

## Interactions

### Page load
Server component fetches the contractor with all linked packages (each including customer ID and name). The vault panel then independently fetches `/api/contractors/{id}/documents` and **filters out superseded documents client-side**.

### Edit a field
Click Edit → input → Save PATCHes just that field → re-fetch.

### Upload a compliance document
Opens a modal for the chosen slot. On confirm, posts multipart form data with the file, type, auto-derived name, and any dates. On success the modal closes and the vault re-fetches. The API computes an `expiryStatus` per document that the panel renders directly.

### Mark verified
PATCHes `{isVerified: true}` on the document, then re-fetches.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| Update contractor | PATCH | `/api/contractors/{id}` | Save an inline field | Auth + `update` on `contractor` |
| List vault documents | GET | `/api/contractors/{id}/documents` | Vault mount, after upload/verify | Returns documents with a computed `expiryStatus` |
| Upload vault document | POST | `/api/contractors/{id}/documents` | Upload modal | multipart/form-data |
| Update vault document | PATCH | `/api/contractor-documents/{id}` | Mark verified | Also supports status, dates, notes, and `isSuperseded` |
| Delete contractor | DELETE | `/api/contractors/{id}` | — | **Admin only**; `[TBC]` whether the UI exposes it |

## Page Relationships

- **From:** `/contractors` register; permit detail "Contractor" link; Contractor Compliance report rows
- **To:** `/permits/{id}` for each linked package
- **Data coupling:** Uploading or renewing a vault document can **immediately unblock the readiness gate** on every package assigned to this contractor, and changes the Operations Board compliance notice and the Contractor Compliance report.

## Business Rules

- **This screen is the fix for a contractor-compliance readiness blocker.** When a package can't enter review because insurance is expired, the resolution is uploading a renewal here — nothing on the permit screen can clear it.
- **Uploading a renewal does not automatically supersede the prior document.** The schema has `isSuperseded` and the API accepts it, but the upload flow never sets it. The vault shows the *first* matching non-superseded document per type (`documents.find(...)`), so after a renewal the slot may display whichever record comes first rather than the newest. `[TBC]` — the intended behavior is clearly that a renewal supersedes, but no code performs it. See [G6](../appendix/gaps-and-open-questions.md#g6--vault-renewals-never-mark-the-prior-document-superseded).
- **Insurance blocks submission a week before it lapses; a license blocks only once actually expired.** Workers comp and liability use a 7-day forward-blocking window; the license only warns at 30 days and blocks at expiry. The asymmetry is deliberate — you cannot submit on insurance that will lapse mid-review.
- **W-9 and Other never block anything.** They are tracked for completeness and appear in the compliance report, but the readiness engine ignores them.
- **The specialties field changes shape between create and edit.** A checkbox group on creation, free text here — so an edit can silently produce values that don't match the original vocabulary.
- **Deleting a contractor cascades to their permit packages**, same as customers. Admin-only.
- **The upload modal accepts a narrower file set than the platform allows** (4 types vs 10). Uploading a contractor's insurance certificate as a `.docx` is blocked here by the file picker, though the backend would accept it.
