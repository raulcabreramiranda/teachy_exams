import Link from "next/link";
import { Role } from "@prisma/client";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

type TeacherAttemptsPageProps = {
  searchParams?: Promise<{
    student?: string | string[];
    exam?: string | string[];
  }>;
};

export default async function TeacherAttemptsPage({
  searchParams,
}: TeacherAttemptsPageProps) {
  const session = await requirePageSession([Role.TEACHER]);
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
  const studentSuggestions = [...new Set(
    allReviewedAttempts.map((attempt) => attempt.assignment.student.name),
  )].sort((left, right) => left.localeCompare(right));
  const examSuggestions = [...new Set(
    allReviewedAttempts.map((attempt) => attempt.assignment.list.title),
  )].sort((left, right) => left.localeCompare(right));
  const reviewedAttempts = allReviewedAttempts
    .filter((attempt) => {
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
            <h2 className="text-2xl font-semibold">Reviewed Attempts</h2>
            <p className="mt-1 text-sm text-slate-600">
              Open a reviewed attempt on its own page to inspect answers or reopen it.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/professor" className="app-button-secondary px-3 py-2">
              Go to dashboard
            </Link>
            <Link href="/professor/review" className="app-button-secondary px-3 py-2">
              Go to review queue
            </Link>
          </div>
        </div>
      </div>

      <section className="app-card overflow-hidden">
        <div className="app-card-header space-y-4 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Reviewed attempts</h3>
            <p className="mt-1 text-xs text-slate-500">
              Filter by student or exam, then open the full review page.
            </p>
          </div>

          <form action="/professor/attempts" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input
              type="text"
              name="student"
              list="reviewed-attempt-students"
              defaultValue={studentFilter}
              placeholder="Filter by student name or email"
              className="app-input"
            />
            <input
              type="text"
              name="exam"
              list="reviewed-attempt-exams"
              defaultValue={examFilter}
              placeholder="Filter by exam title"
              className="app-input"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="app-button-primary px-3 py-2">
                Apply
              </button>
              <Link href="/professor/attempts" className="app-button-secondary px-3 py-2">
                Clear
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
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Reviewed</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {reviewedAttempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    {allReviewedAttempts.length === 0
                      ? "No reviewed attempts yet."
                      : "No reviewed attempts match the current filters."}
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
                      {formatDateTime(attempt.submittedAt)}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">
                      {formatScore(attempt.totalScore)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/professor/attempts/${attempt.id}`}
                        className="app-button-secondary px-3 py-2"
                      >
                        Open
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
