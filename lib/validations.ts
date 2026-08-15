/**
 * Validation Schemas
 *
 * Zod schemas for validating API request data.
 * These ensure data integrity and type safety across the application.
 */

import { z } from 'zod'

// ============================================================================
// SHARED ENUMS
// ============================================================================

export const userRoleEnum = z.enum(['admin', 'coordinator', 'reviewer'])

export const permitTypeEnum = z.enum([
  'Building',
  'Electrical',
  'Plumbing',
  'Mechanical',
  'Roofing',
  'HVAC',
  'Structural',
  'MobileHome',
  'Other',
])

export const permitStatusEnum = z.enum([
  'New',
  'Submitted',
  'InReview',
  'RevisionsNeeded',
  'Approved',
  'Issued',
  'Inspections',
  'FinaledClosed',
  'Canceled',
])

export const internalStageEnum = z.enum([
  'WaitingOnContractorDocs',
  'WaitingOnCounty',
  'WaitingOnBilling',
  'ReadyToSubmit',
  'ReadyToClose',
  'InProgress',
])

export const billingStatusEnum = z.enum([
  'NotSent',
  'SentToBilling',
  'Billed',
  'Paid',
])

export const taskStatusEnum = z.enum([
  'NotStarted',
  'InProgress',
  'Waiting',
  'Completed',
])

export const documentCategoryEnum = z.enum([
  'Application',
  'Plans',
  'Specifications',
  'Engineering',
  'Photos',
  'Correspondence',
  'Inspection',
  'Certificate',
  'Other',
])

export const documentStatusEnum = z.enum([
  'Pending',
  'Verified',
  'Rejected',
])

export const checklistItemStatusEnum = z.enum([
  'PENDING',
  'UPLOADED',
  'VERIFIED',
  'REJECTED',
  'WAIVED',
  'NOT_APPLICABLE',
])

export const contractorDocTypeEnum = z.enum([
  'LICENSE',
  'WORKERS_COMP',
  'LIABILITY',
  'W9',
  'OTHER',
])

export const contractorDocStatusEnum = z.enum([
  'ACTIVE',
  'EXPIRED',
  'PENDING_REVIEW',
])

export const reviewStatusEnum = z.enum([
  'ASSIGNED',
  'IN_REVIEW',
  'APPROVED',
  'SENT_BACK',
])

export const exportStatusEnum = z.enum([
  'GENERATED',
  'DOWNLOADED',
  'SUBMITTED',
])

// ============================================================================
// USER
// ============================================================================

export const userSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: userRoleEnum.default('coordinator'),
})

export const userUpdateSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: userRoleEnum.optional(),
})

// ============================================================================
// CUSTOMER
// ============================================================================

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  mainAddress: z.string().optional(),
  notes: z.string().optional(),
})

export const customerUpdateSchema = customerSchema.partial()

// ============================================================================
// CONTRACTOR
// ============================================================================

export const contractorSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  licenseNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  preferredContactMethod: z.enum(['phone', 'email', 'text']).optional(),
  specialties: z.string().optional(),
  workersCompExpirationDate: z.string().datetime().optional().or(z.literal('')).transform((val) => val === '' ? undefined : val),
  liabilityExpirationDate: z.string().datetime().optional().or(z.literal('')).transform((val) => val === '' ? undefined : val),
  notes: z.string().optional(),
})

export const contractorUpdateSchema = contractorSchema.partial()

// ============================================================================
// CONTRACTOR DOCUMENT VAULT
// ============================================================================

export const contractorDocumentSchema = z.object({
  type: contractorDocTypeEnum,
  documentName: z.string().min(1, 'Document name is required'),
  issueDate: z.string().datetime().optional().or(z.literal('')).transform((val) => val === '' ? undefined : val),
  expirationDate: z.string().datetime().optional().or(z.literal('')).transform((val) => val === '' ? undefined : val),
  notes: z.string().optional(),
})

export const contractorDocumentUpdateSchema = z.object({
  documentName: z.string().min(1).optional(),
  issueDate: z.string().datetime().optional().or(z.literal('')).transform((val) => val === '' ? undefined : val),
  expirationDate: z.string().datetime().optional().or(z.literal('')).transform((val) => val === '' ? undefined : val),
  status: contractorDocStatusEnum.optional(),
  isVerified: z.boolean().optional(),
  notes: z.string().optional(),
  isSuperseded: z.boolean().optional(),
})

// ============================================================================
// JURISDICTION
// ============================================================================

export const jurisdictionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  countyCode: z.string().min(1, 'County code is required').max(10),
  state: z.string().length(2, 'State must be a 2-letter code').default('FL'),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

