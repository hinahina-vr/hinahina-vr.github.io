import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "tama", name: "たまちゃん", title: "たまちゃんの日記", subtitle: "萌えの殿堂から",
  tagline: "萌えー！教えてあげる！", desc: "たまちゃん ── 「瓶詰妖精」（2003年）のキャラクター。元気でオタク知識が豊富、教えたがりな瓶の中の妖精。",
  emoji: "🌸", bgGradient: "linear-gradient(135deg, #fff0f5 0%, #ffe0ee 30%, #fff5f8 60%, #fff8fa 100%)",
  textColor: "#5a3050", accentColor: "#d06090", borderColor: "#e080a0", subtitleColor: "#c06080",
  footer: "萌えー！ここまで読んでくれたんだ！教えてあげるね、ありがとう！"
}).catch(e => { console.error(e); process.exit(1); });
