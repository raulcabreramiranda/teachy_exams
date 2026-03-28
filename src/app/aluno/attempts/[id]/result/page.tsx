import Link from "next/link";
import { QuestionType, Role } from "@prisma/client";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getAttemptResult } from "@/services/attempt-service";
import { FillInTheBlankConfig, MatchingConfig, MultipleChoiceConfig } from "@/validations/exercise";

type StudentAttemptResultPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function renderAnswer(questionType: QuestionType, configJson: unknown, responseJson: unknown) {
  if (questionType === QuestionType.MULTIPLE_CHOICE) {
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

  if (questionType === QuestionType.ESSAY) {
    const response = responseJson as { text?: string };
    return <p className="whitespace-pre-wrap text-sm text-slate-600">{response.text || "No answer provided."}</p>;
  }

  if (questionType === QuestionType.FILL_IN_THE_BLANK) {
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
      {config.leftItems.map((leftItem) => {
        const rightId = response.pairs?.[leftItem.id];
        const rightLabel =
          config.rightItems.find((rightItem) => rightItem.id === rightId)?.label ?? "No match";

        return (
          <li key={leftItem.id}>
            {leftItem.label}: {rightLabel}
          </li>
        );
      })}
    </ul>
  );
}

export default async function StudentAttemptResultPage({
  params,
}: StudentAttemptResultPageProps) {
  const session = await requirePageSession([Role.STUDENT]);
  const { id } = await params;
  const attempt = await getAttemptResult(session.userId, id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/aluno"
          className="app-button-secondary px-3 py-2"
        >
          Back to dashboard
        </Link>
      </div>

      <section className="app-card rounded-3xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Exam result
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{attempt.assignment.list.title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Submitted {formatDateTime(attempt.submittedAt)}
            </p>
          </div>

          <div className="app-panel rounded-2xl px-4 py-4 text-sm text-slate-600">
            <p>Status: {attempt.status}</p>
            <p>Total score: {formatScore(attempt.totalScore)}</p>
            <p>Due date: {formatDateTime(attempt.assignment.list.dueAt)}</p>
          </div>
        </div>

        <div className="app-panel mt-6 rounded-2xl px-4 py-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Overall feedback</p>
          <p className="mt-2">
            {attempt.teacherFeedback || "No overall feedback has been added yet."}
          </p>
        </div>
      </section>

      <section className="space-y-6">
        {attempt.answers.map((answer) => (
          <article
            key={answer.id}
            className="app-card rounded-3xl p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  {answer.question.type.replaceAll("_", " ")}
                </p>
                <RichTextContent
                  html={answer.question.prompt}
                  className="mt-2 text-lg font-semibold text-slate-900"
                />
              </div>

              <div className="app-panel rounded-2xl px-4 py-4 text-sm text-slate-600">
                <p>Auto score: {formatScore(answer.autoScore)}</p>
                <p>Manual score: {formatScore(answer.manualScore)}</p>
                <p>
                  Final score:{" "}
                  {formatScore(answer.manualScore ?? answer.autoScore ?? null)}
                </p>
              </div>
            </div>

            <div className="app-panel mt-4 rounded-2xl p-5">
              {renderAnswer(
                answer.question.type,
                answer.question.configJson,
                answer.responseJson,
              )}
            </div>

            <div className="app-panel mt-4 rounded-2xl px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Feedback</p>
              <p className="mt-2">
                {answer.feedback ||
                  (answer.question.type === QuestionType.ESSAY
                    ? "Essay feedback is still pending."
                    : "No answer-specific feedback.")}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
