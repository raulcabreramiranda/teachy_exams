import { Role } from "@prisma/client";
import { AttemptReview } from "@/components/teacher/attempt-review";
import { requirePageSession } from "@/lib/auth";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

export default async function TeacherAttemptsPage() {
  const session = await requirePageSession([Role.TEACHER]);
  const attempts = await getTeacherAttemptsForReview(session.userId);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold">Attempts</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review pending submissions and revisit attempts that were already graded.
        </p>
      </div>

      <AttemptReview
        attempts={attempts.map((attempt) => ({
          id: attempt.id,
          startedAt: attempt.startedAt.toISOString(),
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
          status: attempt.status,
          totalScore: attempt.totalScore,
          teacherFeedback: attempt.teacherFeedback,
          assignment: {
            student: attempt.assignment.student,
            list: {
              title: attempt.assignment.list.title,
            },
          },
          answers: attempt.answers.map((answer) => ({
            id: answer.id,
            responseJson: answer.responseJson,
            autoScore: answer.autoScore,
            manualScore: answer.manualScore,
            feedback: answer.feedback,
            correctedAt: answer.correctedAt?.toISOString() ?? null,
            question: {
              type: answer.question.type,
              prompt: answer.question.prompt,
              points: answer.question.points,
              configJson: answer.question.configJson,
            },
          })),
        }))}
      />
    </div>
  );
}
