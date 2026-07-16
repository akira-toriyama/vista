import { describe, expect, it } from "vitest";
import { asTaskId, isTaskId } from "./task-id";

describe("isTaskId", () => {
  it.each(["t-2tbn", "t-0007", "t-fw2m"])("accepts %s", (value) => {
    expect(isTaskId(value)).toBe(true);
  });

  it.each(["", "t-", "2tbn", "T-2TBN", "t-2tbn ", "x-2tbn"])(
    "rejects %j",
    (value) => {
      expect(isTaskId(value)).toBe(false);
    },
  );
});

describe("asTaskId", () => {
  it("returns the value for a valid id", () => {
    expect(asTaskId("t-2tbn")).toBe("t-2tbn");
  });

  it("throws for an invalid id", () => {
    expect(() => asTaskId("nope")).toThrow(/invalid task id/);
  });
});
