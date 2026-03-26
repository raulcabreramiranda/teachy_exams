import { AttemptStatus, Prisma, QuestionType, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getEmptyResponse, parseQuestionResponse } from "@/lib/questions";
import {
  calculateAttemptTotalScore,
  autoScoreQuestion,
  getAttemptDeadline,
  hasPendingEssayReview,
  isTimeLimitExceeded,
} from "@/services/grading-service";
import { ManualGradeInput, SaveAttemptAnswersInput } from "@/validations/exercise";

function assertDueAtIsAvailable(dueAt?: Date | null) {
  if (dueAt && new Date() > dueAt) {
    throw new AppError("The due date for this list has already passed.", 409);
  }
}

async function getOwnedAttempt(studentId: string, attemptId: string) {
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      assignment: {
        studentId,
      },
    },
    include: {
      assignment: {
        include: {
          list: {
            include: {
              questions: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    throw new AppError("Attempt not found.", 404);
  }

  return attempt;
}

export async function getStudentDashboardData(studentId: string) {
  return prisma.assignment.findMany({
    where: {
      studentId,
    },
    include: {
      list: {
        select: {
          id: true,
          title: true,
          description: true,
          dueAt: true,
          timeLimitMinutes: true,
          publishedAt: true,
        },
      },
      attempts: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          totalScore: true,
        },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });
}

export async function getStudentAssignmentData(studentId: string, assignmentId: string) {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      studentId,
    },
    include: {
      list: {
        include: {
          questions: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      attempts: {
        include: {
          answers: true,
        },
      },
    },
  });

  if (!assignment) {
    throw new AppError("Assignment not found.", 404);
  }

  return assignment;
}

export async function startAttempt(studentId: string, assignmentId: string) {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      studentId,
    },
    include: {
      list: {
        include: {
          questions: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
      attempts: true,
    },
  });

  if (!assignment) {
    throw new AppError("Assignment not found.", 404);
  }

  assertDueAtIsAvailable(assignment.list.dueAt);

  if (assignment.attempts.length > 0) {
    return assignment.attempts[0];
  }

  return prisma.attempt.create({
    data: {
      assignmentId,
      answers: {
        create: assignment.list.questions.map((question) => ({
          questionId: question.id,
          responseJson: getEmptyResponse(question.type) as Prisma.InputJsonValue,
        })),
      },
    },
  });
}

export async function saveAttemptAnswers(
  studentId: string,
  attemptId: string,
  input: SaveAttemptAnswersInput,
) {
  const attempt = await getOwnedAttempt(studentId, attemptId);

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError("Only in-progress attempts can be updated.", 409);
  }

  const questionsById = new Map(
    attempt.assignment.list.questions.map((question) => [question.id, question]),
  );

  await prisma.$transaction(
    input.answers.map((answerInput) => {
      const question = questionsById.get(answerInput.questionId);

      if (!question) {
        throw new AppError("One or more answers do not belong to this list.", 400);
      }

      const parsedResponse = parseQuestionResponse(question.type, answerInput.response);

      return prisma.answer.update({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: question.id,
          },
        },
        data: {
          responseJson: parsedResponse as Prisma.InputJsonValue,
        },
      });
    }),
  );

  return getOwnedAttempt(studentId, attemptId);
}

