import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./lib/diary-self-date.mjs";

const MIN_CLAUSE_LENGTH = 10;
const DEFAULT_MAX_SHARED_OWNERS = 2;

function parseArgs(argv) {
  const args = {
    all: false,
    date: null,
    from: null,
    to: null,
    maxOwners: DEFAULT_MAX_SHARED_OWNERS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--all") {
      args.all = true;
      continue;
    }

    if (arg === "--date") {
      args.date = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === "--from") {
      args.from = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === "--to") {
      args.to = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === "--max-owners") {
      args.maxOwners = Number(argv[i + 1] ?? DEFAULT_MAX_SHARED_OWNERS);
      i += 1;
      continue;
    }

    if (!arg.startsWith("-") && !args.date) {
      args.date = arg;
    }
  }

  if (!Number.isFinite(args.maxOwners) || args.maxOwners < 1) {
    args.maxOwners = DEFAULT_MAX_SHARED_OWNERS;
  }

  return args;
}

function stripMarkup(body) {
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitClauses(text) {
  return text
    .split(/[。、！？!?]\s*|\r?\n+/)
    .map((clause) => clause.replace(/\s+/g, " ").trim())
    .filter((clause) => clause.length >= MIN_CLAUSE_LENGTH)
    .filter((clause) => !/^#+\s/.test(clause));
}

function latestCharacterDiaryDate(files) {
  return files
    .filter((file) => file.dir.startsWith("diary-"))
    .map((file) => file.date)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function selectTargetDates(files, args) {
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

function validateDate(date, files, maxOwners) {
  const clauseFiles = new Map();
  const checked = files.filter((file) => file.date === date && file.dir.startsWith("diary-"));

  for (const file of checked) {
    const markdown = readDiaryFile(file);
    const { body } = splitDiaryMarkdown(markdown);
    const clauses = new Set(splitClauses(stripMarkup(body)));

    for (const clause of clauses) {
      if (!clauseFiles.has(clause)) clauseFiles.set(clause, []);
      clauseFiles.get(clause).push(file);
    }
  }

  const repeated = [...clauseFiles.entries()]
    .filter(([, owners]) => owners.length > maxOwners)
    .map(([clause, owners]) => ({ clause, owners }))
    .sort((left, right) => right.owners.length - left.owners.length);

  return { date, checked, repeated };
}

const args = parseArgs(process.argv.slice(2));
const files = collectDiaryMarkdownFiles();
const targetDates = selectTargetDates(files, args);

if (targetDates.length === 0) {
  console.error("対象の日記が見つかりませんでした。");
  process.exit(1);
}

const results = targetDates.map((date) => validateDate(date, files, args.maxOwners));
const failures = results.filter((result) => result.repeated.length > 0);

if (failures.length === 0) {
  for (const result of results) {
    console.log(
      `${result.date} の声の束バリエーションチェックを通過しました。対象: ${result.checked.length}件`,
    );
  }
  process.exit(0);
}

console.error(
  `声の束に、${args.maxOwners + 1}キャラ以上で同じ節が残っています。金太郎あめ化を避けるため、視点や言い回しを分けてください。`,
);
for (const result of failures) {
  console.error(`\n${result.date}:`);
  for (const item of result.repeated.slice(0, 12)) {
    const owners = item.owners.map((file) => path.relative(repoRoot, file.fullPath)).join(", ");
    console.error(`- "${item.clause}"`);
    console.error(`  ${owners}`);
  }
}
process.exit(1);
