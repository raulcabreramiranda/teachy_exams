import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { CreateStudentInput, UpdateStudentInput } from "@/validations/students";

async function ensureStudentEmailIsAvailable(email: string, studentId?: string) {
  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      ...(studentId
        ? {
            id: {
              not: studentId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (!existingUser) {
    return;
  }

  if (existingUser.deletedAt) {
    throw new AppError(
      "This email belongs to an archived student. Use a different email.",
      409,
    );
  }

  throw new AppError("This email is already in use.", 409);
}

export async function getStudentsForManagement() {
  return prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          assignments: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createStudent(input: CreateStudentInput) {
  await ensureStudentEmailIsAvailable(input.email);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: Role.STUDENT,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

export async function updateStudent(studentId: string, input: UpdateStudentInput) {
  const existingStudent = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existingStudent) {
    throw new AppError("Student not found.", 404);
  }

  await ensureStudentEmailIsAvailable(input.email, studentId);

  return prisma.user.update({
    where: {
      id: studentId,
    },
    data: {
      name: input.name,
      email: input.email,
      ...(input.password
        ? {
            passwordHash: await hashPassword(input.password),
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

export async function softDeleteStudent(studentId: string) {
  const existingStudent = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existingStudent) {
    throw new AppError("Student not found.", 404);
  }

  await prisma.user.update({
    where: {
      id: studentId,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}
