import { QuestionType } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createLog: vi.fn(),
  updateLog: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    aiQuestionGenerationLog: {
      create: mocks.createLog,
      update: mocks.updateLog,
    },
  },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mocks.generateContent,
    };
  },
}));

let generateAiQuestion: typeof import("@/services/ai-question-service").generateAiQuestion;

beforeAll(async () => {
  ({ generateAiQuestion } = await import("@/services/ai-question-service"));
});

describe("ai-question-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GEMINI_MODEL;

    mocks.createLog
      .mockResolvedValueOnce({ id: "log-1" })
      .mockResolvedValueOnce({ id: "log-2" });
    mocks.updateLog.mockResolvedValue({});
  });

  it("retries once when Gemini returns invalid JSON and then succeeds", async () => {
    const generatedQuestion = {
      type: QuestionType.MULTIPLE_CHOICE,
      language: "en" as const,
      prompt: "Which number is even?",
      points: 2,
      data: {
        options: ["1", "3", "4", "5"],
        correctOptionIndexes: [2],
      },
    };

    mocks.generateContent
      .mockResolvedValueOnce({ text: "not valid json" })
      .mockResolvedValueOnce({ text: JSON.stringify(generatedQuestion) });

    const result = await generateAiQuestion("teacher-1", {
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: "MEDIUM",
      language: "en",
      description: "Create a simple math question for beginners.",
      points: 2,
    });

    expect(result).toEqual(generatedQuestion);
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
    expect(mocks.createLog).toHaveBeenCalledTimes(2);
    expect(mocks.createLog.mock.calls[0]?.[0]).toMatchObject({
      data: {
        requestedById: "teacher-1",
        model: "gemini-2.5-flash",
        status: "PENDING",
        strictRetry: false,
      },
    });
    expect(mocks.createLog.mock.calls[1]?.[0]).toMatchObject({
      data: {
        strictRetry: true,
      },
    });
    expect(mocks.updateLog.mock.calls[0]?.[0]).toMatchObject({
      where: { id: "log-1" },
      data: {
        status: "INVALID_RESPONSE",
      },
    });
    expect(mocks.updateLog.mock.calls[1]?.[0]).toMatchObject({
      where: { id: "log-2" },
      data: {
        status: "SUCCESS",
      },
    });
  });

  it("throws a friendly AppError after two invalid Gemini responses", async () => {
    mocks.generateContent
      .mockResolvedValueOnce({ text: "still invalid" })
      .mockResolvedValueOnce({ text: "{ not-json" });

    await expect(
      generateAiQuestion("teacher-1", {
        type: QuestionType.ESSAY,
        difficulty: "HARD",
        language: "pt",
        description: "Generate a short essay prompt about sustainability.",
        points: 3,
      }),
    ).rejects.toMatchObject({
      name: "AppError",
      statusCode: 502,
      message:
        "The AI response could not be parsed. Please try again with a more specific description.",
    });

    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
    expect(mocks.updateLog).toHaveBeenCalledTimes(2);
  });
});
