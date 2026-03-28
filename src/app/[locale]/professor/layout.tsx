import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageSession } from "@/lib/auth";
import { getTeacherReviewSummary } from "@/services/attempt-service";

export default async function TeacherLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}>) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const session = await requirePageSession([Role.TEACHER], locale);
  const reviewSummary = await getTeacherReviewSummary(session.userId);
  const hasPendingReview = reviewSummary.pendingAttemptCount > 0;

  return (
    <DashboardShell
      title={t("TeacherLayout.title")}
      subtitle={t("TeacherLayout.subtitle")}
      navItems={[
        { href: "/professor", label: t("Nav.teacher.dashboard"), exact: true },
        { href: "/professor/lists", label: t("Nav.teacher.exams") },
        { href: "/professor/students", label: t("Nav.teacher.students") },
        {
          href: "/professor/review",
          label: t("Nav.teacher.review"),
          badgeCount: hasPendingReview ? reviewSummary.pendingExamCount : undefined,
        },
        { href: "/professor/attempts", label: t("Nav.teacher.attempts") },
      ]}
      statusNotice={{
        href: "/professor/review",
        compactLabel: hasPendingReview
          ? t("TeacherLayout.reviewNoticeCompact", {
              count: reviewSummary.pendingExamCount,
            })
          : t("TeacherLayout.queueClearCompact"),
        title: hasPendingReview
          ? t("TeacherLayout.reviewNoticeTitle", {
              count: reviewSummary.pendingExamCount,
            })
          : t("TeacherLayout.queueClearTitle"),
        description: hasPendingReview
          ? t("TeacherLayout.reviewNoticeDescription", {
              count: reviewSummary.pendingAttemptCount,
            })
          : t("TeacherLayout.queueClearDescription"),
        tone: hasPendingReview ? "warning" : "success",
      }}
    >
      {children}
    </DashboardShell>
  );
}
