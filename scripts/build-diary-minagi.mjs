/**
 * build-diary-minagi.mjs
 * diary-minagi/*.md を読み込んで diary-minagi.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";
import { injectSiteModeAssets } from "./lib/site-mode-assets.mjs";
import { loadSourceDiaryContext } from "./lib/source-context.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-minagi");
const OUT_FILE = join(import.meta.dirname, "..", "diary-minagi.html");
const ROOT = join(import.meta.dirname, "..");

function parseFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { date: match[1], title: match[2] };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSourceContext(entry) {
  if (!entry.sourceContextHtml) return "";
  const sourceMeta = [entry.sourceDate, entry.sourceTitle].filter(Boolean).join(" / ");
  const sourceLine = sourceMeta
    ? ` <span class="source-context-sep">·</span> <span class="source-context-source">${escapeHtml(sourceMeta)}</span>`
    : "";
  return `            <div class="source-context">
              <p class="source-context-label">この日の前提${sourceLine}</p>
              <div class="source-context-body">
${entry.sourceContextHtml}
              </div>
            </div>`;
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
    const sourceContext = await loadSourceDiaryContext({ rootDir: ROOT, rawEntry: raw });
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

  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

  const entryListItems = entries
    .map((e) => {
      const d = new Date(e.date + "T00:00:00+09:00");
      const dow = WEEKDAYS[d.getDay()];
      return `          <li id="${e.date}">
            <p class="entry-date">${e.date}（${dow}）</p>
            <h3 class="entry-title">${e.title}</h3>
${renderSourceContext(e)}
            ${e.html}
          </li>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>美凪の日記 | 天文部部長の記録</title>
    <meta name="description" content="飛べない翼に、意味はあるのでしょうか。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #e8e8ff 0%, #d0d0f8 30%, #e0e0ff 60%, #f0f0ff 100%);
        color: #2a2a5a;
        font-family: "Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .char-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .char-header .smallline {
        color: #7070b0;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .char-header h1 {
        color: #4040a0;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(160, 112, 48, 0.3);
        letter-spacing: 0.1em;
      }
      .char-header .tagline {
        color: #7070b0;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(160, 112, 48, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {\n        color: #2a2a5a;\n        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed rgba(160, 112, 48, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #8080d0;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 0 8px 8px 0;
        line-height: 1.9;
      }
      .entry-list li img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 12px 0;
      }
      .entry-date {
        color: #7070b0;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #4040a0;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #2a2a5a;
      }

      .source-context {
        margin: 0 0 16px;
        padding: 12px 14px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px dashed rgba(255, 255, 255, 0.35);
      }
      .source-context-label {
        margin: 0 0 6px;
        color: inherit;
        opacity: 0.72;
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
        font-size: 13px;
        line-height: 1.8;
      }
      .source-context-body p:last-child {
        margin-bottom: 0;
      }
      .back-link {
        color: #2a2a5a;
        background: linear-gradient(180deg, #e0e0ff, #8080d0);
        border-color: #8080d0;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #2a2a5a;
        background: linear-gradient(180deg, #f0f0ff, #8080d0);
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
      <header class="char-header">
        <p class="smallline">🌟 天文部部長の記録 🌟</p>
        <h1>美凪の日記</h1>
        <p class="tagline">飛べない翼に、意味はあるのでしょうか。</p>
      </header>

      <section class="panel">
        <p style="color: #7070b0; font-size: 13px; line-height: 1.8; margin: 0;">🌟 遠野美凪 ── 「AIR」（2000年）。一人きりの天文部部長。星と翼の少女。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーさんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>🌟 美凪の記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #7070b0; font-size: 11px;">ここまで読んでくださって……お米券、差し上げます。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, injectSiteModeAssets(html), "utf-8");
  console.log(`✓ diary-minagi.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
