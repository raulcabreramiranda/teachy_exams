import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import {
  deleteExerciseList,
  getTeacherListEditorData,
  updateExerciseList,
} from "@/services/exercise-list-service";
import { exerciseListInputSchema } from "@/validations/exercise";

type TeacherListRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: TeacherListRouteProps) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const { id } = await params;
    const list = await getTeacherListEditorData(session.userId, id);
    return NextResponse.json(list);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: TeacherListRouteProps) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const input = await parseRequestBody(request, exerciseListInputSchema);
    const { id } = await params;
    const list = await updateExerciseList(session.userId, id, input);
    return NextResponse.json({ id: list.id });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: TeacherListRouteProps) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const { id } = await params;
    await deleteExerciseList(session.userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
