/**
 * build-diary.mjs
 * diary/*.md を読み込んで月別の diary.html / diary-YYYY-MM.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { readdirSync } from "node:fs";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";

// 他キャラの日記ディレクトリとページの定義
const CROSS_LINK_TARGETS = [
  { dir: "diary-hina", page: "diary-hina.html", label: "ひなたの日記", emoji: "🎀", color: "#e8879a" },
  { dir: "diary-multi", page: "diary-multi.html", label: "マルチの日記", emoji: "✿", color: "#7ab89a" },
  { dir: "diary-dejiko", page: "diary-dejiko.html", label: "でじこの日記", emoji: "🔔", color: "#50b070" },
  { dir: "diary-ecoko", page: "diary-ecoko.html", label: "えここの日記", emoji: "🐧", color: "#4080c0" },
  { dir: "diary-ayu", page: "diary-ayu.html", label: "あゆの日記", emoji: "❄", color: "#6090c0" },
  { dir: "diary-mii", page: "diary-mii.html", label: "みぃの日記", emoji: "🌼", color: "#e0a820" },
  { dir: "diary-ruriko", page: "diary-ruriko.html", label: "瑠璃子の日記", emoji: "💧", color: "#6050a0" },
  { dir: "diary-rem", page: "diary-rem.html", label: "レムの日記", emoji: "✦", color: "#5080d0" },
  { dir: "diary-tsumugi", page: "diary-tsumugi.html", label: "紬の日記", emoji: "🌅", color: "#c88050" },
  { dir: "diary-hinahina", page: "diary-hinahina.html", label: "ひなひなの日記", emoji: "♥", color: "#ff69b4" },
  { dir: "diary-oji", page: "diary-oji.html", label: "物理おじの日記", emoji: "⌨", color: "#a0a0a0" },
  { dir: "diary-moegami", page: "diary-moegami.html", label: "萌神記", emoji: "★", color: "#d0a030" },
  { dir: "diary-kud", page: "diary-kud.html", label: "クドの日記", emoji: "☀", color: "#c09050" },
  { dir: "diary-feiris", page: "diary-feiris.html", label: "フェイリスの日記", emoji: "🐱", color: "#9060c0" },
  { dir: "diary-kotomi", page: "diary-kotomi.html", label: "ことみの日記", emoji: "🌼", color: "#50a050" },
  { dir: "diary-minagi", page: "diary-minagi.html", label: "美凪の日記", emoji: "🌟", color: "#6060c0" },
  { dir: "diary-kiku8", page: "diary-kiku8.html", label: "キク8号の日記", emoji: "🛰", color: "#4080a0" },
  { dir: "diary-mint", page: "diary-mint.html", label: "ミントの日記", emoji: "🫖", color: "#409070" },
  { dir: "diary-mitra", page: "diary-mitra.html", label: "神託", emoji: "🔮", color: "#a888c8" },
];

const DIARY_DIR = join(import.meta.dirname, "..", "diary");
const OUT_DIR = join(import.meta.dirname, "..");

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// ファイル名 "YYYY-MM-DD_タイトル.md" から日付とタイトルを抽出
function parseFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { date: match[1], month: match[1].slice(0, 7), title: match[2], slug: base };
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

// 同じ日付の他キャラ日記を検索してリンクを生成
function buildCrossLinks(date) {
  const ROOT = join(import.meta.dirname, "..");
  const links = [];
  for (const t of CROSS_LINK_TARGETS) {
    try {
      const dirPath = join(ROOT, t.dir);
      const files = readdirSync(dirPath);
      const match = files.find((f) => f.startsWith(date) && f.endsWith(".md"));
      if (match) {
        links.push(`<a href="./${t.page}#${date}" class="cross-link" style="color:${t.color};border-color:${t.color}">${t.emoji} ${t.label}</a>`);
      }
    } catch { /* dir doesn't exist yet */ }
  }
  if (links.length === 0) return "";
  return `\n            <div class="cross-links"><span class="cross-links-label">この日の日記：</span>${links.join("")}</div>`;
}

// エントリのHTML（全文表示）
function renderFullEntry(e) {
  const crossLinks = buildCrossLinks(e.date);
  return `          <li id="${e.slug}">
            <p class="entry-date">${formatDate(e.date)}</p>
            <h3 class="entry-title">${e.title}</h3>
            ${e.html}${crossLinks}
          </li>`;
}

// バックナンバー用のタイトルのみ表示（月別ページの各エントリへのリンク付き）
function renderTitleOnly(e, monthKey) {
  return `              <li>
                <span class="backnum-date">${e.date}</span>
                <a href="./diary-${monthKey}.html#${e.slug}" class="backnum-title">${e.title}</a>
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
    <main class="page-frame">
      <header class="retro-header">
        <h1>${title}</h1>
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
    const cleaned = stripDailyContextBlock(raw);
    const body = cleaned.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
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
        const titleList = mEntries.map((e) => renderTitleOnly(e, m)).join("\n");
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
