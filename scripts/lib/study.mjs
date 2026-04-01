import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const PROJECT_ROOT = join(import.meta.dirname, "..", "..");
export const STUDY_ROOT = join(PROJECT_ROOT, "study");
export const STUDY_DRAFT_ROOT = join(PROJECT_ROOT, "study-drafts");
export const STUDY_VISUAL_KINDS = new Set(["line-chart", "vector-diagram", "step-animation"]);
export const STUDY_SUBJECTS = [
  {
    slug: "mechanics",
    label: "力学",
    summary: "大学ノートを章ごとに整理しながら、本文と図解をあとから育てていく入口です。",
    note: "最初は見出しだけの stub から始め、方向性が固まった章から公開します。",
  },
];

const DRAFT_STATUSES = new Set(["discussing", "approved"]);
const CHAPTER_STATUSES = new Set(["stub", "published"]);

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatChapterNumber(order) {
  return String(order).padStart(2, "0");
}

export function buildDefaultChapterTitle(order) {
  return `第${order}章（仮）`;
}

export function buildSubjectPageName(subjectSlug) {
  return `study-${subjectSlug}.html`;
}

export function buildChapterPageName(subjectSlug, order) {
  return `study-${subjectSlug}-${formatChapterNumber(order)}.html`;
}

export function buildDraftRelativePath(subjectSlug, order) {
  return `study-drafts/${subjectSlug}/${formatChapterNumber(order)}_下書き.md`;
}

export function normalizeRelativePath(pathValue) {
  return String(pathValue).replaceAll("\\", "/");
}

export function resolveProjectPath(pathValue) {
  return join(PROJECT_ROOT, normalizeRelativePath(pathValue));
}

export function getStudySubject(subjectSlug) {
  return STUDY_SUBJECTS.find((subject) => subject.slug === subjectSlug) ?? null;
}

function parseValue(rawValue) {
  const value = rawValue.trim();
  if (!value.length) {
    return "";
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }
  return value;
}

export function parseFrontmatter(raw) {
  const cleaned = raw.replace(/^\uFEFF/, "");
  const match = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: cleaned };
  }

  const [, head, body] = match;
  const frontmatter = {};
  for (const line of head.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    frontmatter[key] = parseValue(value);
  }

  return { frontmatter, body: body.replace(/^\s+/, "") };
}

export function readMarkdownDocument(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  return parseFrontmatter(raw);
}

export function loadStudyData() {
  return STUDY_SUBJECTS.map((subject) => {
    const subjectDir = join(STUDY_ROOT, subject.slug);
    const filenames = existsSync(subjectDir)
      ? readdirSync(subjectDir).filter((name) => name.endsWith(".md")).sort()
      : [];

    const chapters = filenames.map((filename) => {
      const sourcePath = join(subjectDir, filename);
      const { frontmatter, body } = readMarkdownDocument(sourcePath);
      const order = Number(frontmatter.order);

      return {
        subject,
        filename,
        sourcePath,
        body,
        frontmatter,
        order,
        title: String(frontmatter.title ?? ""),
        status: String(frontmatter.status ?? ""),
        draftRelativePath: normalizeRelativePath(String(frontmatter.draft ?? "")),
        draftPath: frontmatter.draft ? resolveProjectPath(frontmatter.draft) : null,
        pageName: Number.isFinite(order) ? buildChapterPageName(subject.slug, order) : null,
      };
    });

    chapters.sort((left, right) => left.order - right.order);
    return { ...subject, pageName: buildSubjectPageName(subject.slug), chapters };
  });
}

