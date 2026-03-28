import { Role } from "@prisma/client";
import { PageNavigation } from "@/components/layout/page-navigation";
import { AssignmentWorkspace } from "@/components/student/assignment-workspace";
import { requirePageSession } from "@/lib/auth";
import { getStudentAssignmentData } from "@/services/attempt-service";

type StudentAssignmentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentAssignmentPage({
  params,
}: StudentAssignmentPageProps) {
  const session = await requirePageSession([Role.STUDENT]);
  const { id } = await params;
  const assignment = await getStudentAssignmentData(session.userId, id);
  const attempt = assignment.attempts[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="app-page-header p-5">
        <h2 className="text-2xl font-semibold">Exam workspace</h2>
        <p className="mt-1 text-sm text-slate-600">
          Continue your assigned exam and return to the exam list whenever needed.
        </p>
        <PageNavigation
          backHref="/aluno"
          backLabel="Back"
          links={[{ href: "/aluno", label: "Go to exams" }]}
          className="mt-4"
        />
      </div>

      <AssignmentWorkspace
        assignment={{
          id: assignment.id,
          assignedAt: assignment.assignedAt.toISOString(),
          list: {
            title: assignment.list.title,
            description: assignment.list.description,
            dueAt: assignment.list.dueAt?.toISOString() ?? null,
            timeLimitMinutes: assignment.list.timeLimitMinutes,
            questions: assignment.list.questions.map((question) => ({
              id: question.id,
              order: question.order,
              type: question.type,
              prompt: question.prompt,
              points: question.points,
              configJson: question.configJson,
            })),
          },
          attempt: attempt
            ? {
                id: attempt.id,
                status: attempt.status,
                startedAt: attempt.startedAt.toISOString(),
                submittedAt: attempt.submittedAt?.toISOString() ?? null,
                answers: attempt.answers.map((answer) => ({
                  questionId: answer.questionId,
                  responseJson: answer.responseJson,
                })),
              }
            : null,
        }}
      />
    </div>
  );
}
