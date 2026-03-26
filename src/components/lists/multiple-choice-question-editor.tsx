import type { QuestionInput } from "@/validations/exercise";

type MultipleChoiceQuestion = Extract<
  QuestionInput,
  { type: "MULTIPLE_CHOICE" }
>;

type MultipleChoiceQuestionEditorProps = {
  question: MultipleChoiceQuestion;
  onChange: (question: MultipleChoiceQuestion) => void;
};

export function MultipleChoiceQuestionEditor({
  question,
  onChange,
}: MultipleChoiceQuestionEditorProps) {
  function updateOption(index: number, text: string) {
    const nextOptions = question.config.options.map((option, optionIndex) =>
      optionIndex === index ? { ...option, text } : option,
    );

    onChange({
      ...question,
      config: {
        ...question.config,
        options: nextOptions,
      },
    });
  }

  function toggleCorrectOption(optionId: string) {
    const currentIds = new Set(question.config.correctOptionIds);

    if (currentIds.has(optionId)) {
      currentIds.delete(optionId);
    } else {
      currentIds.add(optionId);
    }

    onChange({
      ...question,
      config: {
        ...question.config,
        correctOptionIds: [...currentIds],
      },
    });
  }

  function addOption() {
    onChange({
      ...question,
      config: {
        ...question.config,
        options: [
          ...question.config.options,
          {
            id: crypto.randomUUID(),
            text: "",
          },
        ],
      },
    });
  }

  function removeOption(index: number) {
    const optionToRemove = question.config.options[index];
    const nextOptions = question.config.options.filter(
      (_, optionIndex) => optionIndex !== index,
    );

    onChange({
      ...question,
      config: {
        options: nextOptions,
        correctOptionIds: question.config.correctOptionIds.filter(
          (correctId) => correctId !== optionToRemove.id,
        ),
      },
    });
  }

  return (
    <div className="space-y-3">
      {question.config.options.map((option, index) => (
        <div
          key={option.id}
          className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[auto,1fr,auto]"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={question.config.correctOptionIds.includes(option.id)}
              onChange={() => toggleCorrectOption(option.id)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Correct
          </label>

          <input
            value={option.text}
            onChange={(event) => updateOption(index, event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            placeholder={`Option ${index + 1}`}
          />

          <button
            type="button"
            onClick={() => removeOption(index)}
            disabled={question.config.options.length <= 2}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addOption}
        className="rounded-md border border-dashed border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
      >
        Add option
      </button>
    </div>
  );
}
