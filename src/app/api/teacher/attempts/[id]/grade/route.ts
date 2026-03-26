import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { gradeEssayAnswers } from "@/services/attempt-service";
import { manualGradeInputSchema } from "@/validations/exercise";

type TeacherAttemptGradeRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: TeacherAttemptGradeRouteProps,
) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const { id } = await params;
    const input = await parseRequestBody(request, manualGradeInputSchema);
    const attempt = await gradeEssayAnswers(session.userId, id, input);
    return NextResponse.json({ id: attempt.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
