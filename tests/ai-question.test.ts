import { QuestionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  mapAiQuestionToQuestionInput,
  plainTextToRichTextHtml,
} from "@/lib/ai-question";

describe("ai question helpers", () => {
  it("converts plain text into escaped rich text paragraphs", () => {
    const html = plainTextToRichTextHtml("First line\nSecond line\n\n<script>alert(1)</script>");

    expect(html).toBe(
      "<p>First line<br />Second line</p><p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("maps a generated multiple-choice question into the editor format", () => {
    const mapped = mapAiQuestionToQuestionInput(
      {
        type: QuestionType.MULTIPLE_CHOICE,
        language: "en",
        prompt: "Which number is even?",
        points: 2,
        data: {
          options: ["1", "3", "4", "5"],
          correctOptionIndexes: [2],
        },
      },
      4,
    );

    expect(mapped).toMatchObject({
      order: 4,
      type: QuestionType.MULTIPLE_CHOICE,
      points: 2,
      prompt: "<p>Which number is even?</p>",
    });

    if (mapped.type !== QuestionType.MULTIPLE_CHOICE) {
      throw new Error("Expected a multiple-choice question.");
    }

    expect(mapped.config.options).toHaveLength(4);
    expect(mapped.config.correctOptionIds).toHaveLength(1);

    const correctOptions = mapped.config.options.filter((option) =>
      mapped.config.correctOptionIds.includes(option.id),
    );

    expect(correctOptions.map((option) => option.text)).toEqual(["4"]);
  });
});
