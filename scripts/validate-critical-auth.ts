/**
 * Lightweight validation for critical auth / readiness fixes.
 * Run: npx tsx scripts/validate-critical-auth.ts
 */

import assert from 'node:assert/strict'
import { normalizeRole, can, ForbiddenError } from '../lib/permissions'

function testNormalizeRole() {
  assert.equal(normalizeRole('admin'), 'admin')
  assert.equal(normalizeRole('reviewer'), 'reviewer')
  assert.equal(normalizeRole('coordinator'), 'coordinator')
  assert.equal(normalizeRole('user'), 'coordinator')

  assert.throws(() => normalizeRole('superadmin'), ForbiddenError)
  assert.throws(() => normalizeRole(''), ForbiddenError)
  assert.throws(() => normalizeRole(null), ForbiddenError)
  assert.throws(() => normalizeRole(undefined), ForbiddenError)

  // Unknown roles must not inherit coordinator package delete
  assert.equal(can('coordinator', 'delete', 'package'), false)
  assert.equal(can('admin', 'delete', 'package'), true)
  assert.equal(can('reviewer', 'delete', 'package'), false)
  assert.equal(can('reviewer', 'update', 'package'), false)
  assert.equal(can('reviewer', 'verify', 'document'), true)
}

testNormalizeRole()
console.log('validate-critical-auth: all checks passed')
