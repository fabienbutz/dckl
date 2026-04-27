import { describe, expect, it } from "vitest";
import { stripTime, stripTimeFromArray } from "../src/time-strip.js";

describe("stripTime", () => {
  it("removes top-level date fields", () => {
    const input = {
      number: 42,
      title: "test",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      closed_at: null,
    };
    expect(stripTime(input)).toEqual({ number: 42, title: "test" });
  });

  it("removes date fields recursively", () => {
    const input = {
      issue: { number: 1, created_at: "x" },
      milestone: { title: "v1", due_on: "2026-12-31" },
    };
    expect(stripTime(input)).toEqual({
      issue: { number: 1 },
      milestone: { title: "v1" },
    });
  });

  it("processes arrays of objects", () => {
    const input = [
      { id: 1, created_at: "x" },
      { id: 2, updated_at: "y" },
    ];
    expect(stripTimeFromArray(input)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("preserves non-date fields", () => {
    const input = { number: 0, body: "", labels: [], assignee: null };
    expect(stripTime(input)).toEqual(input);
  });

  it("handles null and undefined", () => {
    expect(stripTime(null)).toBeNull();
    expect(stripTime(undefined)).toBeUndefined();
  });

  it("handles primitive values", () => {
    expect(stripTime(42)).toBe(42);
    expect(stripTime("hello")).toBe("hello");
    expect(stripTime(true)).toBe(true);
  });

  it("removes pull-request and review timestamps too", () => {
    const input = { state: "merged", merged_at: "x", submitted_at: "y", pushed_at: "z" };
    expect(stripTime(input)).toEqual({ state: "merged" });
  });

  it("strips dates from nested arrays inside objects", () => {
    const input = {
      milestone: { title: "v1", due_on: "2026-12-31" },
      issues: [
        { number: 1, created_at: "a", labels: [{ name: "bug", created_at: "b" }] },
      ],
    };
    expect(stripTime(input)).toEqual({
      milestone: { title: "v1" },
      issues: [{ number: 1, labels: [{ name: "bug" }] }],
    });
  });

  it("does not mutate the input", () => {
    const input = { number: 1, created_at: "x" };
    stripTime(input);
    expect(input).toEqual({ number: 1, created_at: "x" });
  });
});
