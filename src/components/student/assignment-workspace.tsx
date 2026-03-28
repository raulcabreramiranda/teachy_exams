"use client";

import { QuestionType } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { isTeacherReopenedAttempt } from "@/lib/attempts";
import { formatDateTime } from "@/lib/format";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "@/lib/sweetalert";
import { FillInTheBlankConfig, MatchingConfig, MultipleChoiceConfig } from "@/validations/exercise";

type AssignmentWorkspaceProps = {
  assignment: {
    id: string;
    assignedAt: string;
    list: {
      title: string;
      description: string | null;
      dueAt: string | null;
      timeLimitMinutes: number | null;
      questions: Array<{
        id: string;
        order: number;
        type: QuestionType;
        prompt: string;
        points: number;
        configJson: unknown;
      }>;
    };
    attempt: {
      id: string;
      status: string;
      startedAt: string;
      submittedAt: string | null;
      answers: Array<{
        questionId: string;
        responseJson: unknown;
      }>;
    } | null;
  };
};

function splitTemplate(template: string) {
  return template.split("{{blank}}");
}

function isQuestionAnswered(
  question: AssignmentWorkspaceProps["assignment"]["list"]["questions"][number],
  response: unknown,
) {
  if (question.type === QuestionType.MULTIPLE_CHOICE) {
    return ((response as { selectedOptionIds?: string[] })?.selectedOptionIds ?? []).length > 0;
  }

  if (question.type === QuestionType.ESSAY) {
    return ((response as { text?: string })?.text ?? "").trim().length > 0;
  }

  if (question.type === QuestionType.FILL_IN_THE_BLANK) {
    const blanks = ((response as { blanks?: string[] })?.blanks ?? []).map((blank) =>
      blank.trim(),
    );
    const expectedBlanks = (question.configJson as FillInTheBlankConfig).answers.length;

    return (
      blanks.length === expectedBlanks &&
      blanks.every((blank) => blank.length > 0)
    );
  }

  const pairs = (response as { pairs?: Record<string, string> })?.pairs ?? {};
  const leftItems = (question.configJson as MatchingConfig).leftItems;

  return leftItems.every((leftItem) => {
    const selectedRightId = pairs[leftItem.id];
    return typeof selectedRightId === "string" && selectedRightId.length > 0;
  });
}

