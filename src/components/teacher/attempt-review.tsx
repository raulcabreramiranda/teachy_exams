"use client";

import { QuestionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDateTime, formatScore } from "@/lib/format";
import { FillInTheBlankConfig, MatchingConfig, MultipleChoiceConfig } from "@/validations/exercise";

type AttemptReviewProps = {
  attempts: Array<{
    id: string;
    startedAt: string;
    submittedAt: string | null;
    status: string;
    totalScore: number | null;
    teacherFeedback: string | null;
    assignment: {
      student: {
        name: string;
        email: string;
      };
      list: {
        title: string;
      };
    };
    answers: Array<{
      id: string;
      responseJson: unknown;
      autoScore: number | null;
      manualScore: number | null;
      feedback: string | null;
      correctedAt: string | null;
      question: {
        type: QuestionType;
        prompt: string;
        points: number;
        configJson: unknown;
      };
    }>;
  }>;
};

function renderResponse(
  type: QuestionType,
  responseJson: unknown,
  configJson: unknown,
) {
  if (type === QuestionType.MULTIPLE_CHOICE) {
    const config = configJson as MultipleChoiceConfig;
    const response = responseJson as { selectedOptionIds?: string[] };

    return (
      <ul className="space-y-1 text-sm text-slate-600">
        {config.options
          .filter((option) => response.selectedOptionIds?.includes(option.id))
          .map((option) => (
            <li key={option.id}>• {option.text}</li>
          ))}
        {!response.selectedOptionIds?.length ? <li>No option selected.</li> : null}
      </ul>
    );
  }

  if (type === QuestionType.ESSAY) {
    const response = responseJson as { text?: string };
    return <p className="whitespace-pre-wrap text-sm text-slate-600">{response.text || "No answer provided."}</p>;
  }

  if (type === QuestionType.FILL_IN_THE_BLANK) {
    const config = configJson as FillInTheBlankConfig;
    const response = responseJson as { blanks?: string[] };
    return (
      <ul className="space-y-1 text-sm text-slate-600">
        {config.answers.map((_, index) => (
          <li key={index}>Blank {index + 1}: {response.blanks?.[index] || "No answer"}</li>
        ))}
      </ul>
    );
  }

  const config = configJson as MatchingConfig;
  const response = responseJson as { pairs?: Record<string, string> };

  return (
    <ul className="space-y-1 text-sm text-slate-600">
      {config.leftItems.map((item) => {
        const rightId = response.pairs?.[item.id];
        const rightLabel =
          config.rightItems.find((rightItem) => rightItem.id === rightId)?.label ?? "No match";

        return (
          <li key={item.id}>
            {item.label}: {rightLabel}
          </li>
        );
      })}
    </ul>
  );
}

export function AttemptReview({ attempts }: AttemptReviewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingAttemptId, setPendingAttemptId] = useState<string | null>(null);
  const [forms, setForms] = useState(() =>
    Object.fromEntries(
      attempts.map((attempt) => [
        attempt.id,
        {
          teacherFeedback: attempt.teacherFeedback ?? "",
          answers: Object.fromEntries(
            attempt.answers
              .filter((answer) => answer.question.type === QuestionType.ESSAY)
              .map((answer) => [
                answer.id,
                {
                  manualScore:
                    answer.manualScore === null ? "" : String(answer.manualScore),
                  feedback: answer.feedback ?? "",
                },
              ]),
          ),
        },
      ]),
    ),
  );

  const attemptSummaries = useMemo(() => attempts, [attempts]);

  async function handleSubmit(attemptId: string) {
    const form = forms[attemptId];

    setPendingAttemptId(attemptId);
    setError(null);

    const response = await fetch(`/api/teacher/attempts/${attemptId}/grade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teacherFeedback: form.teacherFeedback,
        answers: Object.entries(form.answers).map(([answerId, answer]) => ({
          answerId,
          manualScore: Number(answer.manualScore || 0),
          feedback: answer.feedback,
        })),
      }),
    });

    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setPendingAttemptId(null);

    if (!response.ok) {
      setError(body?.message ?? "Unable to save manual grading.");
      return;
    }

    router.refresh();
  }

  if (attemptSummaries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
        No student attempts have been submitted yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {attemptSummaries.map((attempt) => (
        <section
          key={attempt.id}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                {attempt.assignment.list.title}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {attempt.assignment.student.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {attempt.assignment.student.email}
              </p>
            </div>

            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <p>Started: {formatDateTime(attempt.startedAt)}</p>
              <p>Submitted: {formatDateTime(attempt.submittedAt)}</p>
              <p>Status: {attempt.status}</p>
              <p>Total score: {formatScore(attempt.totalScore)}</p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {attempt.answers.map((answer) => (
              <article
                key={answer.id}
                className="rounded-md border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {answer.question.prompt}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {answer.question.type.replaceAll("_", " ")} • {answer.question.points} points
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600">
                    <p>Auto score: {formatScore(answer.autoScore)}</p>
                    <p>Manual score: {formatScore(answer.manualScore)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                  {renderResponse(
                    answer.question.type,
                    answer.responseJson,
                    answer.question.configJson,
                  )}
                </div>

                {answer.question.type === QuestionType.ESSAY ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-[160px,1fr]">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Manual score
                      </label>
                      <input
                        value={forms[attempt.id]?.answers[answer.id]?.manualScore ?? ""}
                        onChange={(event) =>
                          setForms((currentForms) => ({
                            ...currentForms,
                            [attempt.id]: {
                              ...currentForms[attempt.id],
                              answers: {
                                ...currentForms[attempt.id].answers,
                                [answer.id]: {
                                  ...currentForms[attempt.id].answers[answer.id],
                                  manualScore: event.target.value,
                                },
                              },
                            },
                          }))
                        }
                        type="number"
                        min={0}
                        max={answer.question.points}
                        step={0.5}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Feedback
                      </label>
                      <textarea
                        value={forms[attempt.id]?.answers[answer.id]?.feedback ?? ""}
                        onChange={(event) =>
                          setForms((currentForms) => ({
                            ...currentForms,
                            [attempt.id]: {
                              ...currentForms[attempt.id],
                              answers: {
                                ...currentForms[attempt.id].answers,
                                [answer.id]: {
                                  ...currentForms[attempt.id].answers[answer.id],
                                  feedback: event.target.value,
                                },
                              },
                            },
                          }))
                        }
                        rows={3}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        placeholder="Optional answer feedback"
                      />
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Overall feedback
            </label>
            <textarea
              value={forms[attempt.id]?.teacherFeedback ?? ""}
              onChange={(event) =>
                setForms((currentForms) => ({
                  ...currentForms,
                  [attempt.id]: {
                    ...currentForms[attempt.id],
                    teacherFeedback: event.target.value,
                  },
                }))
              }
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              placeholder="Optional summary feedback for the whole attempt"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => handleSubmit(attempt.id)}
              disabled={pendingAttemptId === attempt.id}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingAttemptId === attempt.id ? "Saving..." : "Save grading"}
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
