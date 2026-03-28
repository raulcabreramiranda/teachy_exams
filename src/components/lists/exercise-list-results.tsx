import { formatDateTime, formatScore } from "@/lib/format";

export type ExerciseListResultStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADED";

export type ExerciseListResultItem = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  attemptId: string | null;
  status: ExerciseListResultStatus;
  startedAt: string | null;
  submittedAt: string | null;
  totalScore: number | null;
};

type ExerciseListResultsProps = {
  results: ExerciseListResultItem[];
  totalPoints: number;
};

function getStatusMeta(status: ExerciseListResultStatus) {
  switch (status) {
    case "IN_PROGRESS":
      return {
        label: "✍ In progress",
        className: "app-badge app-badge-warning",
        barClassName: "bg-amber-400",
      };
    case "SUBMITTED":
      return {
        label: "📝 Pending review",
        className: "app-badge app-badge-info",
        barClassName: "bg-sky-500",
      };
    case "GRADED":
      return {
        label: "✅ Graded",
        className: "app-badge app-badge-success",
        barClassName: "bg-emerald-500",
      };
    case "PENDING":
    default:
      return {
        label: "⏳ Not started",
        className: "app-badge",
        barClassName: "bg-slate-300",
      };
  }
}

function formatPercentage(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function getAttemptDate(value: string | null, emptyLabel: string) {
  return value ? formatDateTime(value) : emptyLabel;
}

export function ExerciseListResults({
  results,
  totalPoints,
}: ExerciseListResultsProps) {
  const counts: Record<ExerciseListResultStatus, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    SUBMITTED: 0,
    GRADED: 0,
  };

  for (const result of results) {
    counts[result.status] += 1;
  }

  const assignedCount = results.length;
  const startedCount = assignedCount - counts.PENDING;
  const gradedResults = results.filter(
    (result) => result.status === "GRADED" && result.totalScore !== null,
  );
  const averageScore =
    gradedResults.length > 0
      ? gradedResults.reduce((sum, result) => sum + (result.totalScore ?? 0), 0) /
        gradedResults.length
      : null;
  const highestScore =
    gradedResults.length > 0
      ? Math.max(...gradedResults.map((result) => result.totalScore ?? 0))
      : null;
  const reviewedRate =
    assignedCount > 0 ? (counts.GRADED / assignedCount) * 100 : 0;

  const summaryCards = [
    {
      label: "Assigned students",
      value: String(assignedCount),
      helper: assignedCount === 1 ? "1 student linked to this exam" : `${assignedCount} students linked to this exam`,
    },
    {
      label: "Started attempts",
      value: String(startedCount),
      helper: `${formatPercentage(
        assignedCount > 0 ? (startedCount / assignedCount) * 100 : 0,
      )} of assigned students started`,
    },
    {
      label: "Pending review",
      value: String(counts.SUBMITTED),
      helper:
        counts.SUBMITTED === 0
          ? "No attempts waiting for teacher review"
          : `${counts.SUBMITTED} attempt${counts.SUBMITTED === 1 ? "" : "s"} waiting for review`,
    },
    {
      label: "Graded attempts",
      value: String(counts.GRADED),
      helper: `${formatPercentage(reviewedRate)} reviewed`,
    },
    {
      label: "Average score",
      value:
        averageScore === null
          ? "Pending"
          : `${formatScore(averageScore)} / ${formatScore(totalPoints)}`,
      helper:
        highestScore === null
          ? "No graded attempts yet"
          : `Highest score: ${formatScore(highestScore)} / ${formatScore(totalPoints)}`,
    },
  ];

  const breakdownItems: Array<{
    status: ExerciseListResultStatus;
    label: string;
    count: number;
  }> = [
    { status: "PENDING", label: "Not started", count: counts.PENDING },
    { status: "IN_PROGRESS", label: "In progress", count: counts.IN_PROGRESS },
    { status: "SUBMITTED", label: "Pending review", count: counts.SUBMITTED },
    { status: "GRADED", label: "Graded", count: counts.GRADED },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Results</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review participation, grading progress, and final scores for this exam.
          </p>
        </div>

        <div className="app-badge app-badge-info">
          {assignedCount} {assignedCount === 1 ? "student" : "students"}
        </div>
      </div>

      {assignedCount === 0 ? (
        <div className="app-empty-state mt-6 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No assigned students yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Assign this exam first to see attempt totals and results here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <div key={card.label} className="app-panel px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{card.helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
            <section className="app-panel px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Attempt status breakdown
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    A quick view of where each student currently stands.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {breakdownItems.map((item) => {
                  const percentage =
                    assignedCount > 0 ? (item.count / assignedCount) * 100 : 0;
                  const statusMeta = getStatusMeta(item.status);

                  return (
                    <div key={item.status} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="text-slate-500">
                          {item.count} of {assignedCount}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${statusMeta.barClassName}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="app-panel px-4 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Score snapshot</h3>
              <p className="mt-1 text-xs text-slate-500">
                Average and best performance across graded attempts.
              </p>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">Average final score</dt>
                  <dd className="font-semibold text-slate-900">
                    {averageScore === null
                      ? "Pending"
                      : `${formatScore(averageScore)} / ${formatScore(totalPoints)}`}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">Highest score</dt>
                  <dd className="font-semibold text-slate-900">
                    {highestScore === null
                      ? "Pending"
                      : `${formatScore(highestScore)} / ${formatScore(totalPoints)}`}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">Reviewed attempts</dt>
                  <dd className="font-semibold text-slate-900">
                    {counts.GRADED} / {assignedCount}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600">Awaiting teacher review</dt>
                  <dd className="font-semibold text-slate-900">
                    {counts.SUBMITTED}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="mt-6 app-card overflow-x-auto rounded-xl">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Submitted</th>
                  <th>Final score</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => {
                  const statusMeta = getStatusMeta(result.status);

                  return (
                    <tr key={result.studentId}>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {result.studentName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{result.studentEmail}</td>
                      <td className="px-4 py-3">
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {getAttemptDate(result.startedAt, "Not started")}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {getAttemptDate(result.submittedAt, "Not submitted")}
                      </td>
                      <td className="px-4 py-3">
                        {result.totalScore === null ? (
                          <span className="text-slate-500">Pending</span>
                        ) : (
                          <span className="font-medium text-slate-800">
                            {formatScore(result.totalScore)} / {formatScore(totalPoints)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
