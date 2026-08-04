/**
 * Regression guards for readiness catalog / multi-cycle review bugs.
 * Run: npx tsx --test lib/readiness-catalog-invariants.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { requirementAppliesToPermitType } from './checklist-engine'

const readinessSource = () =>
  fs.readFileSync(path.join(process.cwd(), 'lib/readiness-engine.ts'), 'utf8')

describe('readiness evaluates live jurisdiction catalog', () => {
  it('loads active requirements and ignores inactive leftover checklist credit', () => {
    const source = readinessSource()
    assert.match(source, /requirement\.findMany/)
    assert.match(source, /isActive:\s*true/)
    assert.match(source, /item\.requirement\.isActive/)
    assert.match(source, /mandatoryCatalog/)
    assert.match(
      source,
      /Required document not uploaded/,
      'Missing catalog requirements must produce MISSING_REQUIRED_DOCUMENT blockers'
    )
  })

  it('requirementAppliesToPermitType matches * and concrete types', () => {
    assert.equal(requirementAppliesToPermitType('["*"]', 'Building'), true)
    assert.equal(requirementAppliesToPermitType('["Building"]', 'Building'), true)
    assert.equal(requirementAppliesToPermitType('["Roofing"]', 'Building'), false)
    assert.equal(requirementAppliesToPermitType('not-json', 'Building'), false)
  })
})

describe('open review comments span all SENT_BACK cycles', () => {
  it('does not limit SENT_BACK assignments to take: 1', () => {
    const source = readinessSource()
    const reviewBlock = source.slice(
      source.indexOf('reviewAssignments:'),
      source.indexOf('// ── Required fields')
    )
    assert.doesNotMatch(
      reviewBlock,
      /take:\s*1/,
      'Latest-only SENT_BACK would ignore unresolved comments from earlier cycles'
    )
    assert.match(source, /flatMap\(\(assignment\) => assignment\.comments\)/)
  })
})
