CREATE TABLE "AiQuestionGenerationLog" (
  "id" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "requestJson" JSONB NOT NULL,
  "responseText" TEXT,
  "responseJson" JSONB,
  "status" TEXT NOT NULL,
  "strictRetry" BOOLEAN NOT NULL DEFAULT false,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiQuestionGenerationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiQuestionGenerationLog_requestedById_createdAt_idx"
  ON "AiQuestionGenerationLog"("requestedById", "createdAt");

CREATE INDEX "AiQuestionGenerationLog_status_createdAt_idx"
  ON "AiQuestionGenerationLog"("status", "createdAt");

ALTER TABLE "AiQuestionGenerationLog"
  ADD CONSTRAINT "AiQuestionGenerationLog_requestedById_fkey"
  FOREIGN KEY ("requestedById")
  REFERENCES "User"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
