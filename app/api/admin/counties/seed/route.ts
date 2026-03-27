/**
 * POST /api/admin/counties/seed
 *
 * Bulk-seeds all 67 Florida counties with default permit checklists.
 * - Creates Jurisdiction records for any county that doesn't have one.
 * - Creates Requirement records from DEFAULT_REQUIREMENTS for each county.
 * - Skips requirements that already exist (idempotent by documentName + permitTypes).
 * - Records a SeedBatch + RequirementChangeLog entries for auditability.
 * - Populates PermitTypeDefinition table if not already seeded.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { DocumentCategory } from '@prisma/client'
import { FL_COUNTIES, DEFAULT_REQUIREMENTS, DEFAULT_PERMIT_TYPES } from '@/lib/counties-seed-data'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const userId = session.user.id as string

    // 1. Ensure PermitTypeDefinition table is populated
    for (const pt of DEFAULT_PERMIT_TYPES) {
      await prisma.permitTypeDefinition.upsert({
        where: { code: pt.code },
        update: {},
        create: {
          code: pt.code,
          label: pt.label,
          description: pt.description,
          isBuiltIn: true,
          order: pt.order,
          createdBy: userId,
        },
      })
    }

    // 2. Create a SeedBatch record
    const batch = await prisma.seedBatch.create({
      data: {
        triggeredBy: userId,
        description: `Bulk seed of all 67 Florida counties`,
        status: 'RUNNING',
      },
    })

    let totalRequirements = 0
    let skippedCount = 0
    const errors: string[] = []

    // 3. Process each county
    for (const county of FL_COUNTIES) {
      try {
        // Upsert jurisdiction
        const jurisdiction = await prisma.jurisdiction.upsert({
          where: { countyCode: county.code },
          update: {},
          create: {
            name: `${county.name} County`,
            countyCode: county.code,
            state: 'FL',
            isActive: true,
          },
        })

        // For each default requirement, attempt insert (skip on conflict)
        for (const req of DEFAULT_REQUIREMENTS) {
          const permitTypesJson = JSON.stringify(req.permitTypes)

          // Check if already exists
          const existing = await prisma.requirement.findFirst({
            where: {
              jurisdictionId: jurisdiction.id,
              documentName: req.documentName,
              permitTypes: permitTypesJson,
            },
          })

          if (existing) {
            skippedCount++
            continue
          }

          const created = await prisma.requirement.create({
            data: {
              jurisdictionId: jurisdiction.id,
              documentName: req.documentName,
              documentCategory: req.documentCategory as DocumentCategory,
              permitTypes: permitTypesJson,
              isRequired: req.isRequired,
              isMandatoryForSubmission: req.isMandatoryForSubmission,
              description: req.description ?? null,
              helpText: req.helpText ?? null,
              order: req.order,
              isActive: true,
            },
          })

          // Log the creation
          await prisma.requirementChangeLog.create({
            data: {
              requirementId: created.id,
              changedBy: userId,
              seedBatchId: batch.id,
              action: 'CREATED',
              snapshot: JSON.stringify(created),
            },
          })

          totalRequirements++
        }
      } catch (err) {
        errors.push(`${county.code}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // 4. Finalize SeedBatch
    const finalStatus = errors.length > 0 && totalRequirements === 0 ? 'FAILED' : 'COMPLETED'
    await prisma.seedBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        totalCounties: FL_COUNTIES.length,
        totalRequirements,
        skippedCount,
        completedAt: new Date(),
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
      },
    })

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      totalCounties: FL_COUNTIES.length,
      totalRequirements,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('POST /api/admin/counties/seed:', error)
    return NextResponse.json({ error: 'Seed operation failed' }, { status: 500 })
  }
}
