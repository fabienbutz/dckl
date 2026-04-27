import { describe, expect, it } from "vitest";
import { buildIssueBody, toggleCheckbox } from "../src/body-builder.js";
import { parseIssueBody } from "../src/body-parser.js";

describe("buildIssueBody", () => {
  it("builds a body that round-trips through the parser without warnings", () => {
    const built = buildIssueBody({
      worumEsGeht: "Beschreibung",
      warumJetzt: "Warum",
      acceptanceCriteria: [
        { text: "first", checked: false },
        { text: "second", checked: true },
      ],
      context: ["a.ts", "b.ts"],
      dependsOn: [10, 20],
    });
    const parsed = parseIssueBody(built);
    expect(parsed.warnings).toHaveLength(0);
    expect(parsed.contextFiles).toEqual(["a.ts", "b.ts"]);
    expect(parsed.dependsOn).toEqual([10, 20]);
    expect(parsed.acceptanceCriteria.map((a) => a.checked)).toEqual([false, true]);
    expect(parsed.acceptanceCriteria.map((a) => a.text)).toEqual(["first", "second"]);
  });

  it("emits a placeholder when no acceptance criteria provided", () => {
    const built = buildIssueBody({
      worumEsGeht: "x",
      warumJetzt: "y",
      acceptanceCriteria: [],
    });
    expect(built).toContain("(no acceptance criteria yet)");
  });

  it("omits Context and Depends on when those inputs are empty", () => {
    const built = buildIssueBody({
      worumEsGeht: "x",
      warumJetzt: "y",
      acceptanceCriteria: [],
    });
    expect(built).not.toContain("## Context");
    expect(built).not.toContain("## Depends on");
  });

  it("emits Out of scope as an HTML comment block", () => {
    const built = buildIssueBody({
      worumEsGeht: "x",
      warumJetzt: "y",
      acceptanceCriteria: [],
      outOfScope: "Things we are not doing.",
    });
    expect(built).toContain("<!-- Out of scope");
    expect(built).toContain("Things we are not doing.");
    expect(built).toContain("-->");
  });

  it("trims whitespace from input fields", () => {
    const built = buildIssueBody({
      worumEsGeht: "  what  \n",
      warumJetzt: "\t why  ",
      acceptanceCriteria: [{ text: "  spaced  ", checked: false }],
    });
    expect(built).toContain("\nwhat\n");
    expect(built).toContain("\nwhy\n");
    expect(built).toContain("- [ ] spaced");
  });
});

describe("toggleCheckbox", () => {
  const body = `## Woran man merkt, dass es fertig ist

- [ ] Implement parser
- [x] Write tests
- [ ] Update docs
`;

  it("toggles an unchecked box matching the pattern", () => {
    const result = toggleCheckbox(body, "implement parser");
    expect(result.toggled).toBe(true);
    expect(result.newState).toBe(true);
    expect(result.body).toContain("- [x] Implement parser");
    expect(result.matchedText).toBe("Implement parser");
  });

  it("toggles a checked box back to unchecked", () => {
    const result = toggleCheckbox(body, "Write tests");
    expect(result.toggled).toBe(true);
    expect(result.newState).toBe(false);
    expect(result.body).toContain("- [ ] Write tests");
  });

  it("returns toggled: false when no match", () => {
    const result = toggleCheckbox(body, "nonexistent");
    expect(result.toggled).toBe(false);
    expect(result.newState).toBeNull();
    expect(result.matchedText).toBeNull();
    expect(result.body).toBe(body);
  });

  it("matches case-insensitively and on substrings", () => {
    const result = toggleCheckbox(body, "DOCS");
    expect(result.toggled).toBe(true);
    expect(result.matchedText).toBe("Update docs");
  });

  it("only toggles the first match", () => {
    const dup = `- [ ] alpha
- [ ] alpha`;
    const result = toggleCheckbox(dup, "alpha");
    const checked = (result.body.match(/\[x\]/g) ?? []).length;
    expect(checked).toBe(1);
  });

  it("returns unchanged body for empty pattern", () => {
    const result = toggleCheckbox(body, "");
    expect(result.toggled).toBe(false);
    expect(result.body).toBe(body);
  });
});
