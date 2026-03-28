import { AttemptStatus, Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDateTime, formatScore } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/services/attempt-service";

type StudentDashboardAssignment = Awaited<ReturnType<typeof getStudentDashboardData>>[number];
type StudentDashboardAttempt = StudentDashboardAssignment["attempts"][number];
type StudentDashboardFilter =
  | "ALL"
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADED";

type StudentDashboardPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    status?: string | string[];
  }>;
};

function getLatestAttempt(attempts: StudentDashboardAssignment["attempts"]) {
  return [...attempts].sort((left, right) => {
    const leftTime = new Date(left.submittedAt ?? left.startedAt).getTime();
    const rightTime = new Date(right.submittedAt ?? right.startedAt).getTime();

    return rightTime - leftTime;
  })[0] ?? null;
}

function getAssignmentFilterStatus(
  assignment: StudentDashboardAssignment,
  attempt: StudentDashboardAttempt | null,
) {
  if (assignment.attempts.length === 0 || !attempt) {
    return "PENDING" as const;
  }

  return attempt.status;
}

function getStatusBadge(status: Exclude<StudentDashboardFilter, "ALL">) {
  if (status === AttemptStatus.GRADED) {
    return "app-badge app-badge-success";
  }

  if (status === AttemptStatus.SUBMITTED) {
    return "app-badge app-badge-info";
  }

  if (status === AttemptStatus.IN_PROGRESS) {
    return "app-badge app-badge-warning";
  }

  return "app-badge";
}

function getActiveFilter(rawStatus: string | undefined): StudentDashboardFilter {
  if (
    rawStatus === "PENDING" ||
    rawStatus === "IN_PROGRESS" ||
    rawStatus === "SUBMITTED" ||
    rawStatus === "GRADED"
  ) {
    return rawStatus;
  }

  return "ALL";
}

function getFilterHref(filter: StudentDashboardFilter) {
  return filter === "ALL" ? "/aluno" : `/aluno?status=${filter}`;
}

function getStatusLabel(
  status: Exclude<StudentDashboardFilter, "ALL">,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (status === "PENDING") {
    return t("Status.pending");
  }

  if (status === AttemptStatus.IN_PROGRESS) {
    return t("Status.inProgress");
  }

  if (status === AttemptStatus.SUBMITTED) {
    return t("Status.pendingReview");
  }

  return t("Status.graded");
}

function getFilterOptions(
  counts: Record<Exclude<StudentDashboardFilter, "ALL">, number>,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  return [
    {
      value: "ALL" as const,
      label: t("StudentDashboard.all"),
      count: Object.values(counts).reduce((total, current) => total + current, 0),
    },
    {
      value: "PENDING" as const,
      label: t("Status.pending"),
      count: counts.PENDING,
    },
    {
      value: "IN_PROGRESS" as const,
      label: t("Status.inProgress"),
      count: counts.IN_PROGRESS,
    },
    {
      value: "SUBMITTED" as const,
      label: t("Status.pendingReview"),
      count: counts.SUBMITTED,
    },
    {
      value: "GRADED" as const,
      label: t("Status.graded"),
      count: counts.GRADED,
    },
  ];
}

export default async function StudentDashboardPage({
  params,
  searchParams,
}: StudentDashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const session = await requirePageSession([Role.STUDENT], locale);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawStatus = Array.isArray(resolvedSearchParams?.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams?.status;
  const activeFilter = getActiveFilter(rawStatus);
  const assignments = await getStudentDashboardData(session.userId);
  const assignmentItems = assignments.map((assignment) => {
    const attempt = getLatestAttempt(assignment.attempts);
    const status = getAssignmentFilterStatus(assignment, attempt);

    return {
      assignment,
      attempt,
      status,
    };
  });
  const statusCounts = assignmentItems.reduce(
    (totals, item) => ({
      ...totals,
      [item.status]: totals[item.status] + 1,
    }),
    {
      PENDING: 0,
      IN_PROGRESS: 0,
      SUBMITTED: 0,
      GRADED: 0,
    } satisfies Record<Exclude<StudentDashboardFilter, "ALL">, number>,
  );
  const filterOptions = getFilterOptions(statusCounts, t);
  const filteredAssignments =
    activeFilter === "ALL"
      ? assignmentItems
      : assignmentItems.filter((item) => item.status === activeFilter);

  const notStartedCount = statusCounts.PENDING;
  const inProgressCount = statusCounts.IN_PROGRESS;
  const resultCount = statusCounts.SUBMITTED + statusCounts.GRADED;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="app-card p-4">
          <p className="text-sm text-slate-500">{t("StudentDashboard.assignedExams")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{assignments.length}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">{t("StudentDashboard.readyToStart")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{notStartedCount}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">{t("Status.inProgress")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{inProgressCount}</p>
        </article>

        <article className="app-card p-4">
          <p className="text-sm text-slate-500">{t("StudentDashboard.resultsAvailable")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{resultCount}</p>
        </article>
      </section>

      <section className="app-card overflow-hidden">
        <div className="app-card-header space-y-4 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {t("StudentDashboard.cardTitle")}
            </h3>
            <p className="text-sm text-slate-500">
              {t("StudentDashboard.cardSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => {
                const isActive = activeFilter === filter.value;

                return (
                  <Link
                    key={filter.value}
                    href={getFilterHref(filter.value)}
                    className={
                      isActive
                        ? "app-button-primary px-3 py-2"
                        : "app-button-secondary px-3 py-2"
                    }
                    aria-current={isActive ? "page" : undefined}
                  >
                    {filter.label} ({filter.count})
                  </Link>
                );
              })}
            </div>

            <p className="text-sm text-slate-500">
              {t("StudentDashboard.showing", {
                filtered: filteredAssignments.length,
                total: assignmentItems.length,
              })}
            </p>
          </div>
        </div>

        <table className="app-table">
          <thead>
            <tr>
              <th className="px-4 py-3">{t("StudentDashboard.columns.exam")}</th>
              <th className="px-4 py-3">{t("StudentDashboard.columns.status")}</th>
              <th className="px-4 py-3">{t("StudentDashboard.columns.assigned")}</th>
              <th className="px-4 py-3">{t("StudentDashboard.columns.dueDate")}</th>
              <th className="px-4 py-3">{t("StudentDashboard.columns.timeLimit")}</th>
              <th className="px-4 py-3">{t("StudentDashboard.columns.score")}</th>
              <th className="px-4 py-3 text-right">{t("StudentDashboard.columns.action")}</th>
            </tr>
          </thead>
          <tbody>
            {assignmentItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t("StudentDashboard.noExams")}
                </td>
              </tr>
            ) : filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  {t("StudentDashboard.noMatches")}
                </td>
              </tr>
            ) : (
              filteredAssignments.map(({ assignment, attempt, status }) => {
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
                      <span className={getStatusBadge(status)}>
                        {getStatusLabel(status, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(assignment.assignedAt, locale)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(assignment.list.dueAt, locale)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {assignment.list.timeLimitMinutes
                        ? `${assignment.list.timeLimitMinutes} min`
                        : t("AssignmentWorkspace.noTimeLimit")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {attempt?.totalScore === null || attempt?.totalScore === undefined
                        ? t("StudentDashboard.scorePending")
                        : formatScore(attempt.totalScore, locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={actionHref}
                        className="app-button-secondary px-3 py-2"
                      >
                        {attempt
                          ? attempt.status === AttemptStatus.IN_PROGRESS
                            ? t("StudentDashboard.continueAttempt")
                            : t("StudentDashboard.viewResult")
                          : t("StudentDashboard.startAttempt")}
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
