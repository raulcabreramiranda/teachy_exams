import { Role } from "@prisma/client";
import { ExerciseListEditor } from "@/components/lists/exercise-list-editor";
import { requirePageSession } from "@/lib/auth";
import { getTeacherStudents } from "@/services/exercise-list-service";

export default async function NewExerciseListPage() {
  await requirePageSession([Role.TEACHER]);
  const students = await getTeacherStudents();

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold">Create a new exercise list</h2>
        <p className="mt-1 text-sm text-slate-600">
          Define the rules, add questions, and optionally assign students right away.
        </p>
      </div>

      <ExerciseListEditor mode="create" students={students} />
    </div>
  );
}
