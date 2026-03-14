import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "astarotte", name: "ロッテ", title: "ロッテの日記", subtitle: "姫の間から",
  tagline: "べ別に嬉しくなんかないのだ。", desc: "アスタロッテ・ユグヴァール ── 「アスタロッテのおもちゃ！」（2011年）のヒロイン。姫言葉のツンデレ、ぬいぐるみ好き。",
  emoji: "👑", bgGradient: "linear-gradient(135deg, #fff0f8 0%, #ffe8f0 30%, #fff2f8 60%, #fff8fa 100%)",
  textColor: "#5a2848", accentColor: "#c04080", borderColor: "#d06090", subtitleColor: "#b04870",
  footer: "べ別にここまで読んでくれたからって……嬉しくなんかないのだ。"
}).catch(e => { console.error(e); process.exit(1); });
