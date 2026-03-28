import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageSession } from "@/lib/auth";

export default async function StudentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePageSession([Role.STUDENT]);

  return (
    <DashboardShell
      title={session.name}
      subtitle="Review exams and results."
      navItems={[{ href: "/aluno", label: "Exams" }]}
      showSidebar={false}
      centerHeaderContent
    >
      {children}
    </DashboardShell>
  );
}
