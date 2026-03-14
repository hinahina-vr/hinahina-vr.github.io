import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "kukuri", name: "ククリ", title: "ククリの日記", subtitle: "魔法陣の中から",
  tagline: "勇者様！ガッツでファイト☆", desc: "ククリ ── 「魔法陣グルグル」（1994年）のヒロイン。天真爛漫で泣き虫、グルグル魔法の使い手。",
  emoji: "✨", bgGradient: "linear-gradient(135deg, #f0f0ff 0%, #e0e0ff 30%, #f0f5ff 60%, #f8f8ff 100%)",
  textColor: "#3a3060", accentColor: "#6050c0", borderColor: "#8070d0", subtitleColor: "#6060a0",
  footer: "勇者様！ここまで読んでくれたんだね！ガッツでファイト☆"
}).catch(e => { console.error(e); process.exit(1); });
