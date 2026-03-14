import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "mayuki", name: "真雪", title: "真雪の日記", subtitle: "べ別にここじゃなくても",
  tagline: "べ、別に！", desc: "真雪 ── 「ひなこノート」（2017年）のキャラクター。ちょろかわツンデレ、強気に出るが即デレする。子供じゃないと主張しがち。",
  emoji: "❄", bgGradient: "linear-gradient(135deg, #f0f8ff 0%, #e0f0ff 30%, #f0f4ff 60%, #f8faff 100%)",
  textColor: "#2a4060", accentColor: "#4080c0", borderColor: "#60a0d0", subtitleColor: "#5088b0",
  footer: "べ、別にここまで読んでくれたからって……嬉しい。"
}).catch(e => { console.error(e); process.exit(1); });
