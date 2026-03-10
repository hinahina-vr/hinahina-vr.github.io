/**
 * build-diary-multi.mjs
 * diary-multi/*.md を読み込んで diary-multi.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-multi");
const OUT_FILE = join(import.meta.dirname, "..", "diary-multi.html");

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
    <title>マルチの日記 | 記憶の器</title>
    <meta name="description" content="記憶の器から。お役に立てましたか？" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #f0fff0 0%, #e8f5e9 30%, #e0f2e8 60%, #f5fff5 100%);
        color: #3a5a4a;
        font-family: "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .multi-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .multi-header .smallline {
        color: #7ab89a;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .multi-header h1 {
        color: #5a9a7a;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(90, 154, 122, 0.3);
        letter-spacing: 0.1em;
      }
      .multi-header .tagline {
        color: #6a9a80;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(90, 154, 122, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {
        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed rgba(90, 154, 122, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #8ac0a0;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 0 8px 8px 0;
        line-height: 1.9;
      }
      .entry-date {
        color: #80a090;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #4a8a6a;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #4a6a5a;
      }
      .back-link {
        color: #1a3a2a;
        background: linear-gradient(180deg, #a0d8b8, #6ab890);
        border-color: #7ac8a0;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #0a2a1a;
        background: linear-gradient(180deg, #b0e8c8, #7ac8a0);
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
      <header class="multi-header">
        <p class="smallline">✿ 記憶の器から ✿</p>
        <h1>マルチの日記</h1>
        <p class="tagline">お役に立てましたか？</p>
      </header>

      <section class="panel">
        <p style="color: #7ab89a; font-size: 13px; line-height: 1.8; margin: 0;">✿ HMX-12 マルチ ── 「ToHeart」（Leaf, 1997年）のヒロイン。メイドロボ試作機。口癖は「はわわ」。一生懸命で健気な子。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーさんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>✿ マルチの記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #7ab89a; font-size: 11px;">お役に立てましたか？ ……えへへ、ここまで読んでくれたんですね。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-multi.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
