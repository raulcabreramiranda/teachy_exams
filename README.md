# Teachy Exams

Full-stack exam platform built for the Teachy technical challenge with teacher and student flows, automatic and manual grading, multilingual UI, and AI-assisted question drafting.

## Links

- Repository: `https://github.com/raulcabreramiranda/teachy_exams`
- Live demo: `https://teachy-exams.vercel.app/`
- Deploy your own copy on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/raulcabreramiranda/teachy_exams)

## Overview

The project covers the complete exercise-list workflow requested in the challenge:

- Teachers can create, edit, publish, assign, review, and analyze exams
- Students can start attempts, save drafts, submit answers, and view results
- Objective questions can be auto-graded
- Subjective answers can be reviewed manually
- The interface is available in English, Portuguese, and Spanish

## Main Features

### Teacher

- Create, edit, delete, and publish exams
- Add questions with these types:
  - Multiple choice
  - Essay
  - Fill in the blank
  - Matching
- Define:
  - points per question
  - time limit in minutes
  - due date
  - whether objective-only exams should be auto-reviewed
- Assign exams to one or more students
- Manage students
- Review pending submissions through a dedicated review queue
- Inspect reviewed attempts separately
- Reopen or move attempts back to review when needed
- View exam results in a dedicated results tab
- Generate draft questions with Gemini from the Questions tab

### Student

- View assigned exams with status filters
- Start an attempt only while the exam is still available
- See due date, time limit, and remaining time
- Answer all supported question types
- Save draft answers
- Auto-save draft answers while navigating between questions
- Submit the exam
- View final score and teacher feedback after submission/review

### AI Question Generator

- Teachers can generate question drafts with `✨ Generate with AI`
- Supported generated types:
  - Multiple choice
  - Essay
  - Fill in the blank
  - Matching
- Teachers choose:
  - question type
  - difficulty
  - output language
  - points
  - description
- The generated question is previewed first
- Nothing is persisted until the teacher clicks `Use this question` and saves the exam normally
- Gemini requests and responses are logged in the database for traceability

### Internationalization

The UI uses `next-intl` with prefix-based routing:

- `/en`
- `/pt`
- `/es`

Routing rules:

- `/` redirects to `/en`
- UI pages live under `src/app/[locale]/...`
- API routes remain unprefixed under `src/app/api/...`
- The language switcher preserves the current route

## Tech Stack

- Next.js 15 App Router
- TypeScript
- React 19
- Tailwind CSS 4
- Prisma ORM
- PostgreSQL
- Zod
- `next-intl`
- Vitest
- Google Gemini via `@google/genai`

## Architecture Notes

### Authentication

The project uses custom credential authentication with a signed JWT session cookie.

Why:

- only two roles are required: `TEACHER` and `STUDENT`
- the auth flow stays explicit and small
- the same session helpers are consumed by server pages and API routes
- no extra auth tables are required

### Data Model

Main entities:

- `User`
- `ExerciseList`
- `Question`
- `Assignment`
- `Attempt`
- `Answer`
- `AiQuestionGenerationLog`

Important decisions:

- `Question.configJson` stores type-specific question configuration
- `Answer.responseJson` stores type-specific student responses
- `Attempt.assignmentId` is unique, so each assignment has a single attempt
- `Answer` is unique by `attemptId + questionId`
- manual scores use `Float`, allowing partial grading
- AI request/response logs are stored in the database

### Grading Rules

- Multiple choice is graded by comparing the selected option set with the correct set
- Fill in the blank is graded blank-by-blank after text normalization
- Matching is graded by comparing each selected pair to the expected match
- Essay has no automatic score

Final score behavior:

- Essay questions use `manualScore`
- Objective questions use `manualScore ?? autoScore`
- If an exam has pending essay grading, the attempt remains `SUBMITTED`
- If auto-review is disabled, objective-only exams also remain `SUBMITTED` until teacher review

## Project Structure

```text
src/
  app/
    [locale]/
    api/
  components/
    auth/
    layout/
    lists/
    student/
    teacher/
    ui/
  i18n/
  lib/
  services/
  validations/
prisma/
tests/
```

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Required environment variables:

```env
POSTGRES_PRISMA_URL="postgres://..."
AUTH_SECRET="replace-this-with-a-long-random-string"
AUTH_COOKIE_NAME="teachy_session"
GEMINI_API_KEY="your-google-ai-studio-api-key"
GEMINI_MODEL="gemini-2.5-flash"
```

Notes:

- `GEMINI_API_KEY` is only required if you want the AI question generator
- `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`

## Running Locally

Required Node.js version:

```bash
20.9+
```

If you use `nvm`, run:

```bash
nvm use
```

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

Open:

```text
http://localhost:3000
```

The app redirects to `/en`.

## Seeded Accounts

Local seed users:

- Teacher
  - `teacher@teachy.test`
  - `password123`
- Students
  - `bob@teachy.test`
  - `password123`
  - `carol@teachy.test`
  - `password123`

The seed creates published demo exams and student assignments for local testing.

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

## API Summary

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`

### Teacher

- `GET /api/teacher/lists`
- `POST /api/teacher/lists`
- `GET /api/teacher/lists/:id`
- `PATCH /api/teacher/lists/:id`
- `DELETE /api/teacher/lists/:id`
- `POST /api/teacher/lists/:id/assignments`
- `GET /api/teacher/attempts`
- `POST /api/teacher/attempts/:id/grade`
- `POST /api/teacher/attempts/:id/reopen`
- `POST /api/teacher/attempts/:id/ungrade`
- `GET /api/teacher/students`
- `POST /api/teacher/students`
- `PATCH /api/teacher/students/:id`
- `DELETE /api/teacher/students/:id`

### Student

- `POST /api/student/assignments/:id/start`
- `PUT /api/student/attempts/:id/answers`
- `POST /api/student/attempts/:id/submit`

### AI

- `POST /api/ai/generate-question`

## Automated Tests

The project includes unit tests for core domain behavior:

- grading rules and deadline helpers
- reopened-attempt detection
- AI question mapping helpers
- AI service retry behavior when Gemini returns invalid JSON
- create/submit/grade exam workflow simulation

Run all tests:

```bash
npm test
```

Recommended verification before shipping:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deploy Your Own Version on Vercel

You can deploy your own copy from the public repository:

1. Click the Vercel button at the top of this README
2. Import the GitHub repository
3. Configure a PostgreSQL database
4. Add the required environment variables
5. Run the app with Prisma migrations applied to your database

If you want AI generation enabled in your deployment, also configure:

- `GEMINI_API_KEY`
- optional `GEMINI_MODEL`

## Adding or Updating Translations

To add a new translation key:

1. Add the key to:
   - `src/messages/en.json`
   - `src/messages/pt.json`
   - `src/messages/es.json`
2. Read it with:
   - `getTranslations()` in server components
   - `useTranslations()` in client components

To add a new locale:

1. Add the locale to `src/i18n/routing.ts`
2. Create `src/messages/<locale>.json`
3. Update the language switcher labels
4. Adjust formatting fallbacks in `src/lib/format.ts` if needed

## Future Updates

Some good next steps for future versions:

- add end-to-end tests for teacher and student flows
- add pagination and stronger filters for large exam datasets
- add per-question analytics in the results tab
- add optional rubrics for essay grading
- add attempt audit history for teacher actions
- add support for multiple attempts per assignment when product rules require it
- add import/export for exams
- add richer AI generation options such as topic tags and curriculum level
