import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { PageNavigation } from "@/components/layout/page-navigation";
import { AttemptReview } from "@/components/teacher/attempt-review";
import { toAttemptReviewItem } from "@/components/teacher/attempt-review-data";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

type TeacherReviewExamPageProps = {
  params: Promise<{
    locale: string;
    listId: string;
  }>;
};

export default async function TeacherReviewExamPage({
  params,
}: TeacherReviewExamPageProps) {
  const { locale, listId } = await params;
  const t = await getTranslations({ locale });
  const session = await requirePageSession([Role.TEACHER], locale);
  const attempts = await getTeacherAttemptsForReview(session.userId);
  const submittedAttempts = attempts.filter(
    (attempt) => attempt.status === "SUBMITTED" && attempt.assignment.list.id === listId,
  );

  if (submittedAttempts.length === 0) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <h2 className="text-2xl font-semibold">{submittedAttempts[0].assignment.list.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t("TeacherReviewExamPage.subtitle")}
        </p>
        <PageNavigation
          backHref="/professor/review"
          links={[{ href: "/professor/review", label: t("Common.goToReviewQueue") }]}
          className="mt-4"
        />
      </div>

      <AttemptReview
        attempts={submittedAttempts.map(toAttemptReviewItem)}
        mode="review"
        emptyMessage={t("TeacherReviewExamPage.empty")}
        attemptsTitle={t("TeacherReviewExamPage.cardTitle")}
        attemptsDescription={t("TeacherReviewExamPage.cardSubtitle")}
        initialSelectedAttemptId={submittedAttempts[0].id}
        hideAttemptList
      />
    </div>
  );
}
