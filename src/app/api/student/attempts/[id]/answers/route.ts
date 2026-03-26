import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { saveAttemptAnswers } from "@/services/attempt-service";
import { saveAttemptAnswersSchema } from "@/validations/exercise";

type StudentAttemptAnswersRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(
  request: NextRequest,
  { params }: StudentAttemptAnswersRouteProps,
) {
  try {
    const session = await requireApiSession(request, [Role.STUDENT]);
    const { id } = await params;
    const input = await parseRequestBody(request, saveAttemptAnswersSchema);
    const attempt = await saveAttemptAnswers(session.userId, id, input);
    return NextResponse.json({ id: attempt.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
