/**
 * Paginated admin audit log for settings and configuration changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { ForbiddenError, requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const take = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 200);
    const cursor = searchParams.get("cursor");

    const items = await prisma.adminAuditLog.findMany({
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    let nextCursor: string | null = null;
    let list = items;
    if (items.length > take) {
      const next = items.pop();
      nextCursor = next?.id ?? null;
      list = items;
    }

    return NextResponse.json({ data: list, nextCursor });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
