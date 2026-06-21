import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./diary-self-date.mjs";

export const VOICE_BOILERPLATE_RULES = [
  { phrase: "「", maxOwners: 0 },
  { phrase: "」", maxOwners: 0 },
  { phrase: "『", maxOwners: 0 },
  { phrase: "』", maxOwners: 0 },
  { phrase: "の声では", maxOwners: 0 },
  { phrase: "という出来事が", maxOwners: 0 },
  { phrase: "という細部を拾って", maxOwners: 0 },
  { phrase: "まで含めて", maxOwners: 0 },
  { phrase: "ただの記録ではなく", maxOwners: 1 },
  { phrase: "生活に残った小さな合図", maxOwners: 1 },
  { phrase: "別の声で言い直す", maxOwners: 1 },
  { phrase: "同じ出来事の輪郭", maxOwners: 1 },
  { phrase: "受け止めた", maxOwners: 4 },
];

function stripMarkup(body) {
  return body
    .replace(/^---\s*$/gmu, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function latestCharacterDiaryDate(files) {
  return files
    .filter((file) => file.dir.startsWith("diary-"))
    .map((file) => file.date)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

export function selectVoiceBoilerplateTargetDates(files, args = {}) {
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

export function validateVoiceBoilerplateForDate(date, options = {}) {
  const rules = options.rules ?? VOICE_BOILERPLATE_RULES;
  const files = options.files ?? collectDiaryMarkdownFiles();
  const checked = files.filter((file) => file.date === date && file.dir.startsWith("diary-"));
  const findings = [];

  for (const rule of rules) {
    const owners = [];

    for (const file of checked) {
      const markdown = readDiaryFile(file);
      const { body } = splitDiaryMarkdown(markdown);
      if (stripMarkup(body).includes(rule.phrase)) {
        owners.push(file);
      }
    }

    if (owners.length > rule.maxOwners) {
      findings.push({ rule, owners });
    }
  }

  return { date, checked, findings };
}

export function formatVoiceBoilerplateFindings(result) {
  const lines = [
    `${result.date} の声の束に、共通テンプレ化した言い回しが残っています。キャラごとの文型に分けてください。`,
  ];

  for (const finding of result.findings) {
    const owners = finding.owners
      .map((file) => path.relative(repoRoot, file.fullPath))
      .join(", ");
    lines.push(`- "${finding.rule.phrase}" (${finding.owners.length}件 / 上限${finding.rule.maxOwners}件)`);
    lines.push(`  ${owners}`);
  }

  return lines.join("\n");
}
