import { Role } from "@prisma/client";
import { ExerciseListEditor } from "@/components/lists/exercise-list-editor";
import { PageNavigation } from "@/components/layout/page-navigation";
import { requirePageSession } from "@/lib/auth";
import { getTeacherStudents } from "@/services/exercise-list-service";

export default async function NewExerciseListPage() {
  await requirePageSession([Role.TEACHER]);
  const students = await getTeacherStudents();

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <h2 className="text-2xl font-semibold">Create a new exam</h2>
        <p className="mt-1 text-sm text-slate-600">
          Define the rules, add questions, and optionally assign students right away.
        </p>
        <PageNavigation
          backHref="/professor/lists"
          backLabel="Back"
          links={[{ href: "/professor/lists", label: "Go to exams" }]}
          className="mt-4"
        />
      </div>

      <ExerciseListEditor mode="create" students={students} />
    </div>
  );
}
