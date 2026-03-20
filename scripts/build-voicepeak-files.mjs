import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, dirname, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CONFIG_PATH = join(ROOT, "voicepeak", "voicepeak.config.json");

function padNumber(value, digits) {
  return String(value).padStart(digits, "0");
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function sanitizeVoicepeakText(text, config) {
  return asString(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, config.lineBreakReplacement)
    .replace(/\t/g, config.tabReplacement)
    .replace(/,/g, config.commaReplacement)
    .trim();
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\n") + "\n";
}

function buildVoiceIdFactory(strategy, digits) {
  if (strategy === "speaker-sequence") {
    const counts = new Map();
    return (speakerKey) => {
      const next = (counts.get(speakerKey) || 0) + 1;
      counts.set(speakerKey, next);
      return padNumber(next, digits);
    };
  }

  let next = 0;
  return () => {
    next += 1;
    return padNumber(next, digits);
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function buildScenarioFiles(config, scenarioId, scenarioConfig) {
  const sourcePath = join(ROOT, scenarioConfig.source);
  const scenario = await readJson(sourcePath);
  const chars = asObject(scenario.chars);
  const steps = Array.isArray(scenario.scenario) ? scenario.scenario : [];
  const generatedRoot = join(ROOT, config.generatedRoot, scenarioId);
  const importRoot = join(generatedRoot, "import");
  const digits = Number.isFinite(config.defaultVoiceIdPadding) ? config.defaultVoiceIdPadding : 3;
  const nextVoiceId = buildVoiceIdFactory(scenarioConfig.voiceIdStrategy, digits);
  const importRowsBySpeaker = new Map();
  const manifestRows = [
    [
      "scenarioId",
      "audioNamespace",
      "speaker",
      "characterName",
      "voicepeakNarrator",
      "preset",
      "stepIndex",
      "voiceId",
      "exportFileName",
      "runtimeRelativePath",
      "textForVoicepeak",
      "sourceText"
    ]
  ];

  await rm(generatedRoot, { recursive: true, force: true });
  await ensureDir(importRoot);

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const step = steps[stepIndex];
    if (!step || typeof step !== "object" || !Object.prototype.hasOwnProperty.call(step, "text")) {
      continue;
    }

    const speaker = asString(step.speaker, "narrator").trim() || "narrator";
    const speakerConfig = asObject(scenarioConfig.speakers?.[speaker]);
    const voicepeakNarrator = asString(speakerConfig.voicepeakNarrator, "ナレーター名を入力");
    const preset = asString(speakerConfig.preset).trim();
    const characterName = asString(chars[speaker]?.name, speaker);
    const textForVoicepeak = sanitizeVoicepeakText(step.text, config);
    const voiceId = nextVoiceId(speaker, stepIndex);
    const exportFileName = `${voiceId}.${config.defaultAudioFormat}`;
    const runtimeRelativePath = join(
      config.runtimeAudioRoot,
      scenarioConfig.audioNamespace,
      speaker,
      exportFileName
    ).replaceAll("\\", "/");

    if (!importRowsBySpeaker.has(speaker)) {
      importRowsBySpeaker.set(speaker, []);
    }

    const importColumns = preset
      ? [voicepeakNarrator, textForVoicepeak, preset]
      : [voicepeakNarrator, textForVoicepeak];
    importRowsBySpeaker.get(speaker).push(importColumns.join("\t"));

    manifestRows.push([
      scenarioId,
      scenarioConfig.audioNamespace,
      speaker,
      characterName,
      voicepeakNarrator,
      preset,
      stepIndex,
      voiceId,
      exportFileName,
      runtimeRelativePath,
      textForVoicepeak,
      asString(step.text).replace(/\r\n/g, "\n")
    ]);
  }

  for (const [speaker, lines] of importRowsBySpeaker.entries()) {
    const filePath = join(importRoot, `${speaker}.txt`);
    await ensureDir(dirname(filePath));
    await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  }

  const manifestCsvPath = join(generatedRoot, "export-manifest.csv");
  await writeFile(manifestCsvPath, toCsv(manifestRows), "utf8");

  const manifestJsonPath = join(generatedRoot, "export-manifest.json");
  await writeFile(
    manifestJsonPath,
    JSON.stringify(
      {
        scenarioId,
        source: relative(ROOT, sourcePath).replaceAll("\\", "/"),
        audioNamespace: scenarioConfig.audioNamespace,
        generatedAt: new Date().toISOString(),
        rows: manifestRows.slice(1).map((row) => ({
          scenarioId: row[0],
          audioNamespace: row[1],
          speaker: row[2],
          characterName: row[3],
          voicepeakNarrator: row[4],
          preset: row[5],
          stepIndex: row[6],
          voiceId: row[7],
          exportFileName: row[8],
          runtimeRelativePath: row[9],
          textForVoicepeak: row[10],
          sourceText: row[11]
        }))
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  const readmePath = join(generatedRoot, "README.txt");
  await writeFile(
    readmePath,
    [
      `Scenario: ${scenarioId}`,
      `Audio namespace: ${scenarioConfig.audioNamespace}`,
      "",
      "Files:",
      "- import/<speaker>.txt : VOICEPEAK セリフ一覧インポート用 (タブ区切り)",
      "- export-manifest.csv : 書き出しファイル名対応表",
      "",
      "Export rule:",
      `- place exported files under ${config.runtimeAudioRoot}/${scenarioConfig.audioNamespace}/{speaker}/`,
      `- expected file extension: .${config.defaultAudioFormat}`
    ].join("\n") + "\n",
    "utf8"
  );

  return {
    scenarioId,
    lines: manifestRows.length - 1,
    speakers: importRowsBySpeaker.size
  };
}

async function main() {
  const config = await readJson(CONFIG_PATH);
  const scenarios = asObject(config.scenarios);
  const results = [];

  for (const [scenarioId, rawScenarioConfig] of Object.entries(scenarios)) {
    const scenarioConfig = {
      source: asString(rawScenarioConfig.source, `scenarios/${scenarioId}.json`),
      audioNamespace: asString(rawScenarioConfig.audioNamespace, scenarioId),
      voiceIdStrategy: asString(rawScenarioConfig.voiceIdStrategy, "speaker-sequence"),
      speakers: asObject(rawScenarioConfig.speakers)
    };
    results.push(await buildScenarioFiles(config, scenarioId, scenarioConfig));
  }

  console.log(`VOICEPEAK files generated from ${relative(ROOT, CONFIG_PATH)}:`);
  for (const result of results) {
    console.log(`- ${result.scenarioId}: ${result.lines} lines / ${result.speakers} speakers`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
