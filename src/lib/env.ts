function readEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  authSecret: readEnv("AUTH_SECRET"),
  authCookieName: process.env.AUTH_COOKIE_NAME ?? "teachy_session",
};
