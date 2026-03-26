"use client";

import { QuestionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EssayQuestionEditor } from "@/components/lists/essay-question-editor";
import { FillInTheBlankQuestionEditor } from "@/components/lists/fill-in-the-blank-question-editor";
import { MatchingQuestionEditor } from "@/components/lists/matching-question-editor";
import { MultipleChoiceQuestionEditor } from "@/components/lists/multiple-choice-question-editor";
import type { QuestionInput } from "@/validations/exercise";

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

type ExerciseListEditorProps = {
  mode: "create" | "edit";
  listId?: string;
  students: StudentOption[];
  initialValue?: {
    title: string;
    description: string;
    timeLimitMinutes: string;
    dueAt: string;
    publish: boolean;
    questions: QuestionInput[];
    selectedStudentIds: string[];
  };
};

type ExerciseListInitialValue = NonNullable<
  ExerciseListEditorProps["initialValue"]
>;

function createDefaultQuestion(type: QuestionType, order: number): QuestionInput {
  switch (type) {
    case QuestionType.MULTIPLE_CHOICE:
      return {
        order,
        type,
        prompt: "",
        points: 1,
        config: {
          options: [
            { id: crypto.randomUUID(), text: "" },
            { id: crypto.randomUUID(), text: "" },
          ],
          correctOptionIds: [],
        },
      };
    case QuestionType.ESSAY:
      return {
        order,
        type,
        prompt: "",
        points: 1,
        config: {
          placeholder: "",
        },
      };
    case QuestionType.FILL_IN_THE_BLANK:
      return {
        order,
        type,
        prompt: "",
        points: 1,
        config: {
          template: "Use {{blank}} in the sentence.",
          answers: [""],
        },
      };
    case QuestionType.MATCHING:
      return {
        order,
        type,
        prompt: "",
        points: 1,
        config: {
          leftItems: [{ id: crypto.randomUUID(), label: "" }],
          rightItems: [{ id: crypto.randomUUID(), label: "" }],
          correctMatches: {},
        },
      };
  }
}

const emptyInitialValue: ExerciseListInitialValue = {
  title: "",
  description: "",
  timeLimitMinutes: "",
  dueAt: "",
  publish: false,
  questions: [createDefaultQuestion(QuestionType.MULTIPLE_CHOICE, 1)],
  selectedStudentIds: [],
};

