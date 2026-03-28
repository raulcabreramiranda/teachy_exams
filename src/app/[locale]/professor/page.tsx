import { AttemptStatus, Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";
import { getTeacherDashboardData } from "@/services/exercise-list-service";
import { getStudentsForManagement } from "@/services/student-service";

function getAttemptBadgeClass(status: AttemptStatus) {
  return status === AttemptStatus.GRADED
    ? "app-badge app-badge-success"
    : "app-badge app-badge-warning";
}

function getAttemptStatusLabel(
  status: AttemptStatus,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  return status === AttemptStatus.GRADED
    ? t("Status.graded")
    : t("Status.pendingReview");
}

type TeacherPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function TeacherPage({ params }: TeacherPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const session = await requirePageSession([Role.TEACHER], locale);
  const [exams, attempts, students] = await Promise.all([
    getTeacherDashboardData(session.userId),
    getTeacherAttemptsForReview(session.userId),
    getStudentsForManagement(),
  ]);

  const publishedExams = exams.filter((exam) => exam.publishedAt).length;
  const pendingAttempts = attempts.filter(
    (attempt) => attempt.status === AttemptStatus.SUBMITTED,
  );
  const gradedAttempts = attempts.filter(
    (attempt) => attempt.status === AttemptStatus.GRADED,
  );

  return (
    <div className="space-y-5">
      <section className="app-page-header flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {t("TeacherDashboard.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t("TeacherDashboard.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/professor/lists/new"
            className="app-button-secondary px-3 py-2"
          >
            {t("TeacherDashboard.newExam")}
          </Link>
          <Link
            href="/professor/review"
            className="app-button-secondary px-3 py-2"
          >
            {t("TeacherDashboard.openGrading")}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-card p-4">
          <p className="text-sm text-slate-500">{t("TeacherDashboard.totalExams")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{exams.length}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">{t("TeacherDashboard.publishedExams")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{publishedExams}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">{t("TeacherDashboard.activeStudents")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{students.length}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">{t("TeacherDashboard.pendingGrading")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {pendingAttempts.length}
          </p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="app-card overflow-hidden">
          <div className="app-card-header flex items-center justify-between px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {t("TeacherDashboard.recentExams")}
              </h3>
              <p className="text-sm text-slate-500">
                {t("TeacherDashboard.recentExamsSubtitle")}
              </p>
            </div>
            <Link
              href="/professor/lists"
              className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
            >
              {t("Common.viewAll")}
            </Link>
          </div>

          <table className="app-table">
            <thead>
              <tr>
                <th className="px-4 py-3">{t("TeacherDashboard.columns.exam")}</th>
                <th className="px-4 py-3">{t("TeacherDashboard.columns.status")}</th>
                <th className="px-4 py-3">{t("TeacherDashboard.columns.questions")}</th>
                <th className="px-4 py-3">{t("TeacherDashboard.columns.assignments")}</th>
                <th className="px-4 py-3">{t("TeacherDashboard.columns.dueDate")}</th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    {t("TeacherDashboard.noExams")}
                  </td>
                </tr>
              ) : (
                exams.slice(0, 5).map((exam) => (
                  <tr key={exam.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{exam.title}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span
                        className={
                          exam.publishedAt
                            ? "app-badge app-badge-success"
                            : "app-badge"
                        }
                      >
                        {exam.publishedAt ? t("Status.published") : t("Status.draft")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{exam._count.questions}</td>
                    <td className="px-4 py-3 text-slate-600">{exam._count.assignments}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(exam.dueAt, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <section className="app-card overflow-hidden">
            <div className="app-card-header flex items-center justify-between px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {t("TeacherDashboard.gradingQueue")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("TeacherDashboard.gradingQueueSubtitle")}
                </p>
              </div>
              <Link
                href="/professor/review"
                className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
              >
                {t("Common.open")}
              </Link>
            </div>

            <div className="app-striped-list divide-y divide-[var(--border)]">
              {attempts.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">
                  {t("TeacherDashboard.noAttempts")}
                </p>
              ) : (
                attempts.slice(0, 5).map((attempt) => (
                  <article key={attempt.id} className="space-y-1 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {attempt.assignment.student.name}
                        </p>
                        <p className="text-slate-600">{attempt.assignment.list.title}</p>
                      </div>
                      <span className={`${getAttemptBadgeClass(attempt.status)} capitalize`}>
                        {getAttemptStatusLabel(attempt.status, t)}
                      </span>
                    </div>
                    <p className="text-slate-500">
                      {t("TeacherDashboard.submittedAt", {
                        date: formatDateTime(attempt.submittedAt, locale),
                      })}
                    </p>
                    <p className="text-slate-500">
                      {t("TeacherDashboard.scoreLabel", {
                        score:
                          attempt.totalScore === null
                            ? t("Status.scorePending")
                            : formatScore(attempt.totalScore, locale),
                      })}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="app-card p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {t("TeacherDashboard.gradingSummary")}
            </h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <dt>{t("TeacherDashboard.needsGrading")}</dt>
                <dd className="font-medium text-slate-900">{pendingAttempts.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{t("TeacherDashboard.reviewedAttempts")}</dt>
                <dd className="font-medium text-slate-900">{gradedAttempts.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>{t("TeacherDashboard.totalAttempts")}</dt>
                <dd className="font-medium text-slate-900">{attempts.length}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>
    </div>
  );
}
