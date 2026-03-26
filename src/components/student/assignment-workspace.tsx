"use client";

import { QuestionType } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export function AssignmentWorkspace({ assignment }: AssignmentWorkspaceProps) {
  const router = useRouter();
  const attempt = assignment.attempt;
  const [isPending, setIsPending] = useState(false);
  const [hasRequestedExpiredRefresh, setHasRequestedExpiredRefresh] = useState(false);
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

  const { dueDate, effectiveDeadline } = useMemo(() => {
    const nextDueDate = assignment.list.dueAt
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
  }, [assignment.list.dueAt, assignment.list.timeLimitMinutes, attempt]);

  const remainingMilliseconds = effectiveDeadline
    ? effectiveDeadline.getTime() - tick
    : null;

  const isExpired = remainingMilliseconds !== null && remainingMilliseconds <= 0;

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

  async function persistAnswers(mode: "save" | "submit") {
    if (!attempt) {
      return;
    }

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
      await showErrorAlert({
        title: mode === "save" ? "Unable to save draft" : "Unable to submit attempt",
        text: body?.message ?? "Try again in a moment.",
      });
      return;
    }

    if (mode === "save") {
      await showSuccessAlert({
        title: "Draft saved",
        text: "Your latest answers were stored successfully.",
        timer: 900,
      });
      router.refresh();
      return;
    }

    await showSuccessAlert({
      title: "Attempt submitted",
      text: "Your answers were sent successfully.",
      timer: 900,
    });
    router.push(`/aluno/attempts/${attempt.id}/result`);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Assignment
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{assignment.list.title}</h2>
            {assignment.list.description ? (
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {assignment.list.description}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
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
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Starting..." : "Start attempt"}
            </button>
            {dueDate !== null && dueDate.getTime() < Date.now() ? (
              <p className="text-sm text-rose-700">
                The due date has passed. New attempts are blocked.
              </p>
            ) : null}
          </div>
        ) : null}

        {attempt && attempt.status !== "IN_PROGRESS" ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            This attempt has already been submitted.
            {" "}
            <Link href={`/aluno/attempts/${attempt.id}/result`} className="font-semibold underline">
              View result
            </Link>
          </div>
        ) : null}

        {attempt && attempt.status === "IN_PROGRESS" && isExpired ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            The allowed time has ended. This attempt is being finalized automatically.
          </div>
        ) : null}

      </section>

      {attempt && attempt.status === "IN_PROGRESS" && !isExpired ? (
        <section className="space-y-6">
          {assignment.list.questions.map((question) => (
            <article
              key={question.id}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.45)]"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Question {question.order}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{question.prompt}</h3>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                  {question.points} points
                </div>
              </div>

              {question.type === QuestionType.MULTIPLE_CHOICE ? (
                <div className="grid gap-3">
                  {(question.configJson as MultipleChoiceConfig).options.map((option) => {
                    const currentAnswer = answers[question.id] as { selectedOptionIds?: string[] };
                    const selectedIds = currentAnswer.selectedOptionIds ?? [];

                    return (
                      <label
                        key={option.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
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
                                [question.id]: {
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

              {question.type === QuestionType.ESSAY ? (
                <textarea
                  value={(answers[question.id] as { text?: string })?.text ?? ""}
                  onChange={(event) =>
                    setAnswers((currentAnswers) => ({
                      ...currentAnswers,
                      [question.id]: {
                        text: event.target.value,
                      },
                    }))
                  }
                  rows={8}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-600 focus:bg-white"
                  placeholder={
                    ((question.configJson as { placeholder?: string }).placeholder ??
                      "Write your answer here.")
                  }
                />
              ) : null}

              {question.type === QuestionType.FILL_IN_THE_BLANK ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-base text-slate-700">
                    {splitTemplate((question.configJson as FillInTheBlankConfig).template).map(
                      (part, index, parts) => (
                        <span key={`${question.id}-${index}`} className="inline-flex items-center gap-2">
                          <span>{part}</span>
                          {index < parts.length - 1 ? (
                            <input
                              value={
                                (answers[question.id] as { blanks?: string[] })?.blanks?.[index] ?? ""
                              }
                              onChange={(event) =>
                                setAnswers((currentAnswers) => {
                                  const currentBlanks =
                                    (currentAnswers[question.id] as { blanks?: string[] })?.blanks ??
                                    [];
                                  const nextBlanks = Array.from(
                                    {
                                      length:
                                        (question.configJson as FillInTheBlankConfig).answers.length,
                                    },
                                    (_, blankIndex) =>
                                      blankIndex === index
                                        ? event.target.value
                                        : currentBlanks[blankIndex] ?? "",
                                  );

                                  return {
                                    ...currentAnswers,
                                    [question.id]: {
                                      blanks: nextBlanks,
                                    },
                                  };
                                })
                              }
                              className="min-w-36 rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-amber-600"
                            />
                          ) : null}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {question.type === QuestionType.MATCHING ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {(question.configJson as MatchingConfig).leftItems.map((leftItem) => {
                    const currentPairs =
                      (answers[question.id] as { pairs?: Record<string, string> })?.pairs ?? {};

                    return (
                      <div
                        key={leftItem.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="mb-3 text-sm font-medium text-slate-700">
                          {leftItem.label}
                        </p>
                        <select
                          value={currentPairs[leftItem.id] ?? ""}
                          onChange={(event) =>
                            setAnswers((currentAnswers) => {
                              const currentResponse =
                                (currentAnswers[question.id] as {
                                  pairs?: Record<string, string>;
                                })?.pairs ?? {};

                              return {
                                ...currentAnswers,
                                [question.id]: {
                                  pairs: {
                                    ...currentResponse,
                                    [leftItem.id]: event.target.value,
                                  },
                                },
                              };
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-amber-600"
                        >
                          <option value="">Select a match</option>
                          {(question.configJson as MatchingConfig).rightItems.map((rightItem) => (
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
          ))}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => persistAnswers("save")}
              disabled={isPending || isExpired}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => persistAnswers("submit")}
              disabled={isPending || isExpired}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Submitting..." : "Submit attempt"}
            </button>
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
