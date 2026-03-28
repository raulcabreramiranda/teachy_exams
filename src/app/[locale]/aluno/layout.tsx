import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageSession } from "@/lib/auth";

export default async function StudentLayout({
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
  const session = await requirePageSession([Role.STUDENT], locale);

  return (
    <DashboardShell
      title={session.name}
      subtitle={t("StudentLayout.subtitle")}
      navItems={[{ href: "/aluno", label: t("Nav.student.exams") }]}
      showSidebar={false}
      centerHeaderContent
    >
      {children}
    </DashboardShell>
  );
}
