# Teachy Exercise Lists

Full-stack exercise list manager built with Next.js App Router, TypeScript, Prisma, PostgreSQL, and Tailwind CSS.

## Features

- Teacher flow
  - Create, update, delete, and publish exercise lists
  - Create and edit questions for all required types
  - Assign lists to existing students
  - Review submitted attempts
  - Grade essay answers manually and add feedback
- Student flow
  - Review assigned lists and attempt rules
  - Start a timed attempt
  - Save answers and submit the attempt
  - View scores and feedback after submission
- Supported question types
  - Multiple choice with one or more correct answers
  - Essay
  - Fill in the blank
  - Matching columns
- Optional list rules
  - `timeLimitMinutes`
  - `dueAt`

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- Custom auth with signed JWT session cookie (`httpOnly`) and RBAC
- Vitest for unit tests

## Auth Decision

The project uses custom session auth instead of NextAuth.

Reasoning:

- The scope only needs credentials login plus RBAC for `TEACHER` and `STUDENT`.
- A signed JWT in an `httpOnly` cookie keeps the implementation small and explicit.
- Route handlers and server pages both consume the same session helpers.
- No extra auth tables are required in Prisma.

## Prisma Model

Main entities:

- `User`
- `ExerciseList`
- `Question`
- `Assignment`
- `Attempt`
- `Answer`

Important modeling decisions:

- `Question.configJson` stores type-specific configuration.
- `Answer.responseJson` stores the student response in a type-specific shape.
- `Attempt.assignmentId` is unique, so each assignment has a single attempt.
- `Answer` is unique by `attemptId + questionId`.
- Float scores are used so teachers can assign partial manual credit when needed.

## Auto-grading Rules

- Multiple choice
  - Compares the selected option set against the correct option set.
  - Order does not matter.
- Fill in the blank
  - Compares blank-by-blank after `trim()` + `lowercase`.
- Matching
  - Compares each left item to its expected right item.
- Essay
  - No automatic score.
  - Teacher sets `manualScore` and optional feedback later.

Total attempt score:

- Objective questions use `autoScore`.
- Essay questions use `manualScore`.
- The attempt stays `SUBMITTED` while essay grading is pending.
- The attempt becomes `GRADED` after all essay answers are manually corrected.

## Project Structure

```text
src/
  app/
    api/
    aluno/
    professor/
    login/
  components/
    auth/
    layout/
    lists/
    student/
    teacher/
  lib/
  services/
  validations/
prisma/
tests/
```

## Environment

Copy the example file:

```bash
cp .env.example .env
```

Required variables:

```env
POSTGRES_PRISMA_URL="postgres://..."
AUTH_SECRET="replace-this-with-a-long-random-string"
AUTH_COOKIE_NAME="teachy_session"
```

## Running the Project

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Apply migrations:

```bash
npm run prisma:migrate
```

Seed the database:

```bash
npm run prisma:seed
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Seeded Accounts

- Teacher
  - `teacher@teachy.test`
  - `password123`
- Students
  - `bob@teachy.test`
  - `password123`
  - `carol@teachy.test`
  - `password123`

The seed also creates one published exercise list with all four question types and assigns it to both students.

## Available Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Validation

The following checks should pass before shipping:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## API Summary

Teacher routes:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/teacher/lists`
- `POST /api/teacher/lists`
- `GET /api/teacher/lists/:id`
- `PATCH /api/teacher/lists/:id`
- `DELETE /api/teacher/lists/:id`
- `POST /api/teacher/lists/:id/assignments`
- `GET /api/teacher/attempts`
- `POST /api/teacher/attempts/:id/grade`

Student routes:

- `POST /api/student/assignments/:id/start`
- `PUT /api/student/attempts/:id/answers`
- `POST /api/student/attempts/:id/submit`

## Future Improvements

- Add integration and end-to-end tests
- Add attempt audit trail and teacher action history
- Add per-question manual override for objective answers
- Add finer permission checks and middleware-based route gating
- Improve list editing protections after assignment
- Add richer UI feedback, pagination, and search
- Add multiple attempts per assignment if the product rules change
