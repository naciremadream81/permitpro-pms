-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED', 'WAIVED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('Building', 'Electrical', 'Plumbing', 'Mechanical', 'Roofing', 'HVAC', 'Structural', 'MobileHome', 'Other');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('New', 'Submitted', 'InReview', 'RevisionsNeeded', 'Approved', 'Issued', 'Inspections', 'FinaledClosed', 'Canceled');

-- CreateEnum
CREATE TYPE "InternalStage" AS ENUM ('WaitingOnContractorDocs', 'WaitingOnCounty', 'WaitingOnBilling', 'ReadyToSubmit', 'ReadyToClose', 'InProgress');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('NotSent', 'SentToBilling', 'Billed', 'Paid');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('Application', 'Plans', 'Specifications', 'Engineering', 'Photos', 'Correspondence', 'Inspection', 'Certificate', 'Other');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('Pending', 'Verified', 'Rejected');

-- CreateEnum
CREATE TYPE "ContractorDocType" AS ENUM ('LICENSE', 'WORKERS_COMP', 'LIABILITY', 'W9', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractorDocStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('ASSIGNED', 'IN_REVIEW', 'APPROVED', 'SENT_BACK');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONTRACTOR_LICENSE_EXPIRING_30D', 'CONTRACTOR_LICENSE_EXPIRING_7D', 'CONTRACTOR_LICENSE_EXPIRED', 'CONTRACTOR_INSURANCE_EXPIRING_60D', 'CONTRACTOR_INSURANCE_EXPIRING_30D', 'CONTRACTOR_INSURANCE_EXPIRED', 'PACKAGE_STALLED', 'REVIEW_ASSIGNED', 'REVIEW_SENT_BACK', 'REVIEW_APPROVED', 'EXPORT_READY', 'CHECKLIST_ITEM_WAIVED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('GENERATED', 'DOWNLOADED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NotStarted', 'InProgress', 'Waiting', 'Completed');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('StatusChange', 'StageChange', 'BillingStatusChange', 'DocumentUploaded', 'DocumentVerified', 'DocumentRejected', 'TaskCreated', 'TaskCompleted', 'NoteAdded', 'FieldUpdated', 'ChecklistGenerated', 'ChecklistItemUpdated', 'ChecklistItemWaived', 'ReviewAssigned', 'ReviewStarted', 'ReviewApproved', 'ReviewSentBack', 'CommentAdded', 'CommentResolved', 'ContractorDocumentUploaded', 'PackageExported', 'ReadinessBlocked', 'ReadinessOverridden');

-- CreateEnum
CREATE TYPE "DocumentTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PACKAGE_PIPELINE', 'STALLED_PACKAGES', 'CONTRACTOR_COMPLIANCE', 'DOCUMENT_QUALITY', 'REVIEW_PERFORMANCE', 'SUBMISSION_VOLUME');

-- CreateEnum
CREATE TYPE "ChangeAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ACTIVATED', 'DEACTIVATED', 'RESTORED');

-- CreateEnum
CREATE TYPE "SeedBatchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'coordinator',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "mainAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "preferredContactMethod" TEXT,
    "specialties" TEXT,
    "workersCompExpirationDate" TIMESTAMP(3),
    "liabilityExpirationDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jurisdiction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countyCode" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'FL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "permitTypes" TEXT NOT NULL,
    "documentCategory" "DocumentCategory" NOT NULL,
    "documentName" TEXT NOT NULL,
    "description" TEXT,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isMandatoryForSubmission" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "validationRules" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" "ChecklistItemStatus" NOT NULL DEFAULT 'PENDING',
    "waiverReason" TEXT,
    "waivedBy" TEXT,
    "waivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitPackage" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "coordinatorId" TEXT,
    "jurisdictionId" TEXT,
    "projectName" TEXT NOT NULL,
    "projectAddress" TEXT NOT NULL,
    "county" TEXT,
    "jurisdictionNotes" TEXT,
    "permitType" "PermitType" NOT NULL,
    "status" "PermitStatus" NOT NULL DEFAULT 'New',
    "internalStage" "InternalStage" DEFAULT 'InProgress',
    "permitNumber" TEXT,
    "openedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetIssueDate" TIMESTAMP(3),
    "closedDate" TIMESTAMP(3),
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'NotSent',
    "sentToBillingAt" TIMESTAMP(3),
    "billingNotes" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermitPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitDocument" (
    "id" TEXT NOT NULL,
    "permitPackageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionTag" TEXT,
    "notes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "DocumentStatus" NOT NULL DEFAULT 'Pending',
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT,
    "parentDocumentId" TEXT,
    "versionGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermitDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorDocument" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "type" "ContractorDocType" NOT NULL,
    "documentName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ContractorDocStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "isSuperseded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContractorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAssignment" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "ReviewStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "documentId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "packageId" TEXT,
    "contractorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportProfile" (
    "id" TEXT NOT NULL,
    "jurisdictionId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "folderStructure" TEXT NOT NULL DEFAULT '[]',
    "fileNamingPattern" TEXT NOT NULL DEFAULT '{category}_{fileName}',
    "includeManifest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "exportedBy" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT,
    "downloadedAt" TIMESTAMP(3),
    "status" "ExportStatus" NOT NULL DEFAULT 'GENERATED',

    CONSTRAINT "ExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "permitPackageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'NotStarted',
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "priority" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "permitPackageId" TEXT NOT NULL,
    "userId" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequiredDocumentTemplate" (
    "id" TEXT NOT NULL,
    "permitType" "PermitType" NOT NULL,
    "county" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequiredDocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "mergeFields" TEXT NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "reportType" "ReportType" NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "columns" TEXT NOT NULL DEFAULT '[]',
    "sortBy" TEXT,
    "sortOrder" TEXT DEFAULT 'desc',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageSnapshot" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "stage" "InternalStage",
    "status" "PermitStatus" NOT NULL,
    "checklistPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verifiedDocPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daysInStage" INTEGER NOT NULL DEFAULT 0,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "openComments" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementChangeLog" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "seedBatchId" TEXT,
    "action" "ChangeAction" NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedBatch" (
    "id" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "description" TEXT,
    "totalCounties" INTEGER NOT NULL DEFAULT 0,
    "totalRequirements" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SeedBatchStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "SeedBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitTypeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermitTypeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Contractor_companyName_idx" ON "Contractor"("companyName");

-- CreateIndex
CREATE INDEX "Contractor_licenseNumber_idx" ON "Contractor"("licenseNumber");

-- CreateIndex
CREATE INDEX "Contractor_email_idx" ON "Contractor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Jurisdiction_countyCode_key" ON "Jurisdiction"("countyCode");

-- CreateIndex
CREATE INDEX "Jurisdiction_state_idx" ON "Jurisdiction"("state");

-- CreateIndex
CREATE INDEX "Jurisdiction_isActive_idx" ON "Jurisdiction"("isActive");

-- CreateIndex
CREATE INDEX "Requirement_jurisdictionId_idx" ON "Requirement"("jurisdictionId");

-- CreateIndex
CREATE INDEX "Requirement_documentCategory_idx" ON "Requirement"("documentCategory");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_jurisdictionId_documentName_permitTypes_key" ON "Requirement"("jurisdictionId", "documentName", "permitTypes");

-- CreateIndex
CREATE INDEX "ChecklistItem_packageId_idx" ON "ChecklistItem"("packageId");

-- CreateIndex
CREATE INDEX "ChecklistItem_requirementId_idx" ON "ChecklistItem"("requirementId");

-- CreateIndex
CREATE INDEX "ChecklistItem_status_idx" ON "ChecklistItem"("status");

-- CreateIndex
CREATE INDEX "PermitPackage_customerId_idx" ON "PermitPackage"("customerId");

-- CreateIndex
CREATE INDEX "PermitPackage_contractorId_idx" ON "PermitPackage"("contractorId");

-- CreateIndex
CREATE INDEX "PermitPackage_coordinatorId_idx" ON "PermitPackage"("coordinatorId");

-- CreateIndex
CREATE INDEX "PermitPackage_jurisdictionId_idx" ON "PermitPackage"("jurisdictionId");

-- CreateIndex
CREATE INDEX "PermitPackage_status_idx" ON "PermitPackage"("status");

-- CreateIndex
CREATE INDEX "PermitPackage_internalStage_idx" ON "PermitPackage"("internalStage");

-- CreateIndex
CREATE INDEX "PermitPackage_permitType_idx" ON "PermitPackage"("permitType");

-- CreateIndex
CREATE INDEX "PermitPackage_billingStatus_idx" ON "PermitPackage"("billingStatus");

-- CreateIndex
CREATE INDEX "PermitPackage_permitNumber_idx" ON "PermitPackage"("permitNumber");

-- CreateIndex
CREATE INDEX "PermitPackage_county_idx" ON "PermitPackage"("county");

-- CreateIndex
CREATE INDEX "PermitPackage_lastActivityAt_idx" ON "PermitPackage"("lastActivityAt");

-- CreateIndex
CREATE INDEX "PermitDocument_permitPackageId_idx" ON "PermitDocument"("permitPackageId");

-- CreateIndex
CREATE INDEX "PermitDocument_category_idx" ON "PermitDocument"("category");

-- CreateIndex
CREATE INDEX "PermitDocument_status_idx" ON "PermitDocument"("status");

-- CreateIndex
CREATE INDEX "PermitDocument_versionGroupId_idx" ON "PermitDocument"("versionGroupId");

-- CreateIndex
CREATE INDEX "PermitDocument_parentDocumentId_idx" ON "PermitDocument"("parentDocumentId");

-- CreateIndex
CREATE INDEX "ContractorDocument_contractorId_idx" ON "ContractorDocument"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorDocument_type_idx" ON "ContractorDocument"("type");

-- CreateIndex
CREATE INDEX "ContractorDocument_status_idx" ON "ContractorDocument"("status");

-- CreateIndex
CREATE INDEX "ContractorDocument_expirationDate_idx" ON "ContractorDocument"("expirationDate");

-- CreateIndex
CREATE INDEX "ReviewAssignment_packageId_idx" ON "ReviewAssignment"("packageId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_reviewerId_idx" ON "ReviewAssignment"("reviewerId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_status_idx" ON "ReviewAssignment"("status");

-- CreateIndex
CREATE INDEX "ReviewComment_assignmentId_idx" ON "ReviewComment"("assignmentId");

-- CreateIndex
CREATE INDEX "ReviewComment_isResolved_idx" ON "ReviewComment"("isResolved");

-- CreateIndex
CREATE INDEX "NotificationEvent_recipientId_idx" ON "NotificationEvent"("recipientId");

-- CreateIndex
CREATE INDEX "NotificationEvent_status_idx" ON "NotificationEvent"("status");

-- CreateIndex
CREATE INDEX "NotificationEvent_type_idx" ON "NotificationEvent"("type");

-- CreateIndex
CREATE INDEX "NotificationEvent_packageId_idx" ON "NotificationEvent"("packageId");

-- CreateIndex
CREATE INDEX "NotificationEvent_createdAt_idx" ON "NotificationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ExportProfile_jurisdictionId_idx" ON "ExportProfile"("jurisdictionId");

-- CreateIndex
CREATE INDEX "ExportLog_packageId_idx" ON "ExportLog"("packageId");

-- CreateIndex
CREATE INDEX "ExportLog_status_idx" ON "ExportLog"("status");

-- CreateIndex
CREATE INDEX "Task_permitPackageId_idx" ON "Task"("permitPackageId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_assignedTo_idx" ON "Task"("assignedTo");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "ActivityLog_permitPackageId_idx" ON "ActivityLog"("permitPackageId");

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_idx" ON "ActivityLog"("activityType");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "RequiredDocumentTemplate_permitType_county_idx" ON "RequiredDocumentTemplate"("permitType", "county");

-- CreateIndex
CREATE UNIQUE INDEX "RequiredDocumentTemplate_permitType_county_category_name_key" ON "RequiredDocumentTemplate"("permitType", "county", "category", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_code_key" ON "DocumentTemplate"("code");

-- CreateIndex
CREATE INDEX "DocumentTemplate_category_idx" ON "DocumentTemplate"("category");

-- CreateIndex
CREATE INDEX "DocumentTemplate_status_idx" ON "DocumentTemplate"("status");

-- CreateIndex
CREATE INDEX "SavedReport_createdBy_idx" ON "SavedReport"("createdBy");

-- CreateIndex
CREATE INDEX "SavedReport_reportType_idx" ON "SavedReport"("reportType");

-- CreateIndex
CREATE INDEX "PackageSnapshot_packageId_idx" ON "PackageSnapshot"("packageId");

-- CreateIndex
CREATE INDEX "PackageSnapshot_snapshotDate_idx" ON "PackageSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "PackageSnapshot_status_idx" ON "PackageSnapshot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PackageSnapshot_packageId_snapshotDate_key" ON "PackageSnapshot"("packageId", "snapshotDate");

-- CreateIndex
CREATE INDEX "RequirementChangeLog_requirementId_idx" ON "RequirementChangeLog"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementChangeLog_changedBy_idx" ON "RequirementChangeLog"("changedBy");

-- CreateIndex
CREATE INDEX "RequirementChangeLog_seedBatchId_idx" ON "RequirementChangeLog"("seedBatchId");

-- CreateIndex
CREATE INDEX "RequirementChangeLog_createdAt_idx" ON "RequirementChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "SeedBatch_triggeredBy_idx" ON "SeedBatch"("triggeredBy");

-- CreateIndex
CREATE INDEX "SeedBatch_status_idx" ON "SeedBatch"("status");

-- CreateIndex
CREATE INDEX "SeedBatch_startedAt_idx" ON "SeedBatch"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PermitTypeDefinition_code_key" ON "PermitTypeDefinition"("code");

-- CreateIndex
CREATE INDEX "PermitTypeDefinition_isActive_idx" ON "PermitTypeDefinition"("isActive");

-- CreateIndex
CREATE INDEX "PermitTypeDefinition_order_idx" ON "PermitTypeDefinition"("order");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PermitPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PermitDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitPackage" ADD CONSTRAINT "PermitPackage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitPackage" ADD CONSTRAINT "PermitPackage_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitPackage" ADD CONSTRAINT "PermitPackage_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitPackage" ADD CONSTRAINT "PermitPackage_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitDocument" ADD CONSTRAINT "PermitDocument_permitPackageId_fkey" FOREIGN KEY ("permitPackageId") REFERENCES "PermitPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitDocument" ADD CONSTRAINT "PermitDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitDocument" ADD CONSTRAINT "PermitDocument_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "PermitDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorDocument" ADD CONSTRAINT "ContractorDocument_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PermitPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReviewAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PermitDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportProfile" ADD CONSTRAINT "ExportProfile_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PermitPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportLog" ADD CONSTRAINT "ExportLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ExportProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_permitPackageId_fkey" FOREIGN KEY ("permitPackageId") REFERENCES "PermitPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_permitPackageId_fkey" FOREIGN KEY ("permitPackageId") REFERENCES "PermitPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageSnapshot" ADD CONSTRAINT "PackageSnapshot_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PermitPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementChangeLog" ADD CONSTRAINT "RequirementChangeLog_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementChangeLog" ADD CONSTRAINT "RequirementChangeLog_seedBatchId_fkey" FOREIGN KEY ("seedBatchId") REFERENCES "SeedBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

