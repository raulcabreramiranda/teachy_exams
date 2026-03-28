import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { PageNavigation } from "@/components/layout/page-navigation";
import { AttemptReview } from "@/components/teacher/attempt-review";
import { toAttemptReviewItem } from "@/components/teacher/attempt-review-data";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

type TeacherReviewExamPageProps = {
  params: Promise<{
    listId: string;
  }>;
};

export default async function TeacherReviewExamPage({
  params,
}: TeacherReviewExamPageProps) {
  const session = await requirePageSession([Role.TEACHER]);
  const { listId } = await params;
  const attempts = await getTeacherAttemptsForReview(session.userId);
  const submittedAttempts = attempts.filter(
    (attempt) => attempt.status === "SUBMITTED" && attempt.assignment.list.id === listId,
  );

  if (submittedAttempts.length === 0) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <h2 className="text-2xl font-semibold">{submittedAttempts[0].assignment.list.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review the submitted attempts for this exam on a dedicated page.
        </p>
        <PageNavigation
          backHref="/professor/review"
          backLabel="Back"
          links={[{ href: "/professor/review", label: "Go to review queue" }]}
          className="mt-4"
        />
      </div>

      <AttemptReview
        attempts={submittedAttempts.map(toAttemptReviewItem)}
        mode="review"
        emptyMessage="This exam has no remaining attempts to review."
        attemptsTitle="Student attempts"
        attemptsDescription="Select a submitted attempt and save grading to continue."
        initialSelectedAttemptId={submittedAttempts[0].id}
        hideAttemptList
      />
    </div>
  );
}
