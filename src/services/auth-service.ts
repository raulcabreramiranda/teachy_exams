import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import { LoginInput } from "@/validations/auth";

export async function authenticateUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  return user;
}
