import { Prisma, QuestionType } from "@prisma/client";
import {
  EssayConfig,
  FillInTheBlankConfig,
  MatchingConfig,
  MultipleChoiceConfig,
  essayResponseSchema,
  fillInTheBlankResponseSchema,
  matchingResponseSchema,
  multipleChoiceResponseSchema,
} from "@/validations/exercise";

export type QuestionConfig =
  | MultipleChoiceConfig
  | EssayConfig
  | FillInTheBlankConfig
  | MatchingConfig;

export type MultipleChoiceResponse = {
  selectedOptionIds: string[];
};

export type EssayResponse = {
  text: string;
};

export type FillInTheBlankResponse = {
  blanks: string[];
};

export type MatchingResponse = {
  pairs: Record<string, string>;
};

export type QuestionResponse =
  | MultipleChoiceResponse
  | EssayResponse
  | FillInTheBlankResponse
  | MatchingResponse;

export function getQuestionConfig(
  type: QuestionType,
  configJson: Prisma.JsonValue,
): QuestionConfig {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE:
      return configJson as MultipleChoiceConfig;
    case QuestionType.ESSAY:
      return configJson as EssayConfig;
    case QuestionType.FILL_IN_THE_BLANK:
      return configJson as FillInTheBlankConfig;
    case QuestionType.MATCHING:
      return configJson as MatchingConfig;
  }
}

export function parseQuestionResponse(type: QuestionType, input: unknown) {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE:
      return multipleChoiceResponseSchema.parse(input);
    case QuestionType.ESSAY:
      return essayResponseSchema.parse(input);
    case QuestionType.FILL_IN_THE_BLANK:
      return fillInTheBlankResponseSchema.parse(input);
    case QuestionType.MATCHING:
      return matchingResponseSchema.parse(input);
  }
}

export function getEmptyResponse(type: QuestionType) {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE:
      return { selectedOptionIds: [] };
    case QuestionType.ESSAY:
      return { text: "" };
    case QuestionType.FILL_IN_THE_BLANK:
      return { blanks: [] };
    case QuestionType.MATCHING:
      return { pairs: {} };
  }
}
