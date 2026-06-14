-- Fix SeedBatch table: rename errorLog → errorMessage, add NOT NULL defaults for counters
-- SQLite workaround: drop + recreate (table is empty from prior migration)

DROP TABLE IF EXISTS "SeedBatch";

CREATE TABLE "SeedBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "triggeredBy" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalCounties" INTEGER NOT NULL DEFAULT 0,
    "totalRequirements" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

CREATE INDEX IF NOT EXISTS "SeedBatch_triggeredBy_idx" ON "SeedBatch"("triggeredBy");
CREATE INDEX IF NOT EXISTS "SeedBatch_status_idx" ON "SeedBatch"("status");
CREATE INDEX IF NOT EXISTS "SeedBatch_startedAt_idx" ON "SeedBatch"("startedAt");
