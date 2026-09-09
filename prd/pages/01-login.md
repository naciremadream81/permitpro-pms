# Login

> **Route:** `/login`
> **Module:** Authentication
> **Access:** Public (the only public page)
> **Source:** [app/login/page.tsx](../../app/login/page.tsx)

## Overview

The single entry point to the system. Staff sign in with a company email address and password; there is no self-registration, no password reset, and no SSO — accounts are created by an administrator in Settings.

## Layout

A single centered card on an empty canvas, roughly 384px wide:

```
        Permit·Pro                    ← wordmark
  Permit coordination & document management

┌────────────────────────────────────┐
│ Sign in to your account            │
│                                    │
│ [error banner, when present]       │
│                                    │
│ Email address                      │
│ [                              ]   │
│                                    │
│ Password                           │
│ [                              ]   │
│                                    │
│ [        Sign in        ]          │
└────────────────────────────────────┘
```

## Fields

| Field | Type | Required | Autocomplete | Placeholder | Notes |
|-------|------|----------|--------------|-------------|-------|
| Email address | Email input | Yes | `email` | `you@company.com` | Browser-enforced email format |
| Password | Password input | Yes | `current-password` | `Enter your password` | No minimum enforced client-side; the account-creation form requires 6+ characters |

## Interactions

### Page load
Nothing is fetched. The form renders empty and ready.

### Sign in
- **Trigger:** Submit the form (button click or Enter)
- **Behavior:** Button label becomes "Signing in…" and disables to prevent double submission. Credentials are passed to NextAuth with `redirect: false` so the page controls the outcome itself.
- **On success:** Navigate to `/dashboard` and refresh server data so the new session is picked up.
- **On invalid credentials:** Show `Invalid email or password` in a red banner with `role="alert"`. Deliberately does not reveal whether the email exists.
- **On unexpected error:** Show `An error occurred. Please try again.`
- **Either way:** The loading state clears so the user can retry.

## API Dependencies

| API | Method | Path | Trigger | Notes |
|-----|--------|------|---------|-------|
| NextAuth sign-in | POST | `/api/auth/callback/credentials` | Form submit | Called indirectly via `signIn('credentials')`. Verifies the bcrypt hash and issues a JWT |

## Page Relationships

- **From:** `/` (root redirects here when there is no session); any NextAuth-protected flow
- **To:** `/dashboard` on success
- **Note:** The app shell (header, nav, AI assistant) is absent here — this page renders outside `AppLayout`.

## Business Rules

- **No self-service account creation.** Users exist only if an admin created them.
- **No password reset flow exists.** A locked-out user needs an admin to set a new password in Settings.
- **Role is fixed at sign-in.** It is baked into the JWT; a role change by an admin does not take effect until the affected user's token is reissued (next sign-in).
- **Failed attempts are not rate-limited or recorded.** There is no lockout, no attempt counter, and no audit entry for a failed sign-in. `[TBC]` — whether this is acceptable for the deployment's threat model is a product decision.
