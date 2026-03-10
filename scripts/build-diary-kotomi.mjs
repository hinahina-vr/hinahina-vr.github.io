/**
 * build-diary-kotomi.mjs
 * diary-kotomi/*.md を読み込んで diary-kotomi.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-kotomi");
const OUT_FILE = join(import.meta.dirname, "..", "diary-kotomi.html");

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
    const body = raw.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
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
    <title>ことみの日記 | たんぽぽ娘の記録</title>
    <meta name="description" content="バイオリン、弾いてもいいですか？" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #f0fff0 0%, #d8f8d8 30%, #e8ffe8 60%, #f8fff8 100%);
        color: #2a4a2a;
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
        color: #60a060;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .char-header h1 {
        color: #308030;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(160, 112, 48, 0.3);
        letter-spacing: 0.1em;
      }
      .char-header .tagline {
        color: #60a060;
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
      .panel h2 {
        color: #308030;
        border-bottom: 1px dashed rgba(160, 112, 48, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #80c080;
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
        color: #60a060;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #308030;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #2a4a2a;
      }
      .back-link {
        color: #2a4a2a;
        background: linear-gradient(180deg, #e8ffe8, #80c080);
        border-color: #80c080;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #2a4a2a;
        background: linear-gradient(180deg, #f8fff8, #80c080);
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
        <p class="smallline">🌼 たんぽぽ娘の記録 🌼</p>
        <h1>ことみの日記</h1>
        <p class="tagline">バイオリン、弾いてもいいですか？</p>
      </header>

      <section class="panel">
        <p style="color: #60a060; font-size: 13px; line-height: 1.8; margin: 0;">🌼 一ノ瀬ことみ ── 「CLANNAD」（2004年）。全国模試全科目一桁の天才。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーさんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>🌼 ことみの記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #60a060; font-size: 11px;">ここまで読んでくださったのですか……ありがとうございます。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-kotomi.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
