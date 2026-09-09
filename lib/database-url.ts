import path from 'node:path'

/** Preserve Prisma 6's schema-relative SQLite paths after upgrading the adapter. */
export function databaseUrl(url = process.env.DATABASE_URL ?? 'file:./dev.db') {
  if (!url.startsWith('file:')) throw new Error('DATABASE_URL must be a SQLite file URL')
  const file = url.slice(5)
  if (file === ':memory:' || path.isAbsolute(file)) return url
  return `file:${path.resolve(process.cwd(), 'prisma', file)}`
}
