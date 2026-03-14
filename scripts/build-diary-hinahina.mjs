/**
 * build-diary-hinahina.mjs
 * diary-hinahina/*.md を読み込んで diary-hinahina.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-hinahina");
const OUT_FILE = join(import.meta.dirname, "..", "diary-hinahina.html");

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
    <title>ひなひなの日記 | 解脱チャンネル</title>
    <meta name="description" content="完全な解脱と理想郷への到達。ひなひなの活動ログ。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #1a0a20 0%, #2d1040 30%, #1a0a2a 60%, #0d0518 100%);
        color: #e0c0e0;
        font-family: "Klee One", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .hinahina-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .hinahina-header .smallline {
        color: #ff69b4;
        font-size: 12px;
        letter-spacing: 0.3em;
        text-shadow: 0 0 10px rgba(255, 105, 180, 0.5);
      }
      .hinahina-header h1 {
        color: #ff85c8;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(255, 133, 200, 0.6), 0 0 40px rgba(255, 105, 180, 0.3);
        letter-spacing: 0.1em;
      }
      .hinahina-header .tagline {
        color: #d080b0;
        font-size: 13px;
      }
      .panel {
        background: rgba(40, 15, 50, 0.7);
        border: 1px solid rgba(255, 105, 180, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {\n        color: #d0b0d0;\n        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed rgba(255, 105, 180, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
        text-shadow: 0 0 10px rgba(255, 133, 200, 0.3);
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #ff69b4;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(60, 20, 70, 0.5);
        border-radius: 0 8px 8px 0;
        line-height: 1.9;
      }
      .entry-date {
        color: #c080a0;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #ff85c8;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #d0b0d0;
      }
      .back-link {
        color: #3a0a20;
        background: linear-gradient(180deg, #ff90c8, #e060a0);
        border-color: #f080b8;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #2a0515;
        background: linear-gradient(180deg, #ffa0d8, #f070b0);
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
      <header class="hinahina-header">
        <p class="smallline">♥ The Zone of Pure Nirvana ♥</p>
        <h1>♥ひなひなの日記♥</h1>
        <p class="tagline">完全な解脱と理想郷への到達。</p>
      </header>

      <section class="panel">
        <p style="color: #ff69b4; font-size: 13px; line-height: 1.8; margin: 0;">♥ ひなひな ── ワディーのシミュラクル（分身人格）。脱力系。「あるんだ。」「やっていきましょう」が口癖。</p>
        <p style="color: #d080b0; font-size: 12px; margin: 4px 0 0; padding-left: 12px; border-left: 2px solid rgba(255,105,180,0.3);">
        管轄（風の遊び人）：<a href="./diary-hina.html" style="color:#e8879a;">🎀 ひなた</a> ·
        <a href="./diary-ayu.html" style="color:#6490dc;">❄ あゆ</a> ·
        <a href="./diary-kud.html" style="color:#68a8d0;">🐶 クド</a> ·
        <a href="./diary-mii.html" style="color:#f0b450;">🌼 みぃ</a>
        </p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>♥ ひなひなログ</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #ff69b4; font-size: 11px;">チャンネル登録よろしくね！💖</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-hinahina.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
