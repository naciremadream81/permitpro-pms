-- Fix SeedBatch table: rename errorLog to errorMessage, add NOT NULL defaults
-- for counters, and preserve any batches created before this migration runs.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SeedBatch" (
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

INSERT INTO "new_SeedBatch" (
    "id",
    "triggeredBy",
    "description",
    "status",
    "totalCounties",
    "totalRequirements",
    "skippedCount",
    "errorMessage",
    "startedAt",
    "completedAt"
)
SELECT
    "id",
    "triggeredBy",
    "description",
    COALESCE("status", 'PENDING'),
    COALESCE("totalCounties", 0),
    COALESCE("totalRequirements", 0),
    COALESCE("skippedCount", 0),
    "errorLog",
    "startedAt",
    "completedAt"
FROM "SeedBatch";

DROP TABLE "SeedBatch";
ALTER TABLE "new_SeedBatch" RENAME TO "SeedBatch";

PRAGMA foreign_keys=ON;

CREATE INDEX IF NOT EXISTS "SeedBatch_triggeredBy_idx" ON "SeedBatch"("triggeredBy");
CREATE INDEX IF NOT EXISTS "SeedBatch_status_idx" ON "SeedBatch"("status");
CREATE INDEX IF NOT EXISTS "SeedBatch_startedAt_idx" ON "SeedBatch"("startedAt");
