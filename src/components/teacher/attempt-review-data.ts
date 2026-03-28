import type { AttemptReviewItem } from "@/components/teacher/attempt-review";
import { getTeacherAttemptsForReview } from "@/services/attempt-service";

type TeacherAttempt = Awaited<ReturnType<typeof getTeacherAttemptsForReview>>[number];

export function toAttemptReviewItem(attempt: TeacherAttempt): AttemptReviewItem {
  return {
    id: attempt.id,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    status: attempt.status,
    totalScore: attempt.totalScore,
    teacherFeedback: attempt.teacherFeedback,
    assignment: {
      student: attempt.assignment.student,
      list: {
        id: attempt.assignment.list.id,
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
  };
}
