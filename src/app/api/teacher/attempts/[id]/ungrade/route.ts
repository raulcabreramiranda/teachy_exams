import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { ungradeAttemptForTeacher } from "@/services/attempt-service";

type TeacherAttemptUngradeRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: TeacherAttemptUngradeRouteProps,
) {
  try {
    void request;
    const session = await requireApiSession(request, [Role.TEACHER]);
    const { id } = await params;
    const attempt = await ungradeAttemptForTeacher(session.userId, id);
    return NextResponse.json({
      id: attempt.id,
      listId: attempt.assignment.list.id,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
