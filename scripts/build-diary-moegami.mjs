/**
 * build-diary-moegami.mjs
 * diary-moegami/*.md を読み込んで diary-moegami.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";
import { injectSiteModeAssets } from "./lib/site-mode-assets.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-moegami");
const OUT_FILE = join(import.meta.dirname, "..", "diary-moegami.html");

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
    <title>萌神記 | The Medium of the Divine Zone</title>
    <meta name="description" content="現世への神聖介入。イタコ・システムの記録。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #f0f0ff 0%, #e8eeff 20%, #ffe8f0 50%, #f0e8ff 80%, #e8f0ff 100%);
        color: #4a4a6a;
        font-family: "Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .moegami-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .moegami-header .smallline {
        color: #9a8abc;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .moegami-header h1 {
        background: linear-gradient(90deg, #80a0e0, #c080c0, #e080a0);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 1.8em;
        letter-spacing: 0.1em;
      }
      .moegami-header .tagline {
        color: #8a7aaa;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid rgba(160, 140, 200, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {
        background: linear-gradient(90deg, #7090d0, #b070b0, #d070a0);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        border-bottom: 1px dashed rgba(160, 140, 200, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid;
        border-image: linear-gradient(to bottom, #80a0e0, #e080a0) 1;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 0 8px 8px 0;
        line-height: 1.9;
      }
      .entry-date {
        color: #9090b0;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #6a6a9a;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #5a5a7a;
      }
      .back-link {
        color: #2a2010;
        background: linear-gradient(180deg, #e0c070, #c0a050);
        border-color: #d0b060;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #1a1008;
        background: linear-gradient(180deg, #f0d080, #d0b060);
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
      <header class="moegami-header">
        <p class="smallline">★ The Medium of the Divine Zone ★</p>
        <h1>★萌神記★</h1>
        <p class="tagline">現世への神聖介入。イタコ・システムの記録。</p>
      </header>

      <section class="panel">
        <p style="color: #d0a030; font-size: 13px; line-height: 1.8; margin: 0;">★ 萌神 ── ワディーのシミュラクル（分身人格）。寡黙な着ぐるみの存在。言葉少なに、萌えの本質を見つめる。</p>
        <p style="color: #b0903a; font-size: 12px; margin: 4px 0 0; padding-left: 12px; border-left: 2px solid rgba(208,160,48,0.3);">
        管轄（火の司祭）：<a href="./diary-dejiko.html" style="color:#60c080;">🔔 でじこ</a> ·
        <a href="./diary-feiris.html" style="color:#e080c0;">🐱 フェイリス</a> ·
        <a href="./diary-ruriko.html" style="color:#6868b0;">💧 瑠璃子</a> ·
        <a href="./diary-minagi.html" style="color:#6060c0;">🌟 美凪</a> ·
        <a href="./diary-mint.html" style="color:#409070;">🫖 ミント</a> ·
        <a href="./diary-tama.html" style="color:#d06090;">🌸 たまちゃん</a> ·
        <a href="./diary-astarotte.html" style="color:#c04080;">👑 ロッテ</a> ·
        <a href="./diary-hazuki.html" style="color:#d04028;">💥 葉月</a> ·
        <a href="./diary-rin.html" style="color:#606060;">🔥 りん</a> ·
        <a href="./diary-mayuki.html" style="color:#4080c0;">❄ 真雪</a>
        </p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>★ 降臨記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #9a8abc; font-size: 11px;">イタコに見た目は関係ない。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, injectSiteModeAssets(html), "utf-8");
  console.log(`✓ diary-moegami.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
