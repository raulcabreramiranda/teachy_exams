import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { AttemptReview } from "@/components/teacher/attempt-review";
import { toAttemptReviewItem } from "@/components/teacher/attempt-review-data";
import { PageNavigation } from "@/components/layout/page-navigation";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

type TeacherAttemptPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeacherAttemptPage({ params }: TeacherAttemptPageProps) {
  const session = await requirePageSession([Role.TEACHER]);
  const { id } = await params;
  const attempts = await getTeacherAttemptsForReview(session.userId);
  const attempt = attempts.find((item) => item.id === id && item.status === "GRADED");

  if (!attempt) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <h2 className="text-2xl font-semibold">Reviewed Attempt</h2>
        <p className="mt-1 text-sm text-slate-600">
          Inspect the graded answers on a dedicated page.
        </p>
        <PageNavigation
          backHref="/professor/attempts"
          backLabel="Back"
          links={[{ href: "/professor/attempts", label: "Go to reviewed attempts" }]}
          className="mt-4"
        />
      </div>

      <AttemptReview
        attempts={[toAttemptReviewItem(attempt)]}
        mode="history"
        attemptsTitle="Reviewed attempt"
        attemptsDescription="This reviewed attempt is open in its own page."
        initialSelectedAttemptId={attempt.id}
      />
    </div>
  );
}
