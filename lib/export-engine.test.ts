/**
 * Unit tests for export-engine fail-closed behavior helpers.
 * Run: npx tsx --test lib/export-engine.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ExportIncompleteError } from './export-engine'

describe('ExportIncompleteError', () => {
  it('carries missing document metadata for API 422 responses', () => {
    const missing = [{ id: 'doc-1', fileName: 'plans.pdf' }]
    const err = new ExportIncompleteError(
      'Export aborted: 1 document(s) missing from storage: plans.pdf',
      missing
    )

    assert.equal(err.name, 'ExportIncompleteError')
    assert.equal(err.missingDocuments.length, 1)
    assert.equal(err.missingDocuments[0].fileName, 'plans.pdf')
    assert.match(err.message, /missing from storage/)
  })
})
