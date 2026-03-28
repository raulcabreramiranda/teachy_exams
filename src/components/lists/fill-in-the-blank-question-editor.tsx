import { getFillBlankCount } from "@/lib/question-helpers";
import type { QuestionInput } from "@/validations/exercise";

type FillInTheBlankQuestion = Extract<
  QuestionInput,
  { type: "FILL_IN_THE_BLANK" }
>;

type FillInTheBlankQuestionEditorProps = {
  question: FillInTheBlankQuestion;
  onChange: (question: FillInTheBlankQuestion) => void;
};

export function FillInTheBlankQuestionEditor({
  question,
  onChange,
}: FillInTheBlankQuestionEditorProps) {
  function syncAnswers(template: string) {
    const nextCount = Math.max(getFillBlankCount(template), 1);
    const nextAnswers = Array.from({ length: nextCount }, (_, index) => {
      return question.config.answers[index] ?? "";
    });

    onChange({
      ...question,
      config: {
        ...question.config,
        template,
        answers: nextAnswers,
      },
    });
  }

  function updateAnswer(index: number, value: string) {
    onChange({
      ...question,
      config: {
        ...question.config,
        answers: question.config.answers.map((answer, answerIndex) =>
          answerIndex === index ? value : answer,
        ),
      },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Template
        </label>
        <textarea
          value={question.config.template}
          onChange={(event) => syncAnswers(event.target.value)}
          rows={4}
          className="app-textarea"
          placeholder="Use {{blank}} wherever students should type an answer."
        />
        <p className="mt-2 text-xs text-slate-500">
          Use <span className="font-semibold">{`{{blank}}`}</span> once for each blank.
        </p>
      </div>

      <div className="grid gap-3">
        {question.config.answers.map((answer, index) => (
          <div key={`${question.order}-${index}`}>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Blank {index + 1} answer
            </label>
            <input
              value={answer}
              onChange={(event) => updateAnswer(index, event.target.value)}
              className="app-input"
              placeholder={`Expected answer for blank ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
