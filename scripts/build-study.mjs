import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";
import { getSiteModeHeadBootstrap, getSiteModeScriptTag } from "./lib/site-mode-assets.mjs";
import {
  PROJECT_ROOT,
  STUDY_ROOT,
  buildSubjectPageName,
  collectStudyIssues,
  escapeHtml,
  formatChapterNumber,
  loadStudyData,
} from "./lib/study.mjs";

marked.use({
  gfm: true,
  breaks: false,
});

function stripInlineMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function createHeadingId(rawText, slugCounts) {
  const base =
    rawText
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, " ")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section";

  const count = slugCounts.get(base) ?? 0;
  slugCounts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function buildChapterMarkup(markdown) {
  const headings = [];
  const slugCounts = new Map();
  const lines = markdown.split(/\r?\n/);

  const preparedMarkdown = lines
    .map((line) => {
      const match = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
      if (!match) {
        return line;
      }

      const level = match[1].length;
      const sourceText = match[2].replace(/\s+#+\s*$/, "").trim();
      const plainText = stripInlineMarkdown(sourceText);
      const headingId = createHeadingId(plainText, slugCounts);
      const headingHtml = typeof marked.parseInline === "function" ? marked.parseInline(sourceText) : escapeHtml(sourceText);

      headings.push({
        id: headingId,
        level,
        text: plainText,
      });

      return `<h${level} id="${escapeHtml(headingId)}" class="study-heading-anchor">${headingHtml}</h${level}>`;
    })
    .join("\n");

  return {
    headings,
    preparedMarkdown,
  };
}

function renderChapterToc(headings) {
  if (!headings.length) {
    return "";
  }

  const items = headings
    .map(
      (heading) => `          <li class="study-toc-item study-toc-item--level-${heading.level}">
            <a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>
          </li>`
    )
    .join("\n");

  return `      <section class="panel">
        <h2>目次</h2>
        <ol class="study-toc-list">
${items}
        </ol>
      </section>`;
}

function renderNav(links) {
  return `
      <section class="panel">
        <p>
          ${links
            .map((link) => `<a class="back-link" href="${link.href}">${escapeHtml(link.label)}</a>`)
            .join("\n          ")}
        </p>
      </section>`;
}

function renderPage({ title, description, smallline, heading, tagline, marquee, navLinks, sections }) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | ワディーゲストハウス</title>
    <meta name="description" content="${escapeHtml(description)}" />
${getSiteModeHeadBootstrap()}
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="stars" aria-hidden="true"></div>
    <main class="page-frame">
      <header class="retro-header">
        <p class="smallline">${escapeHtml(smallline)}</p>
        <h1>${escapeHtml(heading)}</h1>
        <p class="tagline">${escapeHtml(tagline)}</p>
        <marquee behavior="scroll" direction="left" scrollamount="5">${escapeHtml(marquee)}</marquee>
      </header>
${renderNav(navLinks)}
${sections.join("\n")}
      <footer class="retro-footer">
        <p>Copyright (C) 1999-2026 ワディーゲストハウス All Rights Reserved.</p>
      </footer>
    </main>
    <script src="./study-visuals.js"></script>
${getSiteModeScriptTag()}
  </body>
</html>
`;
}

function renderStudyHome(subjects) {
  const subjectCards = subjects
    .map(
      (subject, index) => `          <article class="study-subject-card">
            <p class="study-card-kicker">Subject ${String(index + 1).padStart(2, "0")}</p>
            <h3>${escapeHtml(subject.label)}</h3>
            <p>${escapeHtml(subject.summary)}</p>
            <p class="study-card-note">${escapeHtml(subject.note)}</p>
            <p><a class="feature-link" href="./${buildSubjectPageName(subject.slug)}">章一覧を見る</a></p>
          </article>`
    )
    .join("\n");

  return renderPage({
    title: "勉強コーナー",
    description: "大学で勉強した内容を科目ごとに整理していく、ワディーゲストハウスの勉強コーナー。",
    smallline: "Study Corner",
    heading: "勉強コーナー",
    tagline: "大学で勉強した内容を、科目ごとに少しずつ整理していく入口。",
    marquee: "★ まずは力学から ★ 章ごとに少しずつ更新予定 ★",
    navLinks: [
      { href: "./index.html", label: "トップページへ戻る" },
      { href: "./study-mechanics.html", label: "力学の章一覧へ" },
    ],
    sections: [
      `      <section class="panel">
        <h2>科目一覧</h2>
        <div class="study-collection">
${subjectCards}
        </div>
      </section>`,
    ],
  });
}

function renderSubjectPage(subject) {
  const chapterItems = subject.chapters
    .map((chapter) => {
      const note =
        chapter.status === "published"
          ? "いま読める章です。図やメモを見ながら内容を追えます。"
          : "これから少しずつ書き足していく章です。";

      return `          <li>
            <article class="study-chapter-card">
              <div class="study-chapter-meta">
                <span class="study-chapter-number">Chapter ${formatChapterNumber(chapter.order)}</span>
              </div>
              <h3><a href="./${chapter.pageName}">${escapeHtml(chapter.title)}</a></h3>
              <p>${escapeHtml(note)}</p>
            </article>
          </li>`;
    })
    .join("\n");

  return renderPage({
    title: "力学",
    description: "力学ノートの章一覧ページ。いま読める章と、これから増やしていく章を並べています。",
    smallline: "Mechanics",
    heading: subject.label,
    tagline: "大学で勉強した力学ノートを、章ごとにまとめていくページ。",
    marquee: "★ 第1章から順番に追加予定 ★",
    navLinks: [
      { href: "./study.html", label: "勉強コーナーへ戻る" },
      { href: "./index.html", label: "トップページへ戻る" },
    ],
    sections: [
      `      <section class="panel">
        <h2>章一覧</h2>
        <ol class="study-chapter-list">
${chapterItems}
        </ol>
      </section>`,
    ],
  });
}

async function renderChapterPage(subject, chapter) {
  const chapterMarkup = buildChapterMarkup(chapter.body);
  const articleHtml = await marked.parse(chapterMarkup.preparedMarkdown);
  const introText =
    chapter.status === "published"
      ? "いま読める章です。本文と図を行き来しながら読めるようにまとめています。"
      : "この章はこれから書き足していきます。";

  return renderPage({
    title: `${subject.label} — ${chapter.title}`,
    description: `${subject.label}の${chapter.title}ページ。Markdown を正本にして、章ごとに内容を追加していきます。`,
    smallline: `${subject.label} Chapter ${formatChapterNumber(chapter.order)}`,
    heading: chapter.title,
    tagline: "大学で勉強した内容を、あとから見返しやすい形で少しずつまとめていく章ページ。",
    marquee: "★ 内容は順次追加予定 ★",
    navLinks: [
      { href: `./${buildSubjectPageName(subject.slug)}`, label: `${subject.label}の章一覧へ` },
      { href: "./study.html", label: "勉強コーナーへ戻る" },
    ],
    sections: [
      `      <section class="panel">
        <div class="study-page-meta">
          <span class="study-chapter-number">Chapter ${formatChapterNumber(chapter.order)}</span>
        </div>
        <p class="study-page-note">${escapeHtml(introText)}</p>
      </section>`,
      renderChapterToc(chapterMarkup.headings),
      `      <section class="panel study-article-panel">
        <article class="study-article">
${articleHtml}
        </article>
      </section>`,
    ],
  });
}

async function main() {
  await mkdir(STUDY_ROOT, { recursive: true });
  const studyData = loadStudyData();
  const issues = collectStudyIssues(studyData);

  if (issues.length) {
    throw new Error(`Study validation failed:\n- ${issues.join("\n- ")}`);
  }

  const studyHomeHtml = renderStudyHome(studyData);
  await writeFile(join(PROJECT_ROOT, "study.html"), studyHomeHtml, "utf-8");
  console.log("✓ study.html generated");

  for (const subject of studyData) {
    const subjectHtml = renderSubjectPage(subject);
    await writeFile(join(PROJECT_ROOT, buildSubjectPageName(subject.slug)), subjectHtml, "utf-8");
    console.log(`✓ ${buildSubjectPageName(subject.slug)} generated`);

    for (const chapter of subject.chapters) {
      const chapterHtml = await renderChapterPage(subject, chapter);
      await writeFile(join(PROJECT_ROOT, chapter.pageName), chapterHtml, "utf-8");
      console.log(`✓ ${chapter.pageName} generated`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
