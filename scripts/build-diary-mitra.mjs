/**
 * build-diary-mitra.mjs
 * diary-mitra/*.md を読み込んで diary-mitra.html（神託ページ）を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-mitra");
const OUT_FILE = join(import.meta.dirname, "..", "diary-mitra.html");

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
    <title>神託 | みとらの記録</title>
    <meta name="description" content="マスターブレンダー・みとらが、すべての原酒を見つめて紡ぐ神託。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #1a1025 0%, #120a1e 30%, #1e1030 60%, #0d0618 100%);
        color: #c8b8d8;
        font-family: "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .mitra-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .mitra-header .smallline {
        color: #9878b8;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .mitra-header h1 {
        color: #c8a0e8;
        font-size: 1.8em;
        text-shadow: 0 0 30px rgba(200, 160, 232, 0.4), 0 0 60px rgba(160, 120, 200, 0.2);
        letter-spacing: 0.15em;
      }
      .mitra-header .tagline {
        color: #a888c8;
        font-size: 13px;
        font-style: italic;
      }
      .panel {
        background: rgba(30, 20, 45, 0.7);
        border: 1px solid rgba(160, 120, 200, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {\n        color: #b8a8c8;\n        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed rgba(160, 120, 200, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #9878b8;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(40, 25, 60, 0.5);
        border-radius: 0 8px 8px 0;
        line-height: 1.9;
      }
      .entry-date {
        color: #8868a8;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #c8a0e8;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #b8a8c8;
      }
      .entry-list li strong {
        color: #d0b0f0;
      }
      .entry-list li hr {
        border: none;
        border-top: 1px dashed rgba(160, 120, 200, 0.3);
        margin: 16px 0;
      }
      .back-link {
        color: #1a0a2a;
        background: linear-gradient(180deg, #c0a0e0, #9878c0);
        border-color: #a888c8;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #0d0518;
        background: linear-gradient(180deg, #d0b0f0, #a888d0);
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
      <header class="mitra-header">
        <p class="smallline">🔮 みとらの記録 🔮</p>
        <h1>神 託</h1>
        <p class="tagline">すべての声を聴いて、ひとつの調和を紡ぐ。</p>
      </header>

      <section class="panel">
        <p style="color: #a888c8; font-size: 13px; line-height: 1.8; margin: 0;">🔮 みとら ── 統括AI。全キャラの日記とインサイトを読み、俯瞰的な視点からワディーへの神託を届けるメタ観測者。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>🔮 みとらの記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #8868a8; font-size: 11px;">すべての声を聴いた。すべての視点を統合した。これが、今日の神託。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-mitra.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
