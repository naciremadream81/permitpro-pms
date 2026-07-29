/**
 * Regression guards for critical data-integrity invariants.
 * Run: npx tsx --test lib/data-integrity.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

describe('requirement DELETE soft-delete invariant', () => {
  it('never hard-deletes requirements (preserves RequirementChangeLog)', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/requirements/[id]/route.ts'),
      'utf8'
    )
    assert.match(source, /Always soft-delete/)
    assert.doesNotMatch(
      source,
      /prisma\.requirement\.delete\(/,
      'Hard delete would CASCADE-wipe RequirementChangeLog audit rows'
    )
  })
})

describe('jurisdiction DELETE soft-delete invariant', () => {
  it('never hard-deletes jurisdictions (preserves requirement catalogs)', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/jurisdictions/[id]/route.ts'),
      'utf8'
    )
    assert.match(source, /Soft-delete only/)
    assert.doesNotMatch(
      source,
      /prisma\.jurisdiction\.delete\(/,
      'Hard delete would CASCADE-wipe Requirements and change logs'
    )
    assert.match(source, /isActive:\s*false/)
  })
})

describe('docker entrypoint migration fail-closed', () => {
  it('does not swallow prisma migrate deploy failures', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'docker-entrypoint.sh'),
      'utf8'
    )
    assert.match(source, /prisma migrate deploy/)
    assert.doesNotMatch(
      source,
      /prisma migrate deploy\s*\|\|/,
      'Swallowed migrate failures allow the app to boot against a drifted schema'
    )
  })
})

describe('export engine fail-closed on missing storage', () => {
  it('throws ExportIncompleteError before writing ExportLog', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/export-engine.ts'),
      'utf8'
    )
    assert.match(source, /ExportIncompleteError/)
    assert.match(source, /missingDocuments\.length > 0/)
    // Ensure we no longer silently continue past missing blobs into GENERATED
    const missingHandler = source.slice(
      source.indexOf('missingDocuments'),
      source.indexOf('// Build archive')
    )
    assert.match(missingHandler, /throw new ExportIncompleteError/)
  })
})
