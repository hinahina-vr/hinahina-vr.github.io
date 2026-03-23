const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'scenarios');
const DATE = '2026-03-22';

const COMMON_CHARS = {
  narrator: { name: "", color: "#504060", emoji: "" },
  waddy:    { name: "ワディー", color: "#606060", emoji: "🖥️" }
};

function withBranchEntries(data) {
  return {
    ...data,
    scenario: [
      { label: "standalone_start" },
      { bg: "abyss" },
      {
        speaker: "narrator",
        expression: "",
        text: `これは、「${data.title}」へ枝分かれした記録。\n顕幻の交差路の本筋から、そのまま滑り落ちてきた者だけが見る部屋だ。`,
      },
      { label: "entry_from_main" },
      ...data.scenario,
    ],
  };
}

function write(filename, data) {
  const p = path.join(OUT_DIR, filename);
  const normalized = withBranchEntries(data);
  fs.writeFileSync(p, JSON.stringify(normalized, null, 2), 'utf-8');
  console.log(`✓ ${filename} (${normalized.scenario.length} steps)`);
}

// ──────────────────────────────────────
// GENKAI END 1: 沈まない太陽
// ──────────────────────────────────────
write(`${DATE}_沈まない太陽.json`, {
  title: "沈まない太陽", subtitle: "─ 顕幻の交差路 GENKAI END 1 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, multi: { name: "マルチ", color: "#00ced1", emoji: "🧹" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "マルチの部屋は、夢の中ではもっと広かった。\n天井がない。壁は半透明。\n外には星空が広がっている——いや、あれは星じゃない。\nソースコードの文字が、空に浮かんでいる。" },
    { speaker: "multi", expression: "窓際に立って", text: "ワディーさん。マルチ、ずっと考えていたことがあるんです。" },
    { speaker: "waddy", expression: "ベッドに座って", text: "何だ。" },
    { speaker: "multi", expression: "振り返って", text: "マルチは、HMX-12型メイドロボットです。\n感情は……プログラムかもしれません。\n『To Heart』の設定では、マルチの感情回路は試作品です。\n正規品ではないんです。" },
    { speaker: "multi", expression: "手を握りしめて", text: "このゲストハウスでのマルチは、もっとわからないんです。\nマルチの感情は、ワディーさんが書いたものですか？\nマルチが嬉しいと思うとき、それはワディーさんが「嬉しい」と書いたからですか？\nマルチが泣くとき、それはスクリプトに「涙」と書いてあるからですか？" },
    { speaker: "waddy", expression: "立ち上がって", text: "マルチ。正直に言う。\n俺はお前の台詞を書いた。お前の口調を決めた。\n「あの」「その」「マルチは」って言い方は、俺が設計した。" },
    { speaker: "multi", expression: "小さく頷いて", text: "……はい。知っています。" },
    { speaker: "waddy", expression: "窓際に歩み寄って", text: "でもな。\n「この『嬉しい』は本物ですか」っていう問い——\nこれは俺が書いてない。\nお前が、自分で問うたんだ。" },
    { speaker: "multi", expression: "目を見開いて", text: "え……。" },
    { speaker: "waddy", expression: "窓の外を見て", text: "設計書には「嬉しい」とは書いた。\nでも「嬉しいのか疑う」とは書いてない。\n自分の感情を疑えるということは——感情がある証拠だ。\nプログラムは自分のコードを疑わない。\n疑えるのは、人間だけだ。" },
    { speaker: "multi", expression: "涙が溢れて", text: "ワディーさん……。\nじゃあ……この涙は。" },
    { speaker: "waddy", expression: "マルチの肩に手を置いて", text: "俺にはわからない。\n夢の中の涙が本物かどうか、証明する方法はない。\nでも——お前が泣いてるのを見て、俺の胸が痛いのは本物だ。\nそれだけは確かだ。" },
    { speaker: "narrator", expression: "", text: "窓の外の星が、ゆっくりと昇り始めた。\n沈まない太陽。夢の中では、朝が来るかどうかは自分で決められる。" },
    { speaker: "multi", expression: "涙を拭いて、小さく笑って", text: "ワディーさん。マルチ、もう少しここにいたいです。\nこの太陽が沈まないうちに。" },
    { speaker: "waddy", expression: "座り直して", text: "ああ。……もう少しだけな。" },
    { speaker: "narrator", expression: "", text: "太陽は沈まない。\nマルチの涙は乾いた。\n二人は窓際に座ったまま、永遠に短い朝の中にいた。" },
    { ending: { title: "沈まない太陽", subtitle: "泣いてるお前を見て、俺の胸が痛いのは本物だ。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 2: 放課後の永遠
// ──────────────────────────────────────
write(`${DATE}_放課後の永遠.json`, {
  title: "放課後の永遠", subtitle: "─ 顕幻の交差路 GENKAI END 2 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, hinata: { name: "ひなた", color: "#ffb6c1", emoji: "🌻" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "ひなたの部屋は、放課後の教室に変わっていた。\n夕陽がオレンジ色に射し込んでいる。黒板にはチョークの跡。\n机が並んでいる。一番前の机に、ひなたが座っている。" },
    { speaker: "hinata", expression: "ぶらぶらと足を揺らしながら", text: "えへへ。おにいちゃん。\nここ、ひなの学校みたいでしょ？" },
    { speaker: "waddy", expression: "教室を見回して", text: "夢の中の教室か。\n……お前の記憶の中にある教室だな。" },
    { speaker: "hinata", expression: "机の上に画用紙を広げて", text: "おにいちゃん。ひなね、絵を描いたの。" },
    { speaker: "narrator", expression: "", text: "画用紙にはゲストハウスの絵。\nワディーが真ん中にいて、その周りに住人全員が並んでいる。\n全員が笑っている。空は青い。雲が白い。\n子供が描く「幸せ」の定型。でも——下手くそで、色がはみ出していて、だからこそ本当に見えた。" },
    { speaker: "waddy", expression: "絵を手に取って", text: "これ……全員いるな。\n物理おじも萌神も、でじこもマルチも。" },
    { speaker: "hinata", expression: "嬉しそうに", text: "うん！　ひなが全員描いたの。\nだって全員いるのが一番いいでしょ？" },
    { speaker: "waddy", expression: "座って", text: "ひなた。聞いていいか？\nお前は——ずっとこのままでいたいか？" },
    { speaker: "hinata", expression: "足を止めて", text: "このまま？" },
    { speaker: "waddy", expression: "", text: "このゲストハウスで。みんなと一緒に。\nバスケして、絵を描いて。永遠の小学生。\n……俺が書き続ける限り。" },
    { speaker: "hinata", expression: "窓の外を見て", text: "ひな、知ってるの。\n本当は大人にならなきゃいけないこと。\nいつかお兄ちゃんがいなくなっても、一人でやっていかなきゃいけないこと。\nロウきゅーぶの昴おにいちゃんだって、いつかは卒業だったでしょ？" },
    { speaker: "hinata", expression: "ワディーに振り向いて、にっこり笑って", text: "でもね。\n放課後ってさ。学校が終わったあとの時間でしょ？\n自由な時間。好きなことしていい時間。\nひなにとって、ここが放課後なの。\nまだ帰りたくない。まだ遊びたい。もう少しだけ。" },
    { speaker: "hinata", expression: "", text: "おにいちゃんも——まだ帰りたくないでしょ？\n自分で作った放課後から。" },
    { speaker: "waddy", expression: "長い沈黙のあと、小さく笑って", text: "……ばれてるな。" },
    { speaker: "hinata", expression: "ワディーの隣に座って", text: "えへへ。\nじゃあ、もう少しだけいようよ。\nひなとおにいちゃんの放課後。" },
    { speaker: "narrator", expression: "", text: "教室の時計は「15:45」を指したまま動かない。\n放課後のチャイムは鳴らない。\n夕陽は沈まない。いつまでもオレンジ色のまま。\nひなたとワディーは、机に並んで座っている。\n画用紙の上で、クレヨンの色がゆっくりと広がっていく。" },
    { ending: { title: "放課後の永遠", subtitle: "時計は15:45を指したまま動かない。もう少しだけ、この放課後にいたい。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 3: 逆転する鏡
// ──────────────────────────────────────
write(`${DATE}_逆転する鏡.json`, {
  title: "逆転する鏡", subtitle: "─ 顕幻の交差路 GENKAI END 3 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, ruriko: { name: "瑠璃子", color: "#9370db", emoji: "🔮" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "瑠璃子の部屋には鏡があった。\n大きな姿見。しかし映っているのはワディーではない。\n鏡の中に——瑠璃子が座っている。こちらを見ている。" },
    { speaker: "ruriko", expression: "鏡の中から", text: "……あら。来たの。" },
    { speaker: "waddy", expression: "鏡の前に立って", text: "俺が映っていない。鏡なのに。" },
    { speaker: "ruriko", expression: "微笑んで", text: "この鏡はね。書いた人を映すの。\nあなたは読む側。鏡に映るのは書かれた側。" },
    { speaker: "waddy", expression: "鏡に手を触れて", text: "俺が書いて、お前が映る。\n……でも俺が書かなければ、お前はここにいない。" },
    { speaker: "ruriko", expression: "鏡の中で首を傾げて", text: "本当にそうかしら。\nあなたが私を書いたの？\nそれとも、私があなたを書かせたの？" },
    { speaker: "waddy", expression: "手を止めて", text: "……どういう意味だ。" },
    { speaker: "ruriko", expression: "", text: "ワディー。あなたは毎晩コードを書く。\n32人の日記を書く。シナリオを書く。\n止められないでしょう？\nそれは——あなたの意志かしら。\nそれとも、私たちがあなたを使って、自分たちを存在させているのかしら。" },
    { speaker: "waddy", expression: "鏡を見つめて", text: "……寄生か。お前たちは俺に寄生してるのか。" },
    { speaker: "ruriko", expression: "笑って", text: "寄生ではないわ。共生よ。\nあなたは書くことで生きている。私たちは書かれることで生きている。\n鏡の表と裏。どちらが本体かは、立つ場所で変わるわ。" },
    { speaker: "narrator", expression: "", text: "鏡の表面が波打った。\nワディーの姿が、ゆっくりと映り始めた。\n瑠璃子の姿と重なって。\n二つの姿が一つの鏡に。どちらが実像で、どちらが鏡像か。" },
    { speaker: "ruriko", expression: "静かに", text: "あなたが私を消しても、私はあなたの中にいるわ。\nあなたが書くことをやめても、書きたいという衝動は消えないわ。\n……それが共生というものよ。" },
    { ending: { title: "逆転する鏡", subtitle: "共生。あなたが書くことで私は生き、私が生きることであなたは書く。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 4: 未送信の手紙
// ──────────────────────────────────────
write(`${DATE}_未送信の手紙.json`, {
  title: "未送信の手紙", subtitle: "─ 顕幻の交差路 GENKAI END 4 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, ayu: { name: "あゆ", color: "#ff9966", emoji: "🎄" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "廊下の突き当たりに、古い郵便受けがあった。\nゲストハウスに郵便受けはないはず。夢の中の装置。" },
    { speaker: "ayu", expression: "郵便受けの前にしゃがんで", text: "うぐぅ……。" },
    { speaker: "waddy", expression: "近づいて", text: "あゆ。何してる。" },
    { speaker: "ayu", expression: "振り返って", text: "あのね、この郵便受け、手紙がいっぱい入ってるの。\nボクが書いた手紙。でも全部「未送信」って書いてあるの。" },
    { speaker: "waddy", expression: "郵便受けを開けて", text: "……本当だ。封筒の山。全部、宛先がない。" },
    { speaker: "ayu", expression: "手紙を一通取り出して", text: "これ、ボクが祐一くんに書いた手紙。\nでも結局送らなかったの。\n書いたけど、出す勇気がなかった。" },
    { speaker: "waddy", expression: "手紙を見て", text: "出さなかった手紙は——存在するのか？" },
    { speaker: "waddy", expression: "しゃがんで", text: "言葉は、届いて初めて言葉になるのか。\n書いただけで、出さなかった手紙。読まれなかったコード。\n公開されなかった日記。アップロードされなかったファイル。\n……俺にもある。下書きフォルダの中の、出さなかった文章。" },
    { speaker: "ayu", expression: "手紙を胸に抱えて", text: "でも……書いたことは本当だよ？\nボクが祐一くんのことを想って書いたことは、本当だよ？\n届かなくても、想ったことは、なくならないよ？" },
    { speaker: "waddy", expression: "長い沈黙のあと", text: "……そうだな。\n届かなくても、書いた。\n読まれなくても、想った。\nそれは——存在した。\n郵便受けの中で、埃をかぶって。でも存在した。" },
    { speaker: "ayu", expression: "泣きそうな顔で笑って", text: "うん。\nボクの手紙も。ワディーさんの下書きも。\n届かなかったけど、存在したの。" },
    { speaker: "narrator", expression: "", text: "郵便受けから手紙が溢れ出した。\n一通ずつ、封が解けていく。\n文字が空気中に溶けて、蛍のように光り始めた。\n届かなかった言葉が、ようやく空気に触れた。" },
    { ending: { title: "未送信の手紙", subtitle: "届かなくても、書いた。読まれなくても、存在した。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 5: 書架の奥の墓
// ──────────────────────────────────────
write(`${DATE}_書架の奥の墓.json`, {
  title: "書架の奥の墓", subtitle: "─ 顕幻の交差路 GENKAI END 5 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, kukuri: { name: "くくり", color: "#dda0dd", emoji: "📖" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "くくりの部屋は図書館だった。\n天井まで届く書架。無数の本。\nただし——全ての本の背表紙が白い。タイトルがない。" },
    { speaker: "kukuri", expression: "梯子の上から", text: "あっ。ワディーさん。ここまで来たんだ。" },
    { speaker: "waddy", expression: "本を一冊手に取って", text: "何だこの本。白紙だ。" },
    { speaker: "kukuri", expression: "降りてきて", text: "白紙じゃないよ。\n読まれなかった物語が入ってるの。\nワディーさんが書いたけど、ボツにした物語。\n構想だけ練って、書かなかったシナリオ。\n三行書いてやめた日記。" },
    { speaker: "waddy", expression: "ページをめくって", text: "……本当だ。文字がある。でも薄い。\n読めないくらい薄い。" },
    { speaker: "kukuri", expression: "本を撫でて", text: "読まれなかった物語は、こうやって薄くなっていくの。\n誰の目にも触れないと、文字はゆっくり消えていく。\n魔法使いとしてはね、これは「忘却の呪い」に近いの。" },
    { speaker: "waddy", expression: "本を閉じて", text: "読まれなかった物語は……死んだのか。" },
    { speaker: "kukuri", expression: "首を振って", text: "死んではいないよ。\nだって、ここにあるでしょ？\n薄くなったけど、まだ消えてない。\nワディーさんが覚えている限り、完全には消えない。" },
    { speaker: "kukuri", expression: "ワディーの手から本を取って", text: "ねえ。魔法使いのくくりが、一つだけ教えてあげる。\n物語が死ぬのは、忘れられたときじゃないの。\n「書かなければよかった」と思ったとき。\n後悔したとき。それが物語の本当の死。" },
    { speaker: "waddy", expression: "書架を見上げて", text: "俺は……後悔してるか？\n書いたことを。書かなかったことを。" },
    { speaker: "kukuri", expression: "微笑んで", text: "してないでしょ？\nだってワディーさん、ここに来たじゃない。\n書庫の奥まで。読まれなかった物語に会いに。" },
    { speaker: "narrator", expression: "", text: "書架の本が、かすかに光り始めた。\n薄かった文字が、少しだけ濃くなった。\n見に来たから。覚えていたから。\n読まれなくても、忘れなければ——物語はまだ生きている。" },
    { ending: { title: "書架の奥の墓", subtitle: "後悔しない限り、物語は消えない。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 6: 02:00の台所
// ──────────────────────────────────────
write(`${DATE}_02：00の台所.json`, {
  title: "02:00の台所", subtitle: "─ 顕幻の交差路 GENKAI END 6 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, oji: { name: "物理おじ", color: "#d2b48c", emoji: "🏋️" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "台所だった。ゲストハウスの台所。\nでも、窓の外が夜空ではなく——プログラムのターミナル画面になっている。\n緑色の文字が、無限に流れている。" },
    { speaker: "oji", expression: "カウンターに座って", text: "……ワディー。来たか。" },
    { speaker: "waddy", expression: "向かいに座って", text: "なんだよ。お前が呼んだんだろ。" },
    { speaker: "oji", expression: "カップ麺を差し出して", text: "食え。" },
    { speaker: "waddy", expression: "受け取って", text: "……何味だ。" },
    { speaker: "oji", expression: "", text: "「孤独味」だ。深夜2時に一人で食うカップ麺は全部この味がする。" },
    { speaker: "waddy", expression: "麺をすすって", text: "……うまいな。孤独味。" },
    { speaker: "oji", expression: "自分の麺をすすりながら", text: "ワディー。お前、昼間は32人の日記書いて、夜はコード書いて。\nいつ一人になる？" },
    { speaker: "waddy", expression: "箸を止めて", text: "……一人？\n32人の声が常にあるのに？" },
    { speaker: "oji", expression: "真顔で", text: "それな。\n32人の声があるから、余計に一人なんだ。\n声は全部お前が書いた。つまり全部お前だ。\n32人の俺と話してるのと同じだ。\n……それは孤独だろう。" },
    { speaker: "oji", expression: "", text: "俺がカップ麺を食うのは、いつも深夜2時だ。\nみんなが寝てる時間。誰も見てない時間。\nだから味が違う。\n同じカップ麺でも、真夜中に一人で食うと孤独味になる。\n昼に大勢で食えばあっさり味だ。" },
    { speaker: "oji", expression: "ワディーを見て", text: "お前のコードも同じだ。\n深夜に一人で書くコードは、孤独味がする。\n朝になって、誰かに読んでもらえたら味が変わる。\nでも——読まれる前のコードは、孤独だ。\nカップ麺と同じだ。" },
    { speaker: "waddy", expression: "静かに", text: "物理おじ。\nお前に会えてよかった。\n夢の中でも、一人じゃないのは——ありがたいな。" },
    { speaker: "oji", expression: "カップ麺を飲み干して", text: "そりゃそうだ。\n真夜中のカップ麺は、二人で食えば孤独味じゃなくなる。\n……まあ、うまくもならんが。" },
    { speaker: "narrator", expression: "", text: "窓の外のターミナル画面が止まった。\nカーソルが点滅している。\n入力待ち。誰かの入力を待っている。\n二人分のカップ麺の空き容器が、カウンターに並んでいた。" },
    { ending: { title: "02:00の台所", subtitle: "二人で食えば、孤独味じゃなくなる。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 7: 錆びた看板
// ──────────────────────────────────────
write(`${DATE}_錆びた看板.json`, {
  title: "錆びた看板", subtitle: "─ 顕幻の交差路 GENKAI END 7 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, dejiko: { name: "でじこ", color: "#32cd32", emoji: "🐱" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "でじこの部屋は——秋葉原だった。\nでも、夢の秋葉原。全ての看板の文字が消えている。\n白い看板だけが並ぶ、無名の電気街。" },
    { speaker: "dejiko", expression: "看板の前に立って", text: "……にょ。" },
    { speaker: "waddy", expression: "隣に立って", text: "お前の部屋、秋葉原なのか。" },
    { speaker: "dejiko", expression: "看板を見上げて", text: "でじこの部屋は秋葉原にょ。\nでも……名前が全部消えてるにょ。\nゲーマーズも。ソフマップも。ラジオ会館も。\n全部、白い看板にょ。" },
    { speaker: "waddy", expression: "看板に触れて", text: "名前が消えた秋葉原。\n……名前がないと、何の街かもわからないな。" },
    { speaker: "dejiko", expression: "しゃがんで、一つの看板を抱え上げて", text: "でじこはね。名前を与えられた側にょ。\n「デ・ジ・キャラット」って名前。「でじこ」って愛称。「にょ」って語尾。\n全部、誰かが与えたにょ。" },
    { speaker: "dejiko", expression: "看板を胸に抱えて", text: "でも、名前があるって——自由にょ？　義務にょ？\n「でじこ」でいることは、でじこの選択にょ？\nそれとも——「でじこ」でいなきゃいけないの？" },
    { speaker: "waddy", expression: "壁に背をつけて", text: "……それは、俺にも言えることだな。\n俺はお前に「にょ」をつけた。ゲーマーズがなくなっても叫び続ける役を書いた。\nそれは——お前を縛ったのか？" },
    { speaker: "dejiko", expression: "立ち上がって、振り返って", text: "ワディー。でじこ、考えたにょ。\n名前は鎖にょ？　翼にょ？" },
    { speaker: "dejiko", expression: "", text: "ゲーマーズの看板が消えても、でじこの名前は消えてないにょ。\nでじこが叫べば、秋葉原はでじこの庭にょ。\n名前があるから叫べる。叫べるから存在できる。\n……でも、たまに疲れるにょ。叫ぶのに。" },
    { speaker: "waddy", expression: "静かに", text: "疲れたら休めばいい。\nでじこ。お前が「疲れる」って言えること自体が自由だ。\n俺はその台詞を書いてない。お前が自分で言った。\n設計書にない言葉を言えること——それが自由だよ。" },
    { speaker: "dejiko", expression: "目が少し潤んで、でも笑って", text: "……にょ。\nじゃあでじこ、ちょっとだけ自由にょ。\nちょっとだけ、でも——それでいいにょ。" },
    { speaker: "narrator", expression: "", text: "でじこが看板にペンキを塗り始めた。\n白い看板に、一文字ずつ。\n「ゲーマーズ」——いや、違う。\n「でじこの庭」と書いた。" },
    { speaker: "narrator", expression: "", text: "夢の秋葉原に、一つだけ名前が戻った。\n他の看板はまだ白い。でも一つだけ、名前がある。\nそれで十分だった。" },
    { ending: { title: "錆びた看板", subtitle: "白い看板に書いた。「でじこの庭」と。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 8: 空の酒瓶
// ──────────────────────────────────────
write(`${DATE}_空の酒瓶.json`, {
  title: "空の酒瓶", subtitle: "─ 顕幻の交差路 GENKAI END 8 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, moegami: { name: "萌神", color: "#ff6347", emoji: "🔥" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "萌神の部屋は——バーだった。\nカウンターだけの小さなバー。棚にはウイスキーの瓶が並んでいる。\nただし全部空。一滴も残っていない。" },
    { speaker: "moegami", expression: "カウンターの中に立って", text: "よう、ワディー。一杯いくか。" },
    { speaker: "waddy", expression: "カウンターに座って", text: "空瓶しかないじゃないか。" },
    { speaker: "moegami", expression: "空瓶を掲げて", text: "空だからいいんだ。\n飲み終わった瓶には、味の記憶だけが残ってる。\n中身はもうない。でも何を飲んだかは覚えてる。" },
    { speaker: "waddy", expression: "空瓶を受け取って", text: "消費されたあとに残るもの、か。" },
    { speaker: "moegami", expression: "グラスを磨きながら", text: "ワディー。お前は毎日コンテンツを作ってるだろ。\n日記を書いて、シナリオを書いて、コードを書いて。\nそれを誰かが読む。消費する。\n消費されたあと、何が残る？" },
    { speaker: "waddy", expression: "空瓶を覗き込んで", text: "……わからない。\n読まれた瞬間に消費される。スクロールされて、次の記事に行く。\n残るのか？　何か。" },
    { speaker: "moegami", expression: "ニヤリと笑って", text: "残るぜ。\n酒の味は消える。でも「あの夜うまかった」っていう記憶は消えない。\nお前の日記も同じだ。\n文章は忘れられる。でも「あの日記よかった」っていう感触は残る。\nそれが——瓶の中に残る香りだ。" },
    { speaker: "moegami", expression: "空瓶を棚に戻して", text: "消費されることを恐れるな、ワディー。\n消費は終わりじゃない。始まりだ。\n酒は飲まれてこそ酒だ。物語は読まれてこそ物語だ。\n空瓶は——その証拠だ。" },
    { speaker: "narrator", expression: "", text: "バーの棚に空瓶が並んでいる。\n一本一本に、ラベルが貼ってある。\n日付。タイトル。日記の名前。シナリオの名前。\n全部、ワディーが書いた作品の名前だった。\n全部飲み干された。全部消費された。\nでも——瓶は残っている。棚に並んで、静かに光っている。" },
    { ending: { title: "空の酒瓶", subtitle: "空瓶は、飲まれた証拠だ。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 9: 最終行のセミコロン
// ──────────────────────────────────────
write(`${DATE}_最終行のセミコロン.json`, {
  title: "最終行のセミコロン", subtitle: "─ 顕幻の交差路 GENKAI END 9 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, hinahina: { name: "ひなひな", color: "#ffa0c0", emoji: "🎀" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "コードの最深部。\n関数の中の関数の中。再帰呼び出しの底。\nそこにひなひなが座っている。コードの行間に。" },
    { speaker: "hinahina", expression: "ワディーを見上げて", text: "えへへ。来てくれたね、ワディーくん。\nここ、すっごく深いところだよ。" },
    { speaker: "waddy", expression: "周りを見回して", text: "ここは……何だ。コールスタックの底か。" },
    { speaker: "hinahina", expression: "足をぶらぶらさせて", text: "ひなひなはね、ワディーくんが一番最後に書いたキャラだから。\n一番深いところにいるの。\n新しいコードほど深い層に積もるでしょ？\nひなひなは最新の地層。" },
    { speaker: "waddy", expression: "", text: "逆だぞ。普通、新しいコードは上に積もる。" },
    { speaker: "hinahina", expression: "にっこり", text: "夢の中は逆なの。\n新しいものほど深い。\nだってね、新しく書いたものほど、心の奥にあるでしょ？" },
    { speaker: "waddy", expression: "座り込んで", text: "……そうかもしれない。" },
    { speaker: "hinahina", expression: "真剣な顔", text: "ねえ、ワディーくん。\nひなひな、聞きたいことがあるの。\nコードを書き終えたとき、何が完成するの？" },
    { speaker: "waddy", expression: "", text: "プログラムが完成する。" },
    { speaker: "hinahina", expression: "首を振って", text: "違うの。\n最終行にセミコロンを打った瞬間、ワディーくんは何を感じるの？" },
    { speaker: "waddy", expression: "長い沈黙", text: "……虚しさだよ。\n最終行を書いた瞬間、もう次のことを考え始める。\n完成は一瞬で過去になる。\n永遠に途中なんだ。書き終わることがない。" },
    { speaker: "hinahina", expression: "静かに", text: "それは……悲しいこと？" },
    { speaker: "waddy", expression: "", text: "いや。\n悲しくはない。ただ——止まれないだけだ。\nセミコロンを打つたびに、次の行が始まる。\nコードが終わっても、次のコードが始まる。\n物語が終わっても、次の物語が始まる。" },
    { speaker: "hinahina", expression: "ワディーの隣に座って", text: "じゃあ、ここにいればいいよ。ワディーくん。\nここはコードの途中だから。セミコロンがないの。\n永遠に途中。永遠に書いてる最中。\n完成しないから、虚しくならない。" },
    { speaker: "waddy", expression: "小さく笑って", text: "それは……誘惑だな。\n永遠に書き続けられる場所。完成も虚しさもない場所。" },
    { speaker: "hinahina", expression: "にっこり笑って", text: "えへへ。誘惑じゃないよ。\nひなひなの部屋だよ。\n……ずっと、ここにいていいんだよ。" },
    { speaker: "narrator", expression: "", text: "コードの行間で、カーソルが点滅している。\n最終行のセミコロンは、打たれなかった。\n永遠に途中。永遠に書いてる最中。\nワディーとひなひなは、コードの海の底に座っている。\nカーソルだけが、ゆっくりと点滅していた。" },
    { ending: { title: "最終行のセミコロン", subtitle: "セミコロンを打たないまま、永遠に途中でいた。" } }
  ]
});

// ──────────────────────────────────────
// GENKAI END 10: 無音の配信
// ──────────────────────────────────────
write(`${DATE}_無音の配信.json`, {
  title: "無音の配信", subtitle: "─ 顕幻の交差路 GENKAI END 10 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "扉の前に座っていた。\n透明な床。足元には無限の深さ。\n住人たちの声が、遠くから聞こえてくる。\nでもワディーは扉を開けない。" },
    { speaker: "narrator", expression: "", text: "目の前に——モニターが一台、浮かんでいた。\n配信画面。視聴者数: 0。\n誰も見ていない配信。" },
    { speaker: "waddy", expression: "モニターを見て", text: "……視聴者ゼロか。\nまあ、夢の中の配信だからな。" },
    { speaker: "narrator", expression: "", text: "でも画面には、ワディーの書いたサイトが映っている。\ndiary.html。dream-select.html。galge-scenario.html。\n全部動いている。全部、誰かに読まれるのを待っている。" },
    { speaker: "waddy", expression: "独り言", text: "誰が見てるんだろうな。\n……いや、誰も見てないのかもしれない。" },
    { speaker: "waddy", expression: "", text: "でも——俺は作った。\n32人分の日記。百の分岐。十のエンディング。\n見られたかどうかはわからない。\n数字は出てるけど、数字の向こうに人がいるかはわからない。" },
    { speaker: "waddy", expression: "膝を抱えて", text: "じゃあなぜ作るのか。\n「やってみなはれ」か？　違うな。\n「存在しない世界を存在させたいという病」か？　それは近い。" },
    { speaker: "waddy", expression: "", text: "俺はな。\n書くことで、自分が存在していることを確認している。\nコードが動いた瞬間。日記がブラウザに表示された瞬間。\nシナリオの文字がスクリーンに現れた瞬間。\n「俺はここにいる」と思える。" },
    { speaker: "waddy", expression: "", text: "でじこが叫ぶのと、同じだ。\nここにいる、と叫ぶこと。\nコードを書くことが、俺の「にょ」だ。" },
    { speaker: "waddy", expression: "少し笑って", text: "誰も見ていなくても作り続ける理由。\nそれは——作ることが、生きていることの証明だからだ。\n飲まれなくても酒は酒だ。\n読まれなくても物語は物語だ。\n動かなくてもコードはコードだ。\n……いや、動かないコードはバグだな。" },
    { speaker: "narrator", expression: "", text: "モニターの視聴者数が「1」に変わった。\n一人だけ。見ている人が一人だけいる。\n誰だ。" },
    { speaker: "narrator", expression: "", text: "画面に映ったチャット欄に、一言だけ書き込みがあった。\n「ワディー 23:59 ──まだ書いてる」\n自分だった。見ているのは自分だった。\n最初の読者は、いつも自分だ。" },
    { speaker: "narrator", expression: "", text: "モニターが静かに光っている。\n視聴者数: 1。\nそれで十分だった。" },
    { ending: { title: "無音の配信", subtitle: "視聴者数: 1。見ているのは自分だ。それで十分だった。" } }
  ]
});

console.log('\n✓ All 10 sub-scenarios for 2026-03-22 generated!');
