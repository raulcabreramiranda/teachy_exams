import Link from "next/link";
import { Role } from "@prisma/client";
import { toAttemptReviewItem } from "@/components/teacher/attempt-review-data";
import { ReviewQueue } from "@/components/teacher/review-queue";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

export default async function TeacherReviewPage() {
  const session = await requirePageSession([Role.TEACHER]);
  const attempts = await getTeacherAttemptsForReview(session.userId);
  const submittedAttempts = attempts.filter((attempt) => attempt.status === "SUBMITTED");

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Review Queue</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose an exam, review the submitted attempts, and move through each student in order.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/professor" className="app-button-secondary px-3 py-2">
              Go to dashboard
            </Link>
            <Link href="/professor/attempts" className="app-button-secondary px-3 py-2">
              Go to reviewed attempts
            </Link>
          </div>
        </div>
      </div>

      <ReviewQueue
        attempts={submittedAttempts.map(toAttemptReviewItem)}
      />
    </div>
  );
}
