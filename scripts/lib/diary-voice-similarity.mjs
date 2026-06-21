import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./diary-self-date.mjs";

export const VOICE_SIMILARITY_LIMITS = {
  meanCosine: 0.3,
  p95Cosine: 0.56,
  maxCosine: 0.68,
};

function normalizeVoiceBody(markdown) {
  const { body } = splitDiaryMarkdown(markdown);
  return body
    .replace(/^---\s*$/gmu, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/[「」『』“”"'`]/g, "")
    .replace(/[\s\u3000、。，．！？!?・:：;；（）()[\]【】<>《》…—-]+/g, "")
    .trim();
}

function buildNgramVector(text) {
  const counts = new Map();

  for (const size of [2, 3, 4, 5]) {
    for (let index = 0; index <= text.length - size; index += 1) {
      const token = text.slice(index, index + size);
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return counts;
}

function cosine(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const value of left.values()) {
    leftNorm += value * value;
  }

  for (const value of right.values()) {
    rightNorm += value * value;
  }

  const [small, large] = left.size < right.size ? [left, right] : [right, left];
  for (const [token, value] of small) {
    dot += value * (large.get(token) ?? 0);
  }

  return leftNorm > 0 && rightNorm > 0 ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

function percentile(values, point) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((point / 100) * sorted.length) - 1);
  return sorted[index];
}

function latestCharacterDiaryDate(files) {
  return files
    .filter((file) => file.dir.startsWith("diary-"))
    .map((file) => file.date)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

export function selectVoiceSimilarityTargetDates(files, args = {}) {
  const dates = [
    ...new Set(files.filter((file) => file.dir.startsWith("diary-")).map((file) => file.date)),
  ].sort();

  if (args.all) return dates;

  if (args.from || args.to) {
    return dates.filter(
      (date) => (!args.from || date >= args.from) && (!args.to || date <= args.to),
    );
  }

  return [args.date ?? latestCharacterDiaryDate(files)].filter(Boolean);
}

export function analyzeVoiceSimilarityForDate(date, options = {}) {
  const files = options.files ?? collectDiaryMarkdownFiles();
  const limits = options.limits ?? VOICE_SIMILARITY_LIMITS;
  const checked = files
    .filter((file) => file.date === date && file.dir.startsWith("diary-"))
    .map((file) => {
      const text = normalizeVoiceBody(readDiaryFile(file));
      return {
        file,
        text,
        vector: buildNgramVector(text),
      };
    })
    .filter((entry) => entry.text.length > 0);

  const pairs = [];
  const values = [];

  for (let leftIndex = 0; leftIndex < checked.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < checked.length; rightIndex += 1) {
      const value = cosine(checked[leftIndex].vector, checked[rightIndex].vector);
      values.push(value);
      pairs.push({
        left: checked[leftIndex].file,
        right: checked[rightIndex].file,
        cosine: value,
      });
    }
  }

  pairs.sort((left, right) => right.cosine - left.cosine);
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const p95 = percentile(values, 95);
  const max = values.length > 0 ? Math.max(...values) : 0;
  const findings = [];

  if (mean > limits.meanCosine) findings.push({ metric: "mean", value: mean, limit: limits.meanCosine });
  if (p95 > limits.p95Cosine) findings.push({ metric: "p95", value: p95, limit: limits.p95Cosine });
  if (max > limits.maxCosine) findings.push({ metric: "max", value: max, limit: limits.maxCosine });

  return {
    date,
    checked: checked.map((entry) => entry.file),
    pairCount: values.length,
    stats: { mean, p95, max },
    worstPairs: pairs.slice(0, 8),
    findings,
  };
}

function formatNumber(value) {
  return value.toFixed(4);
}

export function formatVoiceSimilarityFindings(result) {
  const lines = [
    `${result.date} の声の束で、本文同士の意味近似が強すぎる可能性があります。`,
    `統計: mean=${formatNumber(result.stats.mean)} / p95=${formatNumber(result.stats.p95)} / max=${formatNumber(result.stats.max)}`,
  ];

  for (const finding of result.findings) {
    lines.push(`- ${finding.metric}: ${formatNumber(finding.value)} > ${formatNumber(finding.limit)}`);
  }

  for (const pair of result.worstPairs.slice(0, 3)) {
    const left = path.relative(repoRoot, pair.left.fullPath);
    const right = path.relative(repoRoot, pair.right.fullPath);
    lines.push(`- ${formatNumber(pair.cosine)}: ${left} / ${right}`);
  }

  return lines.join("\n");
}
