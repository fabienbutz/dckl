import { Store } from "@dckl/server";
import { findDcklRoot } from "@dckl/server/storage";

export type JourneyNewOptions = {
  name?: string;
  description?: string;
};

const SLUG_REGEX = /^[a-z0-9][a-z0-9-_]*$/i;

export async function runJourneyNew(
  slug: string,
  options: JourneyNewOptions = {},
): Promise<void> {
  const dcklRoot = findDcklRoot(process.cwd());
  if (!dcklRoot) {
    console.error("[dckl journey] no .dckl/ found — run `dckl init` first");
    process.exitCode = 1;
    return;
  }

  if (!SLUG_REGEX.test(slug)) {
    console.error(
      `[dckl journey] slug "${slug}" must be alphanumeric with dashes/underscores, starting with a letter or digit`,
    );
    process.exitCode = 1;
    return;
  }
  if (slug.length > 64) {
    console.error("[dckl journey] slug too long (max 64 chars)");
    process.exitCode = 1;
    return;
  }

  const store = new Store(dcklRoot);
  const name = options.name ?? defaultNameFromSlug(slug);

  try {
    const { journey } = await store.createJourney({
      id: slug,
      name,
      description: options.description,
      steps: [],
    });
    const path = `.dckl/journeys/${journey.meta.id}.md`;
    console.log(`[dckl journey] created ${path}`);
    console.log(`                 name: ${journey.meta.name}`);
    console.log("                 edit the file to add steps (see SKILL.md → Creating a journey).");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[dckl journey] create failed: ${msg}`);
    process.exitCode = 1;
  }
}

export async function runJourneyList(): Promise<void> {
  const dcklRoot = findDcklRoot(process.cwd());
  if (!dcklRoot) {
    console.error("[dckl journey] no .dckl/ found");
    process.exitCode = 1;
    return;
  }
  const store = new Store(dcklRoot);
  const journeys = await store.listJourneys();
  if (journeys.length === 0) {
    console.log("[dckl journey] no journeys yet. Create one with `dckl journey new <slug>`.");
    return;
  }
  for (const j of journeys) {
    const done = j.steps.filter((s) => s.status === "done").length;
    const broken = j.steps.filter((s) => s.status === "broken").length;
    console.log(
      `  ${j.id.padEnd(24)}  ${done}/${j.steps.length} done${broken > 0 ? `  ${broken} broken` : ""}  · ${j.name}`,
    );
  }
}

function defaultNameFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
