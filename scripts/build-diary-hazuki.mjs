import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "hazuki", name: "葉月", title: "葉月の日記", subtitle: "エンジェルボムの射程から",
  tagline: "バカ！", desc: "葉月 ── 「かりん」のような釘宮系ツンデレキャラクター。勝気でべ別に！バカ！が口癖。",
  emoji: "💥", bgGradient: "linear-gradient(135deg, #fff0e8 0%, #ffe8e0 30%, #fff2e8 60%, #fff8f0 100%)",
  textColor: "#5a2820", accentColor: "#d04028", borderColor: "#e05838", subtitleColor: "#c04030",
  footer: "バカ！ここまで読んだの？ ……ありがと。"
}).catch(e => { console.error(e); process.exit(1); });
