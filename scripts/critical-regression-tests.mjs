import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const repoRoot = process.cwd()

function sqlite(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath], {
    input: sql,
    encoding: 'utf8',
  }).trim()
}

function testSeedBatchMigrationPreservesAuditLinks() {
  const tempDir = mkdtempSync(join(tmpdir(), 'permitpro-critical-'))
  const dbPath = join(tempDir, 'migration.db')

  try {
    sqlite(dbPath, `
      PRAGMA foreign_keys=ON;

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
        "snapshot" TEXT NOT NULL,
        CONSTRAINT "RequirementChangeLog_requirementId_fkey"
          FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "RequirementChangeLog_seedBatchId_fkey"
          FOREIGN KEY ("seedBatchId") REFERENCES "SeedBatch" ("id")
          ON DELETE SET NULL ON UPDATE CASCADE
      );

      INSERT INTO "Requirement" ("id") VALUES ('req-1');
      INSERT INTO "SeedBatch" (
        "id",
        "triggeredBy",
        "description",
        "status",
        "totalCounties",
        "totalRequirements",
        "skippedCount",
        "errorLog"
      ) VALUES (
        'batch-1',
        'admin-1',
        'seed before fix',
        'FAILED',
        NULL,
        NULL,
        NULL,
        'original error'
      );
      INSERT INTO "RequirementChangeLog" (
        "id",
        "requirementId",
        "changedBy",
        "seedBatchId",
        "action",
        "snapshot"
      ) VALUES (
        'log-1',
        'req-1',
        'admin-1',
        'batch-1',
        'CREATED',
        '{}'
      );
    `)

    const migrationSql = readFileSync(
      join(repoRoot, 'prisma/migrations/20260326235900_fix_seed_batch_columns/migration.sql'),
      'utf8'
    )
    sqlite(dbPath, migrationSql)

    const batch = sqlite(
      dbPath,
      'SELECT id, totalCounties, totalRequirements, skippedCount, errorMessage FROM "SeedBatch";'
    )
    assert.equal(batch, 'batch-1|0|0|0|original error')

    const seedBatchId = sqlite(
      dbPath,
      'SELECT seedBatchId FROM "RequirementChangeLog" WHERE id = \'log-1\';'
    )
    assert.equal(seedBatchId, 'batch-1')

    const foreignKeyErrors = sqlite(dbPath, 'PRAGMA foreign_key_check;')
    assert.equal(foreignKeyErrors, '')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function testRequirementDeleteRemainsSoftDeleteOnly() {
  const route = readFileSync(join(repoRoot, 'app/api/requirements/[id]/route.ts'), 'utf8')

  assert.doesNotMatch(route, /prisma\.requirement\.delete/)
  assert.match(route, /data:\s*\{\s*isActive:\s*false\s*\}/)
  assert.match(route, /softDeleted:\s*true/)
}

function testEntrypointFailsFastOnMigrationErrors() {
  const entrypoint = readFileSync(join(repoRoot, 'docker-entrypoint.sh'), 'utf8')

  assert.match(entrypoint, /set -e/)
  assert.match(entrypoint, /^\s*prisma migrate deploy\s*$/m)
  assert.doesNotMatch(entrypoint, /prisma migrate deploy\s*\|\|/)
}

function main() {
  const tests = [
    testSeedBatchMigrationPreservesAuditLinks,
    testRequirementDeleteRemainsSoftDeleteOnly,
    testEntrypointFailsFastOnMigrationErrors,
  ]

  for (const test of tests) {
    test()
    process.stdout.write(`PASS ${test.name}\n`)
  }
}

main()
