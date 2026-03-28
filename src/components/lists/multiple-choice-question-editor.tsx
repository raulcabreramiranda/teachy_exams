import { Tooltip } from "@/components/ui/tooltip";
import { TrashIcon } from "@/components/ui/icons";
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
      <div className="app-card overflow-x-auto rounded-xl">
        <table className="app-table">
          <thead>
            <tr>
              <th className="px-4 py-3">✅</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {question.config.options.map((option, index) => (
              <tr key={option.id}>
                <td className="px-4 py-3 align-middle">
                  <input
                    type="checkbox"
                    checked={question.config.correctOptionIds.includes(option.id)}
                    onChange={() => toggleCorrectOption(option.id)}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label={`Mark option ${index + 1} as correct`}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={option.text}
                    onChange={(event) => updateOption(index, event.target.value)}
                    className="app-input"
                    placeholder={`Option ${index + 1}`}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Tooltip content="Remove this option">
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      disabled={question.config.options.length <= 2}
                      aria-label="Remove this option"
                      className="app-icon-button h-8 w-8"
                    >
                      <span className="h-4 w-4">
                        <TrashIcon />
                      </span>
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Tooltip content="Add another answer option">
        <button
          type="button"
          onClick={addOption}
          className="app-button-secondary border-dashed px-3 py-1.5 text-xs"
        >
          Add option
        </button>
      </Tooltip>
    </div>
  );
}