export function extractVisualBlocks(markdownBody) {
  const visualPattern =
    /<figure\b([^>]*class=(["'])[^"']*\bstudy-visual\b[^"']*\2[^>]*)>([\s\S]*?)<\/figure>/gi;
  const blocks = [];
  let match;

  while ((match = visualPattern.exec(markdownBody)) !== null) {
    const attrs = match[1];
    const inner = match[3];
    const kindMatch = attrs.match(/\bdata-kind=(["'])(.*?)\1/i);
    const configMatch = attrs.match(/\bdata-config=(["'])([\s\S]*?)\1/i);

    blocks.push({
      raw: match[0],
      attrs,
      inner,
      kind: kindMatch ? kindMatch[2] : "",
      configText: configMatch ? configMatch[2] : "",
      hasTitle: /class=(["'])[^"']*\bstudy-visual__title\b[^"']*\1/i.test(inner),
      hasDescription: /class=(["'])[^"']*\bstudy-visual__description\b[^"']*\1/i.test(inner),
      hasFallback: /class=(["'])[^"']*\bstudy-visual__fallback\b[^"']*\1/i.test(inner),
    });
  }

  return blocks;
}

function readDraftDocument(chapter) {
  if (!chapter.draftPath || !existsSync(chapter.draftPath)) {
    return null;
  }

  return readMarkdownDocument(chapter.draftPath);
}

function validateDraft(chapter, issues) {
  if (!chapter.draftRelativePath) {
    issues.push(`${chapter.sourcePath}: draft frontmatter が必要です`);
    return null;
  }

  if (!chapter.draftPath || !existsSync(chapter.draftPath)) {
    issues.push(
      `${chapter.sourcePath}: 参照先 draft ${chapter.draftRelativePath} が存在しません`
    );
    return null;
  }

  const draftDocument = readDraftDocument(chapter);
  const draftFrontmatter = draftDocument.frontmatter;

  if (!String(draftFrontmatter.title ?? "").trim()) {
    issues.push(`${chapter.draftPath}: title frontmatter が必要です`);
  }

  if (draftFrontmatter.subject !== chapter.subject.slug) {
    issues.push(
      `${chapter.draftPath}: subject は ${chapter.subject.slug} である必要があります`
    );
  }

  if (Number(draftFrontmatter.chapter) !== chapter.order) {
    issues.push(`${chapter.draftPath}: chapter は ${chapter.order} である必要があります`);
  }

  if (!DRAFT_STATUSES.has(String(draftFrontmatter.status ?? ""))) {
    issues.push(
      `${chapter.draftPath}: status は discussing か approved のどちらかである必要があります`
    );
  }

  return draftDocument;
}

function validateVisualBlocks(chapter, issues) {
  const blocks = extractVisualBlocks(chapter.body);

  if (!blocks.length) {
    issues.push(`${chapter.sourcePath}: published 章には study-visual が最低1つ必要です`);
    return;
  }

  blocks.forEach((block, index) => {
    const prefix = `${chapter.sourcePath}: visual #${index + 1}`;
    if (!STUDY_VISUAL_KINDS.has(block.kind)) {
      issues.push(`${prefix}: data-kind は ${[...STUDY_VISUAL_KINDS].join(", ")} のいずれかにしてください`);
    }

    if (!block.configText) {
      issues.push(`${prefix}: data-config が必要です`);
    } else {
      try {
        JSON.parse(block.configText);
      } catch {
        issues.push(`${prefix}: data-config が JSON として解釈できません`);
      }
    }

    if (!block.hasTitle) {
      issues.push(`${prefix}: study-visual__title が必要です`);
    }
    if (!block.hasDescription) {
      issues.push(`${prefix}: study-visual__description が必要です`);
    }
    if (!block.hasFallback) {
      issues.push(`${prefix}: study-visual__fallback が必要です`);
    }
  });
}

export function collectStudyIssues(studyData = loadStudyData()) {
  const issues = [];

  for (const subject of studyData) {
    for (const chapter of subject.chapters) {
      if (!String(chapter.title).trim()) {
        issues.push(`${chapter.sourcePath}: title frontmatter が必要です`);
      }

      if (!Number.isInteger(chapter.order) || chapter.order <= 0) {
        issues.push(`${chapter.sourcePath}: order frontmatter は 1以上の整数である必要があります`);
      }

      if (!CHAPTER_STATUSES.has(chapter.status)) {
        issues.push(`${chapter.sourcePath}: status は stub か published のどちらかである必要があります`);
      }

      const draftDocument = validateDraft(chapter, issues);
      if (!draftDocument) {
        continue;
      }

      if (chapter.status === "published") {
        if (draftDocument.frontmatter.status !== "approved") {
          issues.push(
            `${chapter.sourcePath}: published 章の draft は approved である必要があります`
          );
        }
        validateVisualBlocks(chapter, issues);
      }
    }
  }

  return issues;
}
