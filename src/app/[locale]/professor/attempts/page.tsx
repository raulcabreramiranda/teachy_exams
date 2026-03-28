import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

type TeacherAttemptsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    student?: string | string[];
    exam?: string | string[];
  }>;
};

export default async function TeacherAttemptsPage({
  params,
  searchParams,
}: TeacherAttemptsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const session = await requirePageSession([Role.TEACHER], locale);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const studentFilter = Array.isArray(resolvedSearchParams?.student)
    ? resolvedSearchParams.student[0]
    : resolvedSearchParams?.student ?? "";
  const examFilter = Array.isArray(resolvedSearchParams?.exam)
    ? resolvedSearchParams.exam[0]
    : resolvedSearchParams?.exam ?? "";
  const normalizedStudentFilter = studentFilter.trim().toLowerCase();
  const normalizedExamFilter = examFilter.trim().toLowerCase();
  const attempts = await getTeacherAttemptsForReview(session.userId);
  const allReviewedAttempts = attempts.filter((attempt) => attempt.status === "GRADED");
  const studentSuggestions = [
    ...new Set(allReviewedAttempts.map((attempt) => attempt.assignment.student.name)),
  ].sort((left, right) => left.localeCompare(right));
  const examSuggestions = [
    ...new Set(allReviewedAttempts.map((attempt) => attempt.assignment.list.title)),
  ].sort((left, right) => left.localeCompare(right));
  const reviewedAttempts = allReviewedAttempts.filter((attempt) => {
    const matchesStudent =
      normalizedStudentFilter.length === 0 ||
      `${attempt.assignment.student.name} ${attempt.assignment.student.email}`
        .toLowerCase()
        .includes(normalizedStudentFilter);
    const matchesExam =
      normalizedExamFilter.length === 0 ||
      attempt.assignment.list.title.toLowerCase().includes(normalizedExamFilter);

    return matchesStudent && matchesExam;
  });

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{t("TeacherAttempts.title")}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("TeacherAttempts.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/professor" className="app-button-secondary px-3 py-2">
              {t("Common.goToDashboard")}
            </Link>
            <Link href="/professor/review" className="app-button-secondary px-3 py-2">
              {t("Common.goToReviewQueue")}
            </Link>
          </div>
        </div>
      </div>

      <section className="app-card overflow-hidden">
        <div className="app-card-header space-y-4 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t("TeacherAttempts.cardTitle")}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {t("TeacherAttempts.cardSubtitle")}
            </p>
          </div>

          <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input
              type="text"
              name="student"
              list="reviewed-attempt-students"
              defaultValue={studentFilter}
              placeholder={t("TeacherAttempts.studentPlaceholder")}
              className="app-input"
            />
            <input
              type="text"
              name="exam"
              list="reviewed-attempt-exams"
              defaultValue={examFilter}
              placeholder={t("TeacherAttempts.examPlaceholder")}
              className="app-input"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="app-button-primary px-3 py-2">
                {t("Common.apply")}
              </button>
              <Link href="/professor/attempts" className="app-button-secondary px-3 py-2">
                {t("Common.clear")}
              </Link>
            </div>
          </form>

          <datalist id="reviewed-attempt-students">
            {studentSuggestions.map((studentName) => (
              <option key={studentName} value={studentName} />
            ))}
          </datalist>

          <datalist id="reviewed-attempt-exams">
            {examSuggestions.map((examTitle) => (
              <option key={examTitle} value={examTitle} />
            ))}
          </datalist>
        </div>

        <div className="overflow-x-auto">
          <table className="app-table">
            <thead>
              <tr>
                <th className="px-4 py-3">{t("TeacherAttempts.columns.student")}</th>
                <th className="px-4 py-3">{t("TeacherAttempts.columns.exam")}</th>
                <th className="px-4 py-3">{t("TeacherAttempts.columns.reviewed")}</th>
                <th className="px-4 py-3">{t("TeacherAttempts.columns.score")}</th>
                <th className="px-4 py-3 text-right">{t("TeacherAttempts.columns.open")}</th>
              </tr>
            </thead>
            <tbody>
              {reviewedAttempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    {allReviewedAttempts.length === 0
                      ? t("TeacherAttempts.noAttempts")
                      : t("TeacherAttempts.noMatches")}
                  </td>
                </tr>
              ) : (
                reviewedAttempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-900">
                        {attempt.assignment.student.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {attempt.assignment.student.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">
                      {attempt.assignment.list.title}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">
                      {formatDateTime(attempt.submittedAt, locale)}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">
                      {attempt.totalScore === null
                        ? t("Status.scorePending")
                        : formatScore(attempt.totalScore, locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/professor/attempts/${attempt.id}`}
                        className="app-button-secondary px-3 py-2"
                      >
                        {t("Common.open")}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
