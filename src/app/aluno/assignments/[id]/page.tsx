import { Role } from "@prisma/client";
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
  );
}
