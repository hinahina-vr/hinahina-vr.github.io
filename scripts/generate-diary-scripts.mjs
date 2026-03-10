/**
 * generate-diary-scripts.mjs
 * クドのスクリプトをテンプレートにして5キャラ分生成
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const kudScript = readFileSync(join(import.meta.dirname, "build-diary-kud.mjs"), "utf-8");

const chars = [
    { id: "feiris", title: "フェイリスの日記", subtitle: "ニャンニャンの秋葉原", tagline: "チェシャー・ブレイク！", desc: "フェイリス・ニャンニャン ── 「STEINS;GATE」（2009年）。メイクイーン＋ニャン²のNo.1メイド。", footer: "ここまで読んでくれたニャン。ふふ。", emoji: "🐱", bg1: "#f8e8ff", bg2: "#e8d0ff", bg3: "#f0e0ff", bg4: "#faf0ff", accent: "#7040a0", text: "#4a305a", border: "#b080d0", smallline: "#a070b0" },
    { id: "kotomi", title: "ことみの日記", subtitle: "たんぽぽ娘の記録", tagline: "バイオリン、弾いてもいいですか？", desc: "一ノ瀬ことみ ── 「CLANNAD」（2004年）。全国模試全科目一桁の天才。", footer: "ここまで読んでくださったのですか……ありがとうございます。", emoji: "🌼", bg1: "#f0fff0", bg2: "#d8f8d8", bg3: "#e8ffe8", bg4: "#f8fff8", accent: "#308030", text: "#2a4a2a", border: "#80c080", smallline: "#60a060" },
    { id: "minagi", title: "美凪の日記", subtitle: "天文部部長の記録", tagline: "飛べない翼に、意味はあるのでしょうか。", desc: "遠野美凪 ── 「AIR」（2000年）。一人きりの天文部部長。星と翼の少女。", footer: "ここまで読んでくださって……お米券、差し上げます。", emoji: "🌟", bg1: "#e8e8ff", bg2: "#d0d0f8", bg3: "#e0e0ff", bg4: "#f0f0ff", accent: "#4040a0", text: "#2a2a5a", border: "#8080d0", smallline: "#7070b0" },
    { id: "kiku8", title: "キク8号の日記", subtitle: "技術試験衛星の記録", tagline: "覚えていてくださって……ありがとうございます。", desc: "キク8号 ── 「ワンダバスタイル」（2003年）。美少女型技術試験衛星ロボ。弾道計算のスペシャリスト。", footer: "軌道上から……お読みいただきありがとうございます。", emoji: "🛰", bg1: "#e8f0f8", bg2: "#d0e0f0", bg3: "#e0e8f8", bg4: "#f0f4ff", accent: "#306080", text: "#1a3050", border: "#6090b0", smallline: "#5080a0" },
    { id: "mint", title: "ミントの日記", subtitle: "テレパスの令嬢", tagline: "ふふふ、計算通りですわ。", desc: "ミント・ブラマンシェ ── 「ギャラクシーエンジェル」（2001年）。ブラマンシュ財閥の令嬢。", footer: "ここまでお読みいただき、計算通りですわ。ふふふ。", emoji: "🫖", bg1: "#e8fff0", bg2: "#c8f0d8", bg3: "#d8ffe8", bg4: "#f0fff8", accent: "#207050", text: "#1a4030", border: "#60b090", smallline: "#508070" },
];

for (const c of chars) {
    let s = kudScript;
    // ディレクトリ・ファイル名
    s = s.replace(/diary-kud/g, `diary-${c.id}`);
    s = s.replace(/kud-header/g, "char-header");
    // タイトル・メタ
    s = s.replace("クドの日記 | わふーの太陽", `${c.title} | ${c.subtitle}`);
    s = s.replace("わふー！ クドの日記なのです。", c.tagline);
    // 背景色
    s = s.replace("#fff8e8", c.bg1);
    s = s.replace("#ffe8c0", c.bg2);
    s = s.replace("#fff0d0", c.bg3);
    s = s.replace("#fffaf0", c.bg4);
    // テキスト色（複数箇所）
    s = s.replaceAll("#5a4a30", c.text);
    s = s.replaceAll("#c09050", c.smallline);
    s = s.replaceAll("#a07030", c.accent);
    s = s.replaceAll("#d0a060", c.border);
    s = s.replaceAll("#806020", c.accent);
    // リンク色
    s = s.replace("#3a2a10", c.text);
    s = s.replace("#e0c890", c.bg3);
    s = s.replace("#c0a060", c.border);
    s = s.replace("#1a1000", c.text);
    s = s.replace("#f0d8a0", c.bg4);
    s = s.replace("#d0b070", c.border);
    s = s.replace("#c0a070", c.smallline);
    // ヘッダー
    s = s.replace("☀ わふーの太陽 ☀", `${c.emoji} ${c.subtitle} ${c.emoji}`);
    s = s.replace(">クドの日記<", `>${c.title}<`);
    s = s.replace(">わふー！ がんばるのです！<", `>${c.tagline}<`);
    // 説明文
    s = s.replace("☀ 能美クドリャフカ ── 「リトルバスターズ！」（2007年）のヒロイン。犬みたいな子。宇宙に行くのが夢。", `${c.emoji} ${c.desc}`);
    s = s.replace("☀ クドの記録", `${c.emoji} ${c.title.replace("の日記", "の記録")}`);
    s = s.replace("わふー……ここまで読んでくれたのですか？ ありがとうございます！", c.footer);

    writeFileSync(join(import.meta.dirname, `build-diary-${c.id}.mjs`), s, "utf-8");
    console.log(`✓ Created build-diary-${c.id}.mjs`);
}
