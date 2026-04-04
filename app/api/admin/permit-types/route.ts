/**
 * Lists canonical permit types from the Prisma enum for admin UI.
 */

import { NextResponse } from "next/server";
import { ForbiddenError, requireAdmin, UnauthorizedError } from "@/lib/auth-helpers";
import { permitTypeEnum } from "@/lib/validations";

export async function GET() {
  try {
    await requireAdmin();
    const types = permitTypeEnum.options;
    return NextResponse.json({ data: types });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to list permit types" }, { status: 500 });
  }
}
