import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const attempts = await getTeacherAttemptsForReview(session.userId);
    return NextResponse.json(attempts);
  } catch (error) {
    return handleRouteError(error);
  }
}
