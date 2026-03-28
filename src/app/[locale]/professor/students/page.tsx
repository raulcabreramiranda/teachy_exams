import { Role } from "@prisma/client";
import { requirePageSession } from "@/lib/auth";
import { getStudentsForManagement } from "@/services/student-service";
import { StudentManagementTable } from "@/components/teacher/student-management-table";

type TeacherStudentsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function TeacherStudentsPage({
  params,
}: TeacherStudentsPageProps) {
  const { locale } = await params;
  await requirePageSession([Role.TEACHER], locale);
  const students = await getStudentsForManagement();

  return (
    <StudentManagementTable
      students={students.map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        createdAt: student.createdAt.toISOString(),
        assignmentsCount: student._count.assignments,
      }))}
    />
  );
}
