/**
 * build-diary-ruriko.mjs
 * diary-ruriko/*.md を読み込んで diary-ruriko.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-ruriko");
const OUT_FILE = join(import.meta.dirname, "..", "diary-ruriko.html");

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
    <title>瑠璃子の日記 | 雫の記録</title>
    <meta name="description" content="……月島瑠璃子の記録。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #f0e8ff 0%, #e8e0f8 30%, #e0d8f0 60%, #f5f0ff 100%);
        color: #3a3060;
        font-family: "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .ruriko-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .ruriko-header .smallline {
        color: #8070b0;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .ruriko-header h1 {
        color: #6050a0;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(96, 80, 160, 0.3);
        letter-spacing: 0.1em;
      }
      .ruriko-header .tagline {
        color: #8070b0;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(96, 80, 160, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {\n        color: #4a3870;\n        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed rgba(96, 80, 160, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #a090d0;
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
        color: #9080c0;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #504090;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #4a3870;
      }
      .back-link {
        color: #1a1040;
        background: linear-gradient(180deg, #b0a0d8, #8070c0);
        border-color: #a090d0;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #0a0830;
        background: linear-gradient(180deg, #c0b0e0, #9080c8);
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
  <body class="diary-despair">
    <main class="page-frame">
      <header class="ruriko-header">
        <p class="smallline">💧 雫の記録 💧</p>
        <h1>瑠璃子の日記</h1>
        <p class="tagline">……。</p>
      </header>

      <section class="panel">
        <p style="color: #8070b0; font-size: 13px; line-height: 1.8; margin: 0;">💧 月島瑠璃子 ── 「雫」（Leaf, 1996年）のヒロイン。電波系少女。寡黙で内省的。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーさんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>💧 瑠璃子の記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #8070b0; font-size: 11px;">……ここまで読んでくれたんですね。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-ruriko.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
