import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { softDeleteStudent, updateStudent } from "@/services/student-service";
import { updateStudentSchema } from "@/validations/students";

type TeacherStudentRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: TeacherStudentRouteProps,
) {
  try {
    await requireApiSession(request, [Role.TEACHER]);
    const input = await parseRequestBody(request, updateStudentSchema);
    const { id } = await params;
    const student = await updateStudent(id, input);
    return NextResponse.json(student);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: TeacherStudentRouteProps,
) {
  try {
    await requireApiSession(request, [Role.TEACHER]);
    const { id } = await params;
    await softDeleteStudent(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
