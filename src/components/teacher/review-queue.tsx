import Link from "next/link";
import type { AttemptReviewItem } from "@/components/teacher/attempt-review";

type ReviewQueueProps = {
  attempts: AttemptReviewItem[];
};

type ReviewExamGroup = {
  listId: string;
  title: string;
  attempts: AttemptReviewItem[];
};

function getAttemptSortTime(attempt: AttemptReviewItem) {
  return new Date(attempt.submittedAt ?? attempt.startedAt).getTime();
}

function getPendingExamGroups(attempts: AttemptReviewItem[]) {
  const groups = new Map<string, ReviewExamGroup>();
  const sortedAttempts = [...attempts]
    .filter((attempt) => attempt.status === "SUBMITTED")
    .sort((left, right) => getAttemptSortTime(left) - getAttemptSortTime(right));

  for (const attempt of sortedAttempts) {
    const listId = attempt.assignment.list.id;
    const existingGroup = groups.get(listId);

    if (existingGroup) {
      existingGroup.attempts.push(attempt);
      continue;
    }

    groups.set(listId, {
      listId,
      title: attempt.assignment.list.title,
      attempts: [attempt],
    });
  }

  return [...groups.values()].sort((left, right) => {
    if (right.attempts.length !== left.attempts.length) {
      return right.attempts.length - left.attempts.length;
    }

    return left.title.localeCompare(right.title);
  });
}

export function ReviewQueue({ attempts }: ReviewQueueProps) {
  const examGroups = getPendingExamGroups(attempts);

  return (
    <section className="app-card overflow-hidden">
      <div className="app-card-header px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Review queue</h3>
        <p className="mt-1 text-xs text-slate-500">
          Open an exam to review its submitted attempts on a dedicated page.
        </p>
      </div>

      {examGroups.length === 0 ? (
        <div className="p-4">
          <div className="app-empty-state p-6 text-center text-sm text-slate-600">
            All submitted attempts have been reviewed.
          </div>
        </div>
      ) : (
        <div className="app-striped-list divide-y divide-[var(--border)]">
          {examGroups.map((group) => (
            <Link
              key={group.listId}
              href={`/professor/review/${group.listId}`}
              className="block px-4 py-3 transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {group.attempts.length} pending{" "}
                    {group.attempts.length === 1 ? "attempt" : "attempts"}
                  </p>
                </div>
                <span className="app-badge app-badge-warning">
                  {group.attempts.length}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
