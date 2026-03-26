import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { startAttempt } from "@/services/attempt-service";

type StudentAssignmentStartRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: StudentAssignmentStartRouteProps,
) {
  try {
    const session = await requireApiSession(request, [Role.STUDENT]);
    const { id } = await params;
    const attempt = await startAttempt(session.userId, id);
    return NextResponse.json({ id: attempt.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
