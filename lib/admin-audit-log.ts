/**
 * Persists administrative actions for compliance and troubleshooting.
 */

import { prisma } from "@/lib/prisma";

export async function writeAdminAuditLog(input: {
  userId: string | null | undefined;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: unknown;
}) {
  await prisma.adminAuditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      details: input.details !== undefined ? JSON.stringify(input.details) : null,
    },
  });
}
