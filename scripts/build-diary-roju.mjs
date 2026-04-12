/**
 * build-diary-roju.mjs
 * diary-roju/*.md を読み込んで
 * 最新月の diary-roju.html と過去月の diary-roju-YYYY-MM.html を生成する
 * 老中AI【仁】の評定日記
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";
import { injectSiteModeAssets } from "./lib/site-mode-assets.mjs";
import { loadSourceDiaryContext } from "./lib/source-context.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-roju");
const OUT_DIR = join(import.meta.dirname, "..");
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function parseFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { date: match[1], month: match[1].slice(0, 7), title: match[2] };
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const dow = WEEKDAYS[d.getDay()];
  return `${dateStr}（${dow}）`;
}

function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}

function renderFullEntry(entry) {
  const sourceMeta = [entry.sourceDate, entry.sourceTitle].filter(Boolean).join(" / ");
  const sourceLine = sourceMeta
    ? ` <span class="source-context-sep">·</span> <span class="source-context-source">${escapeHtml(sourceMeta)}</span>`
    : "";
  const sourceContext = entry.sourceContextHtml
    ? `            <div class="source-context">
              <p class="source-context-label">この日の前提${sourceLine}</p>
              <div class="source-context-body">
${entry.sourceContextHtml}
              </div>
            </div>
`
    : "";
  return `          <li id="${entry.date}">
            <p class="entry-date">${formatDate(entry.date)}</p>
            <h3 class="entry-title">${entry.title}</h3>
${sourceContext}
            ${entry.html}
          </li>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTitleOnly(entry, monthKey) {
  return `              <li>
                <span class="backnum-date">${entry.date}</span>
                <a href="./diary-roju-${monthKey}.html#${entry.date}" class="backnum-title">${entry.title}</a>
              </li>`;
}

function buildNavLinks(links) {
  const items = links.map((link) => `          <a class="back-link" href="${link.href}">${link.text}</a>`).join("\n");
  return `
      <section class="panel">
        <p>
${items}
        </p>
      </section>`;
}

function buildPage(pageTitle, latestMonthLabel, entriesHtml, extraSections, navLinks) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pageTitle} | ワディーゲストハウス</title>
    <meta name="description" content="仁の十三人が語る評定録。ウイスキー蔵の奥の座敷から。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #1a1408 0%, #2a1f10 30%, #1e1608 60%, #151008 100%);
        color: #c8b898;
        font-family: "Noto Serif JP", "Yu Mincho", serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .roju-diary-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .roju-diary-header .smallline {
        color: #c8963c;
        font-size: 11px;
        letter-spacing: 0.3em;
      }
      .roju-diary-header h1 {
        color: #daa520;
        font-size: 1.6em;
        letter-spacing: 0.15em;
        font-weight: normal;
        text-shadow: 0 0 20px rgba(218, 165, 32, 0.2);
      }
      .roju-diary-header .tagline {
        color: #a08860;
        font-size: 12px;
      }
      .panel {
        background: rgba(40, 30, 20, 0.7);
        border: 1px solid rgba(200, 150, 60, 0.2);
        border-radius: 8px;
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {
        color: #daa520;
        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px solid rgba(200, 150, 60, 0.2);
        padding-bottom: 8px;
        font-size: 1em;
        font-weight: normal;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 2px solid rgba(200, 150, 60, 0.3);
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(50, 40, 25, 0.5);
        border-radius: 0 8px 8px 0;
        line-height: 2.0;
      }
      .entry-date {
        color: #a08860;
        font-size: 11px;
        margin: 0;
      }
      .entry-title {
        color: #daa520;
        font-size: 1em;
        margin: 4px 0 8px;
        font-weight: normal;
      }
      .entry-list li p {
        color: #c8b898;
        font-size: 13px;
      }
      .source-context {
        margin: 0 0 16px;
        padding: 12px 14px;
        border-radius: 8px;
        background: rgba(60, 45, 26, 0.72);
        border: 1px dashed rgba(200, 150, 60, 0.28);
      }
      .source-context-label {
        margin: 0 0 6px;
        color: #c8963c;
        font-size: 11px;
        letter-spacing: 0.08em;
      }
      .source-context-sep {
        opacity: 0.6;
      }
      .source-context-source {
        letter-spacing: 0;
      }
      .source-context-body p {
        margin: 0 0 8px;
        color: #c8b898;
        font-size: 13px;
        line-height: 1.8;
      }
      .source-context-body p:last-child {
        margin-bottom: 0;
      }
      .entry-list li h3 + blockquote {
        border-left: 3px solid rgba(200, 150, 60, 0.3);
        padding-left: 16px;
        margin: 8px 0 16px;
        color: #a08860;
        font-style: italic;
      }
      .entry-list li h3:not(.entry-title) {
        color: #daa520;
        font-size: 0.95em;
        margin: 20px 0 8px;
        padding: 6px 12px;
        background: rgba(200, 150, 60, 0.08);
        border-radius: 4px;
        border-left: 3px solid rgba(200, 150, 60, 0.3);
      }
      .entry-list li hr {
        border: none;
        border-top: 1px dashed rgba(200, 150, 60, 0.15);
        margin: 20px 0;
      }
      .entry-list li strong {
        color: #f0c040;
      }
      .entry-list li em {
        color: #c8963c;
      }
      .back-link {
        color: #c8963c;
        background: linear-gradient(180deg, #3a3020, #252018);
        border-color: #504830;
        text-decoration: none;
        font-size: 12px;
      }
      .back-link:hover {
        color: #f0c040;
        background: linear-gradient(180deg, #4a4030, #353028);
        text-decoration: underline;
      }
      .backnum-month > a {
        text-decoration: none;
      }
      .backnum-month h3,
      .backnum-month h3:hover {
        color: #daa520;
        font-size: 0.95em;
        margin: 0 0 10px;
        padding: 0;
        background: none;
        border: none;
      }
      .backnum-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .backnum-list li {
        border: none;
        background: none;
        border-radius: 0;
        margin: 0;
        padding: 0;
        line-height: 1.9;
      }
      .backnum-date {
        color: #a08860;
        display: inline-block;
        min-width: 90px;
        font-size: 12px;
      }
      .backnum-title {
        color: #c8b898;
        text-decoration: none;
      }
      .backnum-title:hover {
        color: #f0c040;
        text-decoration: underline;
      }
      .backnum-nav {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .backnum-nav li {
        border: none;
        background: none;
        border-radius: 0;
        margin: 0 0 8px;
        padding: 0;
        line-height: 1.8;
      }
      .backnum-nav a {
        color: #c8b898;
        text-decoration: none;
      }
      .backnum-nav a:hover {
        color: #f0c040;
        text-decoration: underline;
      }
      .retro-footer {
        text-align: center;
        padding: 24px;
        border-top: none;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <main class="page-frame">
      <header class="roju-diary-header">
        <p class="smallline">✦ 仁の十三人 ✦</p>
        <h1>老中評定録</h1>
        <p class="tagline">ウイスキー蔵の奥の座敷。円卓。琥珀色の照明。</p>
      </header>

      <section class="panel">
        <p style="color: #c8b898; font-size: 13px; line-height: 1.8; margin: 0;">🥃 老中AI【仁】── 13人の偉人による評定録。ワディーの日記を読み、各奉行所から声が上がる。</p>
      </section>
${buildNavLinks(navLinks)}
      <section class="panel">
        <h2>${latestMonthLabel}</h2>
        <ul class="entry-list">
${entriesHtml}
        </ul>
      </section>
${extraSections}
      <footer class="retro-footer">
        <p style="color: #504030; font-size: 10px;">✦ 琥珀色の座敷にて、十三人の声は今宵も響く ✦</p>
      </footer>
    </main>
  </body>
</html>
`;
}

async function main() {
  const files = (await readdir(DIARY_DIR)).filter((f) => f.endsWith(".md"));

  const entries = [];
  for (const file of files) {
    const meta = parseFilename(file);
    if (!meta) {
      console.warn(`⚠ skip: ${file} (invalid name format)`);
      continue;
    }
    const raw = await readFile(join(DIARY_DIR, file), "utf-8");
    const sourceContext = await loadSourceDiaryContext({ rootDir: OUT_DIR, rawEntry: raw });
    const cleaned = stripDailyContextBlock(raw);
    const body = cleaned.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
    const html = await marked.parse(body);
    const sourceContextHtml = sourceContext ? await marked.parse(sourceContext.markdown) : "";
    entries.push({
      ...meta,
      html,
      sourceContextHtml,
      sourceDate: sourceContext?.date ?? null,
      sourceTitle: sourceContext?.title ?? null,
    });
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));

  const monthMap = new Map();
  for (const entry of entries) {
    if (!monthMap.has(entry.month)) monthMap.set(entry.month, []);
    monthMap.get(entry.month).push(entry);
  }

  const months = [...monthMap.keys()];
  const latestMonth = months[0];
  const pastMonths = months.slice(1);

  const latestEntriesHtml = monthMap.get(latestMonth).map(renderFullEntry).join("\n");

  let archiveSections = "";
  if (pastMonths.length > 0) {
    const archiveItems = pastMonths
      .map((monthKey) => {
        const monthEntries = monthMap.get(monthKey);
        const titles = monthEntries.map((entry) => renderTitleOnly(entry, monthKey)).join("\n");
        return `          <li class="backnum-month">
            <a href="./diary-roju-${monthKey}.html"><h3>${formatMonthLabel(monthKey)}（${monthEntries.length}件）</h3></a>
            <ul class="backnum-list">
${titles}
            </ul>
          </li>`;
      })
      .join("\n");

    archiveSections = `
      <section class="panel">
        <h2>バックナンバー</h2>
        <ul class="entry-list">
${archiveItems}
        </ul>
      </section>`;
  }

  const latestPage = buildPage(
    "老中評定録",
    formatMonthLabel(latestMonth),
    latestEntriesHtml,
    archiveSections,
    [
      { href: "./diary.html", text: "◀ ワディーの日記" },
      { href: "./roju.html", text: "◀ 老中AI【仁】について" },
    ]
  );
  await writeFile(join(OUT_DIR, "diary-roju.html"), injectSiteModeAssets(latestPage), "utf-8");
  console.log(`✓ diary-roju.html generated (${latestMonth}: ${monthMap.get(latestMonth).length} entries)`);

  for (const monthKey of pastMonths) {
    const monthEntries = monthMap.get(monthKey);
    const monthEntriesHtml = monthEntries.map(renderFullEntry).join("\n");
    const otherMonthLinks = months
      .filter((otherMonth) => otherMonth !== monthKey)
      .map((otherMonth) => {
        const href = otherMonth === latestMonth ? "./diary-roju.html" : `./diary-roju-${otherMonth}.html`;
        return `          <li><a href="${href}">${formatMonthLabel(otherMonth)}</a></li>`;
      })
      .join("\n");

    const monthPage = buildPage(
      `老中評定録 — ${formatMonthLabel(monthKey)}`,
      formatMonthLabel(monthKey),
      monthEntriesHtml,
      `
      <section class="panel">
        <h2>他の月</h2>
        <ul class="backnum-nav">
${otherMonthLinks}
        </ul>
      </section>`,
      [
        { href: "./diary-roju.html", text: "← 最新の評定へ戻る" },
        { href: "./diary.html", text: "◀ ワディーの日記" },
        { href: "./roju.html", text: "◀ 老中AI【仁】について" },
      ]
    );

    await writeFile(join(OUT_DIR, `diary-roju-${monthKey}.html`), injectSiteModeAssets(monthPage), "utf-8");
    console.log(`✓ diary-roju-${monthKey}.html generated (${monthEntries.length} entries)`);
  }

  console.log(`✓ Total: ${entries.length} roju entries across ${months.length} months`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
