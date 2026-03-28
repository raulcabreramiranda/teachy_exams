import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toAttemptReviewItem } from "@/components/teacher/attempt-review-data";
import { ReviewQueue } from "@/components/teacher/review-queue";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

type TeacherReviewPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function TeacherReviewPage({ params }: TeacherReviewPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const session = await requirePageSession([Role.TEACHER], locale);
  const attempts = await getTeacherAttemptsForReview(session.userId);
  const submittedAttempts = attempts.filter((attempt) => attempt.status === "SUBMITTED");

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{t("TeacherReviewQueue.title")}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("TeacherReviewQueue.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/professor" className="app-button-secondary px-3 py-2">
              {t("Common.goToDashboard")}
            </Link>
            <Link href="/professor/attempts" className="app-button-secondary px-3 py-2">
              {t("Common.goToReviewedAttempts")}
            </Link>
          </div>
        </div>
      </div>

      <ReviewQueue
        locale={locale}
        attempts={submittedAttempts.map(toAttemptReviewItem)}
      />
    </div>
  );
}
