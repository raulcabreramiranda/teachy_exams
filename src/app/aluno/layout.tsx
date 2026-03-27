import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageSession } from "@/lib/auth";

export default async function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requirePageSession([Role.STUDENT]);

  return (
    <DashboardShell
      title="Student"
      subtitle="Review exams and results."
      navItems={[{ href: "/aluno", label: "Exams" }]}
      showSidebar={false}
    >
      {children}
    </DashboardShell>
  );
}