export function ExerciseListEditor({
  mode,
  listId,
  students,
  initialValue,
}: ExerciseListEditorProps) {
  const router = useRouter();
  const startingValue = initialValue ?? emptyInitialValue;
  const [title, setTitle] = useState(startingValue.title);
  const [description, setDescription] = useState(startingValue.description);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    startingValue.timeLimitMinutes,
  );
  const [dueAt, setDueAt] = useState(startingValue.dueAt);
  const [publish, setPublish] = useState(startingValue.publish);
  const [questions, setQuestions] = useState<QuestionInput[]>(
    startingValue.questions.length > 0
      ? startingValue.questions
      : emptyInitialValue.questions,
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    startingValue.selectedStudentIds,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const assignedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(student.id)),
    [selectedStudentIds, students],
  );

  function normalizeQuestionOrder(nextQuestions: QuestionInput[]) {
    return nextQuestions.map((question, index) => ({
      ...question,
      order: index + 1,
    }));
  }

  function updateQuestion(index: number, nextQuestion: QuestionInput) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, questionIndex) =>
        questionIndex === index ? nextQuestion : question,
      ),
    );
  }

  function removeQuestion(index: number) {
    setQuestions((currentQuestions) =>
      normalizeQuestionOrder(
        currentQuestions.filter((_, questionIndex) => questionIndex !== index),
      ),
    );
  }

  function addQuestion(type: QuestionType) {
    setQuestions((currentQuestions) => [
      ...currentQuestions,
      createDefaultQuestion(type, currentQuestions.length + 1),
    ]);
  }

  function changeQuestionType(index: number, type: QuestionType) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, questionIndex) =>
        questionIndex === index ? createDefaultQuestion(type, question.order) : question,
      ),
    );
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((currentStudentIds) =>
      currentStudentIds.includes(studentId)
        ? currentStudentIds.filter((id) => id !== studentId)
        : [...currentStudentIds, studentId],
    );
  }

  async function handleDelete() {
    if (!listId || !window.confirm("Delete this exercise list?")) {
      return;
    }

    setIsPending(true);
    setError(null);

    const response = await fetch(`/api/teacher/lists/${listId}`, {
      method: "DELETE",
    });

    setIsPending(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Unable to delete the list.");
      return;
    }

    router.push("/professor");
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);
    setMessage(null);

    const payload = {
      title,
      description: description || null,
      timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      publish,
      questions,
    };

    const listResponse = await fetch(
      mode === "create" ? "/api/teacher/lists" : `/api/teacher/lists/${listId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const listBody = (await listResponse.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null;

    if (!listResponse.ok || !listBody?.id) {
      setIsPending(false);
      setError(listBody?.message ?? "Unable to save the exercise list.");
      return;
    }

    if (selectedStudentIds.length > 0) {
      const assignmentResponse = await fetch(
        `/api/teacher/lists/${listBody.id}/assignments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentIds: selectedStudentIds,
          }),
        },
      );

      if (!assignmentResponse.ok) {
        const assignmentBody = (await assignmentResponse.json().catch(() => null)) as
          | { message?: string }
          | null;
        setIsPending(false);
        setError(assignmentBody?.message ?? "The list was saved, but assignments failed.");
        return;
      }
    }

    setIsPending(false);
    setMessage(
      mode === "create"
        ? "Exercise list created successfully."
        : "Exercise list updated successfully.",
    );

    router.push(`/professor/lists/${listBody.id}/edit`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              placeholder="Midterm practice list"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              placeholder="Add a short description for students."
            />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Time limit in minutes
            </label>
            <input
              value={timeLimitMinutes}
              onChange={(event) => setTimeLimitMinutes(event.target.value)}
              type="number"
              min={1}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              placeholder="60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Due date
            </label>
            <input
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              type="datetime-local"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-3">
            <input
              checked={publish}
              onChange={(event) => setPublish(event.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">
              Publish this list after saving
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Questions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add one or more questions. Objective questions are graded automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addQuestion(QuestionType.MULTIPLE_CHOICE)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-slate-900"
            >
              Add MCQ
            </button>
            <button
              type="button"
              onClick={() => addQuestion(QuestionType.ESSAY)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-slate-900"
            >
              Add essay
            </button>
            <button
              type="button"
              onClick={() => addQuestion(QuestionType.FILL_IN_THE_BLANK)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-slate-900"
            >
              Add fill blank
            </button>
            <button
              type="button"
              onClick={() => addQuestion(QuestionType.MATCHING)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-slate-900"
            >
              Add matching
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {questions.map((question, index) => (
            <article
              key={question.id ?? `${question.type}-${index}`}
              className="rounded-md border border-slate-200 p-4"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Question {index + 1}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr),140px,160px]">
                    <input
                      value={question.prompt}
                      onChange={(event) =>
                        updateQuestion(index, {
                          ...question,
                          prompt: event.target.value,
                        })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                      placeholder="Question prompt"
                    />
                    <input
                      value={question.points}
                      onChange={(event) =>
                        updateQuestion(index, {
                          ...question,
                          points: Number(event.target.value || 1),
                        })
                      }
                      type="number"
                      min={0.5}
                      step={0.5}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                      placeholder="Points"
                    />
                    <select
                      value={question.type}
                      onChange={(event) =>
                        changeQuestionType(index, event.target.value as QuestionType)
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    >
                      <option value={QuestionType.MULTIPLE_CHOICE}>Multiple choice</option>
                      <option value={QuestionType.ESSAY}>Essay</option>
                      <option value={QuestionType.FILL_IN_THE_BLANK}>
                        Fill in the blank
                      </option>
                      <option value={QuestionType.MATCHING}>Matching</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  disabled={questions.length === 1}
                  className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove question
                </button>
              </div>

              {question.type === QuestionType.MULTIPLE_CHOICE ? (
                <MultipleChoiceQuestionEditor
                  question={question}
                  onChange={(nextQuestion) => updateQuestion(index, nextQuestion)}
                />
              ) : null}

              {question.type === QuestionType.ESSAY ? (
                <EssayQuestionEditor
                  question={question}
                  onChange={(nextQuestion) => updateQuestion(index, nextQuestion)}
                />
              ) : null}

              {question.type === QuestionType.FILL_IN_THE_BLANK ? (
                <FillInTheBlankQuestionEditor
                  question={question}
                  onChange={(nextQuestion) => updateQuestion(index, nextQuestion)}
                />
              ) : null}

              {question.type === QuestionType.MATCHING ? (
                <MatchingQuestionEditor
                  question={question}
                  onChange={(nextQuestion) => updateQuestion(index, nextQuestion)}
                />
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Assign to students</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select students now to send the list right after save.
            </p>
          </div>

          <div className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
            {assignedStudents.length} selected
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {students.map((student) => (
            <label
              key={student.id}
              className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3"
            >
              <input
                checked={selectedStudentIds.includes(student.id)}
                onChange={() => toggleStudent(student.id)}
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm">
                <span className="block font-medium text-slate-800">{student.name}</span>
                <span className="block text-slate-500">{student.email}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete list
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create list"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
