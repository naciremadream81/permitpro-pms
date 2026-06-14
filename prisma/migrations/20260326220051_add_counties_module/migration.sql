-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mergeFields" TEXT NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "reportType" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "columns" TEXT NOT NULL DEFAULT '[]',
    "sortBy" TEXT,
    "sortOrder" TEXT DEFAULT 'desc',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PackageSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "snapshotDate" DATETIME NOT NULL,
    "stage" TEXT,
    "status" TEXT NOT NULL,
    "checklistPct" REAL NOT NULL DEFAULT 0,
    "verifiedDocPct" REAL NOT NULL DEFAULT 0,
    "daysInStage" INTEGER NOT NULL DEFAULT 0,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "openComments" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PackageSnapshot_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PermitPackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
