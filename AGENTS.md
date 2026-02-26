# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

PermitPro PMS — a Next.js 14 full-stack permit management system with Prisma ORM (SQLite), NextAuth v5 authentication, and TailwindCSS. See `README.md` for full feature list, API routes, and project structure.

### Gotchas

- **Prisma schema engine cannot create SQLite databases** in this environment due to sandbox restrictions. The `npx prisma migrate dev` and `npx prisma db push` commands fail with "Permission denied (os error 13)". Migrations must be applied manually using `sqlite3` (see update script or the manual migration steps below). `npx prisma generate` works fine.
- **DATABASE_URL must use absolute path with triple-slash** for SQLite: `file:///<workspace>/prisma/dev.db` (replace `<workspace>` with the actual workspace path). The relative `file:./dev.db` form causes runtime errors because the Prisma Client resolves it from a different location than the schema engine.
- **`tsx` does not auto-load `.env`** files. When running seed or other scripts via `tsx`, you must export `DATABASE_URL` in the shell environment first (e.g., `export DATABASE_URL="file:///<workspace>/prisma/dev.db"`).
- The `setup-db.sh` script is interactive (has `read -p` prompts) and cannot be used non-interactively.

### Running the dev server

```bash
export DATABASE_URL="file:///$PWD/prisma/dev.db"
npm run dev
```

The app runs on port 3000. It redirects to `/login` when unauthenticated.

**Demo credentials** (created by seed): `admin@permitco.com` / `admin123`, `user@permitco.com` / `user123`.

### Standard commands

See `package.json` `scripts` section for all commands. Key ones:

- `npm run lint` — ESLint
- `npm run build` — production build
- `npm run db:seed` — seed database (requires `DATABASE_URL` exported)
- `npx prisma generate` — regenerate Prisma client after schema changes

### Manual migration application (when prisma migrate is blocked)

```bash
# Apply each migration SQL file using sqlite3:
sqlite3 prisma/dev.db < prisma/migrations/<migration_name>/migration.sql

# Then register it in the _prisma_migrations table:
sqlite3 prisma/dev.db "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ('$(openssl rand -hex 16)', '$(sha256sum prisma/migrations/<migration_name>/migration.sql | cut -d' ' -f1)', datetime('now'), '<migration_name>', 1);"
```