export const jurisdictionUpdateSchema = jurisdictionSchema.partial()

// ============================================================================
// REQUIREMENT
// ============================================================================

export const requirementSchema = z.object({
  jurisdictionId: z.string().min(1, 'Jurisdiction is required'),
  // JSON-serialized array of PermitType values, or ["*"] for all
  permitTypes: z.string().min(1, 'At least one permit type is required'),
  documentCategory: documentCategoryEnum,
  documentName: z.string().min(1, 'Document name is required'),
  description: z.string().optional(),
  helpText: z.string().optional(),
  isRequired: z.boolean().default(true),
  isMandatoryForSubmission: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  validationRules: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const requirementUpdateSchema = requirementSchema.omit({ jurisdictionId: true }).partial()

// ============================================================================
// CHECKLIST ITEM
// ============================================================================

// Operational statuses coordinators may set. WAIVED / NOT_APPLICABLE both skip
// readiness and must go through the admin waive schema with a reason.
export const checklistItemOperationalStatusEnum = z.enum([
  'PENDING',
  'UPLOADED',
  'VERIFIED',
  'REJECTED',
])

export const checklistItemUpdateSchema = z.object({
  status: checklistItemOperationalStatusEnum.optional(),
  documentId: z.string().optional().nullable(),
  notes: z.string().optional(),
})

// WAIVED / NOT_APPLICABLE both skip the readiness gate — admin-only with reason
export const checklistItemWaiveSchema = z.object({
  status: z.enum(['WAIVED', 'NOT_APPLICABLE']).default('WAIVED'),
  waiverReason: z.string().min(10, 'Waiver reason must be at least 10 characters'),
})

// ============================================================================
// PERMIT PACKAGE
// ============================================================================

export const permitPackageSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  contractorId: z.string().min(1, 'Contractor is required'),
  coordinatorId: z.string().optional(),
  jurisdictionId: z.string().optional(),
  projectName: z.string().min(1, 'Project name is required'),
  projectAddress: z.string().min(1, 'Project address is required'),
  county: z.string().optional(),
  jurisdictionNotes: z.string().optional(),
  permitType: permitTypeEnum,
  status: permitStatusEnum.optional(),
  internalStage: internalStageEnum.optional(),
  permitNumber: z.string().optional(),
  targetIssueDate: z.string().datetime().optional().or(z.literal('')),
  billingStatus: billingStatusEnum.optional(),
  billingNotes: z.string().optional(),
})

export const permitPackageUpdateSchema = permitPackageSchema.partial()

export const permitStatusUpdateSchema = z.object({
  status: permitStatusEnum,
  internalStage: internalStageEnum.optional(),
  note: z.string().optional(),
  // Admin-only override for readiness gate
  overrideReadiness: z.boolean().optional(),
  overrideReason: z.string().optional(),
})

// ============================================================================
// TASK
// ============================================================================

export const taskSchema = z.object({
  permitPackageId: z.string().min(1, 'Permit package is required'),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  status: taskStatusEnum.optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

// permitPackageId is immutable after create — allowing it on PATCH silently
// moves tasks across packages and drops workflow obligations (e.g. billing).
export const taskUpdateSchema = taskSchema.omit({ permitPackageId: true }).partial()

// ============================================================================
// DOCUMENT
// ============================================================================

export const documentUpdateSchema = z.object({
  category: documentCategoryEnum.optional(),
  notes: z.string().optional(),
  isRequired: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  status: documentStatusEnum.optional(),
})

export const documentVerifySchema = z.object({
  isVerified: z.boolean(),
  notes: z.string().optional(),
})

// ============================================================================
// REVIEW
// ============================================================================

export const reviewAssignSchema = z.object({
  reviewerId: z.string().min(1, 'Reviewer is required'),
  dueDate: z.string().datetime().optional().or(z.literal('')),
})

export const reviewActionSchema = z.object({
  action: z.enum(['start', 'approve', 'send_back']),
  // Required when action === 'send_back'
  note: z.string().optional(),
})

export const reviewCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
  checklistItemId: z.string().optional(),
  documentId: z.string().optional(),
})

export const reviewCommentUpdateSchema = z.object({
  isResolved: z.boolean(),
})

// ============================================================================
// EXPORT
// ============================================================================

export const exportProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  jurisdictionId: z.string().optional(),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  folderStructure: z.string().default('[]'),
  fileNamingPattern: z.string().default('{category}_{fileName}'),
  includeManifest: z.boolean().default(true),
})

export const exportProfileUpdateSchema = exportProfileSchema.partial()
