import fs from "node:fs";
import path from "node:path";
import {
  DAILY_CONTEXT_DIR,
  RAW_DIR,
  ROOT_DIR,
  hasDiarySourceActivity,
  renderBungouStyleBlock,
  renderDailyContextBlock,
} from "./lib/daily-context.mjs";

const DRAFTS_DIR = path.join(ROOT_DIR, "drafts");
const DRAFT_FILE_RE = /^(\d{4}-\d{2}-\d{2})_下書き\.md$/;
const DAILY_CONTEXT_BLOCK_RE = /<!-- daily-context:start -->[\s\S]*?<!-- daily-context:end -->/m;
const BUNGOU_STYLE_BLOCK_RE = /<!-- bungou-style:start -->[\s\S]*?<!-- bungou-style:end -->/m;

function parseArgs(argv) {
  const args = { date: null, all: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      args.all = true;
      continue;
    }
    if (arg === "--date") {
      args.date = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(arg) && !args.date) {
      args.date = arg;
      continue;
    }
  }

  return args;
}

function normalizeBlock(value) {
  return value.replace(/\r\n/g, "\n").trim();
}

function extractBlock(markdown, regex) {
  return markdown.match(regex)?.[0] ?? null;
}

function collectDrafts() {
  return fs
    .readdirSync(DRAFTS_DIR)
    .map((name) => {
      const match = name.match(DRAFT_FILE_RE);
      if (!match) return null;
      return {
        date: match[1],
        name,
        fullPath: path.join(DRAFTS_DIR, name),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.date.localeCompare(left.date));
}

function readContext(date) {
  const contextPath = path.join(DAILY_CONTEXT_DIR, `${date}.json`);
  if (!fs.existsSync(contextPath)) {
    return {
      contextPath,
      context: null,
    };
  }

  return {
    contextPath,
    context: JSON.parse(fs.readFileSync(contextPath, "utf8")),
  };
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isEqualJson(left, right) {
  return stableJson(left) === stableJson(right);
}

function readRawSource(date, sourceName) {
  const rawPath = path.join(RAW_DIR, `${date}.${sourceName}.json`);
  if (!fs.existsSync(rawPath)) {
    return {
      rawPath,
      raw: null,
    };
  }

  return {
    rawPath,
    raw: JSON.parse(fs.readFileSync(rawPath, "utf8")),
  };
}

function compareBlock({ label, actual, expected, file }) {
  if (!actual) {
    return `${file}: ${label} ブロックがありません。`;
  }

  if (normalizeBlock(actual) !== normalizeBlock(expected)) {
    return `${file}: ${label} ブロックが収集済み daily-context と一致しません。`;
  }

  return null;
}

function validateRawSource({ date, context, sourceName, requiredOk = false }) {
  const { rawPath, raw } = readRawSource(date, sourceName);
  const relativeRawPath = path.relative(ROOT_DIR, rawPath).replace(/\\/g, "/");
  const contextSource = context.sources?.[sourceName];
  const findings = [];

  if (!contextSource) {
    return [`${sourceName}: daily-context JSON に sources.${sourceName} がありません。`];
  }

  if (!raw) {
    return [`${relativeRawPath}: raw ${sourceName} 収集結果がありません。`];
  }

  if (raw.date !== date) {
    findings.push(`${relativeRawPath}: date が ${date} と一致しません。`);
  }

  if (raw.collectedAt !== context.generatedAt) {
    findings.push(`${relativeRawPath}: collectedAt が daily-context の generatedAt と一致しません。`);
  }

  if (raw.status !== contextSource.status) {
    findings.push(`${relativeRawPath}: status が daily-context の sources.${sourceName}.status と一致しません。`);
  }

  if ((raw.note ?? null) !== (contextSource.note ?? null)) {
    findings.push(`${relativeRawPath}: note が daily-context の sources.${sourceName}.note と一致しません。`);
  }

  if (requiredOk && raw.status !== "ok") {
    findings.push(`${relativeRawPath}: ${sourceName} 収集が成功していません。status=${raw.status}`);
  }

  if (sourceName === "swarm" || sourceName === "x") {
    if (raw.sourceUrl !== contextSource.sourceUrl) {
      findings.push(`${relativeRawPath}: sourceUrl が daily-context の sources.${sourceName}.sourceUrl と一致しません。`);
    }

    if (!isEqualJson(raw.items ?? [], contextSource.items ?? [])) {
      findings.push(`${relativeRawPath}: items が daily-context の sources.${sourceName}.items と一致しません。`);
    }
  }

  if (sourceName === "health") {
    for (const key of ["source", "exportedAt"]) {
      if ((raw[key] ?? null) !== (contextSource[key] ?? null)) {
        findings.push(`${relativeRawPath}: ${key} が daily-context の sources.health.${key} と一致しません。`);
      }
    }

    if (!isEqualJson(raw.device ?? null, contextSource.device ?? null)) {
      findings.push(`${relativeRawPath}: device が daily-context の sources.health.device と一致しません。`);
    }

    if (!isEqualJson(raw.summary ?? null, contextSource.summary ?? null)) {
      findings.push(`${relativeRawPath}: summary が daily-context の sources.health.summary と一致しません。`);
    }
  }

  return findings;
}

function validateDraft(draft) {
  const relativeFile = path.relative(ROOT_DIR, draft.fullPath).replace(/\\/g, "/");
  const markdown = fs.readFileSync(draft.fullPath, "utf8");
  const { contextPath, context } = readContext(draft.date);
  const findings = [];

  if (!context) {
    findings.push(
      `${relativeFile}: 収集済み daily-context がありません。先に node scripts/collect-daily-context.mjs --date ${draft.date} を実行してください。`,
    );
    return findings;
  }

  if (!hasDiarySourceActivity(context)) {
    findings.push(`${relativeFile}: XかSwarmに日記化する動きがありません。新しい日記は作成しないでください。`);
  }

  findings.push(...validateRawSource({
    date: draft.date,
    context,
    sourceName: "swarm",
    requiredOk: true,
  }));
  findings.push(...validateRawSource({
    date: draft.date,
    context,
    sourceName: "x",
    requiredOk: true,
  }));
  findings.push(...validateRawSource({
    date: draft.date,
    context,
    sourceName: "health",
  }));

  const actualDailyContext = extractBlock(markdown, DAILY_CONTEXT_BLOCK_RE);
  const expectedDailyContext = renderDailyContextBlock(context);
  const dailyContextFinding = compareBlock({
    label: "daily-context",
    actual: actualDailyContext,
    expected: expectedDailyContext,
    file: relativeFile,
  });
  if (dailyContextFinding) findings.push(dailyContextFinding);

  if (!context.bungouStyle) {
    findings.push(`${path.relative(ROOT_DIR, contextPath).replace(/\\/g, "/")}: bungouStyle がありません。`);
    return findings;
  }

  const actualBungouStyle = extractBlock(markdown, BUNGOU_STYLE_BLOCK_RE);
  const expectedBungouStyle = renderBungouStyleBlock(context.bungouStyle);
  const bungouStyleFinding = compareBlock({
    label: "bungou-style",
    actual: actualBungouStyle,
    expected: expectedBungouStyle,
    file: relativeFile,
  });
  if (bungouStyleFinding) findings.push(bungouStyleFinding);

  return findings;
}

const args = parseArgs(process.argv.slice(2));
const drafts = collectDrafts();
const targets = args.all
  ? drafts
  : drafts.filter((draft) => draft.date === (args.date ?? drafts[0]?.date));

if (targets.length === 0) {
  console.error(args.date ? `${args.date} の下書きが見つかりませんでした。` : "下書きが見つかりませんでした。");
  process.exit(1);
}

const findings = targets.flatMap(validateDraft);

if (findings.length === 0) {
  const label = args.all ? `${targets.length}件` : targets[0].date;
  console.log(`下書き daily-context チェックを通過しました: ${label}`);
  process.exit(0);
}

console.error("下書きの daily-context が正規収集結果と一致していません。");
console.error("X / Swarm / Health を collect-daily-context で収集してから本文を書いてください。");
for (const finding of findings) {
  console.error(`- ${finding}`);
}
process.exit(1);
