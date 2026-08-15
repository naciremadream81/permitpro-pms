/**
 * Regression guards for critical correctness bugs found in investigation.
 * Run: npx tsx --test lib/critical-bug-invariants.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { uniquifyArchivePath, sanitizeArchivePath } from './export-engine'
import { requirementAppliesToPermitType } from './checklist-engine'
import { normalizeRole, ForbiddenError } from './permissions'
import {
  exportProfileUpdateSchema,
  jurisdictionUpdateSchema,
  requirementUpdateSchema,
} from './validations'

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
  it('PATCH rejects status and internalStage updates', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/route.ts'),
      'utf8'
    )
    assert.match(
      source,
      /status and internalStage cannot be updated via PATCH/
    )
    assert.match(source, /body\?\.status !== undefined/)
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

  it('explicit documentId null does not fall back to the existing linked document', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/checklist/[itemId]/route.ts'),
      'utf8'
    )
    assert.match(
      source,
      /Object\.prototype\.hasOwnProperty\.call\(data,\s*['"]documentId['"]\)/
    )
    assert.match(source, /documentIdProvided\s*\?\s*data\.documentId\s*\?\?\s*undefined/)
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

  it('validates parentDocumentId before writing the upload to storage', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/documents/route.ts'),
      'utf8'
    )
    const parentCheck = source.indexOf('Parent document must belong to this permit package')
    const storageSave = source.indexOf('storage.save(')
    assert.ok(parentCheck >= 0, 'parent package check must exist')
    assert.ok(storageSave >= 0, 'storage.save must exist')
    assert.ok(
      parentCheck < storageSave,
      'Invalid parentDocumentId must be rejected before storage.save to avoid orphan blobs'
    )
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

  it('reserves MANIFEST.txt so uploaded documents cannot collide with the manifest', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/export-engine.ts'),
      'utf8'
    )
    assert.match(source, /usedPaths\.add\(['"]MANIFEST\.txt['"]\)/)

    // Simulate includeManifest reservation before uniquifying docs
    const used = new Set<string>(['MANIFEST.txt'])
    assert.equal(uniquifyArchivePath('MANIFEST.txt', used), 'MANIFEST_2.txt')
    assert.ok(used.has('MANIFEST.txt'))
    assert.ok(used.has('MANIFEST_2.txt'))
  })

  it('strips Zip Slip traversal from archive entry paths', () => {
    assert.equal(sanitizeArchivePath('../../../tmp/pwned/file.pdf'), 'tmp/pwned/file.pdf')
    assert.equal(sanitizeArchivePath('/etc/passwd'), 'etc/passwd')
    assert.equal(sanitizeArchivePath('..\\..\\evil.pdf'), 'evil.pdf')
    assert.equal(sanitizeArchivePath('01_App/Application.pdf'), '01_App/Application.pdf')
    assert.equal(sanitizeArchivePath(''), 'document')
    assert.equal(sanitizeArchivePath('../..'), 'document')

    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/export-engine.ts'),
      'utf8'
    )
    assert.match(source, /sanitizeArchivePath/)
    assert.match(
      source,
      /Array\.isArray\(r\.categories\)/,
      'Malformed folderStructure without categories must not crash export'
    )
  })
})

describe('document delete clears FKs before removing the blob', () => {
  it('deletes the DB row inside a transaction before storage.delete', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/documents/[id]/route.ts'),
      'utf8'
    )
    const deleteFn = source.slice(source.indexOf('export async function DELETE'))
    const txIdx = deleteFn.indexOf('$transaction')
    const storageIdx = deleteFn.indexOf('storage.delete')
    assert.ok(txIdx >= 0, 'DELETE must use a transaction for FK cleanup')
    assert.ok(storageIdx >= 0, 'DELETE must still remove the storage blob')
    assert.ok(
      txIdx < storageIdx,
      'DB delete must precede storage.delete to avoid ghost rows after FK failures'
    )
    assert.match(deleteFn, /checklistItem\.updateMany/)
    assert.match(deleteFn, /parentDocumentId:\s*null/)
  })
})

describe('readiness requires Verified document status', () => {
  it('does not accept isVerified alone when status is Rejected or Pending', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    assert.match(
      source,
      /item\.document\.status\s*!==\s*['"]Verified['"]/,
      'Rejected/Pending documents must not satisfy ReadyToSubmit'
    )
  })
})

describe('contractor vault renew is transactional', () => {
  it('supersedes previous docs and creates the replacement in one transaction', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/contractors/[id]/documents/route.ts'),
      'utf8'
    )
    const postFn = source.slice(source.indexOf('export async function POST'))
    assert.match(postFn, /\$transaction/)
    const txBlockStart = postFn.indexOf('$transaction')
    const txSlice = postFn.slice(txBlockStart, txBlockStart + 1200)
    assert.match(txSlice, /updateMany/)
    assert.match(txSlice, /contractorDocument\.create/)
  })
})

describe('normalizeRole fails closed on unknown roles', () => {
  it('maps known and legacy roles; rejects unrecognized values', () => {
    assert.equal(normalizeRole('admin'), 'admin')
    assert.equal(normalizeRole('reviewer'), 'reviewer')
    assert.equal(normalizeRole('coordinator'), 'coordinator')
    assert.equal(normalizeRole('user'), 'coordinator')
    assert.throws(() => normalizeRole('superadmin'), ForbiddenError)
    assert.throws(() => normalizeRole(''), ForbiddenError)
    assert.throws(() => normalizeRole(null), ForbiddenError)
    assert.throws(() => normalizeRole(undefined), ForbiddenError)
  })
})

describe('getSession refreshes role from the database', () => {
  it('loads the live User.role and rejects deleted users', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/auth-helpers.ts'),
      'utf8'
    )
    const getSessionFn = source.slice(
      source.indexOf('export async function getSession'),
      source.indexOf('export async function requireAuth')
    )
    assert.match(getSessionFn, /prisma\.user\.findUnique/)
    assert.match(getSessionFn, /session\.user\.role\s*=\s*user\.role/)
    assert.match(getSessionFn, /return null/)
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

  it('does not mark ReadyToSubmit when assigning a reviewer', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/review/route.ts'),
      'utf8'
    )
    const assignBranch = source.slice(
      source.indexOf('if (body.reviewerId)'),
      source.indexOf("const { action, note } = reviewActionSchema.parse(body)")
    )
    assert.match(
      assignBranch,
      /internalStage:\s*['"]InProgress['"]/,
      'Assign must leave the package InProgress until approve'
    )
    assert.doesNotMatch(
      assignBranch,
      /internalStage:\s*['"]ReadyToSubmit['"]/,
      'ReadyToSubmit before review completes mislabels packages as county-ready'
    )
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

describe('contractor compliance cannot be bypassed via missing/undated vault docs', () => {
  it('requires LICENSE with expirationDate and blocks undated insurance vault docs', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    assert.match(source, /CONTRACTOR_LICENSE_MISSING/)
    assert.match(source, /CONTRACTOR_INSURANCE_MISSING/)
    assert.match(source, /missing an expiration date/)
    assert.match(source, /checkInsuranceExpiry/)
    const helper = source.slice(source.indexOf('function checkInsuranceExpiry'))
    // Undated vault is source-of-truth missing — must not fall back to legacy
    assert.match(helper, /if \(vaultDoc\)/)
    assert.match(helper, /if \(!vaultDoc\.expirationDate\)/)
    assert.match(helper, /else if \(legacyDate\)/)
    assert.match(helper, /CONTRACTOR_INSURANCE_MISSING/)
  })
})

describe('wrong-category documents cannot satisfy readiness', () => {
  it('blocks when linked document category mismatches requirement', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/readiness-engine.ts'),
      'utf8'
    )
    assert.match(source, /WRONG_DOCUMENT_CATEGORY/)
    assert.match(source, /item\.document\.category !== item\.requirement\.documentCategory/)
  })
})

describe('create cannot skip Approved billing automation', () => {
  it('rejects status Approved on package create', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/route.ts'),
      'utf8'
    )
    assert.match(source, /Cannot create a package as Approved/)
    assert.match(source, /billing automation/)
  })
})

describe('customer/contractor delete is atomic against cascade wipe', () => {
  it('helper uses DELETE … AND NOT EXISTS instead of count-then-delete', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/safe-parent-delete.ts'),
      'utf8'
    )
    assert.match(source, /DELETE FROM "Customer"/)
    assert.match(source, /DELETE FROM "Contractor"/)
    assert.match(source, /AND NOT EXISTS/)
    assert.match(source, /FROM "PermitPackage"/)
    assert.doesNotMatch(
      source,
      /permitPackage\.count/,
      'Count-then-delete leaves a TOCTOU window under ON DELETE CASCADE'
    )
  })

  it('customer and contractor DELETE routes use the atomic helpers', () => {
    const customerRoute = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/[id]/route.ts'),
      'utf8'
    )
    const contractorRoute = fs.readFileSync(
      path.join(process.cwd(), 'app/api/contractors/[id]/route.ts'),
      'utf8'
    )
    assert.match(customerRoute, /deleteCustomerIfNoPackages/)
    assert.match(contractorRoute, /deleteContractorIfNoPackages/)
    assert.doesNotMatch(customerRoute, /permitPackage\.count/)
    assert.doesNotMatch(contractorRoute, /permitPackage\.count/)
  })
})

describe('storage get/delete use path.relative containment', () => {
  it('does not use startsWith for root checks on get/delete', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/storage.ts'),
      'utf8'
    )
    assert.match(source, /resolveWithinRoot/)
    assert.match(source, /path\.relative/)
    // Prefix startsWith allows /storage-evil when root is /storage
    const getFn = source.slice(
      source.indexOf('async get(filePath'),
      source.indexOf('async delete(filePath')
    )
    const deleteFn = source.slice(
      source.indexOf('async delete(filePath'),
      source.indexOf('async exists(filePath')
    )
    assert.doesNotMatch(getFn, /startsWith/)
    assert.doesNotMatch(deleteFn, /startsWith/)
    assert.match(getFn, /resolveWithinRoot/)
    assert.match(deleteFn, /resolveWithinRoot/)
  })
})

describe('permit type/jurisdiction change syncs checklist atomically', () => {
  it('runs permit update and syncChecklist inside the same transaction', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/route.ts'),
      'utf8'
    )
    assert.match(source, /\$transaction/)
    assert.match(source, /syncChecklist\(params\.id,\s*tx\)/)
  })

  it('syncChecklist uses an explicit empty-applicable delete and a transaction by default', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/checklist-engine.ts'),
      'utf8'
    )
    assert.match(source, /applicableIds\.size === 0/)
    assert.match(source, /\$transaction/)
  })
})

describe('Next 15 async request params', () => {
  it('permit write routes type params as Promise and await them', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/permits/[id]/route.ts'),
      'utf8'
    )
    assert.match(source, /params:\s*Promise<\{ id: string \}>/)
    assert.match(source, /await props\.params/)
    assert.doesNotMatch(source, /params:\s*\{\s*id:\s*string\s*\}/)
  })

  it('permit list page awaits Promise searchParams', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/permits/page.tsx'),
      'utf8'
    )
    assert.match(source, /searchParams:\s*Promise</)
    assert.match(source, /await props\.searchParams/)
  })
})

describe('review comments cannot be injected across assignments', () => {
  it('requires send_back permission and assignee/admin authorship', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/review-assignments/[id]/comments/route.ts'),
      'utf8'
    )
    const postFn = source.slice(source.indexOf('export async function POST'))
    assert.match(postFn, /enforce\(role, 'send_back', 'review'\)/)
    assert.match(postFn, /assignment\.reviewerId !== session\.user\.id/)
    assert.doesNotMatch(
      postFn,
      /enforce\([^)]*'read',\s*'review'\)/,
      'Comment create must not be gated only on review.read'
    )
  })

  it('scopes documentId and checklistItemId to the assignment package', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/review-assignments/[id]/comments/route.ts'),
      'utf8'
    )
    const postFn = source.slice(source.indexOf('export async function POST'))
    assert.match(postFn, /permitPackageId:\s*assignment\.packageId/)
    assert.match(postFn, /packageId:\s*assignment\.packageId/)
    assert.match(postFn, /documentId must belong to the same permit package/)
    assert.match(postFn, /checklistItemId must belong to the same permit package/)
  })
})

describe('task updates cannot reassign permit packages', () => {
  it('omits permitPackageId from taskUpdateSchema', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/validations.ts'),
      'utf8'
    )
    assert.match(
      source,
      /taskUpdateSchema\s*=\s*taskSchema\.omit\(\{\s*permitPackageId:\s*true\s*\}\)\.partial\(\)/
    )
  })
})

describe('permit detail status edits use gated status route', () => {
  it('posts status changes to /status instead of PATCH', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/permits/[id]/permit-detail-client.tsx'),
      'utf8'
    )
    assert.match(source, /\/api\/permits\/\$\{permit\.id\}\/status/)
    assert.match(source, /field === 'status'/)
  })
})

describe('update schemas do not inject create-time defaults', () => {
  it('requirement toggle does not reset order or mandatory flags', () => {
    const parsed = requirementUpdateSchema.parse({ isActive: false })
    assert.deepEqual(parsed, { isActive: false })
  })

  it('requirement name edit does not reactivate or reorder', () => {
    const parsed = requirementUpdateSchema.parse({ documentName: 'Site Plan' })
    assert.deepEqual(parsed, { documentName: 'Site Plan' })
    assert.equal('isActive' in parsed, false)
    assert.equal('order' in parsed, false)
    assert.equal('isMandatoryForSubmission' in parsed, false)
  })

  it('jurisdiction toggle does not overwrite state to FL', () => {
    const parsed = jurisdictionUpdateSchema.parse({ isActive: false })
    assert.deepEqual(parsed, { isActive: false })
    assert.equal('state' in parsed, false)
  })

  it('export profile rename does not wipe folder layout or default flag', () => {
    const parsed = exportProfileUpdateSchema.parse({ name: 'County Layout' })
    assert.deepEqual(parsed, { name: 'County Layout' })
    assert.equal('folderStructure' in parsed, false)
    assert.equal('isDefault' in parsed, false)
    assert.equal('fileNamingPattern' in parsed, false)
    assert.equal('includeManifest' in parsed, false)
  })

  it('export profile PATCH 404s before unsetting other defaults', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/export-profiles/[id]/route.ts'),
      'utf8'
    )
    const patchFn = source.slice(source.indexOf('export async function PATCH'))
    const notFoundIdx = patchFn.indexOf("Profile not found")
    const unsetIdx = patchFn.indexOf('isDefault: false')
    assert.ok(notFoundIdx >= 0, 'missing profile must 404')
    assert.ok(unsetIdx >= 0, 'default unset must still exist')
    assert.ok(
      notFoundIdx < unsetIdx,
      'must 404 on a missing id before updateMany clears sibling defaults'
    )
  })
})
