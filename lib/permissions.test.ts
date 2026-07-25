/**
 * Unit tests for the permission matrix and role normalization.
 * Run: npx tsx --test lib/permissions.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { can, enforce, normalizeRole, ForbiddenError } from './permissions'

describe('normalizeRole', () => {
  it('maps canonical roles', () => {
    assert.equal(normalizeRole('admin'), 'admin')
    assert.equal(normalizeRole('coordinator'), 'coordinator')
    assert.equal(normalizeRole('reviewer'), 'reviewer')
  })

  it('maps legacy user role to coordinator', () => {
    assert.equal(normalizeRole('user'), 'coordinator')
  })

  it('fails closed for unknown or missing roles', () => {
    const unknown = normalizeRole('superadmin')
    const missing = normalizeRole(undefined)
    const empty = normalizeRole(null)

    assert.equal(can(unknown, 'delete', 'package'), false)
    assert.equal(can(missing, 'update', 'package'), false)
    assert.equal(can(empty, 'update', 'document'), false)
    assert.equal(can(unknown, 'read', 'package'), false)
  })
})

describe('can / enforce matrix', () => {
  it('allows only admins to delete packages', () => {
    assert.equal(can('admin', 'delete', 'package'), true)
    assert.equal(can('coordinator', 'delete', 'package'), false)
    assert.equal(can('reviewer', 'delete', 'package'), false)
  })

  it('prevents reviewers from updating packages or deleting documents', () => {
    assert.equal(can('reviewer', 'update', 'package'), false)
    assert.equal(can('reviewer', 'delete', 'document'), false)
    assert.equal(can('reviewer', 'verify', 'document'), true)
  })

  it('throws ForbiddenError via enforce for denied actions', () => {
    assert.throws(
      () => enforce('reviewer', 'delete', 'package'),
      (err: unknown) => err instanceof ForbiddenError
    )
  })
})
