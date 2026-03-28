import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { ExerciseListEditor } from "@/components/lists/exercise-list-editor";
import { PageNavigation } from "@/components/layout/page-navigation";
import { requirePageSession } from "@/lib/auth";
import { getTeacherStudents } from "@/services/exercise-list-service";

type NewExerciseListPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function NewExerciseListPage({ params }: NewExerciseListPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  await requirePageSession([Role.TEACHER], locale);
  const students = await getTeacherStudents();

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <h2 className="text-2xl font-semibold">{t("TeacherExamEditor.createTitle")}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t("TeacherExamEditor.createSubtitle")}
        </p>
        <PageNavigation
          backHref="/professor/lists"
          links={[{ href: "/professor/lists", label: t("TeacherExamEditor.goToExams") }]}
          className="mt-4"
        />
      </div>

      <ExerciseListEditor mode="create" students={students} />
    </div>
  );
}
