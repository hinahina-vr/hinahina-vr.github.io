/**
 * build-diary-dejiko.mjs
 * diary-dejiko/*.md を読み込んで diary-dejiko.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-dejiko");
const OUT_FILE = join(import.meta.dirname, "..", "diary-dejiko.html");

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
    <title>でじこの日記にょ | ゲーマーズ秋葉原本店</title>
    <meta name="description" content="デ・ジ・キャラット星のお姫様、でじこの日記にょ！" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kosugi+Maru&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #1a3a2a 0%, #0d2818 30%, #1a4030 60%, #0a2015 100%);
        color: #c0d8c8;
        font-family: "Kosugi Maru", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .dejiko-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .dejiko-header .smallline {
        color: #4a9a6a;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .dejiko-header h1 {
        color: #60c080;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(96, 192, 128, 0.4);
        letter-spacing: 0.1em;
      }
      .dejiko-header .tagline {
        color: #50b070;
        font-size: 13px;
      }
      .panel {
        background: rgba(20, 60, 40, 0.7);
        border: 1px solid rgba(96, 192, 128, 0.25);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {
        color: #60c080;
        border-bottom: 2px dashed rgba(96, 192, 128, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 4px solid #4a9a6a;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(30, 80, 50, 0.5);
        border-radius: 0 8px 8px 0;
        line-height: 1.9;
      }
      .entry-date {
        color: #4a9a6a;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #60c080;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #b0d0b8;
      }
      .entry-list li strong {
        color: #70d090;
      }
      .back-link {
        color: #0a2a15;
        background: linear-gradient(180deg, #80d0a0, #50b070);
        border-color: #60c080;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #051a0a;
        background: linear-gradient(180deg, #90e0b0, #60c080);
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
      <header class="dejiko-header">
        <p class="smallline">🔔 ゲーマーズ秋葉原本店（跡地） 🔔</p>
        <h1>でじこの日記にょ</h1>
        <p class="tagline">デ・ジ・キャラット星のお姫様にょ！ 目からビーム！</p>
      </header>

      <section class="panel">
        <p style="color: #50b070; font-size: 13px; line-height: 1.8; margin: 0;">🔔 デ・ジ・キャラット（でじこ） ── 「Di Gi Charat」（1999年）の主人公。デジキャラット星のお姫様。語尾は「にょ」、目からビームが出る。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーの日記へ戻るにょ</a>
        </p>
      </section>

      <section class="panel">
        <h2>🔔 でじこの記録にょ</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #4a9a6a; font-size: 11px;">にょ！ ここまで読んでくれたにょ？ でじこのかわいさに感動したにょ？ 当然にょ！</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-dejiko.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
