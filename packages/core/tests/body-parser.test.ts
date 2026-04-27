import { describe, expect, it } from "vitest";
import { parseIssueBody } from "../src/body-parser.js";

describe("parseIssueBody", () => {
  it("parses a complete schema-conforming body", () => {
    const body = `## Worum es geht

Brief description of what this is.

## Warum jetzt

Reason it matters now.

## Woran man merkt, dass es fertig ist

- [ ] First criterion
- [x] Second criterion done

## Context

- packages/core/src/index.ts
- packages/core/src/types.ts

## Depends on

- #42
- #43
`;

    const parsed = parseIssueBody(body);
    expect(parsed.sections.get("Worum es geht")?.present).toBe(true);
    expect(parsed.sections.get("Worum es geht")?.content).toContain("Brief description");
    expect(parsed.contextFiles).toEqual([
      "packages/core/src/index.ts",
      "packages/core/src/types.ts",
    ]);
    expect(parsed.dependsOn).toEqual([42, 43]);
    expect(parsed.acceptanceCriteria).toHaveLength(2);
    expect(parsed.acceptanceCriteria[0]?.checked).toBe(false);
    expect(parsed.acceptanceCriteria[0]?.text).toBe("First criterion");
    expect(parsed.acceptanceCriteria[1]?.checked).toBe(true);
    expect(parsed.warnings).toHaveLength(0);
  });

  it("warns about missing required sections", () => {
    const body = "## Worum es geht\n\nOnly this section.";
    const parsed = parseIssueBody(body);
    expect(parsed.warnings).toContain('Missing section: "## Warum jetzt"');
    expect(parsed.warnings).toContain(
      'Missing section: "## Woran man merkt, dass es fertig ist"',
    );
  });

  it("does not warn about optional sections (Context, Depends on, Out of scope)", () => {
    const body = `## Worum es geht

A

## Warum jetzt

B

## Woran man merkt, dass es fertig ist

- [ ] x
`;
    const parsed = parseIssueBody(body);
    expect(parsed.warnings).toHaveLength(0);
    expect(parsed.sections.get("Context")?.present).toBe(false);
    expect(parsed.sections.get("Depends on")?.present).toBe(false);
    expect(parsed.sections.get("Out of scope")?.present).toBe(false);
  });

  it("returns empty arrays for unstructured bodies", () => {
    const parsed = parseIssueBody("Just a body, no sections at all.");
    expect(parsed.contextFiles).toEqual([]);
    expect(parsed.dependsOn).toEqual([]);
    expect(parsed.acceptanceCriteria).toEqual([]);
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });

  it("handles Windows line endings (CRLF)", () => {
    const body = "## Worum es geht\r\n\r\nA\r\n";
    const parsed = parseIssueBody(body);
    expect(parsed.sections.get("Worum es geht")?.content).toBe("A");
  });

  it("captures multiple issue refs from Depends on body text", () => {
    const body = "## Depends on\n\nThis depends on #100 and also #200, see #300";
    const parsed = parseIssueBody(body);
    expect(parsed.dependsOn).toEqual([100, 200, 300]);
  });

  it("captures checkbox state case-insensitively", () => {
    const body = `## Woran man merkt, dass es fertig ist

- [X] uppercase X is checked
- [ ] empty is not
`;
    const parsed = parseIssueBody(body);
    expect(parsed.acceptanceCriteria[0]?.checked).toBe(true);
    expect(parsed.acceptanceCriteria[1]?.checked).toBe(false);
  });

  it("preserves checkbox line numbers (0-based) for later mutation", () => {
    const body = `## Woran man merkt, dass es fertig ist

- [ ] one
- [ ] two
`;
    const parsed = parseIssueBody(body);
    expect(parsed.acceptanceCriteria[0]?.line).toBe(2);
    expect(parsed.acceptanceCriteria[1]?.line).toBe(3);
  });
});
