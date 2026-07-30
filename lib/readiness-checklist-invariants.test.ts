/**
 * Regression guards for readiness / checklist correctness bugs.
 * Run: npx tsx --test lib/readiness-checklist-invariants.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

describe('empty checklist blocks ReadyToSubmit', () => {
  it('treats jurisdiction + zero checklist items as a blocker, not a warning', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    assert.match(
      source,
      /checklistItems\.length === 0/,
      'Must detect never-generated / empty checklists'
    )
    const emptyBranch = source.slice(
      source.indexOf('checklistItems.length === 0'),
      source.indexOf('mandatoryItems.length === 0')
    )
    assert.match(emptyBranch, /blockers\.push/, 'Empty checklist must block submission')
    assert.doesNotMatch(
      emptyBranch,
      /warnings\.push/,
      'Empty checklist must not be downgraded to a warning-only path'
    )
  })
})

describe('legacy insurance expiry independent of LICENSE vault doc', () => {
  it('checks legacy WC/liability when those vault docs are missing', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    assert.match(source, /else if \(pkg\.contractor\.workersCompExpirationDate\)/)
    assert.match(source, /else if \(pkg\.contractor\.liabilityExpirationDate\)/)
    // The previous bug nested both legacy checks under `if (!licenseDoc)`.
    assert.doesNotMatch(
      source,
      /if \(!licenseDoc\) \{[\s\S]*workersCompExpirationDate[\s\S]*liabilityExpirationDate/,
      'Legacy insurance must not be gated on absence of LICENSE vault document'
    )
  })
})

describe('permit PATCH resyncs checklist on jurisdiction/type change', () => {
  it('calls syncChecklist when jurisdictionId or permitType changes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/route.ts'),
      'utf8'
    )
    assert.match(source, /import \{ syncChecklist \} from '@\/lib\/checklist-engine'/)
    assert.match(source, /jurisdictionChanged/)
    assert.match(source, /permitTypeChanged/)
    assert.match(source, /await syncChecklist\(params\.id\)/)
  })
})

describe('checklist documentId scoped to package', () => {
  it('rejects document links that belong to another permit package', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/checklist/[itemId]/route.ts'),
      'utf8'
    )
    assert.match(source, /permitPackageId:\s*params\.id/)
    assert.match(source, /Document must belong to this permit package/)
  })
})
