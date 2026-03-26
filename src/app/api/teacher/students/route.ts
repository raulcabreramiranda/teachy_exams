import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { createStudent, getStudentsForManagement } from "@/services/student-service";
import { createStudentSchema } from "@/validations/students";

export async function GET(request: NextRequest) {
  try {
    await requireApiSession(request, [Role.TEACHER]);
    const students = await getStudentsForManagement();
    return NextResponse.json(students);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireApiSession(request, [Role.TEACHER]);
    const input = await parseRequestBody(request, createStudentSchema);
    const student = await createStudent(input);
    return NextResponse.json(student);
  } catch (error) {
    return handleRouteError(error);
  }
}
