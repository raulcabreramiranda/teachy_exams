import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalPageSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getOptionalPageSession();

  if (session) {
    redirect(session.role === Role.TEACHER ? "/professor" : "/aluno");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
