export function normalizeTextInput(value: string) {
  return value.trim().toLowerCase();
}

export function getFillBlankCount(template: string) {
  return template.split("{{blank}}").length - 1;
}
