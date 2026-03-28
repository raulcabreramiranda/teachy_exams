import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { AttemptReview } from "@/components/teacher/attempt-review";
import { toAttemptReviewItem } from "@/components/teacher/attempt-review-data";
import { PageNavigation } from "@/components/layout/page-navigation";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

type TeacherAttemptPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function TeacherAttemptPage({ params }: TeacherAttemptPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale });
  const session = await requirePageSession([Role.TEACHER], locale);
  const attempts = await getTeacherAttemptsForReview(session.userId);
  const attempt = attempts.find((item) => item.id === id && item.status === "GRADED");

  if (!attempt) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <h2 className="text-2xl font-semibold">{t("TeacherAttemptPage.title")}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t("TeacherAttemptPage.subtitle")}
        </p>
        <PageNavigation
          backHref="/professor/attempts"
          links={[{ href: "/professor/attempts", label: t("Common.goToReviewedAttempts") }]}
          className="mt-4"
        />
      </div>

      <AttemptReview
        attempts={[toAttemptReviewItem(attempt)]}
        mode="history"
        attemptsTitle={t("TeacherAttemptPage.cardTitle")}
        attemptsDescription={t("TeacherAttemptPage.cardSubtitle")}
        initialSelectedAttemptId={attempt.id}
      />
    </div>
  );
}
