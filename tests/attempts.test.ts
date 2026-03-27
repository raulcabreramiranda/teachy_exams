import { describe, expect, it } from "vitest";
import { isTeacherReopenedAttempt } from "@/lib/attempts";

describe("attempt helpers", () => {
  it("identifies a reopened attempt by in-progress status with a stored submitted timestamp", () => {
    expect(isTeacherReopenedAttempt("IN_PROGRESS", "2026-03-27T12:00:00.000Z")).toBe(
      true,
    );
  });

  it("does not treat a regular in-progress attempt as reopened", () => {
    expect(isTeacherReopenedAttempt("IN_PROGRESS", null)).toBe(false);
    expect(isTeacherReopenedAttempt("SUBMITTED", "2026-03-27T12:00:00.000Z")).toBe(
      false,
    );
  });
});
