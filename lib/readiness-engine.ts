/**
 * Package Readiness Engine
 *
 * Evaluates whether a PermitPackage is eligible for a given stage transition.
 * Called before any internalStage → ReadyToSubmit transition.
 *
 * Blockers prevent the transition entirely (unless overridden by ADMIN).
 * Warnings are surfaced to the user but do not block submission.
 */

import { prisma } from '@/lib/prisma'
import { requirementAppliesToPermitType } from '@/lib/checklist-engine'

export interface ReadinessBlocker {
  type:
    | 'MISSING_REQUIRED_DOCUMENT'
    | 'UNVERIFIED_REQUIRED_DOCUMENT'
    | 'CONTRACTOR_LICENSE_EXPIRED'
    | 'CONTRACTOR_INSURANCE_EXPIRED'
    | 'CONTRACTOR_INSURANCE_EXPIRING_SOON'
    | 'MISSING_JURISDICTION'
    | 'MISSING_PROJECT_ADDRESS'
    | 'OPEN_REVIEW_COMMENTS'
  message: string
  checklistItemId?: string
  documentId?: string
  contractorDocumentId?: string
}

export interface ReadinessWarning {
  type:
    | 'CONTRACTOR_LICENSE_EXPIRING_SOON'
    | 'NO_CHECKLIST_ITEMS'
    | 'UNVERIFIED_OPTIONAL_DOCUMENT'
    | 'MISSING_TARGET_DATE'
  message: string
}

export interface ReadinessResult {
  isReady: boolean
  blockers: ReadinessBlocker[]
  warnings: ReadinessWarning[]
  checklistPct: number
}

const INSURANCE_EXPIRY_BLOCK_DAYS = 7
const LICENSE_EXPIRY_WARN_DAYS = 30

/**
 * Evaluate whether a package is ready to submit to a county.
 *
 * @param packageId   The package to evaluate
 * @returns           ReadinessResult with blockers and warnings
 */
