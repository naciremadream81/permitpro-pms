/**
 * Admin settings aggregate — read and patch organization configuration by section.
 */

import { NextRequest, NextResponse } from "next/server";
import { ForbiddenError, requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ensureOrganizationSettings } from "@/lib/organization-settings";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { z } from "zod";

const sectionSchema = z.enum([
  "organization",
  "notifications",
  "integrations",
  "security",
  "localization",
  "backup",
  "billing",
]);

const patchSchema = z.object({
  section: sectionSchema,
  payload: z.any(),
});

export async function GET() {
  try {
    const session = await requireAdmin();
    const org = await ensureOrganizationSettings();
    const featureFlags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({
      data: {
        organization: org,
        featureFlags,
        actor: { id: session.user?.id, email: session.user?.email },
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const { section, payload } = patchSchema.parse(body);
    const org = await ensureOrganizationSettings();

    let update: Record<string, string | undefined> = {};

    switch (section) {
      case "organization": {
        const p = z
          .object({
            displayName: z.string().min(1).max(200).optional(),
            tagline: z.string().max(500).nullable().optional(),
            logoUrl: z
              .union([z.string().url().max(2000), z.literal("")])
              .nullable()
              .optional(),
            primaryHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
            accentHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          })
          .parse(payload);
        if (p.displayName !== undefined) update.displayName = p.displayName;
        if (p.tagline !== undefined) update.tagline = p.tagline ?? undefined;
        if (p.logoUrl !== undefined) update.logoUrl = p.logoUrl || undefined;
        if (p.primaryHex !== undefined) update.primaryHex = p.primaryHex;
        if (p.accentHex !== undefined) update.accentHex = p.accentHex;
        break;
      }
      case "notifications":
      case "integrations":
      case "security":
      case "localization":
      case "backup":
      case "billing": {
        const json = JSON.stringify(payload ?? {});
        const key =
          section === "notifications"
            ? "notificationConfig"
            : section === "integrations"
              ? "integrationConfig"
              : section === "security"
                ? "securityConfig"
                : section === "localization"
                  ? "localizationConfig"
                  : section === "backup"
                    ? "backupRetentionConfig"
                    : "billingConfig";
        update[key] = json;
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    }

    const updated = await prisma.organizationSettings.update({
      where: { id: org.id },
      data: update,
    });

    await writeAdminAuditLog({
      userId: session.user?.id,
      action: "SETTINGS_PATCH",
      resourceType: section,
      resourceId: org.id,
      details: { payload },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
