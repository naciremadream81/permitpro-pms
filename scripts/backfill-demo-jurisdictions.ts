/**
 * Backfill Demo Jurisdictions
 *
 * prisma/seed.ts seeds 10 demo PermitPackages with placeholder county names
 * and leaves PermitPackage.jurisdictionId null. syncChecklist() only produces
 * ChecklistItem rows when jurisdictionId is set, so demo permits show empty
 * checklists until a real jurisdiction is assigned.
 *
 * This script assigns each placeholder-county permit a real Florida county
 * Jurisdiction, mirrors that jurisdiction's name into the legacy `county`
 * field, and regenerates the checklist via syncChecklist().
 *
 * Idempotent: only PermitPackages with jurisdictionId === null AND a known
 * placeholder county name are touched.
 *
 * Run with: npm run db:backfill-demo-jurisdictions
 *
 * Safety: refuses to run in production unless ALLOW_DEMO_BACKFILL=true.
 */

import { prisma } from '@/lib/prisma'
import { syncChecklist } from '@/lib/checklist-engine'

const PLACEHOLDER_TO_REAL_COUNTY: Record<string, string> = {
  'Anytown County': 'Miami-Dade County',
  'Somewhere County': 'Duval County',
  'Elsewhere County': 'Hillsborough County',
  'Downtown County': 'Leon County',
  'Suburbia County': 'Orange County',
}

/** Demo-only jurisdictions created when missing on a fresh seed database. */
const DEMO_JURISDICTIONS: Record<string, { countyCode: string }> = {
  'Miami-Dade County': { countyCode: 'MIA' },
  'Duval County': { countyCode: 'DUV' },
  'Hillsborough County': { countyCode: 'HIL' },
  'Leon County': { countyCode: 'LEO' },
  'Orange County': { countyCode: 'ORA' },
}

function assertSafeToRun() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_BACKFILL !== 'true') {
    console.error(
      'Refusing to run demo jurisdiction backfill in production.\n' +
        'Set ALLOW_DEMO_BACKFILL=true only when you intentionally want to mutate production demo rows.'
    )
    process.exit(1)
  }
}

async function findOrCreateJurisdiction(name: string) {
  const existing = await prisma.jurisdiction.findFirst({
    where: { name },
    select: { id: true, name: true },
  })
  if (existing) return existing

  const demo = DEMO_JURISDICTIONS[name]
  if (!demo) return null

  const created = await prisma.jurisdiction.create({
    data: {
      name,
      countyCode: demo.countyCode,
      state: 'FL',
      isActive: true,
      notes: 'Created by db:backfill-demo-jurisdictions for demo seed data',
    },
    select: { id: true, name: true },
  })

  console.log(`  INFO  Created demo jurisdiction "${name}" (${demo.countyCode})`)
  return created
}

async function main() {
  assertSafeToRun()

  console.log('Backfilling demo PermitPackage jurisdictions...')
  console.log('')

  const placeholderNames = Object.keys(PLACEHOLDER_TO_REAL_COUNTY)

  const candidates = await prisma.permitPackage.findMany({
    where: {
      jurisdictionId: null,
      county: { in: placeholderNames },
    },
    select: { id: true, projectName: true, county: true },
  })

  if (candidates.length === 0) {
    console.log(
      'Nothing to do — no PermitPackage rows have both a null jurisdictionId and a placeholder county name.'
    )
    await prisma.$disconnect()
    return
  }

  let updated = 0
  let skipped = 0

  for (const permit of candidates) {
    const realCountyName = PLACEHOLDER_TO_REAL_COUNTY[permit.county as string]
    if (!realCountyName) {
      console.warn(`  SKIP  ${permit.projectName} (${permit.id}): unmapped county "${permit.county}"`)
      skipped++
      continue
    }

    const jurisdiction = await findOrCreateJurisdiction(realCountyName)
    if (!jurisdiction) {
      console.warn(
        `  SKIP  ${permit.projectName} (${permit.id}): no Jurisdiction row named "${realCountyName}" and not in demo map`
      )
      skipped++
      continue
    }

    await prisma.$transaction(async (tx) => {
      await tx.permitPackage.update({
        where: { id: permit.id },
        data: {
          jurisdictionId: jurisdiction.id,
          county: jurisdiction.name,
        },
      })
    })

    const result = await syncChecklist(permit.id)

    console.log(
      `  OK    ${permit.projectName} (${permit.id}): "${permit.county}" -> "${jurisdiction.name}" — checklist synced (${result.generated} item(s) generated, ${result.skipped} already present)`
    )
    updated++
  }

  console.log('')
  console.log(
    `Done. ${updated} permit package(s) backfilled, ${skipped} skipped, out of ${candidates.length} candidate(s) found.`
  )

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Backfill failed:', err)
  await prisma.$disconnect()
  process.exit(1)
})
