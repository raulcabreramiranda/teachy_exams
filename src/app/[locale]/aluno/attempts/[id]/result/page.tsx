import { QuestionType, Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { PageNavigation } from "@/components/layout/page-navigation";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getAttemptResult } from "@/services/attempt-service";
import {
  FillInTheBlankConfig,
  MatchingConfig,
  MultipleChoiceConfig,
} from "@/validations/exercise";

type StudentAttemptResultPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

function getAttemptStatusText(
  status: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (status === "IN_PROGRESS") {
    return t("Status.inProgress");
  }

  if (status === "SUBMITTED") {
    return t("Status.pendingReview");
  }

  if (status === "GRADED") {
    return t("Status.graded");
  }

  return status;
}

function getQuestionTypeLabel(
  questionType: QuestionType,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (questionType === QuestionType.MULTIPLE_CHOICE) {
    return t("QuestionType.multipleChoice");
  }

  if (questionType === QuestionType.ESSAY) {
    return t("QuestionType.essay");
  }

  if (questionType === QuestionType.FILL_IN_THE_BLANK) {
    return t("QuestionType.fillInTheBlank");
  }

  return t("QuestionType.matching");
}

function getScoreBadge(
  score: number | null,
  maxPoints: number,
  locale: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (score === null) {
    return {
      className: "app-badge app-badge-warning",
      label: t("Status.scorePending"),
    };
  }

  const values = {
    score: formatScore(score, locale),
    max: formatScore(maxPoints, locale),
  };

  if (score <= 0) {
    return {
      className: "app-badge app-badge-danger",
      label: t("StudentResult.scoreZero", values),
    };
  }

  if (score >= maxPoints) {
    return {
      className: "app-badge app-badge-success",
      label: t("StudentResult.scoreFull", values),
    };
  }

  return {
    className: "app-badge app-badge-info",
    label: t("StudentResult.scorePartial", values),
  };
}

function renderAnswer(
  questionType: QuestionType,
  configJson: unknown,
  responseJson: unknown,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
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
        {!response.selectedOptionIds?.length ? (
          <li>{t("StudentResult.noOptionSelected")}</li>
        ) : null}
      </ul>
    );
  }

  if (questionType === QuestionType.ESSAY) {
    const response = responseJson as { text?: string };
    return (
      <p className="whitespace-pre-wrap text-sm text-slate-600">
        {response.text || t("StudentResult.noAnswerProvided")}
      </p>
    );
  }

  if (questionType === QuestionType.FILL_IN_THE_BLANK) {
    const config = configJson as FillInTheBlankConfig;
    const response = responseJson as { blanks?: string[] };

    return (
      <ul className="space-y-1 text-sm text-slate-600">
        {config.answers.map((_, index) => (
          <li key={index}>
            {t("StudentResult.blank", { index: index + 1 })}:{" "}
            {response.blanks?.[index] || t("StudentResult.noAnswer")}
          </li>
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
          config.rightItems.find((rightItem) => rightItem.id === rightId)?.label ??
          t("StudentResult.noMatch");

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
  const { locale, id } = await params;
  const t = await getTranslations({ locale });
  const session = await requirePageSession([Role.STUDENT], locale);
  const attempt = await getAttemptResult(session.userId, id);
  const totalMaxPoints = attempt.answers.reduce(
    (total, answer) => total + answer.question.points,
    0,
  );
  const totalScoreBadge = getScoreBadge(attempt.totalScore, totalMaxPoints, locale, t);

  return (
    <div className="space-y-8">
      <div className="app-page-header p-5">
        <h2 className="text-2xl font-semibold">{t("StudentResult.title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("StudentResult.subtitle")}</p>
        <PageNavigation
          backHref="/aluno"
          links={[{ href: "/aluno", label: t("PageNavigation.goToExams") }]}
          className="mt-4"
        />
      </div>

      <section className="app-card rounded-3xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              {t("StudentResult.title")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{attempt.assignment.list.title}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("StudentResult.submittedAt", {
                date: formatDateTime(attempt.submittedAt, locale),
              })}
            </p>
          </div>

          <div className="app-panel rounded-2xl px-4 py-4 text-sm text-slate-600">
            <p>
              {t("StudentResult.status", {
                status: getAttemptStatusText(attempt.status, t),
              })}
            </p>
            <p>
              {t("StudentResult.dueDate", {
                date: formatDateTime(attempt.assignment.list.dueAt, locale),
              })}
            </p>
            <p>
              {t("StudentResult.total")}{" "}
              <span className={totalScoreBadge.className}>{totalScoreBadge.label}</span>
            </p>
          </div>
        </div>

        <div className="app-panel mt-6 rounded-2xl px-4 py-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">
            {t("StudentResult.overallFeedback")}
          </p>
          <p className="mt-2">
            {attempt.teacherFeedback || t("StudentResult.noOverallFeedback")}
          </p>
        </div>
      </section>

      <section className="space-y-6">
        {attempt.answers.map((answer) => {
          const finalScore = answer.manualScore ?? answer.autoScore ?? null;
          const scoreBadge = getScoreBadge(finalScore, answer.question.points, locale, t);

          return (
            <article
              key={answer.id}
              className="app-card rounded-3xl p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    {getQuestionTypeLabel(answer.question.type, t)}
                  </p>
                  <RichTextContent
                    html={answer.question.prompt}
                    className="mt-2 text-lg font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <span className={scoreBadge.className}>{scoreBadge.label}</span>
                </div>
              </div>

              <div className="app-panel mt-4 rounded-2xl p-5">
                <p className="font-semibold text-slate-900">{t("StudentResult.answer")}</p>
                {renderAnswer(
                  answer.question.type,
                  answer.question.configJson,
                  answer.responseJson,
                  t,
                )}

                <p className="mt-4 font-semibold text-slate-900">
                  {t("StudentResult.feedback")}
                </p>
                <p className="mt-2">
                  {answer.feedback ||
                    (answer.question.type === QuestionType.ESSAY
                      ? t("StudentResult.essayPending")
                      : t("StudentResult.noAnswerFeedback"))}
                </p>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
