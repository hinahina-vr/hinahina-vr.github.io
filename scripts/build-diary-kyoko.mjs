import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "kyoko", name: "京子", title: "京子の日記", subtitle: "ラムレーズンの楽園から",
  tagline: "っしゃ！", desc: "歳納京子 ── 「ゆるゆり」（2011年）のキャラクター。ハイテンションでラムレーズン狂、ノリと勢い。",
  emoji: "🎉", bgGradient: "linear-gradient(135deg, #fff0e0 0%, #ffe8d0 30%, #fff4e0 60%, #fff8f0 100%)",
  textColor: "#5a3020", accentColor: "#d06030", borderColor: "#e07040", subtitleColor: "#c05838",
  footer: "っしゃ！ここまで読んだの？ラムレーズンあげる！"
}).catch(e => { console.error(e); process.exit(1); });
