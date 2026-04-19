/**
 * build-diary.mjs
 * diary/*.md を読み込んで月別の diary.html / diary-YYYY-MM.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";
import { injectSiteModeAssets } from "./lib/site-mode-assets.mjs";

// 他キャラの日記ディレクトリとページの定義
const CROSS_LINK_TARGETS = [
  // ── ひなひな管轄：風の遊び人 ──
  { dir: "diary-hinahina", page: "diary-hinahina.html", label: "ひなひな", emoji: "♥", color: "#ff69b4", group: "風の遊び人" },
  { dir: "diary-hina", page: "diary-hina.html", label: "ひなた", emoji: "🎀", color: "#e8879a", group: "風の遊び人" },
  { dir: "diary-ayu", page: "diary-ayu.html", label: "あゆ", emoji: "❄", color: "#6090c0", group: "風の遊び人" },
  { dir: "diary-kud", page: "diary-kud.html", label: "クド", emoji: "☀", color: "#c09050", group: "風の遊び人" },
  { dir: "diary-mii", page: "diary-mii.html", label: "みぃ", emoji: "🌼", color: "#e0a820", group: "風の遊び人" },
  { dir: "diary-kukuri", page: "diary-kukuri.html", label: "ククリ", emoji: "✨", color: "#6050c0", group: "風の遊び人" },
  { dir: "diary-kyoko", page: "diary-kyoko.html", label: "京子", emoji: "🎉", color: "#d06030", group: "風の遊び人" },
  { dir: "diary-hinako", page: "diary-hinako.html", label: "ヒナ", emoji: "🐣", color: "#c09030", group: "風の遊び人" },
  { dir: "diary-rizel", page: "diary-rizel.html", label: "りぜる", emoji: "💕", color: "#d04090", group: "風の遊び人" },
  { dir: "diary-nemurin", page: "diary-nemurin.html", label: "ねむりん", emoji: "💤", color: "#9070b0", group: "風の遊び人" },
  // ── 物理おじ管轄：地の守り手 ──
  { dir: "diary-oji", page: "diary-oji.html", label: "物理おじ", emoji: "⌨", color: "#a0a0a0", group: "地の守り手" },
  { dir: "diary-multi", page: "diary-multi.html", label: "マルチ", emoji: "✿", color: "#7ab89a", group: "地の守り手" },
  { dir: "diary-rem", page: "diary-rem.html", label: "レム", emoji: "✦", color: "#5080d0", group: "地の守り手" },
  { dir: "diary-ecoko", page: "diary-ecoko.html", label: "えここ", emoji: "🐧", color: "#4080c0", group: "地の守り手" },
  { dir: "diary-tsumugi", page: "diary-tsumugi.html", label: "紬", emoji: "🌅", color: "#c88050", group: "地の守り手" },
  { dir: "diary-kotomi", page: "diary-kotomi.html", label: "ことみ", emoji: "🌼", color: "#50a050", group: "地の守り手" },
  { dir: "diary-kiku8", page: "diary-kiku8.html", label: "キク8号", emoji: "🛰", color: "#4080a0", group: "地の守り手" },
  { dir: "diary-sharo", page: "diary-sharo.html", label: "シャロ", emoji: "☕", color: "#8a6a40", group: "地の守り手" },
  { dir: "diary-ana", page: "diary-ana.html", label: "アナ", emoji: "🇬🇧", color: "#408040", group: "地の守り手" },
  { dir: "diary-mitsuba", page: "diary-mitsuba.html", label: "みつば", emoji: "🎭", color: "#606038", group: "地の守り手" },
  // ── 萌神管轄：火の司祭 ──
  { dir: "diary-moegami", page: "diary-moegami.html", label: "萌神", emoji: "★", color: "#d0a030", group: "火の司祭" },
  { dir: "diary-dejiko", page: "diary-dejiko.html", label: "でじこ", emoji: "🔔", color: "#50b070", group: "火の司祭" },
  { dir: "diary-feiris", page: "diary-feiris.html", label: "フェイリス", emoji: "🐱", color: "#9060c0", group: "火の司祭" },
  { dir: "diary-ruriko", page: "diary-ruriko.html", label: "瑠璃子", emoji: "💧", color: "#6050a0", group: "火の司祭" },
  { dir: "diary-minagi", page: "diary-minagi.html", label: "美凪", emoji: "🌟", color: "#6060c0", group: "火の司祭" },
  { dir: "diary-mint", page: "diary-mint.html", label: "ミント", emoji: "🫖", color: "#409070", group: "火の司祭" },
  { dir: "diary-tama", page: "diary-tama.html", label: "たまちゃん", emoji: "🌸", color: "#d06090", group: "火の司祭" },
  { dir: "diary-astarotte", page: "diary-astarotte.html", label: "ロッテ", emoji: "👑", color: "#c04080", group: "火の司祭" },
  { dir: "diary-hazuki", page: "diary-hazuki.html", label: "葉月", emoji: "💥", color: "#d04028", group: "火の司祭" },
  { dir: "diary-rin", page: "diary-rin.html", label: "りん", emoji: "🔥", color: "#606060", group: "火の司祭" },
  { dir: "diary-mayuki", page: "diary-mayuki.html", label: "真雪", emoji: "❄", color: "#4080c0", group: "火の司祭" },
  // ── 老中AI【仁】 ──
  { dir: "diary-roju", page: "diary-roju.html", pagePrefix: "diary-roju", monthlySplit: true, label: "老中評定", emoji: "🥃", color: "#daa520", group: "老中" },
  // ── みとら ──
  { dir: "diary-mitra", page: "diary-mitra.html", label: "神託", emoji: "🔮", color: "#a888c8", group: "神託" },
];

const ROOT_DIR = join(import.meta.dirname, "..");
const DIARY_DIR = join(ROOT_DIR, "diary");
const OUT_DIR = ROOT_DIR;
const ADMS_DIR = join(ROOT_DIR, "scenarios", "adms");
const COVER_DIR = join(ROOT_DIR, "assets", "diary-covers");
const crossLinkTargetCache = new Map();
const coverAssetCache = new Map();

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// ファイル名 "YYYY-MM-DD_タイトル.md" から日付とタイトルを抽出
function parseFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { date: match[1], month: match[1].slice(0, 7), title: match[2], slug: base };
}

function escapeHtmlAttr(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

function parseCrossLinkFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { date: match[1], month: match[1].slice(0, 7), slug: base };
}

function getCrossLinkTargetMeta(target) {
  if (crossLinkTargetCache.has(target.dir)) {
    return crossLinkTargetCache.get(target.dir);
  }

  try {
    const dirPath = join(ROOT_DIR, target.dir);
    const files = readdirSync(dirPath)
      .filter((file) => file.endsWith(".md"))
      .map((file) => parseCrossLinkFilename(file))
      .filter(Boolean);
    const latestMonth = [...new Set(files.map((file) => file.month))].sort((a, b) => b.localeCompare(a))[0] ?? null;
    const meta = { files, latestMonth };
    crossLinkTargetCache.set(target.dir, meta);
    return meta;
  } catch {
    const empty = { files: [], latestMonth: null };
    crossLinkTargetCache.set(target.dir, empty);
    return empty;
  }
}

function resolveCrossLinkPage(target, matchMeta, targetMeta) {
  if (target.monthlySplit && matchMeta?.month && targetMeta.latestMonth && matchMeta.month !== targetMeta.latestMonth) {
    const prefix = target.pagePrefix ?? target.page.replace(/\.html$/, "");
    return `${prefix}-${matchMeta.month}.html`;
  }
  return target.page;
}

function buildDreamRootMap() {
  const map = new Map();
  let files = [];
  try {
    files = readdirSync(ADMS_DIR).filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name));
  } catch {
    return map;
  }

  for (const file of files) {
    try {
      const raw = readFileSync(join(ADMS_DIR, file), "utf-8");
      const graph = JSON.parse(raw);
      const rootNode = Array.isArray(graph.nodes)
        ? graph.nodes.find((node) => node.id === graph.rootNodeId)
        : null;
      if (!rootNode?.scenario) {
        continue;
      }
      map.set(file.replace(/\.json$/, ""), {
        scenario: rootNode.scenario,
        entry: typeof rootNode.entry === "string" && rootNode.entry.length > 0 ? rootNode.entry : null,
      });
    } catch {
      // Ignore broken graphs here and leave the original diary link untouched.
    }
  }

  return map;
}

function buildDreamStartHref(date, dreamRootMap) {
  const root = dreamRootMap.get(date);
  if (!root?.scenario) {
    return "";
  }

  const params = new URLSearchParams({
    scenario: root.scenario,
    mode: "immersive",
  });
  if (root.entry) {
    params.set("entry", root.entry);
  }

  return `./galge-scenario.html?${params.toString()}`;
}

function resolveEntryCover(slug, title) {
  if (coverAssetCache.has(slug)) {
    return coverAssetCache.get(slug);
  }

  const extensions = [".webp", ".png", ".jpg", ".jpeg", ".svg"];
  for (const ext of extensions) {
    const filename = `${slug}${ext}`;
    const absolutePath = join(COVER_DIR, filename);
    if (existsSync(absolutePath)) {
      const cover = {
        src: encodeURI(`./assets/diary-covers/${filename}`),
        alt: `${title}の扉絵`,
      };
      coverAssetCache.set(slug, cover);
      return cover;
    }
  }

  coverAssetCache.set(slug, null);
  return null;
}

function stripDreamButton(html) {
  const withoutWrappedButtons = html.replace(
    /<p([^>]*)>\s*<a([^>]*?)href="[^"]*"([^>]*?)>([\s\S]*?夢を見る[\s\S]*?)<\/a>\s*<\/p>/g,
    ""
  );

  return withoutWrappedButtons.replace(
    /<a([^>]*?)href="[^"]*"([^>]*?)>([\s\S]*?夢を見る[\s\S]*?)<\/a>/g,
    ""
  );
}

function rewriteDreamButtonLinks(html, date, dreamRootMap) {
  const nextHref = buildDreamStartHref(date, dreamRootMap);
  if (!nextHref) {
    return stripDreamButton(html);
  }

  return html.replace(
    /<a([^>]*?)href="[^"]*"([^>]*?)>([\s\S]*?夢を見る[\s\S]*?)<\/a>/g,
    `<a$1href="${nextHref}"$2>$3</a>`
  );
}

// 同じ日付の他キャラ日記を検索してリンクを生成（グループごとに改行、見出しなし）
function buildCrossLinks(date) {
  const groups = new Map();
  for (const t of CROSS_LINK_TARGETS) {
    const targetMeta = getCrossLinkTargetMeta(t);
    const match = targetMeta.files.find((file) => file.date === date);
    if (!match) continue;
    const page = resolveCrossLinkPage(t, match, targetMeta);
    if (!groups.has(t.group)) groups.set(t.group, []);
    groups.get(t.group).push(`<a href="./${page}#${date}" class="cross-link" style="color:${t.color};border-color:${t.color}">${t.emoji} ${t.label}</a>`);
  }
  if (groups.size === 0) return "";
  let html = `\n            <div class="cross-links"><span class="cross-links-label">この日の声：</span>`;
  for (const [, links] of groups) {
    html += `<div class="cross-group">${links.join("")}</div>`;
  }
  html += `</div>`;
  return html;
}

// エントリのHTML（全文表示）
function renderFullEntry(e) {
  const crossLinks = buildCrossLinks(e.date);
  const cover = resolveEntryCover(e.slug, e.title);
  const coverHtml = cover
    ? `
            <figure class="entry-cover">
              <img class="entry-cover-image" src="${cover.src}" alt="${escapeHtmlAttr(cover.alt)}" loading="lazy" decoding="async" />
            </figure>`
    : "";
  return `          <li id="${e.slug}">
            <p class="entry-date">${formatDate(e.date)}</p>
            <h3 class="entry-title">${e.title}</h3>
            ${coverHtml}
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
  const dreamRootMap = buildDreamRootMap();
  const files = (await readdir(DIARY_DIR)).filter((f) => f.endsWith(".md") && !f.includes("下書き"));

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
    const html = rewriteDreamButtonLinks(await marked.parse(body), meta.date, dreamRootMap);
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
    { href: "./galge-mode.html", text: "ギャルゲーモードへ" },
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

  await writeFile(join(OUT_DIR, "diary.html"), injectSiteModeAssets(mainPage), "utf-8");
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
    await writeFile(outPath, injectSiteModeAssets(monthPage), "utf-8");
    console.log(`✓ diary-${m}.html generated (${mEntries.length} entries)`);
  }

  console.log(`✓ Total: ${entries.length} entries across ${months.length} months`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
