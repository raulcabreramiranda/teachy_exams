import { QuestionType } from "@prisma/client";
import { z } from "zod";
import { getFillBlankCount } from "@/lib/question-helpers";

export const aiQuestionDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const aiQuestionLanguageSchema = z.enum(["en", "pt", "es"]);

export const aiQuestionGenerationInputSchema = z.object({
  type: z.nativeEnum(QuestionType),
  difficulty: aiQuestionDifficultySchema,
  language: aiQuestionLanguageSchema,
  description: z.string().trim().min(5).max(1_500),
  points: z.number().min(0.5).max(100),
});

const multipleChoiceAiDataSchema = z
  .object({
    options: z.array(z.string().trim().min(1)).min(2).max(8),
    correctOptionIndexes: z.array(z.number().int().min(0)).min(1),
  })
  .superRefine((value, context) => {
    const maxIndex = value.options.length - 1;
    const seenIndexes = new Set<number>();

    for (const index of value.correctOptionIndexes) {
      if (index > maxIndex) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct option indexes must reference a valid option.",
          path: ["correctOptionIndexes"],
        });
      }

      if (seenIndexes.has(index)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correct option indexes must be unique.",
          path: ["correctOptionIndexes"],
        });
      }

      seenIndexes.add(index);
    }
  });

const essayAiDataSchema = z.object({
  sampleAnswer: z.string().trim().min(1).max(2_000),
});

const fillInTheBlankAiDataSchema = z
  .object({
    template: z.string().trim().min(1).max(2_000),
    blanks: z.array(z.string().trim().min(1)).min(1).max(8),
  })
  .superRefine((value, context) => {
    const blankCount = getFillBlankCount(value.template);

    if (blankCount < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Template must include "{{blank}}" tokens.',
        path: ["template"],
      });
    }

    if (blankCount !== value.blanks.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The number of blanks must match the template tokens.",
        path: ["blanks"],
      });
    }
  });

const matchingAiDataSchema = z
  .object({
    left: z.array(z.string().trim().min(1)).min(2).max(8),
    right: z.array(z.string().trim().min(1)).min(2).max(8),
    matches: z
      .array(
        z.object({
          leftIndex: z.number().int().min(0),
          rightIndex: z.number().int().min(0),
        }),
      )
      .min(1),
  })
  .superRefine((value, context) => {
    const seenLeftIndexes = new Set<number>();
    const seenRightIndexes = new Set<number>();

    for (const [matchIndex, match] of value.matches.entries()) {
      if (match.leftIndex >= value.left.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each leftIndex must reference an existing left item.",
          path: ["matches", matchIndex, "leftIndex"],
        });
      }

      if (match.rightIndex >= value.right.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each rightIndex must reference an existing right item.",
          path: ["matches", matchIndex, "rightIndex"],
        });
      }

      if (seenLeftIndexes.has(match.leftIndex)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each left item must only appear once in matches.",
          path: ["matches", matchIndex, "leftIndex"],
        });
      }

      if (seenRightIndexes.has(match.rightIndex)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each right item must only appear once in matches.",
          path: ["matches", matchIndex, "rightIndex"],
        });
      }

      seenLeftIndexes.add(match.leftIndex);
      seenRightIndexes.add(match.rightIndex);
    }

    if (seenLeftIndexes.size !== value.left.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Every left item must have a match.",
        path: ["matches"],
      });
    }
  });

const aiQuestionBaseSchema = z.object({
  language: aiQuestionLanguageSchema,
  prompt: z.string().trim().min(1).max(4_000),
  points: z.number().min(0.5).max(100),
});

export const aiGeneratedMultipleChoiceQuestionSchema = aiQuestionBaseSchema.extend({
  type: z.literal(QuestionType.MULTIPLE_CHOICE),
  data: multipleChoiceAiDataSchema,
});

export const aiGeneratedEssayQuestionSchema = aiQuestionBaseSchema.extend({
  type: z.literal(QuestionType.ESSAY),
  data: essayAiDataSchema,
});

export const aiGeneratedFillInTheBlankQuestionSchema = aiQuestionBaseSchema.extend({
  type: z.literal(QuestionType.FILL_IN_THE_BLANK),
  data: fillInTheBlankAiDataSchema,
});

export const aiGeneratedMatchingQuestionSchema = aiQuestionBaseSchema.extend({
  type: z.literal(QuestionType.MATCHING),
  data: matchingAiDataSchema,
});

export const aiGeneratedQuestionSchema = z.discriminatedUnion("type", [
  aiGeneratedMultipleChoiceQuestionSchema,
  aiGeneratedEssayQuestionSchema,
  aiGeneratedFillInTheBlankQuestionSchema,
  aiGeneratedMatchingQuestionSchema,
]);

const baseJsonSchemaProperties = {
  language: {
    type: "string",
    enum: ["en", "pt", "es"],
  },
  prompt: {
    type: "string",
  },
  points: {
    type: "number",
    minimum: 0.5,
    maximum: 100,
  },
} as const;

export const aiGeneratedQuestionJsonSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      properties: {
        ...baseJsonSchemaProperties,
        type: {
          type: "string",
          enum: [QuestionType.MULTIPLE_CHOICE],
        },
        data: {
          type: "object",
          additionalProperties: false,
          properties: {
            options: {
              type: "array",
              minItems: 2,
              maxItems: 8,
              items: { type: "string" },
            },
            correctOptionIndexes: {
              type: "array",
              minItems: 1,
              items: {
                type: "integer",
                minimum: 0,
              },
            },
          },
          required: ["options", "correctOptionIndexes"],
        },
      },
      required: ["type", "language", "prompt", "points", "data"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        ...baseJsonSchemaProperties,
        type: {
          type: "string",
          enum: [QuestionType.ESSAY],
        },
        data: {
          type: "object",
          additionalProperties: false,
          properties: {
            sampleAnswer: {
              type: "string",
            },
          },
          required: ["sampleAnswer"],
        },
      },
      required: ["type", "language", "prompt", "points", "data"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        ...baseJsonSchemaProperties,
        type: {
          type: "string",
          enum: [QuestionType.FILL_IN_THE_BLANK],
        },
        data: {
          type: "object",
          additionalProperties: false,
          properties: {
            template: {
              type: "string",
            },
            blanks: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: { type: "string" },
            },
          },
          required: ["template", "blanks"],
        },
      },
      required: ["type", "language", "prompt", "points", "data"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        ...baseJsonSchemaProperties,
        type: {
          type: "string",
          enum: [QuestionType.MATCHING],
        },
        data: {
          type: "object",
          additionalProperties: false,
          properties: {
            left: {
              type: "array",
              minItems: 2,
              maxItems: 8,
              items: { type: "string" },
            },
            right: {
              type: "array",
              minItems: 2,
              maxItems: 8,
              items: { type: "string" },
            },
            matches: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  leftIndex: {
                    type: "integer",
                    minimum: 0,
                  },
                  rightIndex: {
                    type: "integer",
                    minimum: 0,
                  },
                },
                required: ["leftIndex", "rightIndex"],
              },
            },
          },
          required: ["left", "right", "matches"],
        },
      },
      required: ["type", "language", "prompt", "points", "data"],
    },
  ],
} as const;

export type AiQuestionDifficulty = z.infer<typeof aiQuestionDifficultySchema>;
export type AiQuestionLanguage = z.infer<typeof aiQuestionLanguageSchema>;
export type AiQuestionGenerationInput = z.infer<typeof aiQuestionGenerationInputSchema>;
export type AiGeneratedQuestion = z.infer<typeof aiGeneratedQuestionSchema>;
