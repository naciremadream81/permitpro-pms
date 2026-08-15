/**
 * Atomic parent deletes for Customer / Contractor.
 *
 * PermitPackage FKs use ON DELETE CASCADE, so a TOCTOU between
 * "count packages" and "delete parent" can wipe a package created in the
 * gap. These helpers fold the guard into a single DELETE … AND NOT EXISTS
 * statement so SQLite evaluates the check and delete under one write lock.
 */

import { prisma } from '@/lib/prisma'

export type ParentDeleteResult = 'deleted' | 'has_packages' | 'not_found'

export async function deleteCustomerIfNoPackages(
  id: string
): Promise<ParentDeleteResult> {
  const deleted = await prisma.$executeRaw`
    DELETE FROM "Customer"
    WHERE "id" = ${id}
    AND NOT EXISTS (
      SELECT 1 FROM "PermitPackage" WHERE "customerId" = ${id}
    )
  `

  if (deleted > 0) return 'deleted'

  const exists = await prisma.customer.findUnique({
    where: { id },
    select: { id: true },
  })
  return exists ? 'has_packages' : 'not_found'
}

export async function deleteContractorIfNoPackages(
  id: string
): Promise<ParentDeleteResult> {
  const deleted = await prisma.$executeRaw`
    DELETE FROM "Contractor"
    WHERE "id" = ${id}
    AND NOT EXISTS (
      SELECT 1 FROM "PermitPackage" WHERE "contractorId" = ${id}
    )
  `

  if (deleted > 0) return 'deleted'

  const exists = await prisma.contractor.findUnique({
    where: { id },
    select: { id: true },
  })
  return exists ? 'has_packages' : 'not_found'
}
