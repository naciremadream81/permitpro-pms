-- CreateTable
CREATE TABLE "Jurisdiction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "countyCode" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'FL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jurisdictionId" TEXT NOT NULL,
    "permitTypes" TEXT NOT NULL,
    "documentCategory" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "description" TEXT,
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isMandatoryForSubmission" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "validationRules" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Requirement_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "waiverReason" TEXT,
    "waivedBy" TEXT,
    "waivedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChecklistItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PermitPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChecklistItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChecklistItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PermitDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractorDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "issueDate" DATETIME,
    "expirationDate" DATETIME,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "notes" TEXT,
    "isSuperseded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ContractorDocument_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewAssignment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PermitPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "documentId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewComment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReviewAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PermitDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "packageId" TEXT,
    "contractorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" DATETIME,
    "sentAt" DATETIME,
    "readAt" DATETIME,
    CONSTRAINT "NotificationEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jurisdictionId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "folderStructure" TEXT NOT NULL DEFAULT '[]',
    "fileNamingPattern" TEXT NOT NULL DEFAULT '{category}_{fileName}',
    "includeManifest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExportProfile_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "exportedBy" TEXT NOT NULL,
    "exportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profileId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT,
    "downloadedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    CONSTRAINT "ExportLog_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PermitPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExportLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ExportProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PermitPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "coordinatorId" TEXT,
    "jurisdictionId" TEXT,
    "projectName" TEXT NOT NULL,
    "projectAddress" TEXT NOT NULL,
    "county" TEXT,
    "jurisdictionNotes" TEXT,
    "permitType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'New',
    "internalStage" TEXT DEFAULT 'InProgress',
    "permitNumber" TEXT,
    "openedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetIssueDate" DATETIME,
    "closedDate" DATETIME,
    "billingStatus" TEXT NOT NULL DEFAULT 'NotSent',
    "sentToBillingAt" DATETIME,
    "billingNotes" TEXT,
    "lastActivityAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PermitPackage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PermitPackage_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PermitPackage_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PermitPackage_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PermitPackage" ("billingNotes", "billingStatus", "closedDate", "contractorId", "county", "createdAt", "customerId", "id", "internalStage", "jurisdictionNotes", "openedDate", "permitNumber", "permitType", "projectAddress", "projectName", "sentToBillingAt", "status", "targetIssueDate", "updatedAt") SELECT "billingNotes", "billingStatus", "closedDate", "contractorId", "county", "createdAt", "customerId", "id", "internalStage", "jurisdictionNotes", "openedDate", "permitNumber", "permitType", "projectAddress", "projectName", "sentToBillingAt", "status", "targetIssueDate", "updatedAt" FROM "PermitPackage";
DROP TABLE "PermitPackage";
ALTER TABLE "new_PermitPackage" RENAME TO "PermitPackage";
CREATE INDEX "PermitPackage_customerId_idx" ON "PermitPackage"("customerId");
CREATE INDEX "PermitPackage_contractorId_idx" ON "PermitPackage"("contractorId");
CREATE INDEX "PermitPackage_coordinatorId_idx" ON "PermitPackage"("coordinatorId");
CREATE INDEX "PermitPackage_jurisdictionId_idx" ON "PermitPackage"("jurisdictionId");
CREATE INDEX "PermitPackage_status_idx" ON "PermitPackage"("status");
CREATE INDEX "PermitPackage_internalStage_idx" ON "PermitPackage"("internalStage");
CREATE INDEX "PermitPackage_permitType_idx" ON "PermitPackage"("permitType");
CREATE INDEX "PermitPackage_billingStatus_idx" ON "PermitPackage"("billingStatus");
CREATE INDEX "PermitPackage_permitNumber_idx" ON "PermitPackage"("permitNumber");
CREATE INDEX "PermitPackage_county_idx" ON "PermitPackage"("county");
CREATE INDEX "PermitPackage_lastActivityAt_idx" ON "PermitPackage"("lastActivityAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'coordinator',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
