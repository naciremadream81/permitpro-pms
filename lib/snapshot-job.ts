/**
 * Daily Package Snapshot Job
 *
 * Captures an operational state snapshot for every active PermitPackage.
 * Designed to be called once per day (e.g. from a cron endpoint or scheduled job).
 * Uses upsert so re-running on the same day is idempotent.
 */

import { prisma } from '@/lib/prisma'

export interface SnapshotResult {
  created: number
  updated: number
  errors: number
  durationMs: number
}

export async function runDailySnapshot(): Promise<SnapshotResult> {
  const start = Date.now()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const packages = await prisma.permitPackage.findMany({
    where: {
      status: { notIn: ['FinaledClosed', 'Canceled'] },
    },
    include: {
      checklistItems: {
        select: {
          status: true,
          requirement: { select: { isMandatoryForSubmission: true } },
        },
      },
      documents: {
        select: { status: true },
      },
      reviewAssignments: {
        select: {
          status: true,
          comments: {
            where: { isResolved: false },
            select: { id: true },
          },
        },
      },
      _count: {
        select: { documents: true },
      },
    },
  })

  let created = 0
  let updated = 0
  let errors = 0
  const now = new Date()

  for (const pkg of packages) {
    try {
      // Checklist % — an item counts as done once a document is attached
      // (UPLOADED); final verification is tracked separately via verifiedDocPct.
      // Keep this aligned with checklistCompletionPct (lib/checklist-engine.ts)
      // and the readiness engine (lib/readiness-engine.ts).
      const mandatory = pkg.checklistItems.filter(i => i.requirement.isMandatoryForSubmission)
      const done = mandatory.filter(i =>
        i.status === 'UPLOADED' || i.status === 'VERIFIED' || i.status === 'WAIVED' || i.status === 'NOT_APPLICABLE'
      )
      const checklistPct = mandatory.length === 0 ? 100 : Math.round((done.length / mandatory.length) * 100)

      // Verified document %
      const totalDocs = pkg.documents.length
      const verifiedDocs = pkg.documents.filter(d => d.status === 'Verified').length
      const verifiedDocPct = totalDocs === 0 ? 0 : Math.round((verifiedDocs / totalDocs) * 100)

      // Days in current stage — use lastActivityAt as a proxy
      const since = pkg.lastActivityAt ?? pkg.openedDate
      const daysInStage = Math.floor((now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24))

      // Open review comments across all assignments
      const openComments = pkg.reviewAssignments.reduce(
        (sum, ra) => sum + ra.comments.length,
        0
      )

      // Check if snapshot already exists for today
      const existing = await prisma.packageSnapshot.findUnique({
        where: { packageId_snapshotDate: { packageId: pkg.id, snapshotDate: today } },
        select: { id: true },
      })

      const payload = {
        status: pkg.status,
        stage: pkg.internalStage ?? null,
        checklistPct,
        verifiedDocPct,
        daysInStage,
        totalDocuments: totalDocs,
        openComments,
      }

      await prisma.packageSnapshot.upsert({
        where: { packageId_snapshotDate: { packageId: pkg.id, snapshotDate: today } },
        create: { packageId: pkg.id, snapshotDate: today, ...payload },
        update: payload,
      })

      if (existing) { updated++ } else { created++ }
    } catch (err) {
      console.error(`Snapshot failed for package ${pkg.id}:`, err)
      errors++
    }
  }

  return { created, updated, errors, durationMs: Date.now() - start }
}
