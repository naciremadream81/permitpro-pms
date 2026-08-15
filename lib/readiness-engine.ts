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
    | 'WRONG_DOCUMENT_CATEGORY'
    | 'NO_CHECKLIST_ITEMS'
    | 'CONTRACTOR_LICENSE_MISSING'
    | 'CONTRACTOR_LICENSE_EXPIRED'
    | 'CONTRACTOR_INSURANCE_MISSING'
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
            select: { id: true, status: true, isVerified: true, category: true },
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

  // An empty or optional-only catalog must block ReadyToSubmit — otherwise a
  // misconfigured jurisdiction yields vacuous isReady=true (100% of nothing).
  if (pkg.jurisdictionId && applicableCatalog.length === 0) {
    blockers.push({
      type: 'NO_CHECKLIST_ITEMS',
      message:
        'No active checklist requirements found for this jurisdiction/permit type. Configure jurisdiction requirements before submission.',
    })
  } else if (pkg.jurisdictionId && mandatoryCatalog.length === 0) {
    blockers.push({
      type: 'NO_CHECKLIST_ITEMS',
      message:
        'No mandatory checklist items found. Configure at least one mandatory requirement before submission.',
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
      } else if (item.document.category !== item.requirement.documentCategory) {
        blockers.push({
          type: 'WRONG_DOCUMENT_CATEGORY',
          message: `Linked document category "${item.document.category}" does not match required "${item.requirement.documentCategory}" for "${req.documentName}".`,
          checklistItemId: item.id,
          documentId: item.document.id,
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
  // Missing / undated vault docs must block — otherwise deleting or superseding
  // an expired LICENSE/insurance with an undated upload clears the blocker.
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

  // License — vault LICENSE with a future expirationDate is required
  if (!licenseDoc) {
    blockers.push({
      type: 'CONTRACTOR_LICENSE_MISSING',
      message: 'Contractor license document is required before submission.',
    })
  } else if (!licenseDoc.expirationDate) {
    blockers.push({
      type: 'CONTRACTOR_LICENSE_MISSING',
      message: 'Contractor license is missing an expiration date.',
      contractorDocumentId: licenseDoc.id,
    })
  } else {
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

  // Workers Comp — vault expiration preferred; undated vault falls through to legacy
  checkInsuranceExpiry({
    label: 'Workers compensation',
    vaultDoc: workersCompDoc,
    legacyDate: pkg.contractor.workersCompExpirationDate,
    now,
    blockers,
    blockWithinDays: INSURANCE_EXPIRY_BLOCK_DAYS,
  })

  // Liability — vault expiration preferred; undated vault falls through to legacy
  checkInsuranceExpiry({
    label: 'Liability insurance',
    vaultDoc: liabilityDoc,
    legacyDate: pkg.contractor.liabilityExpirationDate,
    now,
    blockers,
    blockWithinDays: INSURANCE_EXPIRY_BLOCK_DAYS,
  })

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

function checkInsuranceExpiry(opts: {
  label: string
  vaultDoc: { id: string; expirationDate: Date | null } | undefined
  legacyDate: Date | null | undefined
  now: Date
  blockers: ReadinessBlocker[]
  blockWithinDays: number
}) {
  const { label, vaultDoc, legacyDate, now, blockers, blockWithinDays } = opts

  // Vault is source of truth when present. An undated vault row must block —
  // falling through to a stale legacy date would let an undated supersede clear
  // an expired vault blocker.
  let expiryDate: Date | null = null
  let contractorDocumentId: string | undefined

  if (vaultDoc) {
    if (!vaultDoc.expirationDate) {
      blockers.push({
        type: 'CONTRACTOR_INSURANCE_MISSING',
        message: `Contractor ${label} is missing an expiration date.`,
        contractorDocumentId: vaultDoc.id,
      })
      return
    }
    expiryDate = vaultDoc.expirationDate
    contractorDocumentId = vaultDoc.id
  } else if (legacyDate) {
    expiryDate = legacyDate
  } else {
    blockers.push({
      type: 'CONTRACTOR_INSURANCE_MISSING',
      message: `Contractor ${label} with an expiration date is required before submission.`,
    })
    return
  }

  const days = daysBetween(now, expiryDate)
  if (days < 0) {
    blockers.push({
      type: 'CONTRACTOR_INSURANCE_EXPIRED',
      message: `Contractor ${label} expired ${Math.abs(days)} day(s) ago.`,
      contractorDocumentId,
    })
  } else if (days <= blockWithinDays) {
    blockers.push({
      type: 'CONTRACTOR_INSURANCE_EXPIRING_SOON',
      message: `${label} expires in ${days} day(s) — too soon for submission.`,
      contractorDocumentId,
    })
  }
}
