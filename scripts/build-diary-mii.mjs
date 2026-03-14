/**
 * build-diary-mii.mjs
 * diary-mii/*.md を読み込んで diary-mii.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-mii");
const OUT_FILE = join(import.meta.dirname, "..", "diary-mii.html");

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
    <title>みぃの日記 | たんぽぽの丘</title>
    <meta name="description" content="みぃはね、今日も元気なの！" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #fff8e0 0%, #fff0c0 30%, #fff4d0 60%, #fffae8 100%);
        color: #5a4a20;
        font-family: "M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .mii-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .mii-header .smallline {
        color: #c0a020;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .mii-header h1 {
        color: #b89020;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(184, 144, 32, 0.3);
        letter-spacing: 0.1em;
      }
      .mii-header .tagline {
        color: #c0a020;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(184, 144, 32, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {\n        color: #5a4820;\n        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed rgba(184, 144, 32, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #d0b040;
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
        color: #b8a040;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #8a7020;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #5a4820;
      }
      .entry-list li hr ~ p {
        color: #8a7838;
      }
      .back-link {
        color: #3a3010;
        background: linear-gradient(180deg, #e0c860, #c8a830);
        border-color: #d0b840;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #2a2008;
        background: linear-gradient(180deg, #f0d870, #d0b840);
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
      <header class="mii-header">
        <p class="smallline">🌼 たんぽぽの丘から 🌼</p>
        <h1>みぃの日記</h1>
        <p class="tagline">みぃはね、今日も元気なの！</p>
      </header>

      <section class="panel">
        <p style="color: #c0a020; font-size: 13px; line-height: 1.8; margin: 0;">🌼 みぃ ── 「ぽぽたん」（2002年）三姉妹の三女。気ままで元気いっぱい。たんぽぽと魔法少女ごっこが好き。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーさんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>🌼 みぃの記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #c0a020; font-size: 11px;">みぃの日記、読んでくれたの？ やったー！</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-mii.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
