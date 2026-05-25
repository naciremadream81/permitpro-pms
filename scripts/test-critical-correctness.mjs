import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function testSeedBatchMigrationPreservesAuditData() {
  const migrationSql = readRepoFile('prisma/migrations/20260326235900_fix_seed_batch_columns/migration.sql')
  const dbPath = path.join(os.tmpdir(), `permitpro-critical-${process.pid}.db`)
  const db = new Database(dbPath)

  try {
    db.pragma('foreign_keys = ON')
    db.exec(`
      CREATE TABLE "Requirement" (
        "id" TEXT NOT NULL PRIMARY KEY
      );

      CREATE TABLE "SeedBatch" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "triggeredBy" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "totalCounties" INTEGER,
        "totalRequirements" INTEGER,
        "skippedCount" INTEGER,
        "errorLog" TEXT,
        "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" DATETIME
      );

      CREATE TABLE "RequirementChangeLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "requirementId" TEXT NOT NULL,
        "changedBy" TEXT NOT NULL,
        "seedBatchId" TEXT,
        "action" TEXT NOT NULL,
        "fieldName" TEXT,
        "oldValue" TEXT,
        "newValue" TEXT,
        "snapshot" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RequirementChangeLog_requirementId_fkey"
          FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "RequirementChangeLog_seedBatchId_fkey"
          FOREIGN KEY ("seedBatchId") REFERENCES "SeedBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      INSERT INTO "Requirement" ("id") VALUES ('req_1');
      INSERT INTO "SeedBatch" (
        "id", "triggeredBy", "description", "status",
        "totalCounties", "totalRequirements", "skippedCount", "errorLog"
      ) VALUES (
        'batch_1', 'admin_1', 'original seed', 'COMPLETED',
        NULL, 42, NULL, 'legacy error text'
      );
      INSERT INTO "RequirementChangeLog" (
        "id", "requirementId", "changedBy", "seedBatchId", "action", "snapshot"
      ) VALUES (
        'change_1', 'req_1', 'admin_1', 'batch_1', 'CREATED', '{}'
      );
    `)

    db.exec(migrationSql)

    const batch = db.prepare('SELECT * FROM "SeedBatch" WHERE "id" = ?').get('batch_1')
    assert.ok(batch, 'SeedBatch migration must preserve existing seed batches')
    assert.equal(batch.errorMessage, 'legacy error text')
    assert.equal(batch.totalCounties, 0)
    assert.equal(batch.totalRequirements, 42)
    assert.equal(batch.skippedCount, 0)

    const change = db.prepare('SELECT "seedBatchId" FROM "RequirementChangeLog" WHERE "id" = ?').get('change_1')
    assert.equal(change.seedBatchId, 'batch_1', 'RequirementChangeLog must keep its SeedBatch audit link')

    const columns = db.prepare('PRAGMA table_info("SeedBatch")').all().map(column => column.name)
    assert.ok(columns.includes('errorMessage'), 'SeedBatch must expose errorMessage after migration')
    assert.ok(!columns.includes('errorLog'), 'SeedBatch must remove the legacy errorLog column')

    const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all()
    assert.deepEqual(foreignKeyErrors, [])
  } finally {
    db.close()
    fs.rmSync(dbPath, { force: true })
  }
}

function testDockerEntrypointFailsFastOnMigrationErrors() {
  const entrypoint = readRepoFile('docker-entrypoint.sh')

  assert.match(entrypoint, /prisma migrate deploy/, 'entrypoint must run Prisma migrations before startup')
  assert.doesNotMatch(
    entrypoint,
    /prisma migrate deploy\s*\|\|/,
    'entrypoint must not swallow Prisma migration failures'
  )
}

function testPermitTypesPageDoesNotRunFullCountySeed() {
  const page = readRepoFile('app/admin/counties/permit-types/page.tsx')

  assert.doesNotMatch(
    page,
    /\/api\/admin\/counties\/seed/,
    'permit types page must not trigger the full county seed while loading definitions'
  )
}

testSeedBatchMigrationPreservesAuditData()
testDockerEntrypointFailsFastOnMigrationErrors()
testPermitTypesPageDoesNotRunFullCountySeed()

console.log('Critical correctness regression checks passed')
