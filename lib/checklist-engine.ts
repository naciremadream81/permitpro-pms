/**
 * Checklist Generation Engine
 *
 * Generates ChecklistItem records for a PermitPackage based on the
 * Jurisdiction's active Requirements that match the package's permitType.
 *
 * Called immediately after a PermitPackage is created (or when a jurisdiction
 * is assigned to an existing package).
 */

import { prisma } from '@/lib/prisma'
import { PermitType } from '@prisma/client'

export interface ChecklistGenerationResult {
  generated: number
  skipped: number   // already existed (idempotent re-runs)
  requirementIds: string[]
}

/**
 * Generate checklist items for a permit package.
 *
 * Queries all active Requirements for the package's jurisdiction that match
 * its permitType, then creates one ChecklistItem per requirement.
 *
 * Safe to call multiple times — existing items for the same requirement are
 * not duplicated.
 *
 * @param packageId  ID of the PermitPackage
 * @returns          Count of generated and skipped items
 */
export async function generateChecklist(
  packageId: string
): Promise<ChecklistGenerationResult> {
  const pkg = await prisma.permitPackage.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      permitType: true,
      jurisdictionId: true,
    },
  })

  if (!pkg) {
    throw new Error(`Package ${packageId} not found`)
  }

  if (!pkg.jurisdictionId) {
    // No jurisdiction linked — nothing to generate
    return { generated: 0, skipped: 0, requirementIds: [] }
  }

  // Fetch active requirements for this jurisdiction
  const requirements = await prisma.requirement.findMany({
    where: {
      jurisdictionId: pkg.jurisdictionId,
      isActive: true,
    },
    orderBy: { order: 'asc' },
  })

  // Filter to requirements that apply to this permit type
  const applicable = requirements.filter((req) =>
    requirementAppliesToPermitType(req.permitTypes, pkg.permitType)
  )

  if (applicable.length === 0) {
    return { generated: 0, skipped: 0, requirementIds: [] }
  }

  // Load existing checklist item requirement IDs to avoid duplicates
  const existing = await prisma.checklistItem.findMany({
    where: { packageId },
    select: { requirementId: true },
  })
  const existingSet = new Set(existing.map((e) => e.requirementId))

  const toCreate = applicable.filter((req) => !existingSet.has(req.id))

  if (toCreate.length > 0) {
    await prisma.checklistItem.createMany({
      data: toCreate.map((req) => ({
        packageId,
        requirementId: req.id,
        status: 'PENDING' as const,
      })),
    })

    // Log the generation event
    await prisma.activityLog.create({
      data: {
        permitPackageId: packageId,
        activityType: 'ChecklistGenerated',
        description: `Checklist generated: ${toCreate.length} items from jurisdiction requirements`,
        metadata: JSON.stringify({
          jurisdictionId: pkg.jurisdictionId,
          permitType: pkg.permitType,
          itemCount: toCreate.length,
          requirementIds: toCreate.map((r) => r.id),
        }),
      },
    })
  }

  return {
    generated: toCreate.length,
    skipped: applicable.length - toCreate.length,
    requirementIds: toCreate.map((r) => r.id),
  }
}

/**
 * Regenerate checklist after a jurisdiction or permit type change.
 *
 * Removes PENDING items that no longer apply and adds new items for
 * newly applicable requirements. Verified/Waived items are left untouched.
 */
export async function syncChecklist(
  packageId: string
): Promise<ChecklistGenerationResult> {
  const pkg = await prisma.permitPackage.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      permitType: true,
      jurisdictionId: true,
    },
  })

  if (!pkg || !pkg.jurisdictionId) {
    return { generated: 0, skipped: 0, requirementIds: [] }
  }

  const requirements = await prisma.requirement.findMany({
    where: { jurisdictionId: pkg.jurisdictionId, isActive: true },
    orderBy: { order: 'asc' },
  })

  const applicableIds = new Set(
    requirements
      .filter((req) => requirementAppliesToPermitType(req.permitTypes, pkg.permitType))
      .map((r) => r.id)
  )

  // Remove PENDING items whose requirement no longer applies
  await prisma.checklistItem.deleteMany({
    where: {
      packageId,
      status: 'PENDING',
      requirementId: { notIn: Array.from(applicableIds) },
    },
  })

  // Add new items for requirements not yet on the checklist
  return generateChecklist(packageId)
}

/**
 * Compute the completion percentage for a package's checklist.
 * Returns a value between 0 and 100.
 */
export async function checklistCompletionPct(packageId: string): Promise<number> {
  const items = await prisma.checklistItem.findMany({
    where: { packageId },
    select: { status: true, requirement: { select: { isRequired: true } } },
  })

  const required = items.filter((i) => i.requirement.isRequired)
  if (required.length === 0) return 100

  const done = required.filter((i) =>
    i.status === 'VERIFIED' || i.status === 'WAIVED' || i.status === 'NOT_APPLICABLE'
  )

  return Math.round((done.length / required.length) * 100)
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Determine if a requirement's permitTypes JSON array covers the given type.
 *
 * The permitTypes field is stored as a JSON string, e.g.:
 *   '["Building","Roofing"]'  — specific types
 *   '["*"]'                   — applies to all permit types
 */
function requirementAppliesToPermitType(
  permitTypesJson: string,
  permitType: PermitType
): boolean {
  try {
    const types: string[] = JSON.parse(permitTypesJson)
    return types.includes('*') || types.includes(permitType)
  } catch {
    return false
  }
}
