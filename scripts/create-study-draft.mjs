import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  PROJECT_ROOT,
  STUDY_DRAFT_ROOT,
  buildDefaultChapterTitle,
  buildDraftRelativePath,
  formatChapterNumber,
  getStudySubject,
} from "./lib/study.mjs";

function parseArgs(argv) {
  const options = {
    subject: "mechanics",
    chapter: 1,
    title: "",
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--subject") {
      options.subject = argv[index + 1] ?? options.subject;
      index += 1;
      continue;
    }
    if (token === "--chapter") {
      options.chapter = Number(argv[index + 1] ?? options.chapter);
      index += 1;
      continue;
    }
    if (token === "--title") {
      options.title = argv[index + 1] ?? options.title;
      index += 1;
      continue;
    }
    if (token === "--force") {
      options.force = true;
    }
  }

  return options;
}

function buildDraftTemplate({ subject, chapter, title }) {
  return `---
title: ${title}
subject: ${subject.slug}
chapter: ${chapter}
status: discussing
---

# ${subject.label} ${formatChapterNumber(chapter)} 打ち合わせメモ

## 元ネタ・話題候補

## 書き方の方向性

## 文体メモ

- 使用するAI: 文豪AI / 老中AI / 併用
- 文豪AIメモ:
- 老中AIメモ:
- 役割分担メモ:

## 図解・チャート・アニメーション案

## 決定事項

## 未決事項
`;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const subject = getStudySubject(options.subject);

  if (!subject) {
    throw new Error(`Unknown subject: ${options.subject}`);
  }

  if (!Number.isInteger(options.chapter) || options.chapter <= 0) {
    throw new Error("chapter は 1以上の整数で指定してください");
  }

  const title = options.title || buildDefaultChapterTitle(options.chapter);
  const relativePath = buildDraftRelativePath(subject.slug, options.chapter);
  const absolutePath = join(PROJECT_ROOT, relativePath);

  if ((await fileExists(absolutePath)) && !options.force) {
    throw new Error(`${relativePath} は既に存在します。上書きする場合は --force を指定してください`);
  }

  await mkdir(dirname(absolutePath), { recursive: true });
  await mkdir(STUDY_DRAFT_ROOT, { recursive: true });
  await writeFile(absolutePath, buildDraftTemplate({ subject, chapter: options.chapter, title }), "utf-8");

  console.log(`✓ ${relativePath} generated`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
