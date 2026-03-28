"use client";

import { useEffect, useRef } from "react";
import { isRichTextEmpty, sanitizeRichTextHtml } from "@/lib/rich-text";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

const toolbarButtons = [
  { label: "Bold", command: "bold" },
  { label: "Italic", command: "italic" },
  { label: "Underline", command: "underline" },
  { label: "Bullets", command: "insertUnorderedList" },
  { label: "Numbers", command: "insertOrderedList" },
  { label: "Clear", command: "removeFormat" },
] as const;

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write here...",
  minHeightClassName = "min-h-36",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  function syncValue() {
    if (!editorRef.current) {
      return;
    }

    const nextValue = sanitizeRichTextHtml(editorRef.current.innerHTML);

    if (editorRef.current.innerHTML !== nextValue) {
      editorRef.current.innerHTML = nextValue;
    }

    onChange(nextValue);
  }

  function runCommand(command: string) {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncValue();
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");

    document.execCommand("insertText", false, text);
    syncValue();
  }

  return (
    <div className="app-card overflow-hidden rounded-xl">
      <div className="app-card-header flex flex-wrap gap-2 px-3 py-2">
        {toolbarButtons.map((button) => (
          <button
            key={button.command}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(button.command)}
            className="app-button-secondary px-2.5 py-1 text-xs"
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="relative bg-white">
        {isRichTextEmpty(value) ? (
          <span className="pointer-events-none absolute left-3 top-3 text-sm text-slate-400">
            {placeholder}
          </span>
        ) : null}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncValue}
          onBlur={syncValue}
          onPaste={handlePaste}
          className={`${minHeightClassName} px-3 py-3 text-sm text-slate-900 outline-none`}
        />
      </div>
    </div>
  );
}
