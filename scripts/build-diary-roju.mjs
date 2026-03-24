/**
 * build-diary-roju.mjs
 * diary-roju/*.md を読み込んで diary-roju.html を生成する
 * 老中AI【仁】の評定日記
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";
import { injectSiteModeAssets } from "./lib/site-mode-assets.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-roju");
const OUT_FILE = join(import.meta.dirname, "..", "diary-roju.html");

function parseFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { date: match[1], title: match[2] };
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
    const cleaned = stripDailyContextBlock(raw);
    const body = cleaned.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
    const html = await marked.parse(body);
    entries.push({ ...meta, html });
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
            ${e.html}
          </li>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>老中評定録 | ワディーゲストハウス</title>
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

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">◀ ワディーの日記</a>
          <a class="back-link" href="./roju.html" style="margin-left: 12px;">◀ 老中AI【仁】について</a>
        </p>
      </section>

      <section class="panel">
        <h2>📜 評定記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #504030; font-size: 10px;">✦ 琥珀色の座敷にて、十三人の声は今宵も響く ✦</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, injectSiteModeAssets(html), "utf-8");
  console.log(`✓ diary-roju.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
