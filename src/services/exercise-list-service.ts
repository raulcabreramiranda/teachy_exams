import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { AssignmentInput, ExerciseListInput } from "@/validations/exercise";

function mapListPayload(input: ExerciseListInput, teacherId: string): Prisma.ExerciseListCreateInput {
  return {
    title: input.title,
    description: input.description || null,
    createdBy: {
      connect: {
        id: teacherId,
      },
    },
    timeLimitMinutes: input.timeLimitMinutes ?? null,
    dueAt: input.dueAt ? new Date(input.dueAt) : null,
    publishedAt: input.publish ? new Date() : null,
    questions: {
      create: input.questions.map((question) => ({
        order: question.order,
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        configJson: question.config as Prisma.InputJsonValue,
      })),
    },
  };
}

export async function getTeacherDashboardData(teacherId: string) {
  return prisma.exerciseList.findMany({
    where: {
      createdById: teacherId,
    },
    include: {
      _count: {
        select: {
          questions: true,
          assignments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getTeacherStudents() {
  return prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function getTeacherListEditorData(teacherId: string, listId: string) {
  const list = await prisma.exerciseList.findFirst({
    where: {
      id: listId,
      createdById: teacherId,
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
      assignments: {
        select: {
          studentId: true,
        },
      },
    },
  });

  if (!list) {
    throw new AppError("Exercise list not found.", 404);
  }

  return list;
}

export async function createExerciseList(teacherId: string, input: ExerciseListInput) {
  return prisma.exerciseList.create({
    data: mapListPayload(input, teacherId),
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });
}

export async function updateExerciseList(
  teacherId: string,
  listId: string,
  input: ExerciseListInput,
) {
  const existingList = await prisma.exerciseList.findFirst({
    where: {
      id: listId,
      createdById: teacherId,
    },
    include: {
      assignments: {
        include: {
          attempts: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!existingList) {
    throw new AppError("Exercise list not found.", 404);
  }

  const hasAttempts = existingList.assignments.some(
    (assignment) => assignment.attempts.length > 0,
  );

  if (hasAttempts) {
    throw new AppError(
      "This list already has attempts and can no longer be edited.",
      409,
    );
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.question.deleteMany({
      where: {
        listId,
      },
    });

    return transaction.exerciseList.update({
      where: {
        id: listId,
      },
      data: {
        title: input.title,
        description: input.description || null,
        timeLimitMinutes: input.timeLimitMinutes ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        publishedAt: input.publish
          ? existingList.publishedAt ?? new Date()
          : null,
        questions: {
          create: input.questions.map((question) => ({
            order: question.order,
            type: question.type,
            prompt: question.prompt,
            points: question.points,
            configJson: question.config as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        questions: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
  });
}

export async function deleteExerciseList(teacherId: string, listId: string) {
  const existingList = await prisma.exerciseList.findFirst({
    where: {
      id: listId,
      createdById: teacherId,
    },
  });

  if (!existingList) {
    throw new AppError("Exercise list not found.", 404);
  }

  await prisma.exerciseList.delete({
    where: {
      id: listId,
    },
  });
}

export async function assignExerciseList(
  teacherId: string,
  listId: string,
  input: AssignmentInput,
) {
  const exerciseList = await prisma.exerciseList.findFirst({
    where: {
      id: listId,
      createdById: teacherId,
    },
  });

  if (!exerciseList) {
    throw new AppError("Exercise list not found.", 404);
  }

  const students = await prisma.user.findMany({
    where: {
      id: {
        in: input.studentIds,
      },
      role: Role.STUDENT,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (students.length !== input.studentIds.length) {
    throw new AppError("One or more selected students were not found.", 404);
  }

  await prisma.$transaction([
    prisma.assignment.createMany({
      data: input.studentIds.map((studentId) => ({
        listId,
        studentId,
      })),
      skipDuplicates: true,
    }),
    prisma.exerciseList.update({
      where: {
        id: listId,
      },
      data: {
        publishedAt: exerciseList.publishedAt ?? new Date(),
      },
    }),
  ]);

  return prisma.assignment.findMany({
    where: {
      listId,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });
}
