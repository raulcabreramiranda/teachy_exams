import Link from "next/link";
import { AttemptStatus, Role } from "@prisma/client";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";
import { getTeacherDashboardData } from "@/services/exercise-list-service";
import { getStudentsForManagement } from "@/services/student-service";

function formatAttemptStatus(status: AttemptStatus) {
  return status.toLowerCase().replaceAll("_", " ");
}

function getAttemptBadgeClass(status: AttemptStatus) {
  return status === AttemptStatus.GRADED
    ? "app-badge app-badge-success"
    : "app-badge app-badge-warning";
}

export default async function TeacherPage() {
  const session = await requirePageSession([Role.TEACHER]);
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
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track the current exam volume, pending grading, and recent activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/professor/lists/new"
            className="app-button-secondary px-3 py-2"
          >
            New exam
          </Link>
          <Link
            href="/professor/review"
            className="app-button-secondary px-3 py-2"
          >
            Open grading
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-card p-4">
          <p className="text-sm text-slate-500">Total exams</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{exams.length}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">Published exams</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{publishedExams}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">Active students</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{students.length}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">Pending grading</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{pendingAttempts.length}</p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="app-card overflow-hidden">
          <div className="app-card-header flex items-center justify-between px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent exams</h3>
              <p className="text-sm text-slate-500">Latest created exams and assignment volume.</p>
            </div>
            <Link href="/professor/lists" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]">
              View all
            </Link>
          </div>

          <table className="app-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Questions</th>
                <th className="px-4 py-3">Assignments</th>
                <th className="px-4 py-3">Due date</th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No exams created yet.
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
                        {exam.publishedAt ? "✅ Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{exam._count.questions}</td>
                    <td className="px-4 py-3 text-slate-600">{exam._count.assignments}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(exam.dueAt)}</td>
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
                <h3 className="text-sm font-semibold text-slate-900">Grading queue</h3>
                <p className="text-sm text-slate-500">Latest submitted and reviewed attempts.</p>
              </div>
              <Link
                href="/professor/review"
                className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
              >
                Open
              </Link>
            </div>

            <div className="app-striped-list divide-y divide-[var(--border)]">
              {attempts.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">No submitted attempts yet.</p>
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
                        {formatAttemptStatus(attempt.status)}
                      </span>
                    </div>
                    <p className="text-slate-500">
                      Submitted {formatDateTime(attempt.submittedAt)}
                    </p>
                    <p className="text-slate-500">Score: {formatScore(attempt.totalScore)}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="app-card p-4">
            <h3 className="text-sm font-semibold text-slate-900">Grading summary</h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <dt>Needs grading</dt>
                <dd className="font-medium text-slate-900">{pendingAttempts.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Reviewed attempts</dt>
                <dd className="font-medium text-slate-900">{gradedAttempts.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Total attempts</dt>
                <dd className="font-medium text-slate-900">{attempts.length}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>
    </div>
  );
}
