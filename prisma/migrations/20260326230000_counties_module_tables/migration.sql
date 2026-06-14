-- Counties Module: PermitTypeDefinition, RequirementChangeLog, SeedBatch
-- Add changeLogs relation column to Requirement (no column needed — handled by relation)

-- CreateTable
CREATE TABLE IF NOT EXISTS "PermitTypeDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PermitTypeDefinition_code_key" ON "PermitTypeDefinition"("code");
CREATE INDEX IF NOT EXISTS "PermitTypeDefinition_isActive_idx" ON "PermitTypeDefinition"("isActive");

-- CreateTable
CREATE TABLE IF NOT EXISTS "SeedBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggeredBy" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalCounties" INTEGER,
    "totalRequirements" INTEGER,
    "skippedCount" INTEGER,
    "errorLog" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SeedBatch_triggeredBy_idx" ON "SeedBatch"("triggeredBy");
CREATE INDEX IF NOT EXISTS "SeedBatch_status_idx" ON "SeedBatch"("status");

-- CreateTable
CREATE TABLE IF NOT EXISTS "RequirementChangeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requirementId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "seedBatchId" TEXT,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementChangeLog_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementChangeLog_seedBatchId_fkey" FOREIGN KEY ("seedBatchId") REFERENCES "SeedBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementChangeLog_requirementId_idx" ON "RequirementChangeLog"("requirementId");
CREATE INDEX IF NOT EXISTS "RequirementChangeLog_changedBy_idx" ON "RequirementChangeLog"("changedBy");
CREATE INDEX IF NOT EXISTS "RequirementChangeLog_seedBatchId_idx" ON "RequirementChangeLog"("seedBatchId");
CREATE INDEX IF NOT EXISTS "RequirementChangeLog_createdAt_idx" ON "RequirementChangeLog"("createdAt");
