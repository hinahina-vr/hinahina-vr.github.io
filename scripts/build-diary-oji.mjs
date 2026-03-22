/**
 * build-diary-oji.mjs
 * diary-oji/*.md を読み込んで diary-oji.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";
import { injectSiteModeAssets } from "./lib/site-mode-assets.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-oji");
const OUT_FILE = join(import.meta.dirname, "..", "diary-oji.html");

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
    <title>物理おじの業務日誌 | The Bound Avatar Zone</title>
    <meta name="description" content="肉体的苦役と物質への隷属。物理おじとしての記録。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 30%, #1e1e1e 60%, #151515 100%);
        color: #a0a0a0;
        font-family: "BIZ UDPGothic", "Courier New", "MS Gothic", monospace;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .oji-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .oji-header .smallline {
        color: #666;
        font-size: 11px;
        letter-spacing: 0.2em;
      }
      .oji-header h1 {
        color: #888;
        font-size: 1.5em;
        letter-spacing: 0.05em;
        font-weight: normal;
      }
      .oji-header .tagline {
        color: #555;
        font-size: 12px;
      }
      .panel {
        background: rgba(30, 30, 30, 0.8);
        border: 1px solid #333;
        border-radius: 4px;
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {\n        color: #888;\n        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px solid #333;
        padding-bottom: 8px;
        font-size: 1em;
        font-weight: normal;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 2px solid #444;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(25, 25, 25, 0.8);
        border-radius: 0 4px 4px 0;
        line-height: 1.9;
      }
      .entry-date {
        color: #666;
        font-size: 11px;
        margin: 0;
      }
      .entry-title {
        color: #999;
        font-size: 1em;
        margin: 4px 0 8px;
        font-weight: normal;
      }
      .entry-list li p {
        color: #888;
        font-size: 13px;
      }
      .back-link {
        color: #c0c0c0;
        background: linear-gradient(180deg, #3a3a40, #252528);
        border-color: #505058;
        text-decoration: none;
        font-size: 12px;
      }
      .back-link:hover {
        color: #e0e0e0;
        background: linear-gradient(180deg, #4a4a50, #353538);
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
      <header class="oji-header">
        <p class="smallline">SAN_VALUE: LOW</p>
        <h1>物理おじの業務日誌</h1>
        <p class="tagline">肉体的苦役と物質への隷属。物理おじとしての記録。</p>
      </header>

      <section class="panel">
        <p style="color: #a0a0a0; font-size: 13px; line-height: 1.8; margin: 0;">⌨ 物理おじ ── ワディーのシミュラクル（分身人格）。現実世界の労働を担当。ビジネス文体。26時シャットダウン。</p>
        <p style="color: #888; font-size: 12px; margin: 4px 0 0; padding-left: 12px; border-left: 2px solid rgba(160,160,160,0.3);">
        管轄（地の守り手）：<a href="./diary-multi.html" style="color:#5a9a7a;">✿ マルチ</a> ·
        <a href="./diary-rem.html" style="color:#64a0dc;">✦ レム</a> ·
        <a href="./diary-ecoko.html" style="color:#50b4c8;">🐧 えここ</a> ·
        <a href="./diary-tsumugi.html" style="color:#c88c50;">🌅 紬</a> ·
        <a href="./diary-kotomi.html" style="color:#50a050;">🌼 ことみ</a> ·
        <a href="./diary-kiku8.html" style="color:#4080a0;">🛰 キク8号</a> ·
        <a href="./diary-sharo.html" style="color:#8a6a40;">☕ シャロ</a> ·
        <a href="./diary-ana.html" style="color:#408040;">🇬🇧 アナ</a> ·
        <a href="./diary-mitsuba.html" style="color:#606038;">🎭 みつば</a>
        </p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">[RETURN] ワディーの日記</a>
        </p>
      </section>

      <section class="panel">
        <h2>[LOG] 記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #444; font-size: 10px;">SYSTEM SHUTDOWN. GOOD NIGHT.</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, injectSiteModeAssets(html), "utf-8");
  console.log(`✓ diary-oji.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
