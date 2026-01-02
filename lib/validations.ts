/**
 * Validation Schemas
 * 
 * Zod schemas for validating API request data.
 * These ensure data integrity and type safety across the application.
 */

import { z } from 'zod'

// Customer validation schemas
export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  mainAddress: z.string().optional(),
  notes: z.string().optional(),
})

export const customerUpdateSchema = customerSchema.partial()

// Contractor validation schemas
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

// Permit Package validation schemas
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

export const permitPackageSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  contractorId: z.string().min(1, 'Contractor is required'),
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
})

// Task validation schemas
export const taskStatusEnum = z.enum([
  'NotStarted',
  'InProgress',
  'Waiting',
  'Completed',
])

export const taskSchema = z.object({
  permitPackageId: z.string().min(1, 'Permit package is required'),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  status: taskStatusEnum.optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

export const taskUpdateSchema = taskSchema.partial()

// Document validation schemas
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

