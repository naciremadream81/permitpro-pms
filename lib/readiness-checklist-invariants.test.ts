/**
 * Regression guards for readiness / checklist correctness bugs.
 * Run: npx tsx --test lib/readiness-checklist-invariants.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

describe('empty checklist blocks ReadyToSubmit', () => {
  it('treats jurisdiction + zero applicable checklist items as a blocker, not a warning', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    assert.match(
      source,
      /checklistNeverGenerated/,
      'Must detect never-generated / empty checklists against the live catalog'
    )
    const emptyBranch = source.slice(
      source.indexOf('checklistNeverGenerated'),
      source.indexOf('for (const req of mandatoryCatalog)')
    )
    assert.match(emptyBranch, /blockers\.push/, 'Empty checklist must block submission')
    assert.doesNotMatch(
      emptyBranch,
      /warnings\.push/,
      'Empty checklist must not be downgraded to a warning-only path'
    )
  })

  it('treats empty or optional-only jurisdiction catalogs as blockers', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    const vacuousBranch = source.slice(
      source.indexOf('applicableCatalog.length === 0'),
      source.indexOf('checklistNeverGenerated')
    )
    assert.match(vacuousBranch, /type:\s*'NO_CHECKLIST_ITEMS'/)
    assert.match(vacuousBranch, /blockers\.push/)
    assert.doesNotMatch(
      vacuousBranch,
      /warnings\.push/,
      'Vacuous catalogs must not be warning-only'
    )
    assert.match(source, /mandatoryCatalog\.length === 0/)
  })
})

describe('legacy insurance expiry independent of LICENSE vault doc', () => {
  it('checks insurance via vault-or-legacy helper without gating on LICENSE', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    assert.match(source, /checkInsuranceExpiry/)
    assert.match(source, /legacyDate:\s*pkg\.contractor\.workersCompExpirationDate/)
    assert.match(source, /legacyDate:\s*pkg\.contractor\.liabilityExpirationDate/)

    // LICENSE missing/undated handling must finish before insurance checks run
    const licenseBlock = source.slice(
      source.indexOf('// License — vault LICENSE'),
      source.indexOf('// Workers Comp')
    )
    assert.match(licenseBlock, /CONTRACTOR_LICENSE_MISSING/)
    assert.doesNotMatch(
      licenseBlock,
      /workersCompExpirationDate|liabilityExpirationDate|checkInsuranceExpiry/,
      'Insurance evaluation must not nest inside the LICENSE missing branch'
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

  it('rejects document links whose category does not match the requirement', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/checklist/[itemId]/route.ts'),
      'utf8'
    )
    assert.match(source, /linkedDoc\.category !== existingItem\.requirement\.documentCategory/)
    assert.match(source, /does not match required/)
  })
})