export async function evaluateReadiness(packageId: string): Promise<ReadinessResult> {
  const blockers: ReadinessBlocker[] = []
  const warnings: ReadinessWarning[] = []

  const pkg = await prisma.permitPackage.findUnique({
    where: { id: packageId },
    include: {
      contractor: {
        include: {
          contractorDocuments: {
            where: { isSuperseded: false },
            orderBy: { uploadedAt: 'desc' },
          },
        },
      },
      checklistItems: {
        include: {
          requirement: {
            select: {
              id: true,
              isRequired: true,
              isMandatoryForSubmission: true,
              isActive: true,
              documentName: true,
              documentCategory: true,
              jurisdictionId: true,
              permitTypes: true,
            },
          },
          document: {
            select: { id: true, status: true, isVerified: true },
          },
        },
      },
      // All SENT_BACK cycles — not just the latest. Unresolved comments on an
      // older send-back must still block ReadyToSubmit after a later cycle.
      reviewAssignments: {
        where: { status: 'SENT_BACK' },
        include: {
          comments: {
            where: { isResolved: false },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!pkg) {
    throw new Error(`Package ${packageId} not found`)
  }

  // ── Required fields ──────────────────────────────────────────────────────
  if (!pkg.projectAddress) {
    blockers.push({
      type: 'MISSING_PROJECT_ADDRESS',
      message: 'Project address is required before submission.',
    })
  }

  if (!pkg.jurisdictionId) {
    blockers.push({
      type: 'MISSING_JURISDICTION',
      message: 'A jurisdiction must be linked before submission.',
    })
  }

  // ── Checklist evaluation ─────────────────────────────────────────────────
  // Evaluate against the live jurisdiction catalog so:
  // - deactivated requirements cannot satisfy readiness via leftover VERIFIED items
  // - newly added mandatory requirements block even if syncChecklist was never run
  const catalogRequirements = pkg.jurisdictionId
    ? await prisma.requirement.findMany({
        where: {
          jurisdictionId: { equals: pkg.jurisdictionId },
          isActive: true,
        },
        select: {
          id: true,
          documentName: true,
          isMandatoryForSubmission: true,
          permitTypes: true,
        },
      })
    : []

  const applicableCatalog = catalogRequirements.filter((req) =>
    requirementAppliesToPermitType(req.permitTypes, pkg.permitType)
  )
  const mandatoryCatalog = applicableCatalog.filter((req) => req.isMandatoryForSubmission)

  const itemsByRequirementId = new Map(
    pkg.checklistItems
      .filter(
        (item) =>
          item.requirement.isActive &&
          item.requirement.jurisdictionId === pkg.jurisdictionId &&
          requirementAppliesToPermitType(item.requirement.permitTypes, pkg.permitType)
      )
      .map((item) => [item.requirementId, item])
  )

  if (pkg.jurisdictionId && applicableCatalog.length === 0) {
    warnings.push({
      type: 'NO_CHECKLIST_ITEMS',
      message:
        'No active checklist requirements found for this jurisdiction/permit type. Verify the jurisdiction requirements are configured.',
    })
  } else if (pkg.jurisdictionId && mandatoryCatalog.length === 0) {
    warnings.push({
      type: 'NO_CHECKLIST_ITEMS',
      message:
        'No mandatory checklist items found. Verify the jurisdiction requirements are configured.',
    })
  }

  const checklistNeverGenerated =
    !!pkg.jurisdictionId &&
    applicableCatalog.length > 0 &&
    itemsByRequirementId.size === 0

  if (checklistNeverGenerated) {
    blockers.push({
      type: 'MISSING_REQUIRED_DOCUMENT',
      message:
        'Checklist has not been generated for this jurisdiction. Generate the checklist before submission.',
    })
  } else {
    for (const req of mandatoryCatalog) {
      const item = itemsByRequirementId.get(req.id)

      if (!item) {
        blockers.push({
          type: 'MISSING_REQUIRED_DOCUMENT',
          message: `Required document not uploaded: "${req.documentName}"`,
        })
        continue
      }

      if (item.status === 'WAIVED' || item.status === 'NOT_APPLICABLE') continue

      if (item.status === 'PENDING' || !item.document) {
        blockers.push({
          type: 'MISSING_REQUIRED_DOCUMENT',
          message: `Required document not uploaded: "${req.documentName}"`,
          checklistItemId: item.id,
        })
      } else if (
        // Require both checklist VERIFIED and a live Verified document.
        // isVerified alone is insufficient: PATCH can set isVerified while
        // leaving status Pending/Rejected and still satisfy ReadyToSubmit.
        item.status !== 'VERIFIED' ||
        !item.document.isVerified ||
        item.document.status !== 'Verified'
      ) {
        blockers.push({
          type: 'UNVERIFIED_REQUIRED_DOCUMENT',
          message: `Required document not verified: "${req.documentName}"`,
          checklistItemId: item.id,
          documentId: item.document.id,
        })
      }
    }
  }

  // Optional unverified items → warning only (active + applicable only)
  for (const req of applicableCatalog.filter((r) => !r.isMandatoryForSubmission)) {
    const item = itemsByRequirementId.get(req.id)
    if (item?.document && !item.document.isVerified) {
      warnings.push({
        type: 'UNVERIFIED_OPTIONAL_DOCUMENT',
        message: `Optional document not verified: "${req.documentName}"`,
      })
    }
  }

  // ── Contractor compliance ────────────────────────────────────────────────
  const now = new Date()

  const licenseDoc = pkg.contractor.contractorDocuments.find(
    (d) => d.type === 'LICENSE'
  )
  const workersCompDoc = pkg.contractor.contractorDocuments.find(
    (d) => d.type === 'WORKERS_COMP'
  )
  const liabilityDoc = pkg.contractor.contractorDocuments.find(
    (d) => d.type === 'LIABILITY'
  )

  // License
  if (licenseDoc?.expirationDate) {
    const daysUntilExpiry = daysBetween(now, licenseDoc.expirationDate)
    if (daysUntilExpiry < 0) {
      blockers.push({
        type: 'CONTRACTOR_LICENSE_EXPIRED',
        message: `Contractor license expired ${Math.abs(daysUntilExpiry)} day(s) ago.`,
        contractorDocumentId: licenseDoc.id,
      })
    } else if (daysUntilExpiry <= LICENSE_EXPIRY_WARN_DAYS) {
      warnings.push({
        type: 'CONTRACTOR_LICENSE_EXPIRING_SOON',
        message: `Contractor license expires in ${daysUntilExpiry} day(s).`,
      })
    }
  }

  // Workers Comp — vault doc preferred; legacy contractor field if no vault row
  if (workersCompDoc?.expirationDate) {
    const daysUntilExpiry = daysBetween(now, workersCompDoc.expirationDate)
    if (daysUntilExpiry < 0) {
      blockers.push({
        type: 'CONTRACTOR_INSURANCE_EXPIRED',
        message: `Contractor workers compensation expired ${Math.abs(daysUntilExpiry)} day(s) ago.`,
        contractorDocumentId: workersCompDoc.id,
      })
    } else if (daysUntilExpiry <= INSURANCE_EXPIRY_BLOCK_DAYS) {
      blockers.push({
        type: 'CONTRACTOR_INSURANCE_EXPIRING_SOON',
        message: `Workers compensation expires in ${daysUntilExpiry} day(s) — too soon for submission.`,
        contractorDocumentId: workersCompDoc.id,
      })
    }
  } else if (pkg.contractor.workersCompExpirationDate) {
    checkLegacyExpiry(
      pkg.contractor.workersCompExpirationDate,
      'Workers Comp',
      now,
      blockers,
      warnings,
      INSURANCE_EXPIRY_BLOCK_DAYS
    )
  }

  // Liability — vault doc preferred; legacy contractor field if no vault row
  if (liabilityDoc?.expirationDate) {
    const daysUntilExpiry = daysBetween(now, liabilityDoc.expirationDate)
    if (daysUntilExpiry < 0) {
      blockers.push({
        type: 'CONTRACTOR_INSURANCE_EXPIRED',
        message: `Contractor liability insurance expired ${Math.abs(daysUntilExpiry)} day(s) ago.`,
        contractorDocumentId: liabilityDoc.id,
      })
    } else if (daysUntilExpiry <= INSURANCE_EXPIRY_BLOCK_DAYS) {
      blockers.push({
        type: 'CONTRACTOR_INSURANCE_EXPIRING_SOON',
        message: `Liability insurance expires in ${daysUntilExpiry} day(s) — too soon for submission.`,
        contractorDocumentId: liabilityDoc.id,
      })
    }
  } else if (pkg.contractor.liabilityExpirationDate) {
    checkLegacyExpiry(
      pkg.contractor.liabilityExpirationDate,
      'Liability Insurance',
      now,
      blockers,
      warnings,
      INSURANCE_EXPIRY_BLOCK_DAYS
    )
  }

  // ── Open correction comments ─────────────────────────────────────────────
  const openComments = pkg.reviewAssignments.flatMap((assignment) => assignment.comments)
  if (openComments.length > 0) {
    blockers.push({
      type: 'OPEN_REVIEW_COMMENTS',
      message: `${openComments.length} unresolved correction comment(s) must be addressed before resubmission.`,
    })
  }

  // ── Optional field warnings ───────────────────────────────────────────────
  if (!pkg.targetIssueDate) {
    warnings.push({
      type: 'MISSING_TARGET_DATE',
      message: 'No target issue date set.',
    })
  }

  // ── Checklist percentage ─────────────────────────────────────────────────
  const totalRequired = mandatoryCatalog.length
  const completedRequired = mandatoryCatalog.filter((req) => {
    const item = itemsByRequirementId.get(req.id)
    return (
      !!item &&
      (item.status === 'VERIFIED' ||
        item.status === 'WAIVED' ||
        item.status === 'NOT_APPLICABLE')
    )
  }).length
  const checklistPct =
    totalRequired === 0 ? 100 : Math.round((completedRequired / totalRequired) * 100)

  return {
    isReady: blockers.length === 0,
    blockers,
    warnings,
    checklistPct,
  }
}

// ============================================================================
// Helpers
// ============================================================================

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function checkLegacyExpiry(
  expiryDate: Date,
  label: string,
  now: Date,
  blockers: ReadinessBlocker[],
  warnings: ReadinessWarning[],
  blockWithinDays: number
) {
  const days = daysBetween(now, expiryDate)
  if (days < 0) {
    blockers.push({
      type: 'CONTRACTOR_INSURANCE_EXPIRED',
      message: `Contractor ${label} expired ${Math.abs(days)} day(s) ago.`,
    })
  } else if (days <= blockWithinDays) {
    blockers.push({
      type: 'CONTRACTOR_INSURANCE_EXPIRING_SOON',
      message: `${label} expires in ${days} day(s) — too soon for submission.`,
    })
  }
}
