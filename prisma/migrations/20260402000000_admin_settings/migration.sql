-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "displayName" TEXT NOT NULL DEFAULT 'PermitPro',
    "tagline" TEXT,
    "logoUrl" TEXT,
    "primaryHex" TEXT NOT NULL DEFAULT '#2563eb',
    "accentHex" TEXT NOT NULL DEFAULT '#7c3aed',
    "notificationConfig" TEXT NOT NULL DEFAULT '{}',
    "integrationConfig" TEXT NOT NULL DEFAULT '[]',
    "securityConfig" TEXT NOT NULL DEFAULT '{}',
    "localizationConfig" TEXT NOT NULL DEFAULT '{}',
    "backupRetentionConfig" TEXT NOT NULL DEFAULT '{}',
    "billingConfig" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_resourceType_idx" ON "AdminAuditLog"("resourceType");

-- CreateIndex
CREATE INDEX "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");

-- Seed default organization row
INSERT OR IGNORE INTO "OrganizationSettings" ("id", "displayName", "tagline", "logoUrl", "primaryHex", "accentHex", "notificationConfig", "integrationConfig", "securityConfig", "localizationConfig", "backupRetentionConfig", "billingConfig", "createdAt", "updatedAt")
VALUES ('default', 'PermitPro', NULL, NULL, '#2563eb', '#7c3aed', '{}', '[]', '{}', '{}', '{}', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
