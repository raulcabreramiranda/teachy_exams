import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getOptionalPageSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getOptionalPageSession();

  if (!session) {
    redirect("/login");
  }

  redirect(session.role === Role.TEACHER ? "/professor" : "/aluno");
}
