import { Role } from "@prisma/client";
import { requirePageSession } from "@/lib/auth";
import { getTeacherDashboardData } from "@/services/exercise-list-service";
import { TeacherListsTable } from "@/components/teacher/teacher-lists-table";

export default async function TeacherListsPage() {
  const session = await requirePageSession([Role.TEACHER]);
  const lists = await getTeacherDashboardData(session.userId);

  return (
    <TeacherListsTable
      lists={lists.map((list) => ({
        id: list.id,
        title: list.title,
        publishedAt: list.publishedAt?.toISOString() ?? null,
        dueAt: list.dueAt?.toISOString() ?? null,
        questionsCount: list._count.questions,
        assignmentsCount: list._count.assignments,
      }))}
    />
  );
}
