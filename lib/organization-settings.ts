/**
 * Organization settings singleton — ensures the default row exists for SQLite deployments.
 */

import { prisma } from "@/lib/prisma";

const DEFAULT_ID = "default";

export async function ensureOrganizationSettings() {
  const existing = await prisma.organizationSettings.findUnique({
    where: { id: DEFAULT_ID },
  });
  if (existing) return existing;
  return prisma.organizationSettings.create({
    data: { id: DEFAULT_ID },
  });
}
