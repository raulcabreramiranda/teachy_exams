"use client";

import { QuestionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EssayQuestionEditor } from "@/components/lists/essay-question-editor";
import { FillInTheBlankQuestionEditor } from "@/components/lists/fill-in-the-blank-question-editor";
import { MatchingQuestionEditor } from "@/components/lists/matching-question-editor";
import { MultipleChoiceQuestionEditor } from "@/components/lists/multiple-choice-question-editor";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "@/lib/sweetalert";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, TrashIcon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
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

type EditorTab = "data" | "questions" | "assignments";

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

const questionTypeLabels: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE]: "Multiple choice",
  [QuestionType.ESSAY]: "Essay",
  [QuestionType.FILL_IN_THE_BLANK]: "Fill in the blank",
  [QuestionType.MATCHING]: "Matching",
};

const editorTabs: Array<{ id: EditorTab; label: string }> = [
  { id: "data", label: "Data" },
  { id: "questions", label: "Questions" },
  { id: "assignments", label: "Assign to students" },
];

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
  const [activeTab, setActiveTab] = useState<EditorTab>("data");
  const [openQuestionIndex, setOpenQuestionIndex] = useState<number | null>(0);
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
    setOpenQuestionIndex((currentOpenQuestionIndex) => {
      if (currentOpenQuestionIndex === null) {
        return null;
      }

      if (currentOpenQuestionIndex === index) {
        return index > 0 ? index - 1 : 0;
      }

      if (currentOpenQuestionIndex > index) {
        return currentOpenQuestionIndex - 1;
      }

      return currentOpenQuestionIndex;
    });
  }

  function addQuestion(type: QuestionType) {
    const nextIndex = questions.length;

    setQuestions((currentQuestions) => [
      ...currentQuestions,
      createDefaultQuestion(type, currentQuestions.length + 1),
    ]);
    setActiveTab("questions");
    setOpenQuestionIndex(nextIndex);
  }

  function changeQuestionType(index: number, type: QuestionType) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, questionIndex) =>
        questionIndex === index ? createDefaultQuestion(type, question.order) : question,
      ),
    );
  }

  function moveQuestion(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= questions.length) {
      return;
    }

    setQuestions((currentQuestions) => {
      const nextQuestions = [...currentQuestions];
      const questionToMove = nextQuestions[index];

      nextQuestions[index] = nextQuestions[targetIndex];
      nextQuestions[targetIndex] = questionToMove;

      return normalizeQuestionOrder(nextQuestions);
    });

    setOpenQuestionIndex((currentOpenQuestionIndex) => {
      if (currentOpenQuestionIndex === index) {
        return targetIndex;
      }

      if (currentOpenQuestionIndex === targetIndex) {
        return index;
      }

      return currentOpenQuestionIndex;
    });
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((currentStudentIds) =>
      currentStudentIds.includes(studentId)
        ? currentStudentIds.filter((id) => id !== studentId)
        : [...currentStudentIds, studentId],
    );
  }

  function toggleQuestionPanel(index: number) {
    setOpenQuestionIndex((currentOpenQuestionIndex) =>
      currentOpenQuestionIndex === index ? null : index,
    );
  }

  async function handleDelete() {
    if (!listId) {
      return;
    }

    const confirmed = await showConfirmAlert({
      title: "Delete exam?",
      text: "This action removes the exam and its assignments permanently.",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    setIsPending(true);

    const response = await fetch(`/api/teacher/lists/${listId}`, {
      method: "DELETE",
    });

    setIsPending(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      await showErrorAlert({
        title: "Unable to delete the exam",
        text: body?.message ?? "Try again in a moment.",
      });
      return;
    }

    await showSuccessAlert({
      title: "Exam deleted",
      text: "The exam was removed successfully.",
      timer: 1000,
    });
    router.push("/professor");
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

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
      await showErrorAlert({
        title: "Unable to save the exam",
        text: listBody?.message ?? "Review the data and try again.",
      });
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
        setActiveTab("assignments");
        await showErrorAlert({
          title: "Assignments failed",
          text:
            assignmentBody?.message ??
            "The exam was saved, but sending it to students failed.",
        });
        return;
      }
    }

    setIsPending(false);
    await showSuccessAlert({
      title: mode === "create" ? "Exam created" : "Exam updated",
      text:
        mode === "create"
          ? "The exam is ready."
          : "Your changes were saved successfully.",
      timer: 1000,
    });

    router.push(`/professor/lists/${listBody.id}/edit`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {editorTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "data" ? (
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
                placeholder="Midterm exam"
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
                Publish this exam after saving
              </span>
            </label>
          </div>
        </section>
      ) : null}

      {activeTab === "questions" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Questions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add one or more questions. Objective questions are graded automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tooltip content="Add a multiple choice question">
              <button
                type="button"
                onClick={() => addQuestion(QuestionType.MULTIPLE_CHOICE)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-slate-900"
              >
                Add MCQ
              </button>
            </Tooltip>
            <Tooltip content="Add an essay question">
              <button
                type="button"
                onClick={() => addQuestion(QuestionType.ESSAY)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-slate-900"
              >
                Add essay
              </button>
            </Tooltip>
            <Tooltip content="Add a fill in the blank question">
              <button
                type="button"
                onClick={() => addQuestion(QuestionType.FILL_IN_THE_BLANK)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-slate-900"
              >
                Add fill blank
              </button>
            </Tooltip>
            <Tooltip content="Add a matching question">
              <button
                type="button"
                onClick={() => addQuestion(QuestionType.MATCHING)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-slate-900"
              >
                Add matching
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {questions.map((question, index) => (
            <article
              key={question.id ?? `${question.type}-${index}`}
              className="overflow-hidden rounded-md border border-slate-200"
            >
              <div className="flex items-start gap-3 bg-slate-100 p-4">
                <button
                  type="button"
                  onClick={() => toggleQuestionPanel(index)}
                  className="flex flex-1 items-start justify-between gap-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                        Question {index + 1}
                      </p>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                        {questionTypeLabels[question.type]}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                        {question.points} {question.points === 1 ? "point" : "points"}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-sm font-medium text-slate-800">
                      {question.prompt.trim() || "Untitled question"}
                    </p>
                  </div>

                  <span
                    className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition ${openQuestionIndex === index ? "rotate-180" : ""}`}
                  >
                    <ChevronDownIcon />
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  <Tooltip content="Move this question up">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, "up")}
                      disabled={index === 0}
                      aria-label="Move this question up"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="h-4 w-4">
                        <ArrowUpIcon />
                      </span>
                    </button>
                  </Tooltip>

                  <Tooltip content="Move this question down">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, "down")}
                      disabled={index === questions.length - 1}
                      aria-label="Move this question down"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="h-4 w-4">
                        <ArrowDownIcon />
                      </span>
                    </button>
                  </Tooltip>

                  <Tooltip content="Remove this question">
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      disabled={questions.length === 1}
                      aria-label="Remove this question"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="h-4 w-4">
                        <TrashIcon />
                      </span>
                    </button>
                  </Tooltip>
                </div>
              </div>

              {openQuestionIndex === index ? (
                <div className="border-t border-slate-200 p-4">
                  <div className="grid gap-3 lg:grid-cols-[180px,120px,minmax(0,1fr)]">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Type
                      </label>
                      <select
                        value={question.type}
                        onChange={(event) =>
                          changeQuestionType(index, event.target.value as QuestionType)
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                      >
                        <option value={QuestionType.MULTIPLE_CHOICE}>Multiple choice</option>
                        <option value={QuestionType.ESSAY}>Essay</option>
                        <option value={QuestionType.FILL_IN_THE_BLANK}>
                          Fill in the blank
                        </option>
                        <option value={QuestionType.MATCHING}>Matching</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Points
                      </label>
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
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        placeholder="1"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Prompt
                      </label>
                      <input
                        value={question.prompt}
                        onChange={(event) =>
                          updateQuestion(index, {
                            ...question,
                            prompt: event.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        placeholder="Question prompt"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
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
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        </section>
      ) : null}

      {activeTab === "assignments" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Assign to students</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select students now to send the exam right after save.
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
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {mode === "edit" ? (
          <Tooltip content="Delete this exam">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete exam
            </button>
          </Tooltip>
        ) : (
          <div />
        )}

        <Tooltip content={mode === "create" ? "Create this exam" : "Save exam changes"}>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? "Saving..."
              : mode === "create"
                ? "Create exam"
                : "Save exam"}
          </button>
        </Tooltip>
      </div>
    </form>
  );
}