export async function submitAttempt(
  studentId: string,
  attemptId: string,
  input?: SaveAttemptAnswersInput,
) {
  if (input) {
    await saveAttemptAnswers(studentId, attemptId, input);
  }

  const attempt = await getOwnedAttempt(studentId, attemptId);
  const { list } = attempt.assignment;

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError("This attempt has already been submitted.", 409);
  }

  assertDueAtIsAvailable(list.dueAt);

  if (isTimeLimitExceeded(attempt.startedAt, list.timeLimitMinutes)) {
    throw new AppError(
      "The time limit for this attempt has been exceeded. Submission is blocked.",
      409,
    );
  }

  const questionsById = new Map(list.questions.map((question) => [question.id, question]));

  await prisma.$transaction(
    attempt.answers.map((answer) => {
      const question = questionsById.get(answer.questionId);

      if (!question) {
        throw new AppError("Question not found for submitted answer.", 400);
      }

      const parsedResponse = parseQuestionResponse(question.type, answer.responseJson);
      const autoScore = autoScoreQuestion(question, parsedResponse);

      return prisma.answer.update({
        where: {
          id: answer.id,
        },
        data: {
          responseJson: parsedResponse as Prisma.InputJsonValue,
          autoScore,
          correctedAt: question.type === QuestionType.ESSAY ? null : new Date(),
        },
      });
    }),
  );

  const refreshedAttempt = await getOwnedAttempt(studentId, attemptId);
  const answerBundle = refreshedAttempt.answers.map((answer) => ({
    autoScore: answer.autoScore,
    manualScore: answer.manualScore,
    question: {
      type: questionsById.get(answer.questionId)?.type ?? QuestionType.ESSAY,
    },
  }));

  const totalScore = calculateAttemptTotalScore(answerBundle);
  const status = hasPendingEssayReview(answerBundle)
    ? AttemptStatus.SUBMITTED
    : AttemptStatus.GRADED;

  await prisma.attempt.update({
    where: {
      id: attemptId,
    },
    data: {
      status,
      submittedAt: new Date(),
      totalScore,
    },
  });

  return getOwnedAttempt(studentId, attemptId);
}

export async function getAttemptResult(studentId: string, attemptId: string) {
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      assignment: {
        studentId,
      },
      status: {
        in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED],
      },
    },
    include: {
      assignment: {
        include: {
          list: {
            include: {
              questions: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      },
      answers: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new AppError("Attempt result not found.", 404);
  }

  return attempt;
}

export async function getTeacherAttemptsForReview(teacherId: string) {
  return prisma.attempt.findMany({
    where: {
      assignment: {
        list: {
          createdById: teacherId,
        },
      },
      status: {
        in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED],
      },
    },
    include: {
      assignment: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: {
            include: {
              questions: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      },
      answers: {
        include: {
          question: true,
        },
        orderBy: {
          question: {
            order: "asc",
          },
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });
}

export async function gradeEssayAnswers(
  teacherId: string,
  attemptId: string,
  input: ManualGradeInput,
) {
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      assignment: {
        list: {
          createdById: teacherId,
        },
      },
    },
    include: {
      answers: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new AppError("Attempt not found.", 404);
  }

  const essayAnswers = new Map(
    attempt.answers
      .filter((answer) => answer.question.type === QuestionType.ESSAY)
      .map((answer) => [answer.id, answer]),
  );

  for (const answerInput of input.answers) {
    const answer = essayAnswers.get(answerInput.answerId);

    if (!answer) {
      throw new AppError("One or more answers cannot be graded manually.", 400);
    }

    if (answerInput.manualScore > answer.question.points) {
      throw new AppError(
        `Manual score cannot exceed the question points (${answer.question.points}).`,
        422,
      );
    }
  }

  await prisma.$transaction(
    input.answers.map((answerInput) =>
      prisma.answer.update({
        where: {
          id: answerInput.answerId,
        },
        data: {
          manualScore: answerInput.manualScore,
          feedback: answerInput.feedback || null,
          correctedAt: new Date(),
        },
      }),
    ),
  );

  const refreshedAttempt = await prisma.attempt.findUniqueOrThrow({
    where: {
      id: attemptId,
    },
    include: {
      answers: {
        include: {
          question: true,
        },
      },
    },
  });

  const totalScore = calculateAttemptTotalScore(refreshedAttempt.answers);
  const status = hasPendingEssayReview(refreshedAttempt.answers)
    ? AttemptStatus.SUBMITTED
    : AttemptStatus.GRADED;

  return prisma.attempt.update({
    where: {
      id: attemptId,
    },
    data: {
      status,
      totalScore,
      teacherFeedback: input.teacherFeedback || null,
    },
    include: {
      assignment: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          list: true,
        },
      },
      answers: {
        include: {
          question: true,
        },
      },
    },
  });
}

export async function getStudentsForAssignmentOptions() {
  return prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export function getAttemptRulesSummary(startedAt: Date, timeLimitMinutes?: number | null) {
  return {
    startedAt,
    deadline: getAttemptDeadline(startedAt, timeLimitMinutes),
  };
}
