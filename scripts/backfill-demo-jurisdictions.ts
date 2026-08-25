/**
 * Backfill Demo Jurisdictions
 *
 * prisma/seed.ts seeds 10 demo PermitPackages with placeholder county names
 * ('Anytown County', 'Somewhere County', 'Elsewhere County', 'Downtown
 * County', 'Suburbia County') and leaves PermitPackage.jurisdictionId null.
 * Per lib/checklist-engine.ts, generateChecklist()/syncChecklist() only
 * produce ChecklistItem rows when jurisdictionId is set, so all 10 demo
 * permits currently show an empty checklist — the readiness/checklist flow
 * looks broken in a demo even though it works correctly once a real
 * jurisdiction is assigned.
 *
 * This script assigns each placeholder-county permit a real Florida county
 * Jurisdiction, mirrors that jurisdiction's name into the legacy `county`
 * field (matching what app/api/permits/[id]/route.ts's PATCH handler already
 * does when a jurisdiction is assigned), and regenerates the checklist via
 * syncChecklist() so ChecklistItem rows actually get created.
 *
 * Idempotent: only PermitPackages with jurisdictionId === null AND a
 * placeholder county name are touched, so a permit already backfilled (or a
 * genuinely real permit that happens to have no jurisdiction) is left alone
 * on re-run.
 *
 * Run with: npm run db:backfill-demo-jurisdictions
 *
 * NOTE: this script has not been executed against a real database — this
 * environment's .env has a placeholder DATABASE_URL ("replace-with-database-
 * url"), so there is no reachable Postgres instance to run or verify it
 * against. It was written by reading prisma/schema.prisma (the Jurisdiction
 * and PermitPackage models), lib/checklist-engine.ts, and the exact
 * jurisdiction-assignment behavior in app/api/permits/[id]/route.ts's PATCH
 * handler, plus the expected Jurisdiction.name format shown by the
 * placeholder text in app/admin/jurisdictions/new/page.tsx (e.g.
 * "Hillsborough County"). Run it against a real/staging database and check
 * the per-permit log output before trusting it against production data.
 */

import { prisma } from '@/lib/prisma'
import { syncChecklist } from '@/lib/checklist-engine'

// Fixed mapping from each seed placeholder county name (prisma/seed.ts) to a
// real Florida county Jurisdiction name, spread across a few different
// regions of the state so the demo data isn't clustered on one metro area.
// Jurisdiction rows are looked up by `name` (e.g. "Miami-Dade County") —
// see app/admin/jurisdictions/new/page.tsx for the expected name format.
//
//   Anytown County    -> Miami-Dade County    (South Florida)
//   Somewhere County  -> Duval County         (Northeast Florida — Jacksonville)
//   Elsewhere County  -> Hillsborough County  (West-Central Florida — Tampa)
//   Downtown County   -> Leon County          (North Florida — Tallahassee)
//   Suburbia County   -> Orange County        (Central Florida — Orlando)
const PLACEHOLDER_TO_REAL_COUNTY: Record<string, string> = {
  'Anytown County': 'Miami-Dade County',
  'Somewhere County': 'Duval County',
  'Elsewhere County': 'Hillsborough County',
  'Downtown County': 'Leon County',
  'Suburbia County': 'Orange County',
}

async function main() {
  console.log('Backfilling demo PermitPackage jurisdictions...')
  console.log('')

  const placeholderNames = Object.keys(PLACEHOLDER_TO_REAL_COUNTY)

  // Only permits that (a) have no jurisdiction linked yet and (b) still carry
  // one of the known placeholder county names — this is what makes the
  // script safe to re-run: once a permit is backfilled, jurisdictionId is
  // non-null and it will never match this query again.
  const candidates = await prisma.permitPackage.findMany({
    where: {
      jurisdictionId: null,
      county: { in: placeholderNames },
    },
    select: { id: true, projectName: true, county: true },
  })

  if (candidates.length === 0) {
    console.log(
      'Nothing to do — no PermitPackage rows have both a null jurisdictionId and a placeholder county name (already backfilled, or seed data has changed).'
    )
    await prisma.$disconnect()
    return
  }

  let updated = 0
  let skipped = 0

  for (const permit of candidates) {
    const realCountyName = PLACEHOLDER_TO_REAL_COUNTY[permit.county as string]
    if (!realCountyName) {
      // Can't happen given the `county: { in: placeholderNames }` filter
      // above, but guard defensively rather than assume.
      console.warn(`  SKIP  ${permit.projectName} (${permit.id}): unmapped county "${permit.county}"`)
      skipped++
      continue
    }

    // Case-insensitive lookup: we don't have access to a real database from
    // this environment to confirm the exact stored casing, so match
    // leniently rather than assume exact byte-for-byte equality.
    const jurisdiction = await prisma.jurisdiction.findFirst({
      where: { name: { equals: realCountyName, mode: 'insensitive' } },
      select: { id: true, name: true },
    })

    if (!jurisdiction) {
      console.warn(
        `  SKIP  ${permit.projectName} (${permit.id}): no Jurisdiction row named "${realCountyName}" found — create it first (e.g. via /admin/jurisdictions), then re-run this script.`
      )
      skipped++
      continue
    }

    // Mirror app/api/permits/[id]/route.ts's PATCH handler: set
    // jurisdictionId, mirror the jurisdiction's real name into the legacy
    // free-text `county` field, then regenerate the checklist.
    await prisma.permitPackage.update({
      where: { id: permit.id },
      data: {
        jurisdictionId: jurisdiction.id,
        county: jurisdiction.name,
      },
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
