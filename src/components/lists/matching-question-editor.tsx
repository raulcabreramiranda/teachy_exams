import type { QuestionInput } from "@/validations/exercise";

type MatchingQuestion = Extract<QuestionInput, { type: "MATCHING" }>;

type MatchingQuestionEditorProps = {
  question: MatchingQuestion;
  onChange: (question: MatchingQuestion) => void;
};

export function MatchingQuestionEditor({
  question,
  onChange,
}: MatchingQuestionEditorProps) {
  function updateLeftLabel(index: number, label: string) {
    onChange({
      ...question,
      config: {
        ...question.config,
        leftItems: question.config.leftItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, label } : item,
        ),
      },
    });
  }

  function updateRightLabel(index: number, label: string) {
    onChange({
      ...question,
      config: {
        ...question.config,
        rightItems: question.config.rightItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, label } : item,
        ),
      },
    });
  }

  function updateCorrectMatch(leftId: string, rightId: string) {
    onChange({
      ...question,
      config: {
        ...question.config,
        correctMatches: {
          ...question.config.correctMatches,
          [leftId]: rightId,
        },
      },
    });
  }

  function addLeftItem() {
    const id = crypto.randomUUID();

    onChange({
      ...question,
      config: {
        ...question.config,
        leftItems: [...question.config.leftItems, { id, label: "" }],
        correctMatches: {
          ...question.config.correctMatches,
          [id]: question.config.rightItems[0]?.id ?? "",
        },
      },
    });
  }

  function addRightItem() {
    const id = crypto.randomUUID();

    onChange({
      ...question,
      config: {
        ...question.config,
        rightItems: [...question.config.rightItems, { id, label: "" }],
        correctMatches: Object.fromEntries(
          Object.entries(question.config.correctMatches).map(([leftId, rightId]) => [
            leftId,
            rightId || id,
          ]),
        ),
      },
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Left column</p>
          <button
            type="button"
            onClick={addLeftItem}
            className="rounded-md border border-dashed border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-900"
          >
            Add left item
          </button>
        </div>

        {question.config.leftItems.map((item, index) => (
          <div
            key={item.id}
            className="rounded-md border border-slate-200 p-3"
          >
            <input
              value={item.label}
              onChange={(event) => updateLeftLabel(index, event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              placeholder={`Left item ${index + 1}`}
            />

            <div className="mt-3">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Correct match
              </label>
              <select
                value={question.config.correctMatches[item.id] ?? ""}
                onChange={(event) => updateCorrectMatch(item.id, event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              >
                {question.config.rightItems.map((rightItem) => (
                  <option key={rightItem.id} value={rightItem.id}>
                    {rightItem.label || "Unnamed right item"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Right column</p>
          <button
            type="button"
            onClick={addRightItem}
            className="rounded-md border border-dashed border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-900"
          >
            Add right item
          </button>
        </div>

        {question.config.rightItems.map((item, index) => (
          <div
            key={item.id}
            className="rounded-md border border-slate-200 p-3"
          >
            <input
              value={item.label}
              onChange={(event) => updateRightLabel(index, event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              placeholder={`Right item ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
