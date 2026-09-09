# Settings — User Management

> **Route:** `/settings`
> **Module:** Settings
> **Access:** **Admin only** — enforced in the page component
> **Source:** [app/settings/page.tsx](../../app/settings/page.tsx), [settings-client.tsx](../../app/settings/settings-client.tsx)

## Overview

The only user-administration screen: create staff accounts, change names, emails, roles, and passwords, and delete accounts. Since there is no self-registration and no password reset, every account lifecycle event happens here.

One of only three pages that verifies the session itself — no session redirects to `/login`, a non-admin redirects to `/dashboard`.

## Layout

```
┌─ Settings ──────────────────── [Add User] ─┐
│                                            │
│ [Add/Edit user form, when open]            │
│                                            │
│ Name │ Email │ Role │ Activity │ Docs │ Created │ Actions
│ …                                          │
└────────────────────────────────────────────┘
```

## Fields

### Add / edit user form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Email | Email | Yes | Must be unique — the schema enforces it |
| Name | Text | Yes | Display name shown throughout the app |
| Password | Password | **Yes on create, optional on edit** | Minimum 6 characters. Never pre-filled when editing; leaving it blank on edit keeps the existing password |
| Role | Select | Yes | See the role warning below |

### User table

| Column | Content |
|--------|---------|
| Name | Display name |
| Email | Login address |
| Role | Badge |
| Activity | Count of that user's activity-log entries |
| Docs | Count of documents they uploaded |
| Created | Account creation date |
| Actions | Edit / Delete |

## Interactions

### Page load
`GET /api/users`. A 401/403 sets "You do not have permission to access this page" rather than redirecting — though the server-side guard means a non-admin never gets this far.

### Create a user
Requires a password. `POST /api/users`, then the list re-fetches and the form closes.

### Edit a user
Pre-fills email, name, and role but **not** the password. `PATCH /api/users/{id}` — password is included only when the field is non-empty.

### Delete a user
Native `confirm()` — "Are you sure you want to delete this user? This action cannot be undone." — then `DELETE /api/users/{id}` and re-fetch.

### Errors
Permission failures show a fixed message; anything else surfaces the API error text.

## API Dependencies

| API | Method | Path | Notes |
|-----|--------|------|-------|
| List users | GET | `/api/users` | `requireAdmin()` — one of only two routes using the helper |
| Create user | POST | `/api/users` | `requireAdmin()`; bcrypt-hashes the password |
| Update user | PATCH | `/api/users/{id}` | `requireAdmin()` |
| Delete user | DELETE | `/api/users/{id}` | `requireAdmin()` |

## Page Relationships

- **From:** "Settings" item in the admin nav section (visible only to admins)
- **To:** Nothing — a leaf page
- **Data coupling:** Users are referenced as coordinators, reviewers, uploaders, and comment authors. Deletion interacts with those references — see below.

## Business Rules

- **The role dropdown offers only two of the three roles.** The client types role as `'user' | 'admin'` and its form defaults to `'user'`, but the actual system roles are `admin`, `coordinator`, and `reviewer`. `'user'` is a legacy value that `normalizeRole()` silently maps to `coordinator`. **There is no way to create a `reviewer` from this screen** — which means the review workflow's reviewer accounts cannot be provisioned through the UI at all. See [G10](../appendix/gaps-and-open-questions.md#g10--settings-cannot-create-a-reviewer-account).
- **A role change does not take effect until the affected user signs in again.** Roles live in the JWT.
- **Password changes are silent.** The affected user is not notified, and nothing records that an admin changed it.
- **Nothing prevents an admin from deleting or demoting themselves**, or from deleting the last remaining admin — which would lock the firm out of user management and every other admin-only function permanently.
- **Deleting a user with history is constrained by the schema.** `PermitDocument.uploadedBy` and `ReviewComment.authorId` are required relations without cascade, so a delete of a user who has uploaded documents or authored comments will fail at the database level. `[TBC]` — the UI presents delete unconditionally and would surface a raw database error.
- **The activity and document counts are the only usage signal** offered before deleting an account.
