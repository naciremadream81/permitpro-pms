/**
 * Update or delete a single feature flag.
 */

import { NextRequest, NextResponse } from "next/server";
import { ForbiddenError, requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { z } from "zod";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const { id } = params;
    const body = patchSchema.parse(await request.json());
    const updated = await prisma.featureFlag.update({
      where: { id },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.description !== undefined ? { description: body.description ?? undefined } : {}),
      },
    });
    await writeAdminAuditLog({
      userId: session.user?.id,
      action: "FEATURE_FLAG_PATCH",
      resourceType: "FeatureFlag",
      resourceId: id,
      details: body,
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
    return NextResponse.json({ error: "Failed to update flag" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const { id } = params;
    await prisma.featureFlag.delete({ where: { id } });
    await writeAdminAuditLog({
      userId: session.user?.id,
      action: "FEATURE_FLAG_DELETE",
      resourceType: "FeatureFlag",
      resourceId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete flag" }, { status: 500 });
  }
}
