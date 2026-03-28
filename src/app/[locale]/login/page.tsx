import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getLocalizedPathname } from "@/i18n/routing";
import { getOptionalPageSession } from "@/lib/auth";

type LoginPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  const session = await getOptionalPageSession();

  if (session) {
    redirect(
      getLocalizedPathname(
        locale,
        session.role === Role.TEACHER ? "/professor" : "/aluno",
      ),
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
