import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";

const MIN_SENTENCE_LENGTH = 24;

function parseArgs(argv) {
  const args = { date: null, all: false };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (argv[i] === "--all") {
      args.all = true;
      continue;
    }

    if (!argv[i].startsWith("-") && !args.date) {
      args.date = argv[i];
    }
  }

  return args;
}

function stripMarkup(body) {
  return body
    .replace(/^---\s*$/gmu, " ")
    .replace(/^\*\*[^*\n]+への(?:インサイト|神託)[^*\n]*。\*\*\s*$/gmu, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text) {
  return text
    .split(/[。！？!?]\s*|\r?\n+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= MIN_SENTENCE_LENGTH);
}

function latestCharacterDiaryDate(files) {
  return files
    .filter((file) => file.dir.startsWith("diary-"))
    .map((file) => file.date)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function validateDate(date, files) {
  const sentenceFiles = new Map();
  const checked = files.filter((file) => file.date === date && file.dir.startsWith("diary-"));

  for (const file of checked) {
    const markdown = readDiaryFile(file);
    const { body } = splitDiaryMarkdown(markdown);
    const text = stripMarkup(body);
    const sentences = new Set(splitSentences(text));

    for (const sentence of sentences) {
      if (!sentenceFiles.has(sentence)) sentenceFiles.set(sentence, []);
      sentenceFiles.get(sentence).push(file);
    }
  }

  const repeated = [...sentenceFiles.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([sentence, owners]) => ({ sentence, owners }))
    .sort((left, right) => right.owners.length - left.owners.length);

  return { date, checked, repeated };
}

const args = parseArgs(process.argv.slice(2));
const files = collectDiaryMarkdownFiles();
const targetDates = args.all
  ? [...new Set(files.filter((file) => file.dir.startsWith("diary-")).map((file) => file.date))].sort()
  : [args.date ?? latestCharacterDiaryDate(files)].filter(Boolean);

if (targetDates.length === 0) {
  console.error("対象の日記が見つかりませんでした。");
  process.exit(1);
}

const results = targetDates.map((date) => validateDate(date, files));
const failures = results.filter((result) => result.repeated.length > 0);

if (failures.length === 0) {
  for (const result of results) {
    console.log(`${result.date} の声の束重複チェックを通過しました。対象: ${result.checked.length}件`);
  }
  process.exit(0);
}

console.error("声の束に、複数キャラで同一の長い文が残っています。キャラごとの視点や比喩に分けてください。");
for (const result of failures) {
  console.error(`\n${result.date}:`);
  for (const item of result.repeated.slice(0, 10)) {
    const owners = item.owners.map((file) => path.relative(repoRoot, file.fullPath)).join(", ");
    console.error(`- "${item.sentence}"`);
    console.error(`  ${owners}`);
  }
}
process.exit(1);
