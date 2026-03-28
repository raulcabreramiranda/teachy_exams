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
        className="app-textarea"
        placeholder="Add an optional placeholder for the student answer."
      />
    </div>
  );
}
