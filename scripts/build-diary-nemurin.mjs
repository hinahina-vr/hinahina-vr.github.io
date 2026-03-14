import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "nemurin", name: "ねむりん", title: "ねむりんの日記", subtitle: "夢の中から",
  tagline: "zzz……ふわぁ……", desc: "ねむりん ── 「魔法少女育成計画」（2012年）のキャラクター。夢の世界の魔法少女、いつも眠そう。",
  emoji: "💤", bgGradient: "linear-gradient(135deg, #f0e8f8 0%, #e8e0f0 30%, #f0eaf8 60%, #f8f0ff 100%)",
  textColor: "#4a3860", accentColor: "#9070b0", borderColor: "#a080c0", subtitleColor: "#806098",
  footer: "zzz……ここまで読んでくれたんだ……ありがとう……zzz。"
}).catch(e => { console.error(e); process.exit(1); });
