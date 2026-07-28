/**
 * Unit tests for checklist update/waive schemas.
 * Ensures readiness-skipping statuses cannot slip through the coordinator path.
 * Run: npx tsx --test lib/checklist-item-validation.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  checklistItemUpdateSchema,
  checklistItemWaiveSchema,
} from './validations'

describe('checklistItemUpdateSchema', () => {
  it('accepts operational statuses', () => {
    const parsed = checklistItemUpdateSchema.parse({ status: 'VERIFIED' })
    assert.equal(parsed.status, 'VERIFIED')
  })

  it('rejects WAIVED (must use waive schema + admin)', () => {
    assert.throws(() => checklistItemUpdateSchema.parse({ status: 'WAIVED' }))
  })

  it('rejects NOT_APPLICABLE (must use waive schema + admin)', () => {
    assert.throws(() =>
      checklistItemUpdateSchema.parse({ status: 'NOT_APPLICABLE' })
    )
  })
})

describe('checklistItemWaiveSchema', () => {
  it('requires a reason of at least 10 characters', () => {
    assert.throws(() =>
      checklistItemWaiveSchema.parse({ status: 'NOT_APPLICABLE', waiverReason: 'too short' })
    )
  })

  it('accepts NOT_APPLICABLE with a valid reason', () => {
    const parsed = checklistItemWaiveSchema.parse({
      status: 'NOT_APPLICABLE',
      waiverReason: 'Does not apply to this mobile home install',
    })
    assert.equal(parsed.status, 'NOT_APPLICABLE')
  })

  it('defaults status to WAIVED when omitted', () => {
    const parsed = checklistItemWaiveSchema.parse({
      waiverReason: 'County accepted alternate documentation set',
    })
    assert.equal(parsed.status, 'WAIVED')
  })
})
