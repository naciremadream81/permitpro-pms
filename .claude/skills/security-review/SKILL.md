---
name: security-review
description: Review PermitPro API routes, auth flows, and file handling for security vulnerabilities. Use before completing any work touching auth, document upload, or user data.
---

You are performing a security review of PermitPro PMS — a Next.js 14 app with authentication, role-based access control, document uploads, and a SQLite database.

## Scope

Review the files specified by the user, or if no files are specified, review all `app/api/` routes plus `lib/auth.ts`, `lib/storage.ts`, and `middleware.ts`.

## Checklist

### 1. Authentication on every route
Every API route handler must call `getServerSession(authOptions)` and return 401 if null.

```ts
// Required at the start of every handler
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

Flag any route that:
- Is missing the session check entirely
- Calls session check after doing database work
- Uses the session result without null-checking

### 2. Role-based access control
Admin-only operations (user management, sensitive reports, settings) must check `session.user.role === 'admin'` and return 403.

Flag any route that:
- Performs admin actions without a role check
- Returns all user data to non-admin users

### 3. Input validation
Every POST, PUT, PATCH route must validate the request body with zod before touching the database.

```ts
const validated = schema.safeParse(body)
if (!validated.success) return NextResponse.json({ error: validated.error.flatten() }, { status: 400 })
```

Flag any route that:
- Uses `body.field` directly from `request.json()` without zod validation
- Passes unvalidated user input to a Prisma query

### 4. Sensitive data exposure
User queries must never return `passwordHash`.

```ts
// Safe
await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } })

// Unsafe — returns passwordHash
await prisma.user.findMany()
```

Flag any query that fetches User records without excluding `passwordHash`.

### 5. File upload security (`lib/storage.ts`)
Check for:
- Path traversal: filenames must be sanitized before being used in file paths
- File type validation: MIME type or extension whitelist should be enforced
- File size limits: large uploads should be rejected before processing
- Files should be stored outside the public web root or behind auth checks

### 6. Middleware coverage (`middleware.ts`)
Check that the Next.js middleware protects all authenticated routes and correctly excludes only public paths (`/login`, `/api/auth`).

### 7. Environment variables
Secrets (database URL, auth secret, API keys) must come from `process.env`, never be hardcoded.

## Output Format

Report findings as:

**[CRITICAL]** — exploitable, must fix now
**[HIGH]** — likely exploitable, fix before merge
**[MEDIUM]** — defense-in-depth, fix soon
**[LOW]** — best practice, fix when convenient

For each finding include:
- File and line number
- What the vulnerability is
- A concrete fix with code example

If no issues are found, say so explicitly.
