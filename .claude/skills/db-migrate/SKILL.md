---
name: db-migrate
description: Guide Prisma schema changes, create migrations, and regenerate the client for PermitPro. Use when adding/modifying database models or fields.
---

You are guiding a Prisma schema change for PermitPro PMS, which uses SQLite via Prisma ORM.

## Workflow

1. **Read the schema first**
   Read `prisma/schema.prisma` to understand the existing models before making any changes.

2. **Make the schema change**
   Edit `prisma/schema.prisma` — add/modify models, fields, relations, or indexes.

   Key conventions in this project:
   - IDs: `String @id @default(cuid())`
   - Timestamps: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
   - Add `@@index([fieldName])` for fields used in WHERE clauses or lookups
   - Enums are defined at the bottom of the schema file
   - Relations follow the pattern: FK field + `@relation(fields: [...], references: [...])`

3. **Create the migration**
   ```bash
   npx prisma migrate dev --name <descriptive-kebab-case-name>
   ```
   Use a name that describes what changed, e.g. `add-permit-notes-field` or `create-invoice-table`.

4. **Regenerate the Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Update affected TypeScript**
   - Check `lib/validations.ts` — update or add zod schemas for the changed model
   - Check relevant `app/api/` routes — update Prisma queries to include/exclude new fields
   - Check `app/` pages — update TypeScript types if you're passing model data as props

6. **Update seed data if needed**
   If the changed model has seed data, update `prisma/seed.ts` to include the new fields.
   Run with: `npx tsx prisma/seed.ts`

## Data Models Reference

Models in `prisma/schema.prisma`:
- `User` — auth, roles (user/admin)
- `Customer` — permit applicants
- `Contractor` — licensed contractors on permits
- `PermitPackage` — the main permit entity (links customer + contractor)
- `PermitDocument` — uploaded files attached to permits
- `ActivityLog` — audit trail for user actions
- Check the schema for any additional models added since this was written.

## Database File

The SQLite database is at `prisma/dev.db` (set via `DATABASE_URL` env var).
Never edit the `.db` file directly — always use Prisma migrations.
