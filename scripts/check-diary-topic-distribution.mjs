import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

function parseArgs(argv) {
  const args = { date: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (!argv[i].startsWith("-") && !args.date) {
      args.date = argv[i];
    }
  }
  return args;
}

function findLatestMainDate() {
  const diaryDir = path.join(repoRoot, "diary");
  return fs
    .readdirSync(diaryDir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}_.*\.md$/.test(name))
    .map((name) => name.slice(0, 10))
    .sort()
    .at(-1);
}

function extractTopics(markdown) {
  const blockMatch = markdown.match(
    /<!-- daily-context:start -->[\s\S]*?<!-- daily-context:end -->/m,
  );
  if (!blockMatch) return [];

  const lines = blockMatch[0].split(/\r?\n/);
  const topics = [];
  let inTopicSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "### 本日の話題") {
      inTopicSection = true;
      continue;
    }

    if (inTopicSection && trimmed.startsWith("### ")) {
      break;
    }

    if (!inTopicSection) continue;

    const match = trimmed.match(/^- ([A-Z])\.\s+(.+)$/);
    if (match) {
      topics.push({ key: match[1], label: match[2] });
    }
  }

  return topics;
}

function collectDiaryFiles(date) {
  return fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith("diary-") &&
        entry.name !== "diary-mitra" &&
        entry.name !== "diary-roju",
    )
    .map((entry) => {
      const dir = path.join(repoRoot, entry.name);
      const file = fs
        .readdirSync(dir)
        .find((name) => name.startsWith(`${date}_`) && name.endsWith(".md"));
      return file ? path.join(dir, file) : null;
    })
    .filter(Boolean);
}

const { date: argDate } = parseArgs(process.argv.slice(2));
const date = argDate ?? findLatestMainDate();

if (!date) {
  console.error("日付を特定できませんでした。`--date YYYY-MM-DD` を指定してください。");
  process.exit(1);
}

const files = collectDiaryFiles(date);
if (files.length === 0) {
  console.error(`${date} のキャラ日記が見つかりませんでした。`);
  process.exit(1);
}

const topicCounts = new Map();
const signatureCounts = new Map();
const missingTopics = [];

for (const file of files) {
  const markdown = fs.readFileSync(file, "utf8");
  const topics = extractTopics(markdown);

  if (topics.length === 0) {
    missingTopics.push(path.relative(repoRoot, file));
    continue;
  }

  for (const topic of topics) {
    topicCounts.set(topic.key, (topicCounts.get(topic.key) ?? 0) + 1);
  }

  const signature = topics
    .map((topic) => topic.key)
    .sort()
    .join("|");
  signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
}

const total = files.length - missingTopics.length;
const hardLimit = Math.max(1, Math.floor(total / 3));
const signatureLimit = Math.max(3, Math.floor(total / 5));

const overloadedTopics = [...topicCounts.entries()]
  .filter(([, count]) => count > hardLimit)
  .sort((a, b) => b[1] - a[1]);

const repeatedSignatures = [...signatureCounts.entries()]
  .filter(([, count]) => count > signatureLimit)
  .sort((a, b) => b[1] - a[1]);

console.log(`${date} の話題分散を検査します。`);
console.log(`対象日記数: ${files.length}件`);
console.log(`1話題あたりの上限目安: ${hardLimit}件`);
console.log(`同一組み合わせの注意目安: ${signatureLimit}件`);
console.log("");
console.log("話題ごとの出現数:");
for (const [topic, count] of [...topicCounts.entries()].sort()) {
  console.log(`- ${topic}: ${count}件`);
}

if (repeatedSignatures.length > 0) {
  console.log("");
  console.log("注意: 同じ話題組み合わせが多い日記:");
  for (const [signature, count] of repeatedSignatures) {
    console.log(`- ${signature}: ${count}件`);
  }
}

if (missingTopics.length > 0) {
  console.log("");
  console.log("daily-context の話題が不足している日記:");
  for (const file of missingTopics) {
    console.log(`- ${file}`);
  }
}

if (overloadedTopics.length > 0 || missingTopics.length > 0) {
  if (overloadedTopics.length > 0) {
    console.log("");
    console.error("話題が集中しすぎています:");
    for (const [topic, count] of overloadedTopics) {
      console.error(`- ${topic}: ${count}件 (上限 ${hardLimit}件)`);
    }
  }
  process.exit(1);
}

console.log("");
console.log("話題分散チェックを通過しました。");
