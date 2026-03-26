import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

async function getJwtSecret() {
  return new TextEncoder().encode(env.authSecret);
}

export async function createSessionToken(session: SessionUser) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(await getJwtSecret());

  return { token, expiresAt };
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, await getJwtSecret());

    if (
      typeof payload.userId !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== Role.TEACHER && payload.role !== Role.STUDENT)
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

function sessionCookieOptions(expiresAt?: Date) {
  return {
    name: env.authCookieName,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  };
}

export function setSessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: Date },
) {
  response.cookies.set({
    ...sessionCookieOptions(session.expiresAt),
    value: session.token,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    ...sessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.authCookieName)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function getSessionFromRequest(request: NextRequest | Request) {
  const cookieHeader =
    request instanceof NextRequest
      ? request.cookies.get(env.authCookieName)?.value
      : request.headers
          .get("cookie")
          ?.split(";")
          .map((entry) => entry.trim())
          .find((entry) => entry.startsWith(`${env.authCookieName}=`))
          ?.split("=")
          .slice(1)
          .join("=");

  if (!cookieHeader) {
    return null;
  }

  return verifySessionToken(cookieHeader);
}

export async function requirePageSession(roles?: Role[]) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (roles && !roles.includes(session.role)) {
    redirect(session.role === Role.TEACHER ? "/professor" : "/aluno");
  }

  return session;
}

export async function getOptionalPageSession() {
  return getCurrentSession();
}

export async function requireApiSession(
  request: NextRequest | Request,
  roles?: Role[],
) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    throw new AppError("You must be signed in to access this resource.", 401);
  }

  if (roles && !roles.includes(session.role)) {
    throw new AppError("You do not have permission to access this resource.", 403);
  }

  return session;
}
