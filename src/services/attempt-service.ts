import { AttemptStatus, Prisma, QuestionType, Role } from "@prisma/client";
import { isTeacherReopenedAttempt } from "@/lib/attempts";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getEmptyResponse, parseQuestionResponse } from "@/lib/questions";
import {
  autoScoreQuestion,
  calculateAttemptTotalScore,
  getAttemptDeadline,
  getEffectiveAttemptDeadline,
  hasPendingEssayReview,
  isAttemptWindowExpired,
} from "@/services/grading-service";
import { ManualGradeInput, SaveAttemptAnswersInput } from "@/validations/exercise";

function assertDueAtIsAvailable(dueAt?: Date | null) {
  if (dueAt && new Date() > dueAt) {
    throw new AppError("The due date for this list has already passed.", 409);
  }
}

type AttemptWithListQuestionsAndAnswers = Prisma.AttemptGetPayload<{
  include: {
    assignment: {
      include: {
        list: {
          include: {
            questions: true;
          };
        };
      };
    };
    answers: true;
  };
}>;

function getAttemptCompletionStatus(
  answers: Array<{
    autoScore: number | null;
    manualScore: number | null;
    question: {
      type: QuestionType;
    };
  }>,
) {
  return hasPendingEssayReview(answers)
    ? AttemptStatus.SUBMITTED
    : AttemptStatus.GRADED;
}

async function updateAttemptAnswersFromInput(
  attempt: AttemptWithListQuestionsAndAnswers,
  input: SaveAttemptAnswersInput,
) {
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
            attemptId: attempt.id,
            questionId: question.id,
          },
        },
        data: {
          responseJson: parsedResponse as Prisma.InputJsonValue,
        },
      });
    }),
  );
}

async function finalizeExpiredAttempt(attempt: AttemptWithListQuestionsAndAnswers) {
  const { list } = attempt.assignment;
  const dueAt = isTeacherReopenedAttempt(attempt.status, attempt.submittedAt)
    ? null
    : list.dueAt;

  if (
    attempt.status !== AttemptStatus.IN_PROGRESS ||
    !isAttemptWindowExpired(attempt.startedAt, dueAt, list.timeLimitMinutes)
  ) {
    return;
  }

  const finalizedAt =
    getEffectiveAttemptDeadline(
      attempt.startedAt,
      dueAt,
      list.timeLimitMinutes,
    ) ?? new Date();
  const questionsById = new Map(list.questions.map((question) => [question.id, question]));

  await prisma.$transaction(async (transaction) => {
    await Promise.all(
      attempt.answers.map((answer) => {
        const question = questionsById.get(answer.questionId);

        if (!question) {
          throw new AppError("Question not found for expired attempt.", 400);
        }

        const parsedResponse = parseQuestionResponse(question.type, answer.responseJson);
        const autoScore = autoScoreQuestion(question, parsedResponse);

        return transaction.answer.update({
          where: {
            id: answer.id,
          },
          data: {
            responseJson: parsedResponse as Prisma.InputJsonValue,
            autoScore,
            correctedAt: question.type === QuestionType.ESSAY ? null : finalizedAt,
          },
        });
      }),
    );

    const refreshedAnswers = await transaction.answer.findMany({
      where: {
        attemptId: attempt.id,
      },
      include: {
        question: {
          select: {
            type: true,
          },
        },
      },
    });

    await transaction.attempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        status: getAttemptCompletionStatus(refreshedAnswers),
        submittedAt: finalizedAt,
        totalScore: calculateAttemptTotalScore(refreshedAnswers),
      },
    });
  });
}

async function finalizeExpiredAttempts(where: Prisma.AttemptWhereInput) {
  const attempts = await prisma.attempt.findMany({
    where: {
      AND: [
        where,
        {
          status: AttemptStatus.IN_PROGRESS,
        },
      ],
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

  for (const attempt of attempts) {
    await finalizeExpiredAttempt(attempt);
  }
}

async function getOwnedAttempt(studentId: string, attemptId: string) {
  await finalizeExpiredAttempts({
    id: attemptId,
    assignment: {
      studentId,
    },
  });

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
  await finalizeExpiredAttempts({
    assignment: {
      studentId,
    },
  });

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
  await finalizeExpiredAttempts({
    assignment: {
      id: assignmentId,
      studentId,
    },
  });

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
  await finalizeExpiredAttempts({
    assignment: {
      id: assignmentId,
      studentId,
    },
  });

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

  await updateAttemptAnswersFromInput(attempt, input);

  return getOwnedAttempt(studentId, attemptId);
}

export async function submitAttempt(
  studentId: string,
  attemptId: string,
  input?: SaveAttemptAnswersInput,
) {
  let attempt = await getOwnedAttempt(studentId, attemptId);

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    return attempt;
  }

  if (input) {
    await updateAttemptAnswersFromInput(attempt, input);
  }

  attempt = await getOwnedAttempt(studentId, attemptId);
  const { list } = attempt.assignment;
  const dueAt = isTeacherReopenedAttempt(attempt.status, attempt.submittedAt)
    ? null
    : list.dueAt;

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    return attempt;
  }

  assertDueAtIsAvailable(dueAt);

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

  await prisma.attempt.update({
    where: {
      id: attemptId,
    },
    data: {
      status: getAttemptCompletionStatus(answerBundle),
      submittedAt: new Date(),
      totalScore: calculateAttemptTotalScore(answerBundle),
    },
  });

  return getOwnedAttempt(studentId, attemptId);
}

export async function getAttemptResult(studentId: string, attemptId: string) {
  await finalizeExpiredAttempts({
    id: attemptId,
    assignment: {
      studentId,
    },
  });

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
  await finalizeExpiredAttempts({
    assignment: {
      list: {
        createdById: teacherId,
      },
    },
  });

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

  return prisma.attempt.update({
    where: {
      id: attemptId,
    },
    data: {
      status: getAttemptCompletionStatus(refreshedAttempt.answers),
      totalScore: calculateAttemptTotalScore(refreshedAttempt.answers),
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

export async function reopenAttemptForTeacher(teacherId: string, attemptId: string) {
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
        select: {
          id: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new AppError("Attempt not found.", 404);
  }

  if (attempt.status === AttemptStatus.IN_PROGRESS) {
    throw new AppError("This attempt is already open.", 409);
  }

  const reopenedAt = new Date();

  await prisma.$transaction([
    prisma.answer.updateMany({
      where: {
        attemptId,
      },
      data: {
        autoScore: null,
        manualScore: null,
        feedback: null,
        correctedAt: null,
      },
    }),
    prisma.attempt.update({
      where: {
        id: attemptId,
      },
      data: {
        status: AttemptStatus.IN_PROGRESS,
        startedAt: reopenedAt,
        // Keep a non-null submission timestamp as a lightweight reopen flag.
        submittedAt: reopenedAt,
        totalScore: null,
        teacherFeedback: null,
      },
    }),
  ]);

  return prisma.attempt.findUniqueOrThrow({
    where: {
      id: attemptId,
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
