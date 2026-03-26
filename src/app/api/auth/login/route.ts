import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { handleRouteError, parseRequestBody } from "@/lib/api";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { authenticateUser } from "@/services/auth-service";
import { loginSchema } from "@/validations/auth";

export async function POST(request: Request) {
  try {
    const input = await parseRequestBody(request, loginSchema);
    const user = await authenticateUser(input);
    const session = await createSessionToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      redirectTo: user.role === Role.TEACHER ? "/professor" : "/aluno",
    });

    setSessionCookie(response, session);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
