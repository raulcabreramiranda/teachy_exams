function resolveLocale(locale?: string) {
  return locale || "en";
}

function getLocalizedFallback(
  locale: string | undefined,
  kind: "notSet" | "pending",
) {
  const normalizedLocale = resolveLocale(locale);

  if (normalizedLocale.startsWith("pt")) {
    return kind === "notSet" ? "Não definido" : "Pendente";
  }

  if (normalizedLocale.startsWith("es")) {
    return kind === "notSet" ? "Sin definir" : "Pendiente";
  }

  return kind === "notSet" ? "Not set" : "Pending";
}

export function formatDateTime(value?: Date | string | null, locale?: string) {
  if (!value) {
    return getLocalizedFallback(locale, "notSet");
  }

  return new Intl.DateTimeFormat(resolveLocale(locale), {
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

export function formatScore(value?: number | null, locale?: string) {
  if (value === null || value === undefined) {
    return getLocalizedFallback(locale, "pending");
  }

  return new Intl.NumberFormat(resolveLocale(locale), {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}
