import { QuestionType } from "@prisma/client";
import type { QuestionInput } from "@/validations/exercise";
import type { AiGeneratedQuestion } from "@/validations/ai";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function plainTextToRichTextHtml(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return trimmedValue
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function mapAiQuestionToQuestionInput(
  question: AiGeneratedQuestion,
  order: number,
): QuestionInput {
  const prompt = plainTextToRichTextHtml(question.prompt);

  switch (question.type) {
    case QuestionType.MULTIPLE_CHOICE: {
      const options = question.data.options.map((text) => ({
        id: crypto.randomUUID(),
        text,
      }));

      return {
        order,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt,
        points: question.points,
        config: {
          options,
          correctOptionIds: question.data.correctOptionIndexes.map(
            (index) => options[index]?.id ?? "",
          ),
        },
      };
    }
    case QuestionType.ESSAY:
      return {
        order,
        type: QuestionType.ESSAY,
        prompt,
        points: question.points,
        config: {
          placeholder: "",
        },
      };
    case QuestionType.FILL_IN_THE_BLANK:
      return {
        order,
        type: QuestionType.FILL_IN_THE_BLANK,
        prompt,
        points: question.points,
        config: {
          template: question.data.template,
          answers: question.data.blanks,
        },
      };
    case QuestionType.MATCHING: {
      const leftItems = question.data.left.map((label) => ({
        id: crypto.randomUUID(),
        label,
      }));
      const rightItems = question.data.right.map((label) => ({
        id: crypto.randomUUID(),
        label,
      }));

      return {
        order,
        type: QuestionType.MATCHING,
        prompt,
        points: question.points,
        config: {
          leftItems,
          rightItems,
          correctMatches: Object.fromEntries(
            question.data.matches.map((match) => [
              leftItems[match.leftIndex]?.id ?? "",
              rightItems[match.rightIndex]?.id ?? "",
            ]),
          ),
        },
      };
    }
  }
}
