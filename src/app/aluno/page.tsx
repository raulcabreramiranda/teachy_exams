import Link from "next/link";
import { Role } from "@prisma/client";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/services/attempt-service";

export default async function StudentDashboardPage() {
  const session = await requirePageSession([Role.STUDENT]);
  const assignments = await getStudentDashboardData(session.userId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Assigned exercise lists</h2>
        <p className="mt-1 text-sm text-slate-600">
          Start a new attempt, continue an in-progress one, or review your submitted result.
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          No assignments available.
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const attempt = assignment.attempts[0] ?? null;
            const actionHref =
              attempt && attempt.status !== "IN_PROGRESS"
                ? `/aluno/attempts/${attempt.id}/result`
                : `/aluno/assignments/${assignment.id}`;

            return (
              <article
                key={assignment.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.45)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                      {attempt ? attempt.status.replaceAll("_", " ") : "Not started"}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">{assignment.list.title}</h3>
                    {assignment.list.description ? (
                      <p className="mt-2 max-w-3xl text-sm text-slate-600">
                        {assignment.list.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    <p>Assigned: {formatDateTime(assignment.assignedAt)}</p>
                    <p>Due date: {formatDateTime(assignment.list.dueAt)}</p>
                    <p>
                      Time limit:{" "}
                      {assignment.list.timeLimitMinutes
                        ? `${assignment.list.timeLimitMinutes} minutes`
                        : "No time limit"}
                    </p>
                    <p>Score: {formatScore(attempt?.totalScore)}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={actionHref}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                  >
                    {attempt
                      ? attempt.status === "IN_PROGRESS"
                        ? "Continue attempt"
                        : "View result"
                      : "Open assignment"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
