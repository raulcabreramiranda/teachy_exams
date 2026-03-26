import { Prisma, QuestionType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const [teacher, studentOne, studentTwo] = await Promise.all([
    prisma.user.upsert({
      where: {
        email: "teacher@teachy.test",
      },
      update: {
        name: "Alice Teacher",
        passwordHash,
        role: Role.TEACHER,
        deletedAt: null,
      },
      create: {
        name: "Alice Teacher",
        email: "teacher@teachy.test",
        passwordHash,
        role: Role.TEACHER,
        deletedAt: null,
      },
    }),
    prisma.user.upsert({
      where: {
        email: "bob@teachy.test",
      },
      update: {
        name: "Bob Student",
        passwordHash,
        role: Role.STUDENT,
        deletedAt: null,
      },
      create: {
        name: "Bob Student",
        email: "bob@teachy.test",
        passwordHash,
        role: Role.STUDENT,
        deletedAt: null,
      },
    }),
    prisma.user.upsert({
      where: {
        email: "carol@teachy.test",
      },
      update: {
        name: "Carol Student",
        passwordHash,
        role: Role.STUDENT,
        deletedAt: null,
      },
      create: {
        name: "Carol Student",
        email: "carol@teachy.test",
        passwordHash,
        role: Role.STUDENT,
        deletedAt: null,
      },
    }),
  ]);

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 7);

  const existingList = await prisma.exerciseList.findFirst({
    where: {
      createdById: teacher.id,
      title: "Introduction to General Knowledge",
    },
    select: {
      id: true,
    },
  });

  if (existingList) {
    await prisma.exerciseList.delete({
      where: {
        id: existingList.id,
      },
    });
  }

  const exerciseList = await prisma.exerciseList.create({
    data: {
      title: "Introduction to General Knowledge",
      description: "A seeded exercise list with one question of each supported type.",
      createdById: teacher.id,
      timeLimitMinutes: 60,
      dueAt,
      publishedAt: new Date(),
      questions: {
        create: [
          {
            order: 1,
            type: QuestionType.MULTIPLE_CHOICE,
            prompt: "Which planets are classified as gas giants?",
            points: 2,
            configJson: {
              options: [
                { id: "jupiter", text: "Jupiter" },
                { id: "mars", text: "Mars" },
                { id: "saturn", text: "Saturn" },
                { id: "venus", text: "Venus" },
              ],
              correctOptionIds: ["jupiter", "saturn"],
            } satisfies Prisma.InputJsonValue,
          },
          {
            order: 2,
            type: QuestionType.ESSAY,
            prompt: "Explain why version control is important in software projects.",
            points: 3,
            configJson: {
              placeholder: "Write a short explanation.",
            } satisfies Prisma.InputJsonValue,
          },
          {
            order: 3,
            type: QuestionType.FILL_IN_THE_BLANK,
            prompt: "Complete the sentence.",
            points: 2,
            configJson: {
              template: "The process of removing bugs from code is called {{blank}}.",
              answers: ["debugging"],
            } satisfies Prisma.InputJsonValue,
          },
          {
            order: 4,
            type: QuestionType.MATCHING,
            prompt: "Match each concept to its description.",
            points: 3,
            configJson: {
              leftItems: [
                { id: "html", label: "HTML" },
                { id: "css", label: "CSS" },
                { id: "js", label: "JavaScript" },
              ],
              rightItems: [
                { id: "structure", label: "Provides structure" },
                { id: "behavior", label: "Adds behavior" },
                { id: "style", label: "Controls presentation" },
              ],
              correctMatches: {
                html: "structure",
                css: "style",
                js: "behavior",
              },
            } satisfies Prisma.InputJsonValue,
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  await prisma.assignment.createMany({
    data: [
      { listId: exerciseList.id, studentId: studentOne.id },
      { listId: exerciseList.id, studentId: studentTwo.id },
    ],
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
