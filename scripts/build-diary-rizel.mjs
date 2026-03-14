import { buildCharDiary } from "./lib/build-diary-char.mjs";
buildCharDiary({
  id: "rizel", name: "りぜる", title: "りぜるの日記", subtitle: "だんなさまのそばから",
  tagline: "だんなさまー！", desc: "りぜる ── 「りぜるまいん」（2002年）のヒロイン。甘えん坊で「だんなさまー！」が口癖、語尾が「〜ですぅ」。",
  emoji: "💕", bgGradient: "linear-gradient(135deg, #fff0f8 0%, #ffe0f0 30%, #fff4f8 60%, #fff8fa 100%)",
  textColor: "#602048", accentColor: "#d04090", borderColor: "#e060a0", subtitleColor: "#c04878",
  footer: "だんなさまー！ここまで読んでくれたんですぅ！嬉しいですぅ！"
}).catch(e => { console.error(e); process.exit(1); });
