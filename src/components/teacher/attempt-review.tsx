"use client";

import { QuestionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { ScoreStepper } from "@/components/ui/score-stepper";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDateTime, formatScore } from "@/lib/format";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "@/lib/sweetalert";
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

type AttemptReviewAttempt = AttemptReviewProps["attempts"][number];
type AttemptReviewAnswer = AttemptReviewAttempt["answers"][number];
type EssayGradeFormAnswer = {
  manualScore: number | null;
  feedback: string;
};
type AttemptGradeForm = {
  teacherFeedback: string;
  answers: Record<string, EssayGradeFormAnswer>;
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
    return (
      <p className="whitespace-pre-wrap text-sm text-slate-600">
        {response.text || "No answer provided."}
      </p>
    );
  }

  if (type === QuestionType.FILL_IN_THE_BLANK) {
    const config = configJson as FillInTheBlankConfig;
    const response = responseJson as { blanks?: string[] };
    return (
      <ul className="space-y-1 text-sm text-slate-600">
        {config.answers.map((_, index) => (
          <li key={index}>
            Blank {index + 1}: {response.blanks?.[index] || "No answer"}
          </li>
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

function getAttemptFilterKey(status: string) {
  return status === "GRADED" ? "reviewed" : "pending";
}

function getAttemptStatusLabel(status: string) {
  return status === "GRADED" ? "Reviewed" : "Needs grading";
}

function getAttemptStatusBadgeClass(status: string) {
  return status === "GRADED"
    ? "app-badge app-badge-success"
    : "app-badge app-badge-warning";
}

function isEssayAnswer(answer: Pick<AttemptReviewAnswer, "question">) {
  return answer.question.type === QuestionType.ESSAY;
}

function createForms(attempts: AttemptReviewProps["attempts"]) {
  return Object.fromEntries(
    attempts.map((attempt) => [
      attempt.id,
      {
        teacherFeedback: attempt.teacherFeedback ?? "",
        answers: Object.fromEntries(
          attempt.answers
            .filter((answer) => isEssayAnswer(answer))
            .map((answer) => [
              answer.id,
              {
                manualScore: answer.manualScore,
                feedback: answer.feedback ?? "",
              },
            ]),
        ),
      } satisfies AttemptGradeForm,
    ]),
  ) as Record<string, AttemptGradeForm>;
}

function cloneForm(form: AttemptGradeForm) {
  return {
    teacherFeedback: form.teacherFeedback,
    answers: Object.fromEntries(
      Object.entries(form.answers).map(([answerId, answer]) => [
        answerId,
        {
          manualScore: answer.manualScore,
          feedback: answer.feedback,
        },
      ]),
    ),
  } satisfies AttemptGradeForm;
}

function areFormsEqual(left: AttemptGradeForm | undefined, right: AttemptGradeForm | undefined) {
  if (!left || !right) {
    return left === right;
  }

  if (left.teacherFeedback !== right.teacherFeedback) {
    return false;
  }

  const leftAnswerIds = Object.keys(left.answers);
  const rightAnswerIds = Object.keys(right.answers);

  if (leftAnswerIds.length !== rightAnswerIds.length) {
    return false;
  }

  return leftAnswerIds.every((answerId) => {
    const leftAnswer = left.answers[answerId];
    const rightAnswer = right.answers[answerId];

    return (
      rightAnswer !== undefined &&
      leftAnswer.manualScore === rightAnswer.manualScore &&
      leftAnswer.feedback === rightAnswer.feedback
    );
  });
}

function getEssayAnswerForm(form: AttemptGradeForm | undefined, answerId: string) {
  return form?.answers[answerId] ?? {
    manualScore: null,
    feedback: "",
  };
}

function clampManualScore(value: number | null, max: number) {
  if (value === null) {
    return null;
  }

  return Math.min(Math.max(value, 0), max);
}

function getPreviewManualScore(
  answer: AttemptReviewAnswer,
  form: AttemptGradeForm | undefined,
) {
  if (!isEssayAnswer(answer)) {
    return answer.manualScore;
  }

  return clampManualScore(
    getEssayAnswerForm(form, answer.id).manualScore,
    answer.question.points,
  );
}

function normalizeAttemptForm(attempt: AttemptReviewAttempt, form: AttemptGradeForm) {
  return {
    teacherFeedback: form.teacherFeedback,
    answers: Object.fromEntries(
      attempt.answers
        .filter((answer) => isEssayAnswer(answer))
        .map((answer) => {
          const formAnswer = getEssayAnswerForm(form, answer.id);

          return [
            answer.id,
            {
              manualScore: getPreviewManualScore(answer, form),
              feedback: formAnswer.feedback,
            },
          ];
        }),
    ),
  } satisfies AttemptGradeForm;
}

function getManualGradingRemaining(
  attempt: AttemptReviewAttempt,
  form: AttemptGradeForm | undefined,
) {
  return attempt.answers.filter(
    (answer) => isEssayAnswer(answer) && getPreviewManualScore(answer, form) === null,
  ).length;
}

function calculateAttemptTotalScorePreview(
  attempt: AttemptReviewAttempt,
  form: AttemptGradeForm | undefined,
) {
  return attempt.answers.reduce((total, answer) => {
    if (isEssayAnswer(answer)) {
      return total + (getPreviewManualScore(answer, form) ?? 0);
    }

    return total + (answer.manualScore ?? answer.autoScore ?? 0);
  }, 0);
}

function getPreviewAttemptStatus(
  attempt: AttemptReviewAttempt,
  form: AttemptGradeForm | undefined,
) {
  return getManualGradingRemaining(attempt, form) === 0 ? "GRADED" : "SUBMITTED";
}

function applySavedFormToAttempt(
  attempt: AttemptReviewAttempt,
  form: AttemptGradeForm,
): AttemptReviewAttempt {
  return {
    ...attempt,
    status: getPreviewAttemptStatus(attempt, form),
    totalScore: calculateAttemptTotalScorePreview(attempt, form),
    teacherFeedback: form.teacherFeedback || null,
    answers: attempt.answers.map((answer) => {
      if (!isEssayAnswer(answer)) {
        return answer;
      }

      const savedAnswer = getEssayAnswerForm(form, answer.id);

      return {
        ...answer,
        manualScore: savedAnswer.manualScore,
        feedback: savedAnswer.feedback || null,
        correctedAt: savedAnswer.manualScore === null ? null : new Date().toISOString(),
      };
    }),
  };
}

export function AttemptReview({ attempts }: AttemptReviewProps) {
  const router = useRouter();
  const [attemptItems, setAttemptItems] = useState(attempts);
  const [pendingAttemptId, setPendingAttemptId] = useState<string | null>(null);
  const [reopeningAttemptId, setReopeningAttemptId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed">(
    attempts.some((attempt) => getAttemptFilterKey(attempt.status) === "pending")
      ? "pending"
      : "reviewed",
  );
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
    attempts[0]?.id ?? null,
  );
  const [forms, setForms] = useState<Record<string, AttemptGradeForm>>(() =>
    createForms(attempts),
  );
  const [initialForms, setInitialForms] = useState<Record<string, AttemptGradeForm>>(() =>
    createForms(attempts),
  );

  useEffect(() => {
    const nextForms = createForms(attempts);

    setAttemptItems(attempts);
    setForms(nextForms);
    setInitialForms(nextForms);
    setSaveNotice(null);
  }, [attempts]);

  const filteredAttempts = useMemo(
    () =>
      attemptItems.filter((attempt) => getAttemptFilterKey(attempt.status) === statusFilter),
    [attemptItems, statusFilter],
  );

  const selectedAttempt = useMemo(
    () =>
      filteredAttempts.find((attempt) => attempt.id === selectedAttemptId) ??
      filteredAttempts[0] ??
      null,
    [filteredAttempts, selectedAttemptId],
  );

  const selectedAttemptForm = selectedAttempt ? forms[selectedAttempt.id] : undefined;
  const selectedAttemptInitialForm = selectedAttempt
    ? initialForms[selectedAttempt.id]
    : undefined;

  const selectedAttemptIsDirty = useMemo(
    () =>
      selectedAttempt
        ? !areFormsEqual(selectedAttemptForm, selectedAttemptInitialForm)
        : false,
    [selectedAttempt, selectedAttemptForm, selectedAttemptInitialForm],
  );

  const selectedAttemptManualRemaining = useMemo(
    () =>
      selectedAttempt ? getManualGradingRemaining(selectedAttempt, selectedAttemptForm) : 0,
    [selectedAttempt, selectedAttemptForm],
  );

  useEffect(() => {
    if (filteredAttempts.length === 0) {
      setSelectedAttemptId(null);
      return;
    }

    if (!selectedAttempt || selectedAttempt.id !== selectedAttemptId) {
      setSelectedAttemptId(filteredAttempts[0].id);
    }
  }, [filteredAttempts, selectedAttempt, selectedAttemptId]);

  function updateAttemptForm(
    attemptId: string,
    updater: (form: AttemptGradeForm) => AttemptGradeForm,
  ) {
    setForms((currentForms) => {
      const currentForm = currentForms[attemptId];

      if (!currentForm) {
        return currentForms;
      }

      return {
        ...currentForms,
        [attemptId]: updater(currentForm),
      };
    });
    setSaveNotice(null);
  }

  async function handleSubmit(attemptId: string) {
    const form = forms[attemptId];

    if (!form) {
      return;
    }

    setPendingAttemptId(attemptId);

    const response = await fetch(`/api/teacher/attempts/${attemptId}/grade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teacherFeedback: form.teacherFeedback,
        answers: Object.entries(form.answers).map(([answerId, answer]) => ({
          answerId,
          manualScore: answer.manualScore,
          feedback: answer.feedback,
        })),
      }),
    });

    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setPendingAttemptId(null);

    if (!response.ok) {
      await showErrorAlert({
        title: "Unable to save grading",
        text: body?.message ?? "Review the scores and try again.",
      });
      return;
    }

    const attemptToUpdate = attemptItems.find((attempt) => attempt.id === attemptId);

    if (!attemptToUpdate) {
      return;
    }

    const savedForm = cloneForm(normalizeAttemptForm(attemptToUpdate, form));

    setInitialForms((currentForms) => ({
      ...currentForms,
      [attemptId]: savedForm,
    }));
    setAttemptItems((currentAttempts) =>
      currentAttempts.map((attempt) =>
        attempt.id === attemptId ? applySavedFormToAttempt(attempt, savedForm) : attempt,
      ),
    );
    setSaveNotice("Grading saved.");
  }

  async function handleReopen(attemptId: string) {
    const confirmed = await showConfirmAlert({
      title: "Reopen this attempt?",
      text:
        "The student will be able to continue this exam. Existing grades and feedback will be cleared.",
      confirmButtonText: "Reopen",
      cancelButtonText: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    setReopeningAttemptId(attemptId);

    const response = await fetch(`/api/teacher/attempts/${attemptId}/reopen`, {
      method: "POST",
    });

    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setReopeningAttemptId(null);

    if (!response.ok) {
      await showErrorAlert({
        title: "Unable to reopen the attempt",
        text: body?.message ?? "Try again in a moment.",
      });
      return;
    }

    await showSuccessAlert({
      title: "Attempt reopened",
      text: "The exam was returned to the student for another submission.",
      timer: 1000,
    });
    router.refresh();
  }

  if (attemptItems.length === 0) {
    return (
      <div className="app-empty-state p-6 text-center text-slate-600">
        No student attempts have been submitted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`app-toggle-button px-3 py-2 ${
              statusFilter === "pending"
                ? "app-toggle-button-active"
                : ""
            }`}
          >
            Needs grading (
            {
              attemptItems.filter((attempt) => getAttemptFilterKey(attempt.status) === "pending")
                .length
            }
            )
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("reviewed")}
            className={`app-toggle-button px-3 py-2 ${
              statusFilter === "reviewed"
                ? "app-toggle-button-active"
                : ""
            }`}
          >
            Reviewed (
            {
              attemptItems.filter((attempt) => getAttemptFilterKey(attempt.status) === "reviewed")
                .length
            }
            )
          </button>
        </div>

        {saveNotice ? (
          <div className="app-badge app-badge-success px-3 py-2 text-sm">
            {saveNotice}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px,minmax(0,1fr)]">
        <section className="app-card overflow-hidden">
          <div className="app-card-header px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Attempts</h3>
            <p className="mt-1 text-xs text-slate-500">
              Select an attempt to review the answers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      No attempts found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      onClick={() => setSelectedAttemptId(attempt.id)}
                      className={`cursor-pointer ${
                        selectedAttempt?.id === attempt.id
                          ? "app-table-row-selected"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900">
                          {attempt.assignment.student.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(attempt.submittedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600">
                        {attempt.assignment.list.title}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={getAttemptStatusBadgeClass(attempt.status)}>
                          {getAttemptStatusLabel(attempt.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedAttempt ? (
          <section className="app-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {selectedAttempt.assignment.list.title}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedAttempt.assignment.student.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedAttempt.assignment.student.email}
                </p>
              </div>

              <div className="app-panel px-3 py-2 text-sm text-slate-600">
                <p>Started: {formatDateTime(selectedAttempt.startedAt)}</p>
                <p>Submitted: {formatDateTime(selectedAttempt.submittedAt)}</p>
                <p>Status: {getAttemptStatusLabel(selectedAttempt.status)}</p>
                <p>
                  Total score:{" "}
                  {formatScore(
                    calculateAttemptTotalScorePreview(selectedAttempt, selectedAttemptForm),
                  )}
                </p>
              </div>
            </div>

            <div className="app-panel mt-6 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="app-badge app-badge-warning">
                  📝 Manual grading remaining: {selectedAttemptManualRemaining}
                </span>
                {selectedAttemptIsDirty ? (
                  <span className="text-sm text-amber-800">Unsaved changes</span>
                ) : (
                  <span className="text-sm text-amber-800">All visible changes are saved.</span>
                )}
              </div>
            </div>

            <div className="mt-8 space-y-6">
              {selectedAttempt.answers.map((answer) => {
                const essayAnswerForm = getEssayAnswerForm(selectedAttemptForm, answer.id);
                const previewManualScore = getPreviewManualScore(answer, selectedAttemptForm);
                const needsGrading = isEssayAnswer(answer) && previewManualScore === null;

                return (
                  <article
                    key={answer.id}
                    className="app-panel bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <RichTextContent
                            html={answer.question.prompt}
                            className="text-sm font-semibold text-slate-900"
                          />
                          {needsGrading ? (
                            <span className="app-badge app-badge-warning">
                              📝 Needs grading
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                          {answer.question.type.replaceAll("_", " ")} • {answer.question.points} points
                        </p>
                      </div>

                      <div className="app-panel px-3 py-2 text-sm text-slate-600">
                        <p>Auto score: {formatScore(answer.autoScore)}</p>
                        {isEssayAnswer(answer) ? (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-700">Manual score</p>
                              <Tooltip content="Grading - Use the stepper to adjust the manual score quickly.">
                                <button
                                  type="button"
                                  aria-label="Grading help"
                                  className="app-icon-button h-5 w-5 rounded-full text-[11px] font-semibold text-slate-500"
                                >
                                  ?
                                </button>
                              </Tooltip>
                            </div>
                            <ScoreStepper
                              value={essayAnswerForm.manualScore}
                              min={0}
                              max={answer.question.points}
                              step={0.5}
                              disabled={pendingAttemptId === selectedAttempt.id}
                              onChange={(manualScore) =>
                                updateAttemptForm(selectedAttempt.id, (currentForm) => ({
                                  ...currentForm,
                                  answers: {
                                    ...currentForm.answers,
                                    [answer.id]: {
                                      ...getEssayAnswerForm(currentForm, answer.id),
                                      manualScore,
                                    },
                                  },
                                }))
                              }
                            />
                          </div>
                        ) : (
                          <p>Manual score: {formatScore(answer.manualScore)}</p>
                        )}
                      </div>
                    </div>

                    <div className="app-panel mt-4 p-3">
                      {renderResponse(
                        answer.question.type,
                        answer.responseJson,
                        answer.question.configJson,
                      )}
                    </div>

                    {isEssayAnswer(answer) ? (
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Feedback
                        </label>
                        <textarea
                          value={essayAnswerForm.feedback}
                          onChange={(event) =>
                            updateAttemptForm(selectedAttempt.id, (currentForm) => ({
                              ...currentForm,
                              answers: {
                                ...currentForm.answers,
                                [answer.id]: {
                                  ...getEssayAnswerForm(currentForm, answer.id),
                                  feedback: event.target.value,
                                },
                              },
                            }))
                          }
                          rows={3}
                          className="app-textarea"
                          placeholder="Optional answer feedback"
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Overall feedback
              </label>
              <textarea
                value={selectedAttemptForm?.teacherFeedback ?? ""}
                onChange={(event) =>
                  updateAttemptForm(selectedAttempt.id, (currentForm) => ({
                    ...currentForm,
                    teacherFeedback: event.target.value,
                  }))
                }
                rows={3}
                className="app-textarea"
                placeholder="Optional summary feedback for the whole attempt"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                {selectedAttemptIsDirty ? "Changes not saved yet." : "No pending changes."}
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleReopen(selectedAttempt.id)}
                  disabled={reopeningAttemptId === selectedAttempt.id}
                  className="app-button-secondary px-4 py-2"
                >
                  {reopeningAttemptId === selectedAttempt.id ? "Reopening..." : "Reopen attempt"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(selectedAttempt.id)}
                  disabled={
                    pendingAttemptId === selectedAttempt.id ||
                    reopeningAttemptId === selectedAttempt.id ||
                    !selectedAttemptIsDirty
                  }
                  className="app-button-primary px-4 py-2"
                >
                  {pendingAttemptId === selectedAttempt.id ? "Saving..." : "Save grading"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="app-empty-state p-8 text-center text-slate-500">
            No attempt selected.
          </div>
        )}
      </div>
    </div>
  );
}
