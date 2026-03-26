import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { assignExerciseList } from "@/services/exercise-list-service";
import { assignmentInputSchema } from "@/validations/exercise";

type TeacherListAssignmentsRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: TeacherListAssignmentsRouteProps,
) {
  try {
    const session = await requireApiSession(request, [Role.TEACHER]);
    const { id } = await params;
    const input = await parseRequestBody(request, assignmentInputSchema);
    const assignments = await assignExerciseList(session.userId, id, input);
    return NextResponse.json(assignments);
  } catch (error) {
    return handleRouteError(error);
  }
}
