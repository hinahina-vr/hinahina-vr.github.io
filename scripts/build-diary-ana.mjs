import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "ana", name: "アナ", title: "アナの日記", subtitle: "日本が大好きな場所から",
  tagline: "Oh! ……すみません。", desc: "アナ・コッポラ ── 「苺ましまろ」（2005年）のキャラクター。イギリス系だが日本文化大好き、反射的に英語が出て恥ずかしがる。",
  emoji: "🇬🇧", bgGradient: "linear-gradient(135deg, #f0f8f0 0%, #e0f0e0 30%, #f0f8f0 60%, #f8faf8 100%)",
  textColor: "#2a502a", accentColor: "#408040", borderColor: "#60a060", subtitleColor: "#408848",
  footer: "Oh! ここまで読んでくださったんですね。ありがとうございます。"
}).catch(e => { console.error(e); process.exit(1); });
