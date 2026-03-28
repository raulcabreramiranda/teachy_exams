import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageSession } from "@/lib/auth";
import { getTeacherReviewSummary } from "@/services/attempt-service";

export default async function TeacherLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePageSession([Role.TEACHER]);
  const reviewSummary = await getTeacherReviewSummary(session.userId);
  const hasPendingReview = reviewSummary.pendingAttemptCount > 0;

  return (
    <DashboardShell
      title="Teacher"
      subtitle="Manage exams, students, and grading."
      navItems={[
        { href: "/professor", label: "🏠 Dashboard", exact: true },
        { href: "/professor/lists", label: "🧪 Exams" },
        { href: "/professor/students", label: "👥 Students" },
        {
          href: "/professor/review",
          label: "📝 Review",
          badgeCount: hasPendingReview ? reviewSummary.pendingExamCount : undefined,
        },
        { href: "/professor/attempts", label: "✅ Attempts" },
      ]}
      statusNotice={{
        href: "/professor/review",
        compactLabel: hasPendingReview
          ? `📝 ${reviewSummary.pendingExamCount} exam${reviewSummary.pendingExamCount === 1 ? "" : "s"} to review`
          : "✅ Queue clear",
        title: hasPendingReview
          ? `${reviewSummary.pendingExamCount} exam${reviewSummary.pendingExamCount === 1 ? "" : "s"} need review`
          : "No exams waiting for review",
        description: hasPendingReview
          ? `${reviewSummary.pendingAttemptCount} submitted attempt${reviewSummary.pendingAttemptCount === 1 ? "" : "s"} are waiting in the review queue.`
          : "All submitted attempts have already been reviewed.",
        tone: hasPendingReview ? "warning" : "success",
      }}
    >
      {children}
    </DashboardShell>
  );
}
