import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageSession } from "@/lib/auth";

export default async function TeacherLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requirePageSession([Role.TEACHER]);

  return (
    <DashboardShell
      title="Teacher"
      subtitle="Manage exams, students, and grading."
      navItems={[
        { href: "/professor", label: "Dashboard", exact: true },
        { href: "/professor/lists", label: "Exams" },
        { href: "/professor/students", label: "Students" },
        { href: "/professor/attempts", label: "Attempts" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
