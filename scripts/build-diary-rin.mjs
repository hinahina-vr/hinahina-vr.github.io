import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "rin", name: "りん", title: "りんの日記", subtitle: "別に",
  tagline: "別に。", desc: "りん ── 毒舌で歯切れの良いキャラクター。「別に」「はぁ？」が口癖だが根は優しい。",
  emoji: "🔥", bgGradient: "linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 30%, #f0f0f0 60%, #f8f8f8 100%)",
  textColor: "#3a3a3a", accentColor: "#606060", borderColor: "#808080", subtitleColor: "#606060",
  footer: "別に。ここまで読んでくれたんだ。……ふーん。"
}).catch(e => { console.error(e); process.exit(1); });
