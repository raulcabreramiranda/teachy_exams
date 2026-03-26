import { Role } from "@prisma/client";
import { requirePageSession } from "@/lib/auth";
import { getStudentsForManagement } from "@/services/student-service";
import { StudentManagementTable } from "@/components/teacher/student-management-table";

export default async function TeacherStudentsPage() {
  await requirePageSession([Role.TEACHER]);
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
