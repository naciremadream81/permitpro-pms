/**
 * Court resolution regressions.
 * Run: npx tsx --test lib/court.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveCourt,
  statusToCourt,
  isInternalTaskName,
  hasContractorBlockingTask,
} from './court'

describe('resolveCourt', () => {
  it('keeps county and closed statuses regardless of tasks', () => {
    const tasks = [{ name: 'Collect contractor documents' }]
    assert.equal(resolveCourt('Submitted', tasks), 'county')
    assert.equal(resolveCourt('FinaledClosed', tasks), 'closed')
  })

  it('moves us/field packages with contractor-blocking open tasks to contractor', () => {
    assert.equal(
      resolveCourt('New', [{ name: 'Collect contractor documents' }]),
      'contractor'
    )
    assert.equal(
      resolveCourt('Issued', [{ name: 'Schedule inspection with contractor' }]),
      'contractor'
    )
  })

  it('does not move packages whose only open tasks are internal coordinator work', () => {
    assert.equal(resolveCourt('New', [{ name: 'Send to Billing' }]), 'us')
    assert.equal(resolveCourt('New', [{ name: 'Follow up with county' }]), 'us')
    assert.equal(resolveCourt('Approved', [{ name: 'Send to Billing' }]), 'us')
  })

  it('treats mixed open tasks as contractor-blocking when any task qualifies', () => {
    assert.equal(
      resolveCourt('New', [
        { name: 'Follow up with county' },
        { name: 'Collect contractor documents' },
      ]),
      'contractor'
    )
  })

  it('leaves us/field packages without open tasks in their status court', () => {
    assert.equal(resolveCourt('New', []), statusToCourt('New'))
    assert.equal(resolveCourt('Inspections', []), statusToCourt('Inspections'))
  })
})

describe('isInternalTaskName', () => {
  it('recognizes billing and county follow-up task names', () => {
    assert.equal(isInternalTaskName('Send to Billing'), true)
    assert.equal(isInternalTaskName('Follow up with county'), true)
    assert.equal(isInternalTaskName('County follow-up'), true)
    assert.equal(isInternalTaskName('Collect contractor documents'), false)
  })
})

describe('hasContractorBlockingTask', () => {
  it('returns false when all open tasks are internal', () => {
    assert.equal(
      hasContractorBlockingTask([{ name: 'Send to Billing' }]),
      false
    )
  })

  it('returns true when any open task is contractor-facing', () => {
    assert.equal(
      hasContractorBlockingTask([{ name: 'Collect contractor documents' }]),
      true
    )
  })
})