export function AssignmentWorkspace({ assignment }: AssignmentWorkspaceProps) {
  const router = useRouter();
  const attempt = assignment.attempt;
  const isReopenedByTeacher = attempt
    ? isTeacherReopenedAttempt(attempt.status, attempt.submittedAt)
    : false;
  const [isPending, setIsPending] = useState(false);
  const [hasRequestedExpiredRefresh, setHasRequestedExpiredRefresh] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      assignment.list.questions.map((question) => {
        const existingAnswer = assignment.attempt?.answers.find(
          (answer) => answer.questionId === question.id,
        );

        return [question.id, existingAnswer?.responseJson ?? getDefaultResponse(question.type)];
      }),
    ),
  );

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [assignment.id, attempt?.id]);

  const { dueDate, effectiveDeadline } = useMemo(() => {
    const nextDueDate = !isReopenedByTeacher && assignment.list.dueAt
      ? new Date(assignment.list.dueAt)
      : null;
    const nextTimeLimitDeadline =
      attempt && assignment.list.timeLimitMinutes
        ? new Date(
            new Date(attempt.startedAt).getTime() +
              assignment.list.timeLimitMinutes * 60_000,
          )
        : null;
    const deadlines = [nextDueDate, nextTimeLimitDeadline].filter(
      (value): value is Date => Boolean(value),
    );

    if (deadlines.length === 0) {
      return {
        dueDate: nextDueDate,
        effectiveDeadline: null,
      };
    }

    return {
      dueDate: nextDueDate,
      effectiveDeadline: deadlines.reduce((current, candidate) =>
        candidate.getTime() < current.getTime() ? candidate : current,
      ),
    };
  }, [assignment.list.dueAt, assignment.list.timeLimitMinutes, attempt, isReopenedByTeacher]);

  const remainingMilliseconds = effectiveDeadline
    ? effectiveDeadline.getTime() - tick
    : null;

  const isExpired = remainingMilliseconds !== null && remainingMilliseconds <= 0;
  const currentQuestion = assignment.list.questions[currentQuestionIndex] ?? null;

  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "IN_PROGRESS" ||
      !isExpired ||
      hasRequestedExpiredRefresh
    ) {
      return;
    }

    setHasRequestedExpiredRefresh(true);
    router.refresh();
  }, [attempt, hasRequestedExpiredRefresh, isExpired, router]);

  function formatRemainingTime(milliseconds: number | null) {
    if (milliseconds === null) {
      return "No active timer";
    }

    if (milliseconds <= 0) {
      return "Expired";
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  async function handleStartAttempt() {
    const confirmed = await showConfirmAlert({
      title: "Start this exam?",
      text: assignment.list.timeLimitMinutes
        ? `The timer will start immediately and you will have ${assignment.list.timeLimitMinutes} minutes to finish.`
        : "Once started, the attempt will be opened immediately.",
      confirmButtonText: "Start now",
      cancelButtonText: "Not yet",
    });

    if (!confirmed) {
      return;
    }

    setIsPending(true);

    const response = await fetch(`/api/student/assignments/${assignment.id}/start`, {
      method: "POST",
    });

    const body = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    setIsPending(false);

    if (!response.ok) {
      await showErrorAlert({
        title: "Unable to start the exam",
        text: body?.message ?? "Try again in a moment.",
      });
      return;
    }

    await showSuccessAlert({
      title: "Exam started",
      text: "Your attempt is now open.",
      timer: 900,
    });
    router.refresh();
  }

  async function persistAnswers(
    mode: "save" | "submit",
    options?: {
      silent?: boolean;
      refresh?: boolean;
    },
  ) {
    if (!attempt) {
      return false;
    }

    const silent = options?.silent ?? false;
    const shouldRefresh = options?.refresh ?? mode === "submit";

    setIsPending(true);

    const payload = {
      answers: assignment.list.questions.map((question) => ({
        questionId: question.id,
        response: answers[question.id] ?? getDefaultResponse(question.type),
      })),
    };

    const response = await fetch(
      mode === "save"
        ? `/api/student/attempts/${attempt.id}/answers`
        : `/api/student/attempts/${attempt.id}/submit`,
      {
        method: mode === "save" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const body = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    setIsPending(false);

    if (!response.ok) {
      if (!silent) {
        await showErrorAlert({
          title: mode === "save" ? "Unable to save draft" : "Unable to submit exam",
          text: body?.message ?? "Try again in a moment.",
        });
      }

      return false;
    }

    if (mode === "save") {
      if (!silent) {
        await showSuccessAlert({
          title: "Draft saved",
          text: "Your latest answers were stored successfully.",
          timer: 900,
        });
      }

      if (shouldRefresh) {
        router.refresh();
      }

      return true;
    }

    await showSuccessAlert({
      title: "Exam submitted",
      text: "Your answers were sent successfully.",
      timer: 900,
    });
    router.push(`/aluno/attempts/${attempt.id}/result`);
    if (shouldRefresh) {
      router.refresh();
    }
    return true;
  }

  async function handleSubmitExam() {
    const unansweredQuestions = assignment.list.questions
      .filter((question) => !isQuestionAnswered(question, answers[question.id]))
      .map((question) => question.order);

    const confirmed = await showConfirmAlert({
      title:
        unansweredQuestions.length > 0
          ? "Submit with unanswered questions?"
          : "Submit exam?",
      text:
        unansweredQuestions.length > 0
          ? `You still have ${unansweredQuestions.length} unanswered question${unansweredQuestions.length === 1 ? "" : "s"}: ${unansweredQuestions.join(", ")}.`
          : "You are about to finish this exam. You will not be able to change your answers after submission.",
      confirmButtonText: "Submit exam",
      cancelButtonText: "Continue editing",
    });

    if (!confirmed) {
      return;
    }

    await persistAnswers("submit");
  }

  async function handleQuestionNavigation(direction: "previous" | "next") {
    const targetIndex =
      direction === "previous"
        ? Math.max(currentQuestionIndex - 1, 0)
        : Math.min(currentQuestionIndex + 1, assignment.list.questions.length - 1);

    if (targetIndex === currentQuestionIndex) {
      return;
    }

    const saved = await persistAnswers("save", {
      silent: true,
      refresh: false,
    });

    if (!saved) {
      await showErrorAlert({
        title: "Unable to change question",
        text: "Your draft could not be saved. Try again in a moment.",
      });
      return;
    }

    setCurrentQuestionIndex(targetIndex);
  }

  return (
    <div className="space-y-8">
      <section className="app-card rounded-3xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Exam
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{assignment.list.title}</h2>
            {assignment.list.description ? (
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {assignment.list.description}
              </p>
            ) : null}
          </div>

          <div className="app-panel rounded-2xl px-4 py-4 text-sm text-slate-600">
            <p>Assigned: {formatDateTime(assignment.assignedAt)}</p>
            <p>Due date: {formatDateTime(assignment.list.dueAt)}</p>
            <p>
              Time limit:{" "}
              {assignment.list.timeLimitMinutes
                ? `${assignment.list.timeLimitMinutes} minutes`
                : "No time limit"}
            </p>
            {attempt ? <p>Remaining: {formatRemainingTime(remainingMilliseconds)}</p> : null}
          </div>
        </div>

        {!attempt ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleStartAttempt}
              disabled={isPending || (dueDate !== null && dueDate.getTime() < Date.now())}
              className="app-button-primary rounded-full px-6 py-3"
            >
              {isPending ? "Starting..." : "Start exam"}
            </button>
            {dueDate !== null && dueDate.getTime() < Date.now() ? (
              <p className="text-sm text-rose-700">
                The due date has passed. New attempts are blocked.
              </p>
            ) : null}
          </div>
        ) : null}

        {attempt && attempt.status !== "IN_PROGRESS" ? (
          <div className="app-panel mt-6 rounded-2xl border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            This exam has already been submitted.
            {" "}
            <Link href={`/aluno/attempts/${attempt.id}/result`} className="font-semibold underline">
              View result
            </Link>
          </div>
        ) : null}

        {attempt && attempt.status === "IN_PROGRESS" && isReopenedByTeacher ? (
          <div className="app-panel mt-6 rounded-2xl border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">
            Your teacher reopened this exam. Your previous answers were kept and the timer restarted.
          </div>
        ) : null}

        {attempt && attempt.status === "IN_PROGRESS" && isExpired ? (
          <div className="app-panel mt-6 rounded-2xl border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            The allowed time has ended. This attempt is being finalized automatically.
          </div>
        ) : null}

      </section>

      {attempt && attempt.status === "IN_PROGRESS" && !isExpired ? (
        <section className="space-y-6">
          {currentQuestion ? (
            <article
              key={currentQuestion.id}
              className="app-card rounded-3xl p-8"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Question {currentQuestion.order} of {assignment.list.questions.length}
                  </p>
                  <RichTextContent
                    html={currentQuestion.prompt}
                    className="mt-2 text-lg font-semibold text-slate-900"
                  />
                </div>
                <div className="app-badge app-badge-info px-4 py-2 text-sm">
                  {currentQuestion.points} points
                </div>
              </div>

              {currentQuestion.type === QuestionType.MULTIPLE_CHOICE ? (
                <div className="grid gap-3">
                  {(currentQuestion.configJson as MultipleChoiceConfig).options.map((option) => {
                    const currentAnswer = answers[currentQuestion.id] as {
                      selectedOptionIds?: string[];
                    };
                    const selectedIds = currentAnswer.selectedOptionIds ?? [];

                    return (
                      <label
                        key={option.id}
                        className="app-panel flex items-center gap-3 rounded-2xl px-4 py-4"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(option.id)}
                          onChange={(event) =>
                            setAnswers((currentAnswers) => {
                              const nextSelectedIds = event.target.checked
                                ? [...selectedIds, option.id]
                                : selectedIds.filter((selectedId) => selectedId !== option.id);

                              return {
                                ...currentAnswers,
                                [currentQuestion.id]: {
                                  selectedOptionIds: nextSelectedIds,
                                },
                              };
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-sm text-slate-700">{option.text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {currentQuestion.type === QuestionType.ESSAY ? (
                <textarea
                  value={(answers[currentQuestion.id] as { text?: string })?.text ?? ""}
                  onChange={(event) =>
                    setAnswers((currentAnswers) => ({
                      ...currentAnswers,
                      [currentQuestion.id]: {
                        text: event.target.value,
                      },
                    }))
                  }
                  rows={8}
                  className="app-textarea rounded-2xl bg-slate-50 px-4 py-3"
                  placeholder={
                    ((currentQuestion.configJson as { placeholder?: string }).placeholder ??
                      "Write your answer here.")
                  }
                />
              ) : null}

              {currentQuestion.type === QuestionType.FILL_IN_THE_BLANK ? (
                <div className="app-panel space-y-4 rounded-2xl p-5">
                  <div className="flex flex-wrap items-center gap-2 text-base text-slate-700">
                    {splitTemplate((currentQuestion.configJson as FillInTheBlankConfig).template).map(
                      (part, index, parts) => (
                        <span
                          key={`${currentQuestion.id}-${index}`}
                          className="inline-flex items-center gap-2"
                        >
                          <span>{part}</span>
                          {index < parts.length - 1 ? (
                            <input
                              value={
                                (answers[currentQuestion.id] as { blanks?: string[] })?.blanks?.[index] ?? ""
                              }
                              onChange={(event) =>
                                setAnswers((currentAnswers) => {
                                  const currentBlanks =
                                    (currentAnswers[currentQuestion.id] as { blanks?: string[] })?.blanks ??
                                    [];
                                  const nextBlanks = Array.from(
                                    {
                                      length:
                                        (currentQuestion.configJson as FillInTheBlankConfig).answers.length,
                                    },
                                    (_, blankIndex) =>
                                      blankIndex === index
                                        ? event.target.value
                                        : currentBlanks[blankIndex] ?? "",
                                  );

                                  return {
                                    ...currentAnswers,
                                    [currentQuestion.id]: {
                                      blanks: nextBlanks,
                                    },
                                  };
                                })
                              }
                              className="app-input min-w-36 rounded-xl"
                            />
                          ) : null}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {currentQuestion.type === QuestionType.MATCHING ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {(currentQuestion.configJson as MatchingConfig).leftItems.map((leftItem) => {
                    const currentPairs =
                      (answers[currentQuestion.id] as { pairs?: Record<string, string> })?.pairs ?? {};

                    return (
                      <div
                        key={leftItem.id}
                        className="app-panel rounded-2xl p-4"
                      >
                        <p className="mb-3 text-sm font-medium text-slate-700">
                          {leftItem.label}
                        </p>
                        <select
                          value={currentPairs[leftItem.id] ?? ""}
                          onChange={(event) =>
                            setAnswers((currentAnswers) => {
                              const currentResponse =
                                (currentAnswers[currentQuestion.id] as {
                                  pairs?: Record<string, string>;
                                })?.pairs ?? {};

                              return {
                                ...currentAnswers,
                                [currentQuestion.id]: {
                                  pairs: {
                                    ...currentResponse,
                                    [leftItem.id]: event.target.value,
                                  },
                                },
                              };
                            })
                          }
                          className="app-select rounded-xl"
                        >
                          <option value="">Select a match</option>
                          {(currentQuestion.configJson as MatchingConfig).rightItems.map((rightItem) => (
                            <option key={rightItem.id} value={rightItem.id}>
                              {rightItem.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          ) : null}

          <div className="app-card flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuestionNavigation("previous")}
                disabled={isPending || currentQuestionIndex === 0}
                className="app-button-secondary rounded-full px-4 py-2"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => handleQuestionNavigation("next")}
                disabled={
                  isPending || currentQuestionIndex === assignment.list.questions.length - 1
                }
                className="app-button-secondary rounded-full px-4 py-2"
              >
                Next
              </button>
              <span className="text-sm text-slate-500">
                Question {currentQuestionIndex + 1} of {assignment.list.questions.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => persistAnswers("save")}
                disabled={isPending || isExpired}
                className="app-button-secondary rounded-full px-6 py-3"
              >
                {isPending ? "Saving..." : "Save draft"}
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={isPending || isExpired}
                className="app-button-primary rounded-full px-6 py-3"
              >
                {isPending ? "Submitting..." : "Submit exam"}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getDefaultResponse(type: QuestionType) {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE:
      return { selectedOptionIds: [] };
    case QuestionType.ESSAY:
      return { text: "" };
    case QuestionType.FILL_IN_THE_BLANK:
      return { blanks: [] };
    case QuestionType.MATCHING:
      return { pairs: {} };
  }
}
