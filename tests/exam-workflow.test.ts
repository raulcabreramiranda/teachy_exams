import { QuestionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getEmptyResponse, parseQuestionResponse } from "@/lib/questions";
import {
  autoScoreQuestion,
  calculateAttemptTotalScore,
  hasPendingEssayReview,
} from "@/services/grading-service";
import { exerciseListInputSchema } from "@/validations/exercise";

describe("exam workflow", () => {
  it("supports creating, submitting, and grading a mixed exam", () => {
    const exam = exerciseListInputSchema.parse({
      title: "Version Control Basics",
      autoReview: true,
      publish: true,
      questions: [
        {
          order: 1,
          type: QuestionType.MULTIPLE_CHOICE,
          prompt: "<p>Which tool is commonly used for version control?</p>",
          points: 2,
          config: {
            options: [
              { id: "a", text: "Figma" },
              { id: "b", text: "Git" },
              { id: "c", text: "Photoshop" },
            ],
            correctOptionIds: ["b"],
          },
        },
        {
          order: 2,
          type: QuestionType.ESSAY,
          prompt: "<p>Explain why version control matters in a team.</p>",
          points: 3,
          config: {
            placeholder: "Write your answer here.",
          },
        },
      ],
    });

    const initialResponses = exam.questions.map((question) => ({
      questionId: question.order,
      response: getEmptyResponse(question.type),
    }));

    expect(initialResponses).toEqual([
      { questionId: 1, response: { selectedOptionIds: [] } },
      { questionId: 2, response: { text: "" } },
    ]);

    const submittedAnswers = [
      {
        autoScore: autoScoreQuestion(
          {
            type: exam.questions[0].type,
            points: exam.questions[0].points,
            configJson: exam.questions[0].config,
          },
          parseQuestionResponse(exam.questions[0].type, {
            selectedOptionIds: ["b"],
          }),
        ),
        manualScore: null,
        question: { type: exam.questions[0].type },
      },
      {
        autoScore: autoScoreQuestion(
          {
            type: exam.questions[1].type,
            points: exam.questions[1].points,
            configJson: exam.questions[1].config,
          },
          parseQuestionResponse(exam.questions[1].type, {
            text: "It helps teams collaborate safely and track history.",
          }),
        ),
        manualScore: null,
        question: { type: exam.questions[1].type },
      },
    ];

    expect(calculateAttemptTotalScore(submittedAnswers)).toBe(2);
    expect(hasPendingEssayReview(submittedAnswers)).toBe(true);

    const gradedAnswers = [
      submittedAnswers[0],
      {
        ...submittedAnswers[1],
        manualScore: 3,
      },
    ];

    expect(calculateAttemptTotalScore(gradedAnswers)).toBe(5);
    expect(hasPendingEssayReview(gradedAnswers)).toBe(false);
  });
});
