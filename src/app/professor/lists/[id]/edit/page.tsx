import { Role } from "@prisma/client";
import { ExerciseListEditor } from "@/components/lists/exercise-list-editor";
import { toDateTimeLocalValue } from "@/lib/format";
import { requirePageSession } from "@/lib/auth";
import { getTeacherListEditorData, getTeacherStudents } from "@/services/exercise-list-service";
import type { QuestionInput } from "@/validations/exercise";

type EditExerciseListPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditExerciseListPage({
  params,
}: EditExerciseListPageProps) {
  const session = await requirePageSession([Role.TEACHER]);
  const { id } = await params;

  const [list, students] = await Promise.all([
    getTeacherListEditorData(session.userId, id),
    getTeacherStudents(),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold">Edit exercise list</h2>
        <p className="mt-1 text-sm text-slate-600">
          Updating questions is blocked after students create attempts to preserve grading data.
        </p>
      </div>

      <ExerciseListEditor
        mode="edit"
        listId={list.id}
        students={students}
        initialValue={{
          title: list.title,
          description: list.description ?? "",
          timeLimitMinutes: list.timeLimitMinutes ? String(list.timeLimitMinutes) : "",
          dueAt: toDateTimeLocalValue(list.dueAt),
          publish: Boolean(list.publishedAt),
          questions: list.questions.map(
            (question) =>
              ({
                id: question.id,
                order: question.order,
                type: question.type,
                prompt: question.prompt,
                points: question.points,
                config: question.configJson,
              }) as QuestionInput,
          ),
          selectedStudentIds: list.assignments.map((assignment) => assignment.studentId),
        }}
      />
    </div>
  );
}
