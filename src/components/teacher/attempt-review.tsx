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

export type AttemptReviewItem = {
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
      id: string;
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
};

type AttemptReviewMode = "history" | "review";

type AttemptReviewProps = {
  attempts: AttemptReviewItem[];
  mode?: AttemptReviewMode;
  emptyMessage?: string;
  attemptsTitle?: string;
  attemptsDescription?: string;
  initialSelectedAttemptId?: string | null;
  hideAttemptList?: boolean;
  onAttemptChange?: (attempt: AttemptReviewItem) => void;
};

type AttemptReviewAttempt = AttemptReviewProps["attempts"][number];
type AttemptReviewAnswer = AttemptReviewAttempt["answers"][number];
type AnswerGradeForm = {
  manualScore: number | null;
  feedback: string;
};
type AttemptGradeForm = {
  teacherFeedback: string;
  answers: Record<string, AnswerGradeForm>;
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
          attempt.answers.map((answer) => [
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

function getAnswerForm(form: AttemptGradeForm | undefined, answerId: string) {
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
  const manualScore = form?.answers[answer.id]?.manualScore ?? answer.manualScore;

  return clampManualScore(manualScore, answer.question.points);
}

function getManualScoreLabel(value: number | null, isReadOnlyMode: boolean) {
  if (isReadOnlyMode && value === null) {
    return "0";
  }

  return formatScore(value);
}

function normalizeAttemptForm(attempt: AttemptReviewAttempt, form: AttemptGradeForm) {
  return {
    teacherFeedback: form.teacherFeedback,
    answers: Object.fromEntries(
      attempt.answers.map((answer) => {
        const formAnswer = getAnswerForm(form, answer.id);

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
    const previewManualScore = getPreviewManualScore(answer, form);

    if (isEssayAnswer(answer)) {
      return total + (previewManualScore ?? 0);
    }

    return total + (previewManualScore ?? answer.autoScore ?? 0);
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
      const savedAnswer = getAnswerForm(form, answer.id);

      return {
        ...answer,
        manualScore: savedAnswer.manualScore,
        feedback: savedAnswer.feedback || null,
        correctedAt:
          savedAnswer.manualScore === null
            ? isEssayAnswer(answer)
              ? null
              : answer.correctedAt
            : new Date().toISOString(),
      };
    }),
  };
}

function shouldShowAttemptInMode(status: string, mode: AttemptReviewMode) {
  return mode === "history" ? status === "GRADED" : status === "SUBMITTED";
}

export function AttemptReview({
  attempts,
  mode = "history",
  emptyMessage,
  attemptsTitle,
  attemptsDescription,
  initialSelectedAttemptId,
  hideAttemptList = false,
  onAttemptChange,
}: AttemptReviewProps) {
  const router = useRouter();
  const isReadOnlyMode = mode === "history";
  const [attemptItems, setAttemptItems] = useState(attempts);
  const [pendingAttemptId, setPendingAttemptId] = useState<string | null>(null);
  const [reopeningAttemptId, setReopeningAttemptId] = useState<string | null>(null);
  const [ungradingAttemptId, setUngradingAttemptId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
    initialSelectedAttemptId ?? null,
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
    setSelectedAttemptId((currentAttemptId) =>
      attempts.some(
        (attempt) =>
          attempt.id === currentAttemptId && shouldShowAttemptInMode(attempt.status, mode),
      )
        ? currentAttemptId
        : attempts.some(
              (attempt) =>
                attempt.id === initialSelectedAttemptId &&
                shouldShowAttemptInMode(attempt.status, mode),
            )
          ? initialSelectedAttemptId ?? null
          : null,
    );
  }, [attempts, initialSelectedAttemptId, mode]);

  const visibleAttempts = useMemo(
    () =>
      attemptItems.filter((attempt) => shouldShowAttemptInMode(attempt.status, mode)),
    [attemptItems, mode],
  );

  const selectedAttempt = useMemo(
    () => visibleAttempts.find((attempt) => attempt.id === selectedAttemptId) ?? null,
    [visibleAttempts, selectedAttemptId],
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
  const selectedAttemptCanSaveWithoutChanges = useMemo(
    () =>
      Boolean(
        selectedAttempt &&
          mode === "review" &&
          selectedAttempt.status === "SUBMITTED" &&
          selectedAttemptManualRemaining === 0 &&
          !selectedAttemptIsDirty,
      ),
    [mode, selectedAttempt, selectedAttemptIsDirty, selectedAttemptManualRemaining],
  );
  const selectedAttemptCanSave = selectedAttemptIsDirty || selectedAttemptCanSaveWithoutChanges;

  useEffect(() => {
    if (
      selectedAttemptId !== null &&
      !visibleAttempts.some((attempt) => attempt.id === selectedAttemptId)
    ) {
      setSelectedAttemptId(null);
    }
  }, [visibleAttempts, selectedAttemptId]);

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

    const updatedAttempt = applySavedFormToAttempt(attemptToUpdate, savedForm);
    const nextAttemptItems = attemptItems.map((attempt) =>
      attempt.id === attemptId ? updatedAttempt : attempt,
    );
    const nextVisibleAttempts = nextAttemptItems.filter((attempt) =>
      shouldShowAttemptInMode(attempt.status, mode),
    );

    setInitialForms((currentForms) => ({
      ...currentForms,
      [attemptId]: savedForm,
    }));
    setAttemptItems(nextAttemptItems);
    onAttemptChange?.(updatedAttempt);

    if (mode === "review" && updatedAttempt.status === "GRADED") {
      setSelectedAttemptId(nextVisibleAttempts[0]?.id ?? null);
    }

    if (mode === "review") {
      if (updatedAttempt.status === "GRADED" && nextVisibleAttempts.length > 0) {
        setSaveNotice("Grading saved. Opening the next student attempt.");
      } else if (updatedAttempt.status === "GRADED") {
        setSaveNotice("Grading saved. This exam has no more attempts to review.");
      } else {
        setSaveNotice("Grading saved. This attempt still needs manual grading.");
      }
    } else if (updatedAttempt.status === "GRADED") {
      setSaveNotice("Grading saved.");
    } else {
      setSaveNotice("Grading saved. This attempt moved back to the review queue.");
    }
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

  async function handleUngrade(attemptId: string, listId: string) {
    const confirmed = await showConfirmAlert({
      title: "Move this attempt back to review?",
      text:
        "The student submission will stay locked, but this attempt will return to the teacher review queue.",
      confirmButtonText: "Review again",
      cancelButtonText: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    setUngradingAttemptId(attemptId);

    const response = await fetch(`/api/teacher/attempts/${attemptId}/ungrade`, {
      method: "POST",
    });

    const body = (await response.json().catch(() => null)) as
      | { id?: string; listId?: string; message?: string }
      | null;
    setUngradingAttemptId(null);

    if (!response.ok || !body?.listId) {
      await showErrorAlert({
        title: "Unable to move the attempt to review",
        text: body?.message ?? "Try again in a moment.",
      });
      return;
    }

    await showSuccessAlert({
      title: "Attempt moved to review",
      text: "You can continue grading it in the teacher review queue.",
      timer: 1000,
    });
    router.push(`/professor/review/${listId}`);
    router.refresh();
  }

  const resolvedEmptyMessage =
    emptyMessage ??
    (mode === "review"
      ? "No attempts are waiting for review."
      : "No reviewed attempts are available.");
  const resolvedAttemptsTitle =
    attemptsTitle ?? (mode === "review" ? "Attempts to review" : "Reviewed attempts");
  const resolvedAttemptsDescription =
    attemptsDescription ??
    (mode === "review"
      ? "Select a student attempt and continue grading this exam."
      : "Open any reviewed attempt to inspect the answers.");

  if (visibleAttempts.length === 0) {
    return (
      <div className="space-y-4">
        {saveNotice ? (
          <div className="flex flex-wrap justify-end gap-3">
            <div className="app-badge app-badge-success px-3 py-2 text-sm">
              {saveNotice}
            </div>
          </div>
        ) : null}

        <div className="app-empty-state p-6 text-center text-slate-600">
          {resolvedEmptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {saveNotice ? (
        <div className="flex flex-wrap justify-end gap-3">
          <div className="app-badge app-badge-success px-3 py-2 text-sm">
            {saveNotice}
          </div>
        </div>
      ) : null}

      <div className={hideAttemptList ? "space-y-4" : "grid gap-4 xl:grid-cols-[360px,minmax(0,1fr)]"}>
        {!hideAttemptList ? (
          <section className="app-card overflow-hidden">
            <div className="app-card-header px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">{resolvedAttemptsTitle}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {resolvedAttemptsDescription}
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
                  {visibleAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        No attempts available.
                      </td>
                    </tr>
                  ) : (
                    visibleAttempts.map((attempt) => (
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
        ) : null}

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

            {mode === "review" ? (
              <div className="app-panel mt-6 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="app-badge app-badge-warning">
                    📝 Manual grading remaining: {selectedAttemptManualRemaining}
                  </span>
                  {selectedAttemptIsDirty ? (
                    <span className="text-sm text-amber-800">Unsaved changes</span>
                  ) : selectedAttemptCanSaveWithoutChanges ? (
                    <span className="text-sm text-amber-800">Ready for teacher approval.</span>
                  ) : (
                    <span className="text-sm text-amber-800">All visible changes are saved.</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="app-panel mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="app-badge app-badge-success">✅ Reviewed attempt</span>
                  <span className="text-sm text-slate-600">
                    Read-only history. Move it back to review to edit grading, or reopen it for the student.
                  </span>
                </div>
              </div>
            )}

            <div className="mt-8 space-y-6">
              {selectedAttempt.answers.map((answer) => {
                const answerForm = getAnswerForm(selectedAttemptForm, answer.id);
                const previewManualScore = getPreviewManualScore(answer, selectedAttemptForm);
                const needsGrading = isEssayAnswer(answer) && previewManualScore === null;

                return (
                  <article
                    key={answer.id}
                    className="app-panel bg-white p-4"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <RichTextContent
                            html={answer.question.prompt}
                            className="break-words text-sm font-semibold leading-6 text-slate-900"
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

                      <div className="flex items-start gap-3 justify-self-end">
                        <div className="pt-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Score
                            </p>
                            {!isReadOnlyMode ? (
                              <Tooltip content="Grading - Use the stepper to adjust the manual score quickly.">
                                <button
                                  type="button"
                                  aria-label="Grading help"
                                  className="app-icon-button h-5 w-5 rounded-full text-[11px] font-semibold text-slate-500"
                                >
                                  ?
                                </button>
                              </Tooltip>
                            ) : null}
                          </div>
                        </div>

                        <div className="app-panel min-w-[230px] px-3 py-2 text-sm text-slate-600">
                          <div className="flex flex-wrap items-center gap-2">
                            {answer.question.type !== QuestionType.ESSAY ? (
                              <span className="app-badge app-badge-info">
                                🤖 Auto: {formatScore(answer.autoScore)}
                              </span>
                            ) : null}
                            <span
                              className={
                                previewManualScore === null
                                  ? isReadOnlyMode
                                    ? "app-badge"
                                    : "app-badge app-badge-warning"
                                  : "app-badge app-badge-success"
                              }
                            >
                              ✍ Manual: {getManualScoreLabel(previewManualScore, isReadOnlyMode)}
                            </span>
                          </div>

                          {!isReadOnlyMode ? (
                            <div className="mt-3">
                              <ScoreStepper
                                value={answerForm.manualScore}
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
                                        ...getAnswerForm(currentForm, answer.id),
                                        manualScore,
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                          ) : null}
                        </div>
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
                          value={answerForm.feedback}
                          onChange={
                            isReadOnlyMode
                              ? undefined
                              : (event) =>
                                  updateAttemptForm(selectedAttempt.id, (currentForm) => ({
                                    ...currentForm,
                                    answers: {
                                      ...currentForm.answers,
                                      [answer.id]: {
                                        ...getAnswerForm(currentForm, answer.id),
                                        feedback: event.target.value,
                                      },
                                    },
                                  }))
                          }
                          readOnly={isReadOnlyMode}
                          rows={3}
                          className="app-textarea"
                          placeholder={
                            isReadOnlyMode ? "Feedback is read-only on reviewed attempts." : "Optional answer feedback"
                          }
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
                onChange={
                  isReadOnlyMode
                    ? undefined
                    : (event) =>
                        updateAttemptForm(selectedAttempt.id, (currentForm) => ({
                          ...currentForm,
                          teacherFeedback: event.target.value,
                        }))
                }
                readOnly={isReadOnlyMode}
                rows={3}
                className="app-textarea"
                placeholder={
                  isReadOnlyMode
                    ? "Overall feedback is read-only on reviewed attempts."
                    : "Optional summary feedback for the whole attempt"
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                {isReadOnlyMode
                  ? "Reviewed attempts can be moved back to review or reopened for the student."
                  : selectedAttemptCanSaveWithoutChanges
                    ? "This attempt is waiting for teacher approval."
                  : selectedAttemptIsDirty
                    ? "Changes not saved yet."
                    : "No pending changes."}
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                {isReadOnlyMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleUngrade(
                          selectedAttempt.id,
                          selectedAttempt.assignment.list.id,
                        )
                      }
                      disabled={ungradingAttemptId === selectedAttempt.id}
                      className="app-button-secondary px-4 py-2"
                    >
                      {ungradingAttemptId === selectedAttempt.id
                        ? "Review again..."
                        : "Review again"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReopen(selectedAttempt.id)}
                      disabled={reopeningAttemptId === selectedAttempt.id}
                      className="app-button-secondary px-4 py-2"
                    >
                      {reopeningAttemptId === selectedAttempt.id ? "Reopening..." : "Reopen attempt"}
                    </button>
                  </>
                ) : (
                  <>
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
                      !selectedAttemptCanSave
                    }
                    className="app-button-primary px-4 py-2"
                  >
                    {pendingAttemptId === selectedAttempt.id
                      ? selectedAttemptCanSaveWithoutChanges && !selectedAttemptIsDirty
                        ? "Marking..."
                        : "Saving..."
                      : selectedAttemptCanSaveWithoutChanges && !selectedAttemptIsDirty
                        ? "Mark as reviewed"
                        : "Save grading"}
                  </button>
                  </>
                )}
              </div>
            </div>
          </section>
        ) : (
          <div className="app-empty-state p-8 text-center text-slate-500">
            {mode === "review"
              ? "Select a student attempt to start grading."
              : "Select a reviewed attempt to inspect it."}
          </div>
        )}
      </div>
    </div>
  );
}
