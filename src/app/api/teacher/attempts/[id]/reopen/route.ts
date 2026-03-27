import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { reopenAttemptForTeacher } from "@/services/attempt-service";

type TeacherAttemptReopenRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: TeacherAttemptReopenRouteProps,
) {
  try {
    void request;
    const session = await requireApiSession(request, [Role.TEACHER]);
    const { id } = await params;
    const attempt = await reopenAttemptForTeacher(session.userId, id);
    return NextResponse.json({ id: attempt.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
