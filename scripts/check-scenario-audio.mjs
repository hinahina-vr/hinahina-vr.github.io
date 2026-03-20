import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SCENARIOS_DIR = join(ROOT, "scenarios");
const AUDIO_ROOT = join(ROOT, "assets", "voices", "scenarios");
const AUDIO_EXTENSIONS = new Set([".wav", ".mp3"]);

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function hasTextStep(step) {
  return isObject(step) && Object.prototype.hasOwnProperty.call(step, "text");
}

async function readScenarioFiles() {
  const names = (await readdir(SCENARIOS_DIR))
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "ja"));

  return Promise.all(
    names.map(async (name) => {
      const filePath = join(SCENARIOS_DIR, name);
      const raw = await readFile(filePath, "utf8");
      return {
        fileName: name,
        filePath,
        data: JSON.parse(raw),
      };
    })
  );
}

async function listAudioFiles(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dirPath, entry.name);
        if (entry.isDirectory()) {
          return listAudioFiles(fullPath);
        }
        if (!entry.isFile()) {
          return [];
        }
        const ext = entry.name.slice(entry.name.lastIndexOf("."));
        if (!AUDIO_EXTENSIONS.has(ext)) {
          return [];
        }
        return [relative(AUDIO_ROOT, fullPath).replaceAll("\\", "/")];
      })
    );
    return nested.flat();
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function resolveAudioCandidates(audioNamespace, speaker, voiceId) {
  const basePath = `${audioNamespace}/${speaker}/${voiceId}`;
  return [`${basePath}.wav`, `${basePath}.mp3`];
}

function collectScenarioFindings(scenarioFile, actualAudioFiles, expectedAudioFiles) {
  const findings = [];
  const { fileName, data } = scenarioFile;
  const scenarioName = basename(fileName, ".json");
  const chars = isObject(data.chars) ? data.chars : {};
  const speakerKeys = new Set(Object.keys(chars));
  const audioNamespace =
    typeof data.audioNamespace === "string" && data.audioNamespace.trim()
      ? data.audioNamespace.trim()
      : typeof data.id === "string" && data.id.trim()
        ? data.id.trim()
        : scenarioName;

  if (!(typeof data.id === "string" && data.id.trim())) {
    findings.push(`[${scenarioName}] top-level id がありません。`);
  }

  if (!Array.isArray(data.scenario)) {
    findings.push(`[${scenarioName}] scenario 配列がありません。`);
    return findings;
  }

  const seenVoiceIds = new Map();

  data.scenario.forEach((step, index) => {
    if (!hasTextStep(step)) {
      return;
    }

    const speaker =
      typeof step.speaker === "string" && step.speaker.trim() ? step.speaker.trim() : "narrator";
    if (!speakerKeys.has(speaker)) {
      findings.push(`[${scenarioName}] step[${index}] が未知の speaker "${speaker}" を参照しています。`);
    }

    if (!(typeof step.voiceId === "string" && step.voiceId.trim())) {
      findings.push(`[${scenarioName}] step[${index}] (${speaker}) に voiceId がありません。`);
      return;
    }

    const voiceId = step.voiceId.trim();
    const voiceKey = `${audioNamespace}/${speaker}/${voiceId}`;
    if (seenVoiceIds.has(voiceKey)) {
      findings.push(
        `[${scenarioName}] step[${index}] (${speaker}) の voiceId "${voiceId}" が重複しています。`
      );
    } else {
      seenVoiceIds.set(voiceKey, index);
    }

    const candidates = resolveAudioCandidates(audioNamespace, speaker, voiceId);
    const matched = candidates.find((candidate) => actualAudioFiles.has(candidate));
    if (!matched) {
      findings.push(
        `[${scenarioName}] step[${index}] (${speaker}) の音声がありません: ${candidates.join(" / ")}`
      );
      return;
    }

    expectedAudioFiles.add(matched);
  });

  return findings;
}

async function main() {
  const scenarioFiles = await readScenarioFiles();
  const actualAudioList = await listAudioFiles(AUDIO_ROOT);
  const actualAudioFiles = new Set(actualAudioList);
  const expectedAudioFiles = new Set();
  const findings = [];

  for (const scenarioFile of scenarioFiles) {
    findings.push(...collectScenarioFindings(scenarioFile, actualAudioFiles, expectedAudioFiles));
  }

  const unusedAudio = actualAudioList
    .filter((audioFile) => !expectedAudioFiles.has(audioFile))
    .sort((left, right) => left.localeCompare(right, "ja"));

  for (const audioFile of unusedAudio) {
    findings.push(`[unused] 参照されていない音声ファイルがあります: ${audioFile}`);
  }

  console.log(`Scenarios: ${scenarioFiles.length}`);
  const audioRootExists = await stat(AUDIO_ROOT).then(() => true).catch(() => false);
  console.log(`Audio root: ${audioRootExists ? AUDIO_ROOT : "(missing)"}`);
  console.log(`Audio files: ${actualAudioList.length}`);

  if (!findings.length) {
    console.log("Scenario audio audit passed.");
    return;
  }

  console.log(`Scenario audio audit found ${findings.length} issue(s):`);
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
