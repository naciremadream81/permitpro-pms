---
name: new-api-route
description: Create a new Next.js App Router API route for PermitPro following project conventions. Use when adding a new endpoint under app/api/.
---

You are creating a new API route for PermitPro PMS — a Next.js 14 App Router application.

## Before Writing Code

1. Read an existing similar route for the pattern, e.g.:
   - `app/api/permits/route.ts` — collection GET + POST
   - `app/api/permits/[id]/route.ts` — single-item GET + PUT + DELETE
2. Read `lib/validations.ts` to see existing zod schemas and add yours there.
3. Read `lib/prisma.ts` — always import the singleton client, never `new PrismaClient()`.
4. Read `lib/auth.ts` — use the session helper defined there.

## File Location

```
app/api/<resource>/route.ts          # GET all, POST new
app/api/<resource>/[id]/route.ts     # GET one, PUT, DELETE
```

## Route Template

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth.config'
import { prisma } from '@/lib/prisma'
import { mySchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await prisma.myModel.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: items })
  } catch (error) {
    console.error('GET /api/resource error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = mySchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.flatten() }, { status: 400 })
    }

    const item = await prisma.myModel.create({ data: validated.data })
    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error) {
    console.error('POST /api/resource error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Rules

1. **Always check session first** — every route must verify auth before doing anything
2. **Use the Prisma singleton** — `import { prisma } from '@/lib/prisma'`, never instantiate directly
3. **Validate all request bodies** — use zod via `schema.safeParse()`, add new schemas to `lib/validations.ts`
4. **Consistent response shape**:
   - Success: `{ data: ... }` with appropriate 2xx status
   - Error: `{ error: "..." }` with appropriate 4xx/5xx status
5. **HTTP status codes**:
   - `401` — not authenticated
   - `403` — authenticated but not authorized (e.g., non-admin accessing admin route)
   - `400` — validation failure
   - `404` — resource not found
   - `201` — successful creation
   - `500` — unexpected server error
6. **Admin-only routes** — check `session.user.role === 'admin'` and return 403 if not
7. **Never return `passwordHash`** — exclude it from any User queries: `select: { passwordHash: false }`

## Zod Schema (add to `lib/validations.ts`)

```ts
import { z } from 'zod'

export const myResourceSchema = z.object({
  name: z.string().min(1),
  // ... fields matching the Prisma model
})

export type MyResourceInput = z.infer<typeof myResourceSchema>
```
