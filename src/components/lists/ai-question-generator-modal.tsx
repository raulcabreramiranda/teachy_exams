"use client";

import { QuestionType } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import type {
  AiGeneratedQuestion,
  AiQuestionDifficulty,
  AiQuestionGenerationInput,
  AiQuestionLanguage,
} from "@/validations/ai";

type AiQuestionGeneratorModalProps = {
  open: boolean;
  onClose: () => void;
  onUseQuestion: (question: AiGeneratedQuestion) => void;
};

type GeneratorFormState = AiQuestionGenerationInput;

const questionTypeOptions: QuestionType[] = [
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.ESSAY,
  QuestionType.FILL_IN_THE_BLANK,
  QuestionType.MATCHING,
];

const difficultyOptions: AiQuestionDifficulty[] = ["EASY", "MEDIUM", "HARD"];

const languageOptions: Array<{ value: AiQuestionLanguage; label: string }> = [
  { value: "en", label: "EN" },
  { value: "pt", label: "PT" },
  { value: "es", label: "ES" },
];

function isAiQuestionLanguage(value: string): value is AiQuestionLanguage {
  return value === "en" || value === "pt" || value === "es";
}

function getDefaultFormState(locale: string): GeneratorFormState {
  return {
    type: QuestionType.MULTIPLE_CHOICE,
    difficulty: "MEDIUM",
    language: isAiQuestionLanguage(locale) ? locale : "en",
    description: "",
    points: 1,
  };
}

function PreviewBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <div className="mt-3 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function QuestionPreview({ question }: { question: AiGeneratedQuestion }) {
  const tAi = useTranslations("AiQuestionGenerator");
  const tQuestionType = useTranslations("QuestionType");

  const questionTypeLabel =
    question.type === QuestionType.MULTIPLE_CHOICE
      ? tQuestionType("multipleChoice")
      : question.type === QuestionType.ESSAY
        ? tQuestionType("essay")
        : question.type === QuestionType.FILL_IN_THE_BLANK
          ? tQuestionType("fillInTheBlank")
          : tQuestionType("matching");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="app-badge">{questionTypeLabel}</span>
        <span className="app-badge app-badge-info">
          {tAi("pointCount", { count: question.points })}
        </span>
        <span className="app-badge app-badge-success">{question.language.toUpperCase()}</span>
      </div>

      <PreviewBlock title={tAi("prompt")}>
        <div className="whitespace-pre-wrap">{question.prompt}</div>
      </PreviewBlock>

      {question.type === QuestionType.MULTIPLE_CHOICE ? (
        <PreviewBlock title={tAi("options")}>
          <ul className="space-y-2">
            {question.data.options.map((option, index) => {
              const isCorrect = question.data.correctOptionIndexes.includes(index);

              return (
                <li
                  key={`${option}-${index}`}
                  className={`rounded-lg border px-3 py-2 ${
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  <span className="font-medium">
                    {isCorrect ? `${tAi("correctOption")}:` : `${tAi("regularOption")}:`}
                  </span>{" "}
                  {option}
                </li>
              );
            })}
          </ul>
        </PreviewBlock>
      ) : null}

      {question.type === QuestionType.ESSAY ? (
        <PreviewBlock title={tAi("sampleAnswer")}>
          <div className="whitespace-pre-wrap">{question.data.sampleAnswer}</div>
          <p className="mt-3 text-xs text-slate-500">
            {tAi("sampleAnswerNote")}
          </p>
        </PreviewBlock>
      ) : null}

      {question.type === QuestionType.FILL_IN_THE_BLANK ? (
        <>
          <PreviewBlock title={tAi("template")}>
            <div className="whitespace-pre-wrap">{question.data.template}</div>
          </PreviewBlock>
          <PreviewBlock title={tAi("expectedBlanks")}>
            <ol className="list-decimal space-y-1 pl-5">
              {question.data.blanks.map((blank, index) => (
                <li key={`${blank}-${index}`}>{blank}</li>
              ))}
            </ol>
          </PreviewBlock>
        </>
      ) : null}

      {question.type === QuestionType.MATCHING ? (
        <PreviewBlock title={tAi("matches")}>
          <div className="grid gap-2">
            {question.data.matches.map((match, index) => (
              <div key={`${match.leftIndex}-${match.rightIndex}-${index}`} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2">
                <span className="font-medium">{question.data.left[match.leftIndex]}</span>
                <span className="mx-2 text-slate-400">→</span>
                <span>{question.data.right[match.rightIndex]}</span>
              </div>
            ))}
          </div>
        </PreviewBlock>
      ) : null}
    </div>
  );
}

export function AiQuestionGeneratorModal({
  open,
  onClose,
  onUseQuestion,
}: AiQuestionGeneratorModalProps) {
  const locale = useLocale();
  const tAi = useTranslations("AiQuestionGenerator");
  const tQuestionType = useTranslations("QuestionType");
  const tCommon = useTranslations("Common");
  const [formState, setFormState] = useState<GeneratorFormState>(
    getDefaultFormState(locale),
  );
  const [generatedQuestion, setGeneratedQuestion] = useState<AiGeneratedQuestion | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate = useMemo(
    () => formState.description.trim().length >= 5 && formState.points > 0,
    [formState.description, formState.points],
  );

  useEffect(() => {
    if (!open) {
      setFormState(getDefaultFormState(locale));
      setGeneratedQuestion(null);
      setErrorMessage(null);
      setIsGenerating(false);
    }
  }, [locale, open]);

  function updateFormState(
    key: keyof GeneratorFormState,
    value: GeneratorFormState[keyof GeneratorFormState],
  ) {
    setFormState((currentState) => ({
      ...currentState,
      [key]: value,
    }));
  }

  async function generateQuestion() {
    setIsGenerating(true);
    setErrorMessage(null);

    const response = await fetch("/api/ai/generate-question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formState),
    });

    const body = (await response.json().catch(() => null)) as
      | AiGeneratedQuestion
      | { message?: string }
      | null;

    setIsGenerating(false);

    if (!response.ok || !body || "type" in body === false) {
      setGeneratedQuestion(null);
      setErrorMessage(
        body && "message" in body && typeof body.message === "string"
          ? body.message
          : tAi("fallbackError"),
      );
      return;
    }

    setGeneratedQuestion(body);
  }

  function handleUseQuestion() {
    if (!generatedQuestion) {
      return;
    }

    onUseQuestion(generatedQuestion);
    onClose();
  }

  return (
    <Modal
      open={open}
      title={tAi("modalTitle")}
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="app-panel px-4 py-3 text-sm text-slate-600">
          {tAi("helperText")}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {tAi("questionType")}
              </label>
              <select
                value={formState.type}
                onChange={(event) =>
                  updateFormState("type", event.target.value as QuestionType)
                }
                className="app-select"
              >
                {questionTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === QuestionType.MULTIPLE_CHOICE
                      ? tQuestionType("multipleChoice")
                      : option === QuestionType.ESSAY
                        ? tQuestionType("essay")
                        : option === QuestionType.FILL_IN_THE_BLANK
                          ? tQuestionType("fillInTheBlank")
                          : tQuestionType("matching")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {tAi("difficulty")}
              </label>
              <select
                value={formState.difficulty}
                onChange={(event) =>
                  updateFormState(
                    "difficulty",
                    event.target.value as AiQuestionDifficulty,
                  )
                }
                className="app-select"
              >
                {difficultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "EASY"
                      ? tAi("difficultyOptions.easy")
                      : option === "MEDIUM"
                        ? tAi("difficultyOptions.medium")
                        : tAi("difficultyOptions.hard")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {tAi("language")}
              </label>
              <select
                value={formState.language}
                onChange={(event) =>
                  updateFormState(
                    "language",
                    event.target.value as AiQuestionLanguage,
                  )
                }
                className="app-select"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {tAi("points")}
              </label>
              <input
                value={formState.points}
                onChange={(event) =>
                  updateFormState("points", Number(event.target.value || 1))
                }
                type="number"
                min={0.5}
                max={100}
                step={0.5}
                className="app-input"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {tAi("description")}
              </label>
              <textarea
                value={formState.description}
                onChange={(event) => updateFormState("description", event.target.value)}
                rows={7}
                maxLength={1500}
                className="app-textarea"
                placeholder={tAi("descriptionPlaceholder")}
              />
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={generateQuestion}
                disabled={!canGenerate || isGenerating}
                className="app-button-primary px-4 py-2"
              >
                {isGenerating ? tAi("generating") : tAi("generate")}
              </button>

              {generatedQuestion ? (
                <button
                  type="button"
                  onClick={generateQuestion}
                  disabled={isGenerating}
                  className="app-button-secondary px-3 py-2"
                >
                  {tAi("regenerate")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            {generatedQuestion ? (
              <>
                <QuestionPreview question={generatedQuestion} />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                  onClick={onClose}
                  className="app-button-secondary px-3 py-2"
                >
                    {tCommon("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleUseQuestion}
                    className="app-button-primary px-4 py-2"
                  >
                    {tAi("useQuestion")}
                  </button>
                </div>
              </>
            ) : (
              <div className="app-empty-state px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {tAi("previewEmptyTitle")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {tAi("previewEmptyText")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
