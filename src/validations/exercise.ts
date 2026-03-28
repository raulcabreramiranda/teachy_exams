import { QuestionType } from "@prisma/client";
import { z } from "zod";
import { getFillBlankCount } from "@/lib/question-helpers";
import { getRichTextPreview, sanitizeRichTextHtml } from "@/lib/rich-text";

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1),
});

const matchItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1),
});

export const multipleChoiceConfigSchema = z
  .object({
    options: z.array(optionSchema).min(2),
    correctOptionIds: z.array(z.string().min(1)).min(1),
  })
  .superRefine((value, context) => {
    const optionIds = new Set(value.options.map((option) => option.id));

    for (const correctId of value.correctOptionIds) {
      if (!optionIds.has(correctId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "All correct options must exist in the options list.",
          path: ["correctOptionIds"],
        });
      }
    }
  });

export const essayConfigSchema = z.object({
  placeholder: z.string().trim().optional(),
});

export const fillInTheBlankConfigSchema = z
  .object({
    template: z.string().trim().min(1),
    answers: z.array(z.string().trim().min(1)).min(1),
  })
  .superRefine((value, context) => {
    const blankCount = getFillBlankCount(value.template);

    if (blankCount < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Use "{{blank}}" in the template for each answer.',
        path: ["template"],
      });
    }

    if (blankCount !== value.answers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The number of blanks must match the number of answers.",
        path: ["answers"],
      });
    }
  });

export const matchingConfigSchema = z
  .object({
    leftItems: z.array(matchItemSchema).min(1),
    rightItems: z.array(matchItemSchema).min(1),
    correctMatches: z.record(z.string(), z.string()),
  })
  .superRefine((value, context) => {
    const leftIds = new Set(value.leftItems.map((item) => item.id));
    const rightIds = new Set(value.rightItems.map((item) => item.id));

    for (const [leftId, rightId] of Object.entries(value.correctMatches)) {
      if (!leftIds.has(leftId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each left-side match key must exist.",
          path: ["correctMatches", leftId],
        });
      }

      if (!rightIds.has(rightId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each right-side match value must exist.",
          path: ["correctMatches", leftId],
        });
      }
    }

    if (Object.keys(value.correctMatches).length !== value.leftItems.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Every left-side item must have a correct match.",
        path: ["correctMatches"],
      });
    }
  });

const baseQuestionSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().min(1),
  prompt: z
    .string()
    .transform((value) => sanitizeRichTextHtml(value))
    .refine((value) => getRichTextPreview(value).length > 0, {
      message: "Prompt is required.",
    }),
  points: z.number().positive().default(1),
});

export const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal(QuestionType.MULTIPLE_CHOICE),
  config: multipleChoiceConfigSchema,
});

export const essayQuestionSchema = baseQuestionSchema.extend({
  type: z.literal(QuestionType.ESSAY),
  config: essayConfigSchema,
});

export const fillInTheBlankQuestionSchema = baseQuestionSchema.extend({
  type: z.literal(QuestionType.FILL_IN_THE_BLANK),
  config: fillInTheBlankConfigSchema,
});

export const matchingQuestionSchema = baseQuestionSchema.extend({
  type: z.literal(QuestionType.MATCHING),
  config: matchingConfigSchema,
});

export const questionInputSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  essayQuestionSchema,
  fillInTheBlankQuestionSchema,
  matchingQuestionSchema,
]);

export const exerciseListInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  autoReview: z.boolean().default(true),
  timeLimitMinutes: z.number().int().positive().optional().nullable(),
  dueAt: z.iso.datetime().optional().nullable(),
  publish: z.boolean().default(false),
  questions: z.array(questionInputSchema).min(1),
});

export const assignmentInputSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1),
});

export const saveAttemptAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        response: z.unknown(),
      }),
    )
    .min(1),
});

export const manualGradeInputSchema = z.object({
  teacherFeedback: z.string().trim().max(2_000).optional(),
  answers: z.array(
    z.object({
      answerId: z.string().min(1),
      manualScore: z.number().min(0).nullable(),
      feedback: z.string().trim().max(2_000).optional(),
    }),
  ),
});

export const multipleChoiceResponseSchema = z.object({
  selectedOptionIds: z.array(z.string().min(1)),
});

export const essayResponseSchema = z.object({
  text: z.string(),
});

export const fillInTheBlankResponseSchema = z.object({
  blanks: z.array(z.string()),
});

export const matchingResponseSchema = z.object({
  pairs: z.record(z.string(), z.string()),
});

export type MultipleChoiceConfig = z.infer<typeof multipleChoiceConfigSchema>;
export type EssayConfig = z.infer<typeof essayConfigSchema>;
export type FillInTheBlankConfig = z.infer<typeof fillInTheBlankConfigSchema>;
export type MatchingConfig = z.infer<typeof matchingConfigSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type ExerciseListInput = z.infer<typeof exerciseListInputSchema>;
export type AssignmentInput = z.infer<typeof assignmentInputSchema>;
export type SaveAttemptAnswersInput = z.infer<typeof saveAttemptAnswersSchema>;
export type ManualGradeInput = z.infer<typeof manualGradeInputSchema>;
