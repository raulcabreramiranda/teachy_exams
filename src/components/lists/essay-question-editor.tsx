import type { QuestionInput } from "@/validations/exercise";

type EssayQuestion = Extract<QuestionInput, { type: "ESSAY" }>;

type EssayQuestionEditorProps = {
  question: EssayQuestion;
  onChange: (question: EssayQuestion) => void;
};

export function EssayQuestionEditor({
  question,
  onChange,
}: EssayQuestionEditorProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        Placeholder
      </label>
      <textarea
        value={question.config.placeholder ?? ""}
        onChange={(event) =>
          onChange({
            ...question,
            config: {
              placeholder: event.target.value,
            },
          })
        }
        rows={3}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        placeholder="Add an optional placeholder for the student answer."
      />
    </div>
  );
}
