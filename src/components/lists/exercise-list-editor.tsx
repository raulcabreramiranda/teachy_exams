"use client";

import { QuestionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EssayQuestionEditor } from "@/components/lists/essay-question-editor";
import { FillInTheBlankQuestionEditor } from "@/components/lists/fill-in-the-blank-question-editor";
import { MatchingQuestionEditor } from "@/components/lists/matching-question-editor";
import { MultipleChoiceQuestionEditor } from "@/components/lists/multiple-choice-question-editor";
import { Modal } from "@/components/ui/modal";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "@/lib/sweetalert";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, TrashIcon } from "@/components/ui/icons";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Tooltip } from "@/components/ui/tooltip";
import { getRichTextPreview, isRichTextEmpty } from "@/lib/rich-text";
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

type QuestionDraft = {
  type: QuestionType;
  points: number;
  prompt: string;
};

function getEmptyQuestionDraft(): QuestionDraft {
  return {
    type: QuestionType.MULTIPLE_CHOICE,
    points: 1,
    prompt: "",
  };
}

function createDefaultQuestion(
  type: QuestionType,
  order: number,
  metadata?: {
    id?: string;
    prompt?: string;
    points?: number;
  },
): QuestionInput {
  const id = metadata?.id;
  const prompt = metadata?.prompt ?? "";
  const points = metadata?.points ?? 1;

  switch (type) {
    case QuestionType.MULTIPLE_CHOICE:
      return {
        id,
        order,
        type: QuestionType.MULTIPLE_CHOICE,
        prompt,
        points,
        config: {
          options: [
            { id: crypto.randomUUID(), text: "" },
            { id: crypto.randomUUID(), text: "" },
          ],
          correctOptionIds: [] as string[],
        },
      };
    case QuestionType.ESSAY:
      return {
        id,
        order,
        type: QuestionType.ESSAY,
        prompt,
        points,
        config: {
          placeholder: "",
        },
      };
    case QuestionType.FILL_IN_THE_BLANK:
      return {
        id,
        order,
        type: QuestionType.FILL_IN_THE_BLANK,
        prompt,
        points,
        config: {
          template: "Use {{blank}} in the sentence.",
          answers: [""],
        },
      };
    case QuestionType.MATCHING:
      return {
        id,
        order,
        type: QuestionType.MATCHING,
        prompt,
        points,
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
  questions: [],
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
  const [studentFilter, setStudentFilter] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    startingValue.selectedStudentIds,
  );
  const [activeTab, setActiveTab] = useState<EditorTab>("data");
  const [openQuestionIndex, setOpenQuestionIndex] = useState<number | null>(
    startingValue.questions.length > 0 ? 0 : null,
  );
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [newQuestionDraft, setNewQuestionDraft] = useState<QuestionDraft>(
    getEmptyQuestionDraft(),
  );
  const [isPending, setIsPending] = useState(false);

  const assignedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(student.id)),
    [selectedStudentIds, students],
  );
  const filteredStudents = useMemo(() => {
    const normalizedFilter = studentFilter.trim().toLowerCase();

    if (!normalizedFilter) {
      return students;
    }

    return students.filter((student) => {
      const haystack = `${student.name} ${student.email}`.toLowerCase();

      return haystack.includes(normalizedFilter);
    });
  }, [studentFilter, students]);

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
      if (questions.length <= 1) {
        return null;
      }

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

  function addQuestion(questionDraft: QuestionDraft) {
    const nextIndex = questions.length;

    setQuestions((currentQuestions) => [
      ...currentQuestions,
      createDefaultQuestion(questionDraft.type, currentQuestions.length + 1, {
        prompt: questionDraft.prompt,
        points: questionDraft.points,
      }),
    ]);
    setActiveTab("questions");
    setOpenQuestionIndex(nextIndex);
    setIsQuestionModalOpen(false);
    setNewQuestionDraft(getEmptyQuestionDraft());
  }

  function changeQuestionType(index: number, type: QuestionType) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, questionIndex) =>
        questionIndex === index
          ? createDefaultQuestion(type, question.order, {
              id: question.id,
              prompt: question.prompt,
              points: question.points,
            })
          : question,
      ),
    );
  }

  function openAddQuestionModal() {
    setNewQuestionDraft(getEmptyQuestionDraft());
    setIsQuestionModalOpen(true);
  }

  function closeAddQuestionModal() {
    setIsQuestionModalOpen(false);
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
            className={`app-toggle-button px-3 py-2 ${
              activeTab === tab.id
                ? "app-toggle-button-active"
                : ""
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "data" ? (
        <section className="app-card grid gap-4 p-4 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="app-input"
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
                className="app-textarea"
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
                className="app-input"
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
                className="app-input"
              />
            </div>

            <label className="app-panel flex items-center gap-3 px-3 py-3">
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
        <section className="app-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Questions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add one or more questions. Objective questions are graded automatically.
            </p>
          </div>

          <Tooltip content="Add a new question">
            <button
              type="button"
              onClick={openAddQuestionModal}
              className="app-button-secondary px-3 py-1.5 text-xs"
            >
              Add question
            </button>
          </Tooltip>
        </div>

        <div className="mt-8 space-y-6">
          {questions.length === 0 ? (
            <div className="app-empty-state px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No questions yet.</p>
              <p className="mt-1 text-sm text-slate-500">
                Use the button above to create the first question.
              </p>
            </div>
          ) : null}

          {questions.map((question, index) => (
            <article
              key={question.id ?? `${question.type}-${index}`}
              className="app-card overflow-hidden rounded-xl"
            >
              <div className="app-card-header flex items-start gap-3 p-4">
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
                      <span className="app-badge">
                        {questionTypeLabels[question.type]}
                      </span>
                      <span className="app-badge app-badge-info">
                        {question.points} {question.points === 1 ? "point" : "points"}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-sm font-medium text-slate-800">
                      {getRichTextPreview(question.prompt) || "Untitled question"}
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
                      className="app-icon-button h-8 w-8"
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
                      className="app-icon-button h-8 w-8"
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
                      className="app-button-danger h-8 w-8"
                    >
                      <span className="h-4 w-4">
                        <TrashIcon />
                      </span>
                    </button>
                  </Tooltip>
                </div>
              </div>

              {openQuestionIndex === index ? (
                <div className="border-t border-[var(--border)] p-4">
                  <div className="grid gap-4 md:grid-cols-[240px,minmax(0,1fr)]">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Type
                        </label>
                        <select
                          value={question.type}
                          onChange={(event) =>
                            changeQuestionType(index, event.target.value as QuestionType)
                          }
                          className="app-select"
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
                          Point
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
                          className="app-input"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Prompt
                      </label>
                      <RichTextEditor
                        value={question.prompt}
                        onChange={(prompt) =>
                          updateQuestion(index, {
                            ...question,
                            prompt,
                          })
                        }
                        placeholder="Write the question prompt"
                        minHeightClassName="min-h-40"
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

        <Modal
          open={isQuestionModalOpen}
          title="Add question"
          onClose={closeAddQuestionModal}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[220px,minmax(0,1fr)]">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Type
                  </label>
                  <select
                    value={newQuestionDraft.type}
                    onChange={(event) =>
                      setNewQuestionDraft((currentDraft) => ({
                        ...currentDraft,
                        type: event.target.value as QuestionType,
                      }))
                    }
                    className="app-select"
                  >
                    <option value={QuestionType.MULTIPLE_CHOICE}>Multiple choice</option>
                    <option value={QuestionType.ESSAY}>Essay</option>
                    <option value={QuestionType.FILL_IN_THE_BLANK}>Fill in the blank</option>
                    <option value={QuestionType.MATCHING}>Matching</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Point
                  </label>
                  <input
                    value={newQuestionDraft.points}
                    onChange={(event) =>
                      setNewQuestionDraft((currentDraft) => ({
                        ...currentDraft,
                        points: Number(event.target.value || 1),
                      }))
                    }
                    type="number"
                    min={0.5}
                    step={0.5}
                    className="app-input"
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Prompt
                </label>
                <RichTextEditor
                  value={newQuestionDraft.prompt}
                  onChange={(prompt) =>
                    setNewQuestionDraft((currentDraft) => ({
                      ...currentDraft,
                      prompt,
                    }))
                  }
                  placeholder="Write the question prompt"
                  minHeightClassName="min-h-40"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeAddQuestionModal}
                className="app-button-secondary px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addQuestion(newQuestionDraft)}
                disabled={isRichTextEmpty(newQuestionDraft.prompt)}
                className="app-button-primary px-3 py-2"
              >
                Add question
              </button>
            </div>
          </div>
        </Modal>
        </section>
      ) : null}

      {activeTab === "assignments" ? (
        <section className="app-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Assign to students</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select students now to send the exam right after save.
            </p>
          </div>

          <div className="app-badge app-badge-info">
            {assignedStudents.length} selected
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="max-w-md">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Filter students
            </label>
            <input
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
              className="app-input"
              placeholder="Search by name or email"
            />
          </div>

          <div className="app-card overflow-x-auto rounded-xl">
            <table className="app-table">
              <thead>
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-center">Assign</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                      <td className="px-4 py-3 text-slate-600">{student.email}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          type="checkbox"
                          aria-label={`Assign exam to ${student.name}`}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      No students found for the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
              className="app-button-danger px-3 py-2"
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
            className="app-button-primary px-4 py-2"
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
