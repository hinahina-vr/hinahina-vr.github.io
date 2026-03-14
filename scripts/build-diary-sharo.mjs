import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "sharo", name: "シャロ", title: "シャロの日記", subtitle: "戦略的節約の記録",
  tagline: "べ、別に！", desc: "桐間紗路 ── 「ご注文はうさぎですか？」（2014年）のキャラクター。しっかり者のツッコミ役、コーヒーで暴走。",
  emoji: "☕", bgGradient: "linear-gradient(135deg, #f8f0e8 0%, #f0e8d8 30%, #f8f4e8 60%, #faf8f0 100%)",
  textColor: "#4a3828", accentColor: "#8a6a40", borderColor: "#b09060", subtitleColor: "#907848",
  footer: "べ、別にここまで読んでくれたからって嬉しくないんだからね。"
}).catch(e => { console.error(e); process.exit(1); });
