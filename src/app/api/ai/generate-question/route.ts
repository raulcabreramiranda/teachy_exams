import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { generateAiQuestion } from "@/services/ai-question-service";
import { aiQuestionGenerationInputSchema } from "@/validations/ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const input = await parseRequestBody(request, aiQuestionGenerationInputSchema);
    const question = await generateAiQuestion(session.userId, input);
    return NextResponse.json(question);
  } catch (error) {
    return handleRouteError(error);
  }
}
