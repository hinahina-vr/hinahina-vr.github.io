import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
  splitDiaryMarkdown,
} from "./diary-self-date.mjs";

const SOURCE_NAME_PATTERNS = [
  {
    label: "Swarm",
    regex: /Swarm/g,
  },
  {
    label: "X",
    regex: /(?<![A-Za-z0-9])X(?![A-Za-z0-9])/g,
  },
  {
    label: "Twitter",
    regex: /Twitter/g,
  },
  {
    label: "x.com",
    regex: /x\.com/gi,
  },
  {
    label: "ツイート",
    regex: /ツイート/g,
  },
];

export function getLatestDiaryDate() {
  return collectDiaryMarkdownFiles()
    .map((file) => file.date)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function stripMarkup(body) {
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateSourceMentionsForDate(date) {
  const files = collectDiaryMarkdownFiles().filter((file) => file.date === date);
  const findings = [];

  for (const file of files) {
    const markdown = readDiaryFile(file);
    const { body } = splitDiaryMarkdown(markdown);
    const plainBody = stripMarkup(body);
    const matches = [];

    for (const pattern of SOURCE_NAME_PATTERNS) {
      const hit = plainBody.match(pattern.regex);
      if (!hit) continue;
      matches.push(`${pattern.label}: ${[...new Set(hit)].join(", ")}`);
    }

    if (matches.length === 0) continue;

    findings.push({
      file: path.relative(repoRoot, file.fullPath),
      matches,
    });
  }

  return { date, checked: files, findings };
}

export function formatSourceMentionFindings(result) {
  const lines = [
    `${result.date} の日記本文に、素材取得元の名前が残っています。日記本文では「場所の記録」「外の足あと」「投稿」などに言い換えてください。`,
  ];

  for (const finding of result.findings) {
    lines.push(`- ${finding.file}: ${finding.matches.join(" / ")}`);
  }

  return lines.join("\n");
}
