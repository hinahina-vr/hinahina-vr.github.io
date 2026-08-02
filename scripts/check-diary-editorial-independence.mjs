import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DATE_PATTERN = /^(2026-\d{2}-\d{2})_/;
const EXPECTED_VOICE_DIRECTORY_COUNT = 33;
const FORBIDDEN = [
  "デジタルサドゥー",
  "画面の苦行",
  "Twitter",
  "ツイート",
  "Swarm",
];

function listMarkdown(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((file) => statSync(file).isFile() && file.endsWith(".md"));
}

function dateOf(file) {
  return basename(file).match(DATE_PATTERN)?.[1] ?? null;
}

function visibleBody(raw) {
  return raw
    .replace(/^# .+$/m, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function trigrams(value) {
  const text = normalize(value);
  const grams = new Set();
  for (let index = 0; index <= text.length - 3; index += 1) {
    grams.add(text.slice(index, index + 3));
  }
  return grams;
}

function jaccard(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

const mainFiles = listMarkdown(join(ROOT, "diary"));
const voiceDirs = readdirSync(ROOT)
  .filter((name) => name.startsWith("diary-"))
  .filter((name) => statSync(join(ROOT, name)).isDirectory());
const voiceFiles = voiceDirs.flatMap((dir) => listMarkdown(join(ROOT, dir)));
const errors = [];
const voicesByDate = new Map();
const normalizedBodies = new Map();

if (voiceDirs.length !== EXPECTED_VOICE_DIRECTORY_COUNT) {
  errors.push(
    `大奥AIディレクトリが ${voiceDirs.length} 件 ` +
    `(期待値 ${EXPECTED_VOICE_DIRECTORY_COUNT} 件)`,
  );
}
for (const dir of voiceDirs) {
  if (listMarkdown(join(ROOT, dir)).length === 0) {
    errors.push(`${dir}: 全期間を通じて日記が1件もない`);
  }
}

for (const file of voiceFiles) {
  const raw = readFileSync(file, "utf8");
  const date = dateOf(file);
  if (!date) continue;
  const role = raw.match(/<!--\s*editorial-role:\s*(.+?)\s*-->/)?.[1]?.trim();
  const claim = raw.match(/<!--\s*editorial-claim:\s*(.+?)\s*-->/)?.[1]?.trim();
  const body = visibleBody(raw);

  if (!role) errors.push(`${file}: editorial-role がない`);
  if (!claim) errors.push(`${file}: editorial-claim がない`);
  if (body.length < 60) errors.push(`${file}: 本文が短すぎる (${body.length}文字)`);
  if (!voicesByDate.has(date)) voicesByDate.set(date, []);
  voicesByDate.get(date).push({ file, role, claim, body, grams: trigrams(body) });

  const normalizedBody = normalize(body);
  if (normalizedBodies.has(normalizedBody)) {
    errors.push(`${file}: 本文が ${normalizedBodies.get(normalizedBody)} と完全重複`);
  } else {
    normalizedBodies.set(normalizedBody, file);
  }
}

for (const mainFile of mainFiles) {
  const date = dateOf(mainFile);
  const voices = voicesByDate.get(date) ?? [];
  if (voices.length < 1 || voices.length > 6) {
    errors.push(`${date}: 大奥AIが ${voices.length} 件 (許容1-6件)`);
  }

  const roles = voices.map((item) => normalize(item.role ?? ""));
  const claims = voices.map((item) => normalize(item.claim ?? ""));
  if (new Set(roles).size !== roles.length) errors.push(`${date}: editorial-role が重複`);
  if (new Set(claims).size !== claims.length) errors.push(`${date}: editorial-claim が重複`);

  for (let left = 0; left < voices.length; left += 1) {
    for (let right = left + 1; right < voices.length; right += 1) {
      const score = jaccard(voices[left].grams, voices[right].grams);
      if (score >= 0.58) {
        errors.push(
          `${date}: 大奥AI本文の字面が近すぎる (${score.toFixed(3)}) ` +
          `${basename(voices[left].file)} / ${basename(voices[right].file)}`,
        );
      }
    }
  }
}

const scenarioFiles = readdirSync(join(ROOT, "scenarios"))
  .filter((name) => /^2026-\d{2}-\d{2}_.+\.json$/.test(name))
  .map((name) => join(ROOT, "scenarios", name));
const visibleFiles = [...mainFiles, ...voiceFiles, ...scenarioFiles];

for (const file of visibleFiles) {
  const raw = readFileSync(file, "utf8");
  const body = file.endsWith(".md") ? visibleBody(raw) : raw;
  for (const phrase of FORBIDDEN) {
    if (body.includes(phrase)) errors.push(`${file}: 禁止語 ${phrase}`);
  }
  if (/[「」『』]/u.test(body)) errors.push(`${file}: 鍵括弧が残っている`);
  if (/\bX\b/u.test(body)) errors.push(`${file}: 本文中に単独の X が残っている`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `Editorial independence passed: ${mainFiles.length} mains, ` +
  `${voiceFiles.length} voices, ${scenarioFiles.length} dreams.`,
);
