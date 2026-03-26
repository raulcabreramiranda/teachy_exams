import { Answer, Question, QuestionType } from "@prisma/client";
import {
  FillInTheBlankConfig,
  MatchingConfig,
  MultipleChoiceConfig,
} from "@/validations/exercise";
import {
  FillInTheBlankResponse,
  MatchingResponse,
  MultipleChoiceResponse,
} from "@/lib/questions";
import { normalizeTextInput } from "@/lib/question-helpers";

function sortValues(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function isTimeLimitExceeded(
  startedAt: Date,
  timeLimitMinutes?: number | null,
  now = new Date(),
) {
  if (!timeLimitMinutes) {
    return false;
  }

  return now.getTime() > startedAt.getTime() + timeLimitMinutes * 60_000;
}

export function getAttemptDeadline(
  startedAt: Date,
  timeLimitMinutes?: number | null,
) {
  if (!timeLimitMinutes) {
    return null;
  }

  return new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
}

export function scoreMultipleChoice(
  config: MultipleChoiceConfig,
  response: MultipleChoiceResponse,
  points: number,
) {
  const correct = sortValues(config.correctOptionIds);
  const selected = sortValues([...new Set(response.selectedOptionIds)]);

  return JSON.stringify(correct) === JSON.stringify(selected) ? points : 0;
}

export function scoreFillInTheBlank(
  config: FillInTheBlankConfig,
  response: FillInTheBlankResponse,
  points: number,
) {
  if (config.answers.length !== response.blanks.length) {
    return 0;
  }

  const isCorrect = config.answers.every(
    (answer, index) =>
      normalizeTextInput(answer) === normalizeTextInput(response.blanks[index] ?? ""),
  );

  return isCorrect ? points : 0;
}

export function scoreMatching(
  config: MatchingConfig,
  response: MatchingResponse,
  points: number,
) {
  const leftIds = Object.keys(config.correctMatches);

  const isCorrect = leftIds.every(
    (leftId) => config.correctMatches[leftId] === response.pairs[leftId],
  );

  return isCorrect ? points : 0;
}

export function autoScoreQuestion(
  question: Pick<Question, "type" | "points" | "configJson">,
  response: unknown,
) {
  switch (question.type) {
    case QuestionType.MULTIPLE_CHOICE:
      return scoreMultipleChoice(
        question.configJson as MultipleChoiceConfig,
        response as MultipleChoiceResponse,
        question.points,
      );
    case QuestionType.FILL_IN_THE_BLANK:
      return scoreFillInTheBlank(
        question.configJson as FillInTheBlankConfig,
        response as FillInTheBlankResponse,
        question.points,
      );
    case QuestionType.MATCHING:
      return scoreMatching(
        question.configJson as MatchingConfig,
        response as MatchingResponse,
        question.points,
      );
    case QuestionType.ESSAY:
      return null;
  }
}

type AnswerWithQuestion = Pick<Answer, "autoScore" | "manualScore"> & {
  question: Pick<Question, "type">;
};

export function calculateAttemptTotalScore(answers: AnswerWithQuestion[]) {
  return answers.reduce((total, answer) => {
    if (answer.question.type === QuestionType.ESSAY) {
      return total + (answer.manualScore ?? 0);
    }

    return total + (answer.manualScore ?? answer.autoScore ?? 0);
  }, 0);
}

export function hasPendingEssayReview(answers: AnswerWithQuestion[]) {
  return answers.some(
    (answer) =>
      answer.question.type === QuestionType.ESSAY && answer.manualScore === null,
  );
}
