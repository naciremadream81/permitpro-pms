import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { can, normalizeRole } from '../lib/permissions'

function readRoute(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

function exportedHandler(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`)
  assert.notEqual(start, -1, `${name} handler should exist`)

  const nextExport = source.indexOf('\nexport async function ', start + 1)
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport)
}

function assertPermissionGuard(
  source: string,
  handler: string,
  action: string,
  resource: string
) {
  const body = exportedHandler(source, handler)

  assert.match(
    body,
    /(enforce|requirePermission)\(/,
    `${handler} must enforce ${resource}.${action} before mutating protected data`
  )
  assert.match(
    body,
    new RegExp(`['"]${action}['"]\\s*,\\s*['"]${resource}['"]`),
    `${handler} must enforce the ${resource}.${action} permission`
  )
}

test('legacy and unknown roles fail closed instead of gaining coordinator write access', () => {
  for (const legacyRole of ['user', 'manager', '', undefined, null]) {
    const role = normalizeRole(legacyRole)

    assert.equal(role, 'unauthorized')
    assert.equal(can(role, 'bulk', 'package'), false)
    assert.equal(can(role, 'create', 'package'), false)
    assert.equal(can(role, 'approve', 'review'), false)
    assert.equal(can(role, 'delete', 'document'), false)
  }
})

test('permit mutation routes enforce the centralized permission matrix', () => {
  const route = readRoute('app/api/permits/[id]/route.ts')

  assertPermissionGuard(route, 'PATCH', 'update', 'package')
  assertPermissionGuard(route, 'DELETE', 'delete', 'package')
})

test('permit creation route enforces the centralized permission matrix', () => {
  const route = readRoute('app/api/permits/route.ts')

  assertPermissionGuard(route, 'POST', 'create', 'package')
})

test('permit status route cannot bypass package update authorization', () => {
  const route = readRoute('app/api/permits/[id]/status/route.ts')

  assertPermissionGuard(route, 'POST', 'update', 'package')
})

test('permit checklist regeneration enforces the centralized permission matrix', () => {
  const route = readRoute('app/api/permits/[id]/checklist/route.ts')

  assertPermissionGuard(route, 'POST', 'update', 'checklist')
})

test('document mutation routes enforce the centralized permission matrix', () => {
  const route = readRoute('app/api/documents/[id]/route.ts')
  const uploadRoute = readRoute('app/api/permits/[id]/documents/route.ts')
  const verifyRoute = readRoute('app/api/documents/[id]/verify/route.ts')

  assertPermissionGuard(route, 'PATCH', 'update', 'document')
  assertPermissionGuard(route, 'DELETE', 'delete', 'document')
  assertPermissionGuard(uploadRoute, 'POST', 'upload', 'document')
  assertPermissionGuard(verifyRoute, 'POST', 'verify', 'document')
})

test('customer and contractor mutation routes enforce the centralized permission matrix', () => {
  const customerRoute = readRoute('app/api/customers/[id]/route.ts')
  const customersRoute = readRoute('app/api/customers/route.ts')
  const contractorRoute = readRoute('app/api/contractors/[id]/route.ts')
  const contractorsRoute = readRoute('app/api/contractors/route.ts')

  assertPermissionGuard(customersRoute, 'POST', 'create', 'customer')
  assertPermissionGuard(customerRoute, 'PATCH', 'update', 'customer')
  assertPermissionGuard(customerRoute, 'DELETE', 'delete', 'customer')
  assertPermissionGuard(contractorsRoute, 'POST', 'create', 'contractor')
  assertPermissionGuard(contractorRoute, 'PATCH', 'update', 'contractor')
  assertPermissionGuard(contractorRoute, 'DELETE', 'delete', 'contractor')
})

test('task mutation routes enforce the centralized permission matrix', () => {
  const taskRoute = readRoute('app/api/tasks/[id]/route.ts')
  const permitTasksRoute = readRoute('app/api/permits/[id]/tasks/route.ts')

  assertPermissionGuard(permitTasksRoute, 'POST', 'create', 'task')
  assertPermissionGuard(taskRoute, 'PATCH', 'update', 'task')
  assertPermissionGuard(taskRoute, 'DELETE', 'delete', 'task')
})

test('middleware protects pages with Edge-safe JWT inspection', () => {
  const middleware = readRoute('middleware.ts')

  assert.match(middleware, /getToken\(/)
  assert.match(middleware, /NextResponse\.redirect\(loginUrl\)/)
  assert.doesNotMatch(middleware, /from ['"]@\/auth['"]/)
})
