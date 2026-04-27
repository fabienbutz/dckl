export interface ParsedSection {
  heading: string;
  content: string;
  present: boolean;
}

export interface AcceptanceItem {
  line: number;
  text: string;
  checked: boolean;
}

export interface ParsedBody {
  sections: Map<string, ParsedSection>;
  contextFiles: string[];
  dependsOn: number[];
  acceptanceCriteria: AcceptanceItem[];
  warnings: string[];
  raw: string;
}

const REQUIRED_SECTIONS = [
  "Worum es geht",
  "Warum jetzt",
  "Woran man merkt, dass es fertig ist",
] as const;

const OPTIONAL_SECTIONS = ["Context", "Depends on", "Out of scope"] as const;

const ALL_SECTIONS = [...REQUIRED_SECTIONS, ...OPTIONAL_SECTIONS] as const;

const HEADING_RE = /^##\s+(.+?)\s*$/;
const CHECKBOX_RE = /^\s*-\s*\[([ xX])\]\s+(.+?)\s*$/;
const BULLET_RE = /^\s*-\s+(.+?)\s*$/;
const ISSUE_REF_RE = /#(\d+)/g;

const ACCEPTANCE_HEADING_RE = /^Woran man merkt/i;

export function parseIssueBody(body: string): ParsedBody {
  const lines = body.split(/\r?\n/);
  const sections = new Map<string, ParsedSection>();
  const warnings: string[] = [];
  const acceptanceCriteria: AcceptanceItem[] = [];

  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  const flush = () => {
    if (currentHeading !== null) {
      sections.set(currentHeading, {
        heading: currentHeading,
        content: currentContent.join("\n").trim(),
        present: true,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1] ?? null;
      currentContent = [];
      continue;
    }

    if (currentHeading !== null) {
      currentContent.push(line);

      if (ACCEPTANCE_HEADING_RE.test(currentHeading)) {
        const cb = CHECKBOX_RE.exec(line);
        if (cb) {
          acceptanceCriteria.push({
            line: i,
            text: cb[2] ?? "",
            checked: (cb[1] ?? " ").toLowerCase() === "x",
          });
        }
      }
    }
  }
  flush();

  for (const expected of ALL_SECTIONS) {
    if (!sections.has(expected)) {
      sections.set(expected, { heading: expected, content: "", present: false });
      if ((REQUIRED_SECTIONS as readonly string[]).includes(expected)) {
        warnings.push(`Missing section: "## ${expected}"`);
      }
    }
  }

  const contextFiles: string[] = [];
  const ctxSection = sections.get("Context");
  if (ctxSection?.present) {
    for (const line of ctxSection.content.split(/\r?\n/)) {
      const m = BULLET_RE.exec(line);
      if (m?.[1]) contextFiles.push(m[1].trim());
    }
  }

  const dependsOn: number[] = [];
  const depSection = sections.get("Depends on");
  if (depSection?.present) {
    for (const match of depSection.content.matchAll(ISSUE_REF_RE)) {
      const num = Number(match[1]);
      if (!Number.isNaN(num)) dependsOn.push(num);
    }
  }

  return { sections, contextFiles, dependsOn, acceptanceCriteria, warnings, raw: body };
}
