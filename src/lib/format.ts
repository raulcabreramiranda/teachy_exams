export function formatDateTime(value?: Date | string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toDateTimeLocalValue(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

export function formatScore(value?: number | null) {
  if (value === null || value === undefined) {
    return "Pending";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
