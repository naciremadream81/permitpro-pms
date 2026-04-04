/**
 * Feature flags — list and create (admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { ForbiddenError, requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/lib/admin-audit-log";
import { z } from "zod";

const createSchema = z.object({
  key: z.string().min(1).max(120).regex(/^[a-z0-9][a-z0-9._-]*$/),
  enabled: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ data: flags });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to list flags" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = createSchema.parse(await request.json());
    const created = await prisma.featureFlag.create({
      data: {
        key: body.key,
        enabled: body.enabled ?? false,
        description: body.description,
      },
    });
    await writeAdminAuditLog({
      userId: session.user?.id,
      action: "FEATURE_FLAG_CREATE",
      resourceType: "FeatureFlag",
      resourceId: created.id,
      details: created,
    });
    return NextResponse.json({ data: created }, { status: 201 });
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
    return NextResponse.json({ error: "Failed to create flag" }, { status: 500 });
  }
}
