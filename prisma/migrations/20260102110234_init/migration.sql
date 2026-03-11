-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "mainAddress" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "preferredContactMethod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PermitPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PermitPackage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PermitPackage_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PermitDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitPackageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionTag" TEXT,
    "notes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT,
    "parentDocumentId" TEXT,
    "versionGroupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PermitDocument_permitPackageId_fkey" FOREIGN KEY ("permitPackageId") REFERENCES "PermitPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PermitDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PermitDocument_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "PermitDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitPackageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NotStarted',
    "assignedTo" TEXT,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "priority" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_permitPackageId_fkey" FOREIGN KEY ("permitPackageId") REFERENCES "PermitPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitPackageId" TEXT NOT NULL,
    "userId" TEXT,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_permitPackageId_fkey" FOREIGN KEY ("permitPackageId") REFERENCES "PermitPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequiredDocumentTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permitType" TEXT NOT NULL,
    "county" TEXT,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
CREATE INDEX "PermitPackage_customerId_idx" ON "PermitPackage"("customerId");

-- CreateIndex
CREATE INDEX "PermitPackage_contractorId_idx" ON "PermitPackage"("contractorId");

-- CreateIndex
CREATE INDEX "PermitPackage_status_idx" ON "PermitPackage"("status");

-- CreateIndex
CREATE INDEX "PermitPackage_permitType_idx" ON "PermitPackage"("permitType");

-- CreateIndex
CREATE INDEX "PermitPackage_billingStatus_idx" ON "PermitPackage"("billingStatus");

-- CreateIndex
CREATE INDEX "PermitPackage_permitNumber_idx" ON "PermitPackage"("permitNumber");

-- CreateIndex
CREATE INDEX "PermitPackage_county_idx" ON "PermitPackage"("county");

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
