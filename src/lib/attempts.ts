export function isTeacherReopenedAttempt(
  status: string,
  submittedAt: Date | string | null | undefined,
) {
  return status === "IN_PROGRESS" && submittedAt !== null && submittedAt !== undefined;
}
