"use client";

import { useEffect, useState } from "react";

type ScoreStepperProps = {
  value: number | null;
  max: number;
  min?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number | null) => void;
};

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function ScoreStepper({
  value,
  max,
  min = 0,
  step = 1,
  disabled = false,
  onChange,
}: ScoreStepperProps) {
  const [inputValue, setInputValue] = useState(value === null ? "" : formatNumber(value));

  useEffect(() => {
    setInputValue(value === null ? "" : formatNumber(value));
  }, [value]);

  function commitValue(nextValue: number | null) {
    if (nextValue === null) {
      setInputValue("");
      onChange(null);
      return;
    }

    const normalizedValue = clampValue(nextValue, min, max);

    setInputValue(formatNumber(normalizedValue));
    onChange(normalizedValue);
  }

  function handleAdjust(delta: number) {
    const baseValue = value ?? min;
    commitValue(baseValue + delta);
  }

  function handleInputChange(nextRawValue: string) {
    if (nextRawValue === "") {
      setInputValue("");
      onChange(null);
      return;
    }

    if (!/^\d*\.?\d*$/.test(nextRawValue)) {
      return;
    }

    setInputValue(nextRawValue);

    if (nextRawValue === ".") {
      return;
    }

    const parsedValue = Number(nextRawValue);

    if (!Number.isNaN(parsedValue)) {
      onChange(parsedValue);
    }
  }

  function handleBlur() {
    if (inputValue.trim() === "" || inputValue === ".") {
      commitValue(null);
      return;
    }

    const parsedValue = Number(inputValue);

    if (Number.isNaN(parsedValue)) {
      commitValue(value);
      return;
    }

    commitValue(parsedValue);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleAdjust(-step)}
          disabled={disabled}
          aria-label="Decrease score"
          className="app-button-secondary h-9 w-9 text-base"
        >
          -
        </button>

        <div className="relative w-28">
          <input
            value={inputValue}
            onChange={(event) => handleInputChange(event.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            inputMode="decimal"
            aria-label="Manual score"
            className="app-input w-full pr-9 text-right disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="--"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-500">
            / {formatNumber(max)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleAdjust(step)}
          disabled={disabled}
          aria-label="Increase score"
          className="app-button-secondary h-9 w-9 text-base"
        >
          +
        </button>
      </div>
    </div>
  );
}
