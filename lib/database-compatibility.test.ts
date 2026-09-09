import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { databaseUrl } from './database-url'

test('SQLite URLs retain schema-relative paths', () => {
  assert.equal(databaseUrl('file:./dev.db'), `file:${path.resolve('prisma/dev.db')}`)
  assert.equal(databaseUrl('file:/app/data/dev.db'), 'file:/app/data/dev.db')
  assert.equal(databaseUrl('file::memory:'), 'file::memory:')
  assert.throws(() => databaseUrl('postgres://localhost/test'), /SQLite/)
})

test('Prisma 7 reads and writes existing Prisma 6 millisecond timestamps', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'permitpro-prisma-'))
  const filename = path.join(dir, 'test.db')
  const db = new Database(filename)
  db.exec(`CREATE TABLE User (
    id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL,
    passwordHash TEXT NOT NULL, role TEXT NOT NULL,
    createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL
  )`)
  const date = new Date('2026-01-02T12:34:56.000Z')
  db.prepare('INSERT INTO User VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('legacy', 'test@example.com', 'Test', 'hash', 'coordinator', date.getTime(), date.getTime())
  db.close()
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${filename}` }, { timestampFormat: 'unixepoch-ms' }),
  })
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: 'legacy' } })
    assert.equal(user.createdAt.toISOString(), date.toISOString())
    await prisma.user.update({ where: { id: 'legacy' }, data: { name: 'Updated' } })
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: 'legacy' } })
    assert.equal(updated.name, 'Updated')
    const rows = await prisma.$queryRawUnsafe<Array<{ storageType: string }>>(
      'SELECT typeof(updatedAt) AS storageType FROM User WHERE id = \'legacy\''
    )
    assert.equal(rows[0].storageType, 'integer')
  } finally {
    await prisma.$disconnect()
    await rm(dir, { recursive: true, force: true })
  }
})
