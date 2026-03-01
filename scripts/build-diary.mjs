/**
 * build-diary.mjs
 * diary/*.md を読み込んで月別の diary.html / diary-YYYY-MM.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const DIARY_DIR = join(import.meta.dirname, "..", "diary");
const OUT_DIR = join(import.meta.dirname, "..");

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// ファイル名 "YYYY-MM-DD_タイトル.md" から日付とタイトルを抽出
function parseFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { date: match[1], month: match[1].slice(0, 7), title: match[2] };
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const dow = WEEKDAYS[d.getDay()];
  return `${dateStr}（${dow}）`;
}

function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split("-");
  return `${y}年${parseInt(m)}月`;
}

// エントリのHTML（全文表示）
function renderFullEntry(e) {
  return `          <li>
            <p class="entry-date">${formatDate(e.date)}</p>
            <h3 class="entry-title">${e.title}</h3>
            ${e.html}
          </li>`;
}

// バックナンバー用のタイトルのみ表示
function renderTitleOnly(e) {
  return `              <li>
                <span class="backnum-date">${e.date}</span>
                <span class="backnum-title">${e.title}</span>
              </li>`;
}

// 共通HTMLヘッダー
function htmlHead(title) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} | ワディーゲストハウス</title>
    <meta name="description" content="ワディーゲストハウスの日記ページ。活動メモと近況ログ。" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body class="diary-despair">
    <div class="stars" aria-hidden="true"></div>
    <main class="page-frame">
      <header class="retro-header">
        <p class="smallline">意識を持ったこと――それが生命の原罪だった。</p>
        <h1>${title}</h1>
        <p class="tagline">やがて澱みに還る、ある意識の記録。</p>
        <marquee behavior="scroll" direction="left" scrollamount="5">
          ★ <a href="./diary-hina.html" style="color: inherit; text-decoration: none;">この世界は、まだ終わっていない</a> ★
        </marquee>
      </header>`;
}

function htmlNav(links) {
  const items = links.map((l) => `          <a class="back-link" href="${l.href}">${l.text}</a>`).join("\n");
  return `
      <section class="panel">
        <p>
${items}
        </p>
      </section>`;
}

function htmlFooter() {
  return `
      <footer class="retro-footer">
        <p>Copyright (C) 1999-2026 ワディーゲストハウス All Rights Reserved.</p>
      </footer>
    </main>
  </body>
</html>
`;
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

  // 日付の新しい順にソート
  entries.sort((a, b) => b.date.localeCompare(a.date));

  // 月ごとにグルーピング（キーの降順を維持）
  const monthMap = new Map();
  for (const e of entries) {
    if (!monthMap.has(e.month)) monthMap.set(e.month, []);
    monthMap.get(e.month).push(e);
  }
  const months = [...monthMap.keys()]; // 既に降順
  const latestMonth = months[0];
  const pastMonths = months.slice(1);

  // --- メインページ diary.html ---
  const latestEntries = monthMap.get(latestMonth);
  const latestEntriesHtml = latestEntries.map(renderFullEntry).join("\n");

  let backNumberHtml = "";
  if (pastMonths.length > 0) {
    const backItems = pastMonths
      .map((m) => {
        const mEntries = monthMap.get(m);
        const titleList = mEntries.map(renderTitleOnly).join("\n");
        return `          <li class="backnum-month">
            <a href="./diary-${m}.html"><h3>${formatMonthLabel(m)}（${mEntries.length}件）</h3></a>
            <ul class="backnum-list">
${titleList}
            </ul>
          </li>`;
      })
      .join("\n");

    backNumberHtml = `
      <section class="panel">
        <h2>バックナンバー</h2>
        <ul class="entry-list">
${backItems}
        </ul>
      </section>`;
  }

  const mainPage = `${htmlHead("日記ページ")}
${htmlNav([
    { href: "./index.html", text: "トップページへ戻る" },
    { href: "./videos.html", text: "動画紹介コーナーへ" },
    { href: "./galge-guide.html", text: "ギャルゲ攻略ページへ" },
  ])}

      <section class="panel">
        <h2>${formatMonthLabel(latestMonth)}</h2>
        <ul class="entry-list">
${latestEntriesHtml}
        </ul>
      </section>
${backNumberHtml}
${htmlFooter()}`;

  await writeFile(join(OUT_DIR, "diary.html"), mainPage, "utf-8");
  console.log(`✓ diary.html generated (${latestMonth}: ${latestEntries.length} entries)`);

  // --- 過去月の個別ページ diary-YYYY-MM.html ---
  for (const m of pastMonths) {
    const mEntries = monthMap.get(m);
    const mEntriesHtml = mEntries.map(renderFullEntry).join("\n");

    // 他月へのナビゲーション
    const otherMonthLinks = months
      .filter((om) => om !== m)
      .map((om) => {
        if (om === latestMonth) {
          return `            <li><a href="./diary.html">${formatMonthLabel(om)}</a></li>`;
        }
        return `            <li><a href="./diary-${om}.html">${formatMonthLabel(om)}</a></li>`;
      })
      .join("\n");

    const monthPage = `${htmlHead(`日記 — ${formatMonthLabel(m)}`)}
${htmlNav([
      { href: "./diary.html", text: "← 最新の日記へ戻る" },
    ])}

      <section class="panel">
        <h2>${formatMonthLabel(m)}</h2>
        <ul class="entry-list">
${mEntriesHtml}
        </ul>
      </section>

      <section class="panel">
        <h2>他の月</h2>
        <ul class="backnum-nav">
${otherMonthLinks}
        </ul>
      </section>
${htmlFooter()}`;

    const outPath = join(OUT_DIR, `diary-${m}.html`);
    await writeFile(outPath, monthPage, "utf-8");
    console.log(`✓ diary-${m}.html generated (${mEntries.length} entries)`);
  }

  console.log(`✓ Total: ${entries.length} entries across ${months.length} months`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
