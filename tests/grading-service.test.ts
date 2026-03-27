import { QuestionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  autoScoreQuestion,
  calculateAttemptTotalScore,
  getEffectiveAttemptDeadline,
  hasPendingEssayReview,
  isAttemptWindowExpired,
  isTimeLimitExceeded,
  scoreFillInTheBlank,
  scoreMatching,
  scoreMultipleChoice,
} from "@/services/grading-service";

describe("grading-service", () => {
  it("scores multiple choice answers as an unordered set", () => {
    const score = scoreMultipleChoice(
      {
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
          { id: "c", text: "C" },
        ],
        correctOptionIds: ["b", "a"],
      },
      {
        selectedOptionIds: ["a", "b"],
      },
      2,
    );

    expect(score).toBe(2);
  });

  it("normalizes fill-in-the-blank answers before comparing", () => {
    const score = scoreFillInTheBlank(
      {
        template: "The answer is {{blank}}.",
        answers: ["Debugging"],
      },
      {
        blanks: ["  debugging "],
      },
      3,
    );

    expect(score).toBe(3);
  });

  it("scores matching answers only when every pair is correct", () => {
    const score = scoreMatching(
      {
        leftItems: [
          { id: "html", label: "HTML" },
          { id: "css", label: "CSS" },
        ],
        rightItems: [
          { id: "structure", label: "Structure" },
          { id: "style", label: "Style" },
        ],
        correctMatches: {
          html: "structure",
          css: "style",
        },
      },
      {
        pairs: {
          html: "structure",
          css: "style",
        },
      },
      4,
    );

    expect(score).toBe(4);
  });

  it("returns null auto score for essay questions", () => {
    const score = autoScoreQuestion(
      {
        type: QuestionType.ESSAY,
        points: 5,
        configJson: { placeholder: "Answer here." },
      },
      {
        text: "Version control matters.",
      },
    );

    expect(score).toBeNull();
  });

  it("calculates the attempt total using manual essay scores and auto scores", () => {
    const totalScore = calculateAttemptTotalScore([
      {
        autoScore: 2,
        manualScore: null,
        question: {
          type: QuestionType.MULTIPLE_CHOICE,
        },
      },
      {
        autoScore: null,
        manualScore: 3.5,
        question: {
          type: QuestionType.ESSAY,
        },
      },
    ]);

    expect(totalScore).toBe(5.5);
    expect(
      hasPendingEssayReview([
        {
          autoScore: null,
          manualScore: null,
          question: {
            type: QuestionType.ESSAY,
          },
        },
      ]),
    ).toBe(true);
  });

  it("flags attempts that exceed the configured time limit", () => {
    const startedAt = new Date("2026-03-27T10:00:00.000Z");
    const now = new Date("2026-03-27T11:01:00.000Z");

    expect(isTimeLimitExceeded(startedAt, 60, now)).toBe(true);
    expect(isTimeLimitExceeded(startedAt, 90, now)).toBe(false);
  });

  it("treats the exact time limit boundary as expired", () => {
    const startedAt = new Date("2026-03-27T10:00:00.000Z");
    const now = new Date("2026-03-27T11:00:00.000Z");

    expect(isTimeLimitExceeded(startedAt, 60, now)).toBe(true);
  });

  it("uses the earliest deadline between due date and time limit", () => {
    const startedAt = new Date("2026-03-27T10:00:00.000Z");
    const dueAt = new Date("2026-03-27T10:20:00.000Z");

    expect(
      getEffectiveAttemptDeadline(startedAt, dueAt, 60)?.toISOString(),
    ).toBe("2026-03-27T10:20:00.000Z");
  });

  it("flags an attempt as expired when the effective deadline has passed", () => {
    const startedAt = new Date("2026-03-27T10:00:00.000Z");
    const dueAt = new Date("2026-03-27T10:20:00.000Z");
    const now = new Date("2026-03-27T10:20:00.000Z");

    expect(isAttemptWindowExpired(startedAt, dueAt, 60, now)).toBe(true);
    expect(
      isAttemptWindowExpired(
        startedAt,
        new Date("2026-03-27T11:30:00.000Z"),
        60,
        new Date("2026-03-27T10:30:00.000Z"),
      ),
    ).toBe(false);
  });
});
