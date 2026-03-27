import Link from "next/link";
import { AttemptStatus, Role } from "@prisma/client";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/services/attempt-service";

export default async function StudentDashboardPage() {
  const session = await requirePageSession([Role.STUDENT]);
  const assignments = await getStudentDashboardData(session.userId);
  const attempts = assignments
    .map((assignment) => assignment.attempts[0] ?? null)
    .filter((attempt): attempt is NonNullable<typeof attempt> => attempt !== null);

  const notStartedCount = assignments.filter((assignment) => assignment.attempts.length === 0).length;
  const inProgressCount = attempts.filter((attempt) => attempt.status === AttemptStatus.IN_PROGRESS).length;
  const resultCount = attempts.filter(
    (attempt) =>
      attempt.status === AttemptStatus.SUBMITTED ||
      attempt.status === AttemptStatus.GRADED,
  ).length;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review assigned exams, continue open attempts, and revisit your results.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Assigned exams</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{assignments.length}</p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Ready to start</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{notStartedCount}</p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">In progress</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{inProgressCount}</p>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Results available</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{resultCount}</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Assigned exams</h3>
          <p className="text-sm text-slate-500">
            Start a new exam, continue an in-progress one, or review your result.
          </p>
        </div>

        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Exam</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Time limit</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  No exams available.
                </td>
              </tr>
            ) : (
              assignments.map((assignment) => {
                const attempt = assignment.attempts[0] ?? null;
                const actionHref =
                  attempt && attempt.status !== AttemptStatus.IN_PROGRESS
                    ? `/aluno/attempts/${attempt.id}/result`
                    : `/aluno/assignments/${assignment.id}`;

                return (
                  <tr key={assignment.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{assignment.list.title}</p>
                      {assignment.list.description ? (
                        <p className="mt-1 max-w-xl text-sm text-slate-500">
                          {assignment.list.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {attempt ? attempt.status.replaceAll("_", " ") : "Not started"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(assignment.assignedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(assignment.list.dueAt)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {assignment.list.timeLimitMinutes
                        ? `${assignment.list.timeLimitMinutes} min`
                        : "No limit"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatScore(attempt?.totalScore)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={actionHref}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                      >
                        {attempt
                          ? attempt.status === AttemptStatus.IN_PROGRESS
                            ? "Continue"
                            : "Result"
                          : "Start"}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
