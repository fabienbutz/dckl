export interface AcceptanceCriterionInput {
  text: string;
  checked: boolean;
}

export interface BodyInput {
  worumEsGeht: string;
  warumJetzt: string;
  acceptanceCriteria: AcceptanceCriterionInput[];
  context?: string[];
  dependsOn?: number[];
  outOfScope?: string;
}

export function buildIssueBody(input: BodyInput): string {
  const parts: string[] = [];

  parts.push(`## Worum es geht\n\n${input.worumEsGeht.trim()}`);
  parts.push(`## Warum jetzt\n\n${input.warumJetzt.trim()}`);

  const criteria =
    input.acceptanceCriteria.length === 0
      ? "- [ ] (no acceptance criteria yet)"
      : input.acceptanceCriteria
          .map((c) => `- [${c.checked ? "x" : " "}] ${c.text.trim()}`)
          .join("\n");
  parts.push(`## Woran man merkt, dass es fertig ist\n\n${criteria}`);

  if (input.context && input.context.length > 0) {
    const lines = input.context.map((p) => `- ${p}`).join("\n");
    parts.push(`## Context\n\n${lines}`);
  }

  if (input.dependsOn && input.dependsOn.length > 0) {
    const lines = input.dependsOn.map((n) => `- #${n}`).join("\n");
    parts.push(`## Depends on\n\n${lines}`);
  }

  if (input.outOfScope) {
    parts.push(`<!-- Out of scope\n${input.outOfScope.trim()}\n-->`);
  }

  return `${parts.join("\n\n")}\n`;
}

export interface ToggleResult {
  body: string;
  toggled: boolean;
  newState: boolean | null;
  matchedText: string | null;
}

const TOGGLE_RE = /^(\s*-\s*\[)([ xX])(\]\s+)(.+?)\s*$/;

export function toggleCheckbox(body: string, pattern: string): ToggleResult {
  const trimmedPattern = pattern.trim().toLowerCase();
  if (trimmedPattern.length === 0) {
    return { body, toggled: false, newState: null, matchedText: null };
  }

  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = TOGGLE_RE.exec(line);
    if (!m) continue;
    const text = (m[4] ?? "").trim();
    if (!text.toLowerCase().includes(trimmedPattern)) continue;
    const wasChecked = (m[2] ?? " ").toLowerCase() === "x";
    const next = !wasChecked;
    lines[i] = `${m[1]}${next ? "x" : " "}${m[3]}${m[4]}`;
    return {
      body: lines.join("\n"),
      toggled: true,
      newState: next,
      matchedText: text,
    };
  }

  return { body, toggled: false, newState: null, matchedText: null };
}
