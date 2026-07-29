import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SCENARIO_DIR = join(ROOT, "scenarios");
const GRAPH_DIR = join(SCENARIO_DIR, "adms");

function titleFromLabel(label) {
  if (label === "standalone_start") return "夢の入口";
  if (label.startsWith("END_")) return label.slice(4).replaceAll("_", " ");
  return label.replaceAll("_", " ");
}

function collectStructure(definition, scenarioName) {
  const steps = Array.isArray(definition.scenario) ? definition.scenario : [];
  const labels = [];

  for (let index = 0; index < steps.length; index += 1) {
    const label = steps[index]?.label;
    if (typeof label === "string" && label.length > 0) {
      labels.push({ id: label, index });
    }
  }

  const edges = [];
  for (let i = 0; i < labels.length; i += 1) {
    const current = labels[i];
    const next = labels[i + 1];
    const segment = steps.slice(current.index + 1, next?.index ?? steps.length);
    const choices = segment.flatMap((step) =>
      Array.isArray(step?.choices) ? step.choices : []
    );

    if (choices.length > 0) {
      for (const choice of choices) {
        if (typeof choice?.goto !== "string" || choice.goto.length === 0) continue;
        edges.push({
          from: current.id,
          to: choice.goto,
          choiceText: String(choice.text || "進む"),
          style: "kenkai",
        });
      }
    } else if (next && !current.id.startsWith("END_")) {
      edges.push({
        from: current.id,
        to: next.id,
        choiceText: "進む",
        style: "kenkai",
      });
    }
  }

  const rootNodeId = labels.some(({ id }) => id === "standalone_start")
    ? "standalone_start"
    : labels[0]?.id;
  const layerById = new Map(rootNodeId ? [[rootNodeId, 0]] : []);
  const queue = rootNodeId ? [rootNodeId] : [];

  while (queue.length > 0) {
    const from = queue.shift();
    const nextLayer = (layerById.get(from) ?? 0) + 1;
    for (const edge of edges.filter((item) => item.from === from)) {
      if (layerById.has(edge.to)) continue;
      layerById.set(edge.to, nextLayer);
      queue.push(edge.to);
    }
  }

  const lanesByLayer = new Map();
  const nodes = labels.map(({ id }, index) => {
    const layer = layerById.get(id) ?? index;
    const laneOffset = lanesByLayer.get(layer) ?? 0;
    lanesByLayer.set(layer, laneOffset + 1);
    const title = definition.mapTitles?.[id] || titleFromLabel(id);

    return {
      id,
      title,
      realm: "kenkai",
      kind:
        id === rootNodeId
          ? "root"
          : id.startsWith("END_")
            ? "ending"
            : id.startsWith("choose_")
              ? "route"
              : "branch",
      layer,
      lane: laneOffset * 4 + 2,
      icon: definition.mapIcons?.[id] || (id.startsWith("END_") ? "●" : "◇"),
      scenario: scenarioName,
      entry: id,
      summary: definition.mapSummaries?.[id] || title,
    };
  });

  return { rootNodeId, nodes, edges };
}

async function main() {
  await mkdir(GRAPH_DIR, { recursive: true });
  const files = (await readdir(SCENARIO_DIR))
    .filter((name) => /^2026-\d{2}-\d{2}_.+\.json$/.test(name))
    .sort();

  const writtenDates = new Set();
  for (const file of files) {
    const scenarioName = basename(file, ".json");
    const raw = await readFile(join(SCENARIO_DIR, file), "utf8");
    const definition = JSON.parse(raw);
    const date = String(definition.date || scenarioName.slice(0, 10));

    if (writtenDates.has(date)) {
      throw new Error(`Multiple curated dreams found for ${date}`);
    }

    const structure = collectStructure(definition, scenarioName);
    if (!structure.rootNodeId || structure.nodes.length === 0) {
      throw new Error(`${file}: no labels found`);
    }

    const graph = {
      date,
      title: `${definition.title} A.D.M.S.`,
      ...structure,
    };
    await writeFile(
      join(GRAPH_DIR, `${date}.json`),
      `${JSON.stringify(graph, null, 2)}\n`,
      "utf8"
    );
    writtenDates.add(date);
  }

  console.log(`Generated ${writtenDates.size} curated dream graphs.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
