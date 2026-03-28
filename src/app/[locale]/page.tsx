import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getLocalizedPathname } from "@/i18n/routing";
import { getOptionalPageSession } from "@/lib/auth";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const session = await getOptionalPageSession();

  if (!session) {
    redirect(getLocalizedPathname(locale, "/login"));
  }

  redirect(
    getLocalizedPathname(
      locale,
      session.role === Role.TEACHER ? "/professor" : "/aluno",
    ),
  );
}
