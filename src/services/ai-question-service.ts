import { GoogleGenAI } from "@google/genai";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { AiQuestionGenerationInput, AiGeneratedQuestion } from "@/validations/ai";
import {
  aiGeneratedQuestionJsonSchema,
  aiGeneratedQuestionSchema,
} from "@/validations/ai";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const baseSystemInstruction = [
  "You generate a single exam question for teachers.",
  "Return JSON only. Do not include markdown, code fences, or explanations.",
  "All human-readable content must be in the requested language.",
  "Keep the question concise and classroom-ready.",
  "Use plain text only for the prompt and answer text.",
  "For MULTIPLE_CHOICE, provide clear options and zero-based correctOptionIndexes.",
  'For FILL_IN_THE_BLANK, use the exact token "{{blank}}" once for each blank.',
  "For MATCHING, create short left and right lists and cover every left item in matches.",
] as const;

type AiQuestionGenerationLogStatus =
  | "PENDING"
  | "SUCCESS"
  | "INVALID_RESPONSE"
  | "ERROR";

class InvalidAiResponseError extends Error {}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AppError(
      "The AI question generator is not configured. Add GEMINI_API_KEY to your environment.",
      500,
    );
  }

  return new GoogleGenAI({ apiKey });
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function buildSystemInstruction(strictRetry: boolean) {
  return strictRetry
    ? [
        ...baseSystemInstruction,
        "The response must be parseable JSON that matches the provided schema exactly.",
      ].join("\n")
    : baseSystemInstruction.join("\n");
}

function buildPrompt(input: AiQuestionGenerationInput, strictRetry = false) {
  return [
    strictRetry
      ? "Your previous response was invalid. You MUST output valid JSON only."
      : "Generate one exam question from the request below.",
    "",
    `Type: ${input.type}`,
    `Difficulty: ${input.difficulty}`,
    `Language: ${input.language}`,
    `Points: ${input.points}`,
    `Teacher description: ${input.description}`,
    "",
    "Question-type rules:",
    "- MULTIPLE_CHOICE: include 4 to 6 options, and at least 1 correct option.",
    "- ESSAY: include a helpful sampleAnswer for teacher reference.",
    '- FILL_IN_THE_BLANK: include a template with "{{blank}}" tokens and matching blanks.',
    "- MATCHING: include at least 3 left items and 3 right items with zero-based matches.",
  ].join("\n");
}

function buildGeminiRequestBody(
  input: AiQuestionGenerationInput,
  strictRetry: boolean,
) {
  return {
    contents: buildPrompt(input, strictRetry),
    config: {
      systemInstruction: buildSystemInstruction(strictRetry),
      responseMimeType: "application/json",
      responseJsonSchema: aiGeneratedQuestionJsonSchema,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };
}

function escapeForSingleQuotedShell(value: string) {
  return value.replace(/'/g, `'\"'\"'`);
}

function buildGeminiCurlCommand(model: string, body: ReturnType<typeof buildGeminiRequestBody>) {
  return [
    `curl "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent" \\`,
    '  -H "x-goog-api-key: [REDACTED]" \\',
    '  -H "Content-Type: application/json" \\',
    "  -X POST \\",
    `  -d '${escapeForSingleQuotedShell(JSON.stringify(body))}'`,
  ].join("\n");
}

async function logGeminiRequest(
  requestedById: string,
  model: string,
  body: ReturnType<typeof buildGeminiRequestBody>,
  strictRetry: boolean,
) {
  return prisma.aiQuestionGenerationLog.create({
    data: {
      requestedById,
      model,
      requestJson: JSON.parse(
        JSON.stringify({
          curl: buildGeminiCurlCommand(model, body),
          body,
        }),
      ) as Prisma.InputJsonValue,
      status: "PENDING",
      strictRetry,
    },
  });
}

async function logGeminiResponse(
  logId: string,
  input: {
    status: AiQuestionGenerationLogStatus;
    rawText?: string;
    responseJson?: AiGeneratedQuestion;
    errorMessage?: string;
  },
) {
  return prisma.aiQuestionGenerationLog.update({
    where: { id: logId },
    data: {
      status: input.status,
      responseText: input.rawText?.trim() || null,
      responseJson: input.responseJson
        ? (JSON.parse(JSON.stringify(input.responseJson)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      errorMessage: input.errorMessage ?? null,
    },
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected AI request error.";
}

function normalizeAiJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function requestAiQuestion(
  requestedById: string,
  client: GoogleGenAI,
  input: AiQuestionGenerationInput,
  strictRetry = false,
): Promise<AiGeneratedQuestion> {
  const model = getGeminiModel();
  const body = buildGeminiRequestBody(input, strictRetry);
  const logEntry = await logGeminiRequest(requestedById, model, body, strictRetry);

  let response;

  try {
    response = await client.models.generateContent({
      model,
      ...body,
    });
  } catch (error) {
    await logGeminiResponse(logEntry.id, {
      status: "ERROR",
      errorMessage: getErrorMessage(error),
    });
    throw error;
  }

  const rawText = response.text;

  if (!rawText) {
    await logGeminiResponse(logEntry.id, {
      status: "INVALID_RESPONSE",
      errorMessage: "The AI response was empty.",
    });
    throw new InvalidAiResponseError("The AI response was empty.");
  }

  try {
    const parsedQuestion = aiGeneratedQuestionSchema.parse(
      JSON.parse(normalizeAiJson(rawText)),
    );

    await logGeminiResponse(logEntry.id, {
      status: "SUCCESS",
      rawText,
      responseJson: parsedQuestion,
    });

    return parsedQuestion;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      await logGeminiResponse(logEntry.id, {
        status: "INVALID_RESPONSE",
        rawText,
        errorMessage: "The AI response was not valid structured JSON.",
      });
      throw new InvalidAiResponseError("The AI response was not valid structured JSON.");
    }

    await logGeminiResponse(logEntry.id, {
      status: "ERROR",
      rawText,
      errorMessage: getErrorMessage(error),
    });
    throw error;
  }
}

export async function generateAiQuestion(
  requestedById: string,
  input: AiQuestionGenerationInput,
) {
  const client = getGeminiClient();

  try {
    return await requestAiQuestion(requestedById, client, input);
  } catch (error) {
    if (!(error instanceof InvalidAiResponseError)) {
      throw new AppError("Unable to generate a question right now.", 502);
    }
  }

  try {
    return await requestAiQuestion(requestedById, client, input, true);
  } catch (error) {
    if (error instanceof InvalidAiResponseError) {
      throw new AppError(
        "The AI response could not be parsed. Please try again with a more specific description.",
        502,
      );
    }

    throw new AppError("Unable to generate a question right now.", 502);
  }
}
