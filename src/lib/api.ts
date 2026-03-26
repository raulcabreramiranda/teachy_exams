import { NextResponse } from "next/server";
import { ZodError, ZodType } from "zod";
import { AppError } from "@/lib/errors";

export async function parseRequestBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Validation failed.",
        issues: error.flatten(),
      },
      { status: 422 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        message: error.message,
      },
      { status: error.statusCode },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      message: "Unexpected server error.",
    },
    { status: 500 },
  );
}
