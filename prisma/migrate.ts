import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");

  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");

        if (separatorIndex === -1) {
          return [line, ""];
        }

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        return [key, value];
      }),
  );
}

function runPsql(databaseUrl: string, args: string[], captureOutput = false) {
  return execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    stdio: captureOutput ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: captureOutput ? "utf8" : undefined,
  });
}

function main() {
  const envFromFile = parseEnvFile(path.resolve(process.cwd(), ".env"));
  const databaseUrl =
    process.env.POSTGRES_PRISMA_URL ?? envFromFile.POSTGRES_PRISMA_URL;

  if (!databaseUrl) {
    throw new Error("Missing POSTGRES_PRISMA_URL.");
  }

  const cleanDatabaseUrl = databaseUrl.replace("&pgbouncer=true", "");
  const migrationsDirectory = path.resolve(process.cwd(), "prisma/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .sort((left, right) => left.localeCompare(right))
    .map((directoryName) => ({
      name: directoryName,
      filePath: path.join(migrationsDirectory, directoryName, "migration.sql"),
    }))
    .filter((entry) => fs.existsSync(entry.filePath));

  runPsql(cleanDatabaseUrl, [
    "-c",
    'CREATE TABLE IF NOT EXISTS "_app_migrations" (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());',
  ]);

  const appliedMigrationsOutput = runPsql(
    cleanDatabaseUrl,
    ["-At", "-c", 'SELECT name FROM "_app_migrations" ORDER BY name;'],
    true,
  ) as string;

  const appliedMigrations = new Set(
    appliedMigrationsOutput
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  );

  for (const migration of migrationFiles) {
    if (appliedMigrations.has(migration.name)) {
      console.log(`Skipping already applied migration: ${migration.name}`);
      continue;
    }

    console.log(`Applying migration: ${migration.name}`);
    runPsql(cleanDatabaseUrl, ["-f", migration.filePath]);

    const safeMigrationName = migration.name.replaceAll("'", "''");
    runPsql(cleanDatabaseUrl, [
      "-c",
      `INSERT INTO "_app_migrations" (name) VALUES ('${safeMigrationName}') ON CONFLICT (name) DO NOTHING;`,
    ]);
  }

  console.log("Migrations applied successfully.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
