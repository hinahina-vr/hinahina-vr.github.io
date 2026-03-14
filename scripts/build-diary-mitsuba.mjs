import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "mitsuba", name: "みつば", title: "みつばの日記", subtitle: "計画通りの場所から",
  tagline: "ふっ、計画通り。", desc: "丸井みつば ── 「みつどもえ」（2010年）のキャラクター。三つ子の長女、腹黒サディストで偉そう。",
  emoji: "🎭", bgGradient: "linear-gradient(135deg, #f0f0e8 0%, #e8e8e0 30%, #f0f0ea 60%, #f8f8f0 100%)",
  textColor: "#3a3a28", accentColor: "#606038", borderColor: "#808060", subtitleColor: "#606048",
  footer: "ちっ、ここまで読むとは……見込みがあるな。"
}).catch(e => { console.error(e); process.exit(1); });
