import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { submitAttempt } from "@/services/attempt-service";
import { saveAttemptAnswersSchema } from "@/validations/exercise";

type StudentAttemptSubmitRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: StudentAttemptSubmitRouteProps,
) {
  try {
    const session = await requireApiSession(request, [Role.STUDENT]);
    const { id } = await params;
    const input = await parseRequestBody(request, saveAttemptAnswersSchema);
    const attempt = await submitAttempt(session.userId, id, input);
    return NextResponse.json({ id: attempt.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
