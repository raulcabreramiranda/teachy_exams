import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { createExerciseList, getTeacherDashboardData } from "@/services/exercise-list-service";
import { exerciseListInputSchema } from "@/validations/exercise";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const lists = await getTeacherDashboardData(session.userId);
    return NextResponse.json(lists);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const input = await parseRequestBody(request, exerciseListInputSchema);
    const list = await createExerciseList(session.userId, input);
    return NextResponse.json({ id: list.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
