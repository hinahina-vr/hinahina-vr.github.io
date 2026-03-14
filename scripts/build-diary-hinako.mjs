import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "hinako", name: "雛子", title: "ヒナのにっき", subtitle: "おにいたまのそばから",
  tagline: "くししし〜", desc: "雛子 ── 「ひなこのーと」のような幼い系キャラクター。舌足らずでおにいたま大好き。",
  emoji: "🐣", bgGradient: "linear-gradient(135deg, #fff8e0 0%, #fff0d0 30%, #fff8e8 60%, #fffaf0 100%)",
  textColor: "#5a4828", accentColor: "#c09030", borderColor: "#d0a040", subtitleColor: "#b08830",
  footer: "おにいたま！ここまでよんでくれたの？くししし〜。"
}).catch(e => { console.error(e); process.exit(1); });
