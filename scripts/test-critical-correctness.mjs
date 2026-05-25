import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import seedData from '../lib/counties-seed-data'
import permitTypeHelpers from '../lib/permit-types'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const { DEFAULT_PERMIT_TYPES } = seedData
const { ensureDefaultPermitTypes } = permitTypeHelpers

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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'permitpro-entrypoint-'))
  const nodeMarker = path.join(tempDir, 'node-started')

  fs.writeFileSync(
    path.join(tempDir, 'prisma'),
    '#!/bin/sh\n[ "$1 $2" = "migrate deploy" ] || exit 64\nexit 42\n',
    { mode: 0o755 }
  )
  fs.writeFileSync(
    path.join(tempDir, 'node'),
    `#!/bin/sh\ntouch "${nodeMarker}"\nexit 0\n`,
    { mode: 0o755 }
  )

  try {
    const result = spawnSync(path.join(repoRoot, 'docker-entrypoint.sh'), {
      cwd: repoRoot,
      env: { ...process.env, PATH: `${tempDir}:${process.env.PATH}` },
      encoding: 'utf8',
    })

    assert.equal(result.status, 42, 'entrypoint must exit with the Prisma failure status')
    assert.equal(fs.existsSync(nodeMarker), false, 'entrypoint must not start Next.js after migration failure')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function testPermitTypeDefaultsBackfillPartialTables() {
  const rows = [
    {
      id: 'custom_1',
      code: 'Custom',
      label: 'Custom',
      description: null,
      isBuiltIn: false,
      isActive: true,
      order: 99,
    },
    {
      id: 'Building',
      code: 'Building',
      label: 'Building',
      description: 'New construction, additions, and alterations',
      isBuiltIn: true,
      isActive: true,
      order: 1,
    },
  ]
  const upsertedCodes = []
  const db = {
    permitTypeDefinition: {
      findMany: async () => [...rows].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
      upsert: async ({ where, create }) => {
        upsertedCodes.push(where.code)
        const existing = rows.find(row => row.code === where.code)
        if (existing) return existing

        const row = {
          id: create.code,
          code: create.code,
          label: create.label,
          description: create.description,
          isBuiltIn: create.isBuiltIn,
          isActive: true,
          order: create.order,
          createdBy: create.createdBy,
        }
        rows.push(row)
        return row
      },
    },
  }

  const result = await ensureDefaultPermitTypes(db, 'admin_1')
  const resultCodes = new Set(result.map(row => row.code))

  for (const permitType of DEFAULT_PERMIT_TYPES) {
    assert.ok(resultCodes.has(permitType.code), `missing default permit type ${permitType.code}`)
  }
  assert.ok(resultCodes.has('Custom'), 'custom permit types must be preserved')
  assert.equal(upsertedCodes.includes('Building'), false, 'existing defaults should not be rewritten')

  const missingDefaultCodes = DEFAULT_PERMIT_TYPES
    .map(permitType => permitType.code)
    .filter(code => code !== 'Building')
  assert.deepEqual(upsertedCodes, missingDefaultCodes)

  for (const code of missingDefaultCodes) {
    const row = rows.find(permitType => permitType.code === code)
    assert.equal(row.isBuiltIn, true)
    assert.equal(row.createdBy, 'admin_1')
  }
}

function testPermitTypesPageDoesNotRunFullCountySeed() {
  const page = readRepoFile('app/admin/counties/permit-types/page.tsx')

  assert.doesNotMatch(
    page,
    /\/api\/admin\/counties\/seed/,
    'permit types page must not trigger the full county seed while loading definitions'
  )
}

await testSeedBatchMigrationPreservesAuditData()
await testDockerEntrypointFailsFastOnMigrationErrors()
await testPermitTypeDefaultsBackfillPartialTables()
await testPermitTypesPageDoesNotRunFullCountySeed()

console.log('Critical correctness regression checks passed')
