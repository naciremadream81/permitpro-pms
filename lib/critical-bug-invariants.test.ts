/**
 * Regression guards for critical correctness bugs found in investigation.
 * Run: npx tsx --test lib/critical-bug-invariants.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { uniquifyArchivePath } from './export-engine'
import { requirementAppliesToPermitType } from './checklist-engine'

describe('syncChecklist removes all stale items', () => {
  it('does not limit deleteMany to PENDING-only status', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/checklist-engine.ts'),
      'utf8'
    )
    const syncFn = source.slice(
      source.indexOf('export async function syncChecklist'),
      source.indexOf('export async function checklistCompletionPct')
    )
    assert.match(syncFn, /deleteMany/)
    assert.doesNotMatch(
      syncFn,
      /status:\s*['"]PENDING['"]/,
      'Stale VERIFIED/WAIVED items must be removed on jurisdiction/type change'
    )
    assert.match(syncFn, /requirementId:\s*\{\s*notIn:/)
  })
})

describe('readiness evaluates live jurisdiction catalog', () => {
  it('filters by active requirements and permit type applicability', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    assert.match(source, /requirementAppliesToPermitType/)
    assert.match(source, /requirement\.findMany/)
    assert.match(source, /isActive:\s*true/)
    assert.match(source, /mandatoryCatalog/)
    assert.match(source, /itemsByRequirementId/)
  })

  it('requirementAppliesToPermitType matches * and concrete types', () => {
    assert.equal(requirementAppliesToPermitType('["*"]', 'Building'), true)
    assert.equal(requirementAppliesToPermitType('["Building"]', 'Building'), true)
    assert.equal(requirementAppliesToPermitType('["Roofing"]', 'Building'), false)
    assert.equal(requirementAppliesToPermitType('not-json', 'Building'), false)
  })
})

describe('ReadyToSubmit cannot bypass status gate', () => {
  it('PATCH rejects internalStage updates', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/route.ts'),
      'utf8'
    )
    assert.match(source, /internalStage cannot be updated via PATCH/)
  })

  it('create rejects ReadyToSubmit', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/route.ts'),
      'utf8'
    )
    assert.match(source, /Cannot create a package as ReadyToSubmit/)
  })

  it('bulk update_stage rejects ReadyToSubmit', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/bulk/route.ts'),
      'utf8'
    )
    assert.match(source, /ReadyToSubmit cannot be set via bulk update/)
  })
})

describe('checklist NOT_APPLICABLE is admin-gated', () => {
  it('operational update schema excludes NOT_APPLICABLE', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/validations.ts'),
      'utf8'
    )
    assert.match(source, /checklistItemOperationalStatusEnum/)
    const operational = source.slice(
      source.indexOf('checklistItemOperationalStatusEnum'),
      source.indexOf('checklistItemUpdateSchema')
    )
    assert.doesNotMatch(operational, /NOT_APPLICABLE/)
    assert.match(source, /z\.enum\(\['WAIVED', 'NOT_APPLICABLE'\]\)/)
  })

  it('checklist item route gates NOT_APPLICABLE behind waive_item', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/checklist/[itemId]/route.ts'),
      'utf8'
    )
    assert.match(source, /body\.status === 'NOT_APPLICABLE'/)
    assert.match(source, /waive_item/)
  })
})

describe('document version parent scoped to package', () => {
  it('rejects parentDocumentId from another permit package', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/documents/route.ts'),
      'utf8'
    )
    assert.match(source, /permitPackageId:\s*params\.id/)
    assert.match(source, /Parent document must belong to this permit package/)
  })
})

describe('export archive path uniquify', () => {
  it('appends numeric suffixes for collisions', () => {
    const used = new Set<string>()
    assert.equal(uniquifyArchivePath('Plans_plan.pdf', used), 'Plans_plan.pdf')
    assert.equal(uniquifyArchivePath('Plans_plan.pdf', used), 'Plans_plan_2.pdf')
    assert.equal(uniquifyArchivePath('Plans_plan.pdf', used), 'Plans_plan_3.pdf')
    assert.equal(
      uniquifyArchivePath('01_App/Application_form.pdf', used),
      '01_App/Application_form.pdf'
    )
    assert.equal(
      uniquifyArchivePath('01_App/Application_form.pdf', used),
      '01_App/Application_form_2.pdf'
    )
  })
})

describe('review approve re-checks readiness', () => {
  it('calls evaluateReadiness before setting ReadyToSubmit on approve', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/review/route.ts'),
      'utf8'
    )
    const approveBranch = source.slice(
      source.indexOf("if (action === 'approve')"),
      source.indexOf("if (action === 'send_back')")
    )
    assert.match(approveBranch, /evaluateReadiness/)
    assert.match(approveBranch, /no longer ready/)
  })
})

describe('status route enforces package update permission', () => {
  it('calls enforce update package before applying status changes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/status/route.ts'),
      'utf8'
    )
    assert.match(source, /enforce\(role, 'update', 'package'\)/)
  })
})
