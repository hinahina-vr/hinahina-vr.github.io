import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIARY_DIR = join(ROOT, "diary");
const GRAPH_DIR = join(ROOT, "scenarios", "adms");
const SCENARIO_DIR = join(ROOT, "scenarios");
const DREAM_REQUIRED_SINCE = "2026-03-18";

const scenarioLabelCache = new Map();

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function getScenarioLabels(scenarioName) {
  if (scenarioLabelCache.has(scenarioName)) {
    return scenarioLabelCache.get(scenarioName);
  }

  const filePath = join(SCENARIO_DIR, `${scenarioName}.json`);
  const definition = await readJson(filePath);
  const labels = new Set();

  for (const step of definition.scenario || []) {
    if (typeof step?.label === "string" && step.label.length > 0) {
      labels.add(step.label);
    }
  }

  scenarioLabelCache.set(scenarioName, labels);
  return labels;
}

function collectReachable(rootNodeId, edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, []);
    }
    adjacency.get(edge.from).push(edge.to);
  }

  const reachable = new Set([rootNodeId]);
  const queue = [rootNodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    const nextNodes = adjacency.get(current) || [];
    for (const nextNodeId of nextNodes) {
      if (reachable.has(nextNodeId)) {
        continue;
      }
      reachable.add(nextNodeId);
      queue.push(nextNodeId);
    }
  }

  return reachable;
}

async function validateGraph(graphFile) {
  const filePath = join(GRAPH_DIR, graphFile);
  const graph = await readJson(filePath);
  const errors = [];
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];

  if (!graph.rootNodeId) {
    errors.push(`${graphFile}: rootNodeId is missing`);
  }

  if (nodes.length === 0) {
    errors.push(`${graphFile}: nodes[] is empty`);
  }

  const nodeMap = new Map();
  for (const node of nodes) {
    if (!node?.id) {
      errors.push(`${graphFile}: node without id`);
      continue;
    }
    if (nodeMap.has(node.id)) {
      errors.push(`${graphFile}: duplicate node id "${node.id}"`);
      continue;
    }
    nodeMap.set(node.id, node);

    if (typeof node.layer !== "number" || typeof node.lane !== "number") {
      errors.push(`${graphFile}: node "${node.id}" must have numeric layer/lane`);
    }

    if (!node.scenario || typeof node.scenario !== "string") {
      errors.push(`${graphFile}: node "${node.id}" is missing scenario`);
      continue;
    }

    const scenarioPath = join(SCENARIO_DIR, `${node.scenario}.json`);
    if (!existsSync(scenarioPath)) {
      errors.push(`${graphFile}: node "${node.id}" points to missing scenario "${node.scenario}"`);
      continue;
    }

    if (typeof node.entry === "string" && node.entry.length > 0) {
      const labels = await getScenarioLabels(node.scenario);
      if (!labels.has(node.entry)) {
        errors.push(
          `${graphFile}: node "${node.id}" points to missing label "${node.entry}" in "${node.scenario}.json"`
        );
      }
    }
  }

  if (graph.rootNodeId && !nodeMap.has(graph.rootNodeId)) {
    errors.push(`${graphFile}: root node "${graph.rootNodeId}" does not exist`);
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.from)) {
      errors.push(`${graphFile}: edge source "${edge.from}" does not exist`);
    }
    if (!nodeMap.has(edge.to)) {
      errors.push(`${graphFile}: edge target "${edge.to}" does not exist`);
    }
  }

  if (graph.rootNodeId && nodeMap.has(graph.rootNodeId)) {
    const reachable = collectReachable(graph.rootNodeId, edges);
    for (const nodeId of nodeMap.keys()) {
      if (!reachable.has(nodeId)) {
        errors.push(`${graphFile}: node "${nodeId}" is not reachable from root "${graph.rootNodeId}"`);
      }
    }
  }

  return {
    graphFile,
    errors,
    nodeCount: nodeMap.size,
    edgeCount: edges.length,
  };
}

async function main() {
  const files = (await readdir(GRAPH_DIR))
    .filter((name) => name.endsWith(".json"))
    .sort();

  const results = [];
  for (const file of files) {
    results.push(await validateGraph(file));
  }

  const errors = results.flatMap((result) => result.errors);
  const graphDates = new Set(files.map((file) => file.replace(/\.json$/, "")));
  const diaryFiles = (await readdir(DIARY_DIR))
    .filter((name) => /^\d{4}-\d{2}-\d{2}_.+\.md$/.test(name))
    .sort();

  for (const diaryFile of diaryFiles) {
    const date = diaryFile.slice(0, 10);
    if (date < DREAM_REQUIRED_SINCE) {
      continue;
    }
    if (!graphDates.has(date)) {
      errors.push(`${diaryFile}: missing dream graph scenarios/adms/${date}.json`);
    }
  }

  if (errors.length > 0) {
    console.error("Dream graph validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  for (const result of results) {
    console.log(`✓ ${result.graphFile} (${result.nodeCount} nodes / ${result.edgeCount} edges)`);
  }
  console.log(`✓ ${results.length} dream graphs validated`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
