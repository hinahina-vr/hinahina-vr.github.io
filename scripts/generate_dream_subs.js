const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'scenarios');
const DATE = '2026-03-21';

const COMMON_CHARS = {
  narrator: { name: "", color: "#504060", emoji: "" },
  waddy:    { name: "ワディー（幻影）", color: "#606060", emoji: "🖥️" }
};

function write(filename, data) {
  const p = path.join(OUT_DIR, filename);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ ${filename} (${data.scenario.length} steps)`);
}

// ──────────────────────────────────────
// GEN-1: 沈黙のリビング
// ──────────────────────────────────────
write(`${DATE}_沈黙のリビング.json`, {
  title: "沈黙のリビング",
  subtitle: "─ 幻界の記録 ─",
  genre: "幻界ノベル",
  date: DATE,
  chars: {
    ...COMMON_CHARS,
    nemurin: { name: "ねむりん", color: "#e8b4d8", emoji: "💤" }
  },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、何も選ばなかった世界線の記録。\n2026年3月21日。ゲストハウスのリビング。\n観測者は──観測を拒否した。" },
    { bg: "void" },
    { speaker: "narrator", expression: "", text: "歪んだゲストハウスのリビング。\nソファの上に毛布が放り出されている。\nワディーはそこに倒れ込んだ。二日酔いの体は重い。\n立ち上がる必要を感じない。" },
    { speaker: "waddy", expression: "目を閉じたまま", text: "……何もしたくない。何も選びたくない。\n昨日の秋葉原が全部、体の中で発酵している。" },
    { speaker: "narrator", expression: "", text: "ソファが沈む。体が沈む。\n毛布が重くなっていく。重力が増しているのか。\nそれとも、自分が軽くなっているのか。" },
    { speaker: "nemurin", expression: "ソファの隣で寝転がって", text: "ん〜……あったかいね〜。" },
    { speaker: "waddy", expression: "体を動かせないまま", text: "……誰だ。" },
    { speaker: "nemurin", expression: "のんびりと", text: "ねむりんだよ〜。夢の中のお友達。\nあなたね〜、ものすごく疲れてるでしょ〜？\nねむりんにはわかるの〜。疲れてる人のところに行くのが得意だから。" },
    { speaker: "waddy", expression: "", text: "夢の中のお友達。……それは僕の無意識が作った存在か。" },
    { speaker: "nemurin", expression: "", text: "んー、そういう難しいことはわかんない。\nでもね、起きなくてもいいんだよ〜？\n眠ってる間は、なにも間違えないもん。" },
    { speaker: "waddy", expression: "", text: "……何もしなければ、何も間違わない。それは正しいのか。" },
    { speaker: "nemurin", expression: "少し考えて", text: "正しいとか間違いとか、起きてる人が考えることだよ〜。\n眠ってる人はね〜、正しいも間違いもないの。\nただ、ここにいるだけ。ぽかぽかして。あったかくて。" },
    { speaker: "waddy", expression: "", text: "だが──ここにいても、何も起きない。" },
    { speaker: "nemurin", expression: "", text: "うん、何も起きないよ〜。\nでもね、「何も起きない」って、すごいことなんだよ〜？\nだって世界中でいろんなことが起きてるのに、ここだけ何も起きないの。\nそれって──選ばれた静けさ、だと思うの。" },
    { speaker: "narrator", expression: "", text: "ソファが、さらに沈む。\nリビングの壁が遠ざかっていく。天井が高くなっていく。\n部屋が広くなったのではなく──自分が小さくなっている。" },
    { speaker: "nemurin", expression: "あくびをしながら", text: "ねむりんね〜、昔ね〜、夢の中で街を救ったことがあるの。\n眠ってるだけで、誰かの役に立てたの。\nでもね……起きたら、忘れちゃうの。全部。\n夢の中の手柄は、現実には持って帰れないの。" },
    { speaker: "waddy", expression: "声が小さくなって", text: "……俺も、昨日の秋葉原を忘れたいのかもしれない。\nコーヒー牛乳の味。テキーラの火傷。でじこの声。ことみの言葉。\n全部、二日酔いの中に沈めて──忘れたい。" },
    { speaker: "nemurin", expression: "寂しそうに", text: "忘れたいの……？　それはちょっと悲しいな〜。\nでもね、ここにいれば忘れられるよ〜。\nここはね、「何もない」の中だから。\n記憶も、選択も、後悔も──全部溶けて、なくなるの。" },
    { speaker: "narrator", expression: "", text: "リビングが消えていく。ソファだけが残っている。\nワディーとねむりんの二人だけが、虚空の中に浮かんでいる。\n何もない。何もしなくていい。何も選ばなくていい。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "選択の放棄は、最も重い選択だった。\n何も選ばないという選択を、彼は選んだ。\nそれは怠惰ではない。それは──恐怖だ。\n選んだら間違えるかもしれない。選ばなければ間違えない。\nだがその思想そのものが──最初の間違いだった。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。ゲストハウスのソファ。\n別の世界線では、選ぶことを選ばなかった。" },
    { ending: { title: "沈黙のリビング", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-2: 水底の秋葉原
// ──────────────────────────────────────
write(`${DATE}_水底の秋葉原.json`, {
  title: "水底の秋葉原",
  subtitle: "─ 幻界の記録 ─",
  genre: "幻界ノベル",
  date: DATE,
  chars: {
    ...COMMON_CHARS,
    kotomi: { name: "ことみ（幻影）", color: "#6050a0", emoji: "🎻" }
  },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、水に飛び込んだ世界線の記録。\n沈んだ看板を追って、彼自身も沈んだ。" },
    { bg: "void" },
    { speaker: "narrator", expression: "", text: "水没した電気街口。足首までだった水が、膝まで上がってきた。\nワディーは水の中に飛び込んだ。\n冷たくない。夢だから温度がない。ただ、水の重さだけがある。" },
    { speaker: "narrator", expression: "", text: "水底が見え始めた。沈んだ看板が散らばっている。\n「ゲーマーズ」。「ラオックス」。「石丸電気」。「ミルクスタンド」。\n昨日の秋葉原だけではない。十年前の秋葉原も沈んでいる。" },
    { speaker: "kotomi", expression: "水中で普通に話して", text: "……水は透明なの。でも深くなると、光が届かないの。" },
    { speaker: "waddy", expression: "", text: "……ことみ？　なぜここに。" },
    { speaker: "kotomi", expression: "", text: "ことみはどこにでもいるの。光が届く場所になら。\nでもここは──もう深すぎるの。" },
    { speaker: "waddy", expression: "", text: "ミルクスタンドの看板が沈んでいる。二百円って書いてある。" },
    { speaker: "kotomi", expression: "看板を見て", text: "二百円は、この深さでは通貨として機能しないの。\n水圧が高すぎて、硬貨が潰れるの。\n……比喩じゃなくて、物理的に。" },
    { speaker: "waddy", expression: "", text: "物理的に。……お前らしいな。" },
    { speaker: "kotomi", expression: "少し困ったように", text: "でもね、光の波長によって届く深さが違うの。\n赤い光が最初に消えるの。だから深海は青いの。\n次にオレンジ。黄色。緑。最後に残るのは──青。" },
    { speaker: "kotomi", expression: "", text: "青だけが残る世界。看板の色も、赤は消えているの。\n「ゲーマーズ」の赤いロゴは、もう見えないの。" },
    { speaker: "waddy", expression: "", text: "色が消えていく。記憶が消えていくのと同じだ。" },
    { speaker: "kotomi", expression: "頷いて", text: "そうなの。記憶も光と同じで、古いものから波長が変わるの。\n鮮やかな赤──感情が最初に消えるの。\n次に暖かさ。温度。匂い。最後に残るのは──輪郭だけ。\n青い、冷たい、輪郭。" },
    { speaker: "narrator", expression: "", text: "さらに深く沈んでいく。\n金子屋の看板が見えた。もつ煮込みの匂い──いや、水中に匂いはない。\n記憶の匂いが、水に溶けて消えていく。" },
    { speaker: "kotomi", expression: "遠くなる声で", text: "ワディーさん。もう光が届かないところまで来てしまったの。\nことみも──これ以上は見えないの。" },
    { speaker: "waddy", expression: "", text: "……水面はどこだ。" },
    { speaker: "kotomi", expression: "", text: "上を見てもわからないの。深すぎて、水面の光が見えないの。\n浮上するには──浮力が必要なの。\nでもあなたは、手放すものがないの。\n手放すと軽くなる。軽くなると浮かぶ。\n……何を手放しますか。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "深く潜りすぎた者は、水圧に慣れてしまう。\n浮上する理由を忘れてしまう。\n記憶の看板は全て水底で朽ちていく。\n名前だけが微かに読める。\nだが名前を読む者がいなければ──看板は看板ではなくなる。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。水没した電気街口。\n別の世界線では、もう水面が見えなくなっていた。" },
    { ending: { title: "水底の秋葉原", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-3: 活字の牢獄
// ──────────────────────────────────────
write(`${DATE}_活字の牢獄.json`, {
  title: "活字の牢獄", subtitle: "─ 幻界の記録 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, kukuri: { name: "くくり（幻影）", color: "#ff69b4", emoji: "✨" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、自分の言葉に飲み込まれた世界線の記録。\n書架の森で、彼は本を開くのではなく──本の中に入った。" },
    { bg: "void" },
    { speaker: "narrator", expression: "", text: "書架の森。天井まで続く本棚。\n全ての背表紙にワディーの日記が刻まれている。\n一冊を開いた瞬間──文字が動いた。渦を巻いて、ワディーを飲み込んだ。" },
    { speaker: "narrator", expression: "", text: "気づくと、紙の上に立っていた。\n足の下に活字が並んでいる。空に活字が漂っている。\n世界が全部、文字でできている。" },
    { speaker: "kukuri", expression: "くるくる回りながら", text: "わー！　すごいすごい！　文字がいっぱいだー！" },
    { speaker: "waddy", expression: "", text: "……ここはどこだ。" },
    { speaker: "kukuri", expression: "嬉しそうに", text: "ここ？　本の中だよ！　あなたが書いた本の中！\nねえねえ、この文字ぜんぶ、あなたが書いたの？\nすごいねー！　呪文がいっぱいだ！" },
    { speaker: "waddy", expression: "", text: "呪文じゃない。日記だ。" },
    { speaker: "kukuri", expression: "目をキラキラさせて", text: "日記も呪文みたいなものだよ！\n書いた人の想いが込められてるもん！\nニケとアタシもね、魔法陣を描くとき、想いを込めるの。\n想いがないと、魔法陣は光らないんだよ！" },
    { speaker: "waddy", expression: "", text: "……俺の日記に想いが込められているのか？" },
    { speaker: "kukuri", expression: "", text: "うん！　だってこの文字、全部動いてるもん！\n「旅情はローレンツ収縮により──」って書いてある文字が、\n本当にびゅーんって縮んでるよ！　面白いねー！" },
    { speaker: "narrator", expression: "", text: "くくりの言う通りだった。文字が文字通りの意味で動いている。\n「速く走る」と書かれた文字は、実際に走っている。\n「沈む」と書かれた文字は、紙面の下に沈んでいく。" },
    { speaker: "waddy", expression: "", text: "……俺の言葉が、文字通りに実体化している。\n比喩が比喩でなくなったのか。" },
    { speaker: "kukuri", expression: "少し真面目な顔で", text: "でもね……呪文は、使い方を間違えると、術者自身に返ってくるんだよ。\n魔法陣グルグルだって、間違えたら自分がぐるぐるしちゃうの。\nあなたの日記の呪文も──今、あなたに返ってきてるんだと思う。" },
    { speaker: "waddy", expression: "", text: "返ってきている？" },
    { speaker: "kukuri", expression: "指差して", text: "ほら、見て。あなたの足、文字になってきてるよ。" },
    { speaker: "narrator", expression: "", text: "足元を見た。靴が文字に変わっている。\n「歩く」「進む」「各駅停車」──自分が書いた言葉が、\n自分の体を浸食していく。書いた者が、書かれた側に回った。" },
    { speaker: "kukuri", expression: "心配そうに", text: "あちゃー……これは解呪できないかも。\n呪文が多すぎて、キタキタおやじでも追いつかないよ。\n……ごめんね。アタシにできることは──一緒にいることくらい。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "書く者は読まれる側に回ることもある。\nローレンツ収縮──自分の言葉が自分を圧縮した。\n日記は魔法陣だった。毎日書くことで、少しずつ力を溜めていた。\nその力が──一気に、術者に返った。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。書架の森。\n別の世界線では、彼は自分の日記の活字に変わった。" },
    { ending: { title: "活字の牢獄", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-4: 鏡像の奴隷
// ──────────────────────────────────────
write(`${DATE}_鏡像の奴隷.json`, {
  title: "鏡像の奴隷", subtitle: "─ 幻界の記録 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, ruriko: { name: "瑠璃子（幻影）", color: "#8080c0", emoji: "🪞" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、鏡に吸い込まれた世界線の記録。\n左右が逆転した世界で、彼は自分の影になった。" },
    { bg: "void" },
    { speaker: "narrator", expression: "", text: "鏡の回廊。無数の鏡が並ぶ廊下。\nワディーが一枚の鏡に触れた瞬間──\n表面が水のように波打ち、手が、腕が、体が、吸い込まれた。" },
    { speaker: "narrator", expression: "", text: "鏡の向こう側。同じ廊下。だが──左右が逆になっている。\n時計の針が逆回り。文字が鏡文字。\nそして、自分の前に──もう一人の自分が立っている。" },
    { speaker: "ruriko", expression: "廊下の奥から静かに", text: "……久しぶりね。鏡の向こう側に来たのは。" },
    { speaker: "waddy", expression: "", text: "……瑠璃子？　なぜお前がここに。" },
    { speaker: "ruriko", expression: "微かに笑って", text: "私は鏡の住人よ。反転した世界の住人。\n……鏡に映るのは、あなた自身。\nでも、あなたは右手を上げた。鏡の中のあなたは左手を上げた。\nどちらが本物？" },
    { speaker: "waddy", expression: "", text: "俺が本物に決まっている。" },
    { speaker: "ruriko", expression: "首をかしげて", text: "鏡の中のあなたも、同じことを言っているわ。\n「俺が本物だ」と。「こちら側が正しい」と。" },
    { speaker: "waddy", expression: "", text: "……それは鏡像だから。俺の動きを反転しているだけだ。" },
    { speaker: "ruriko", expression: "", text: "でも──あなたが鏡の向こう側に来た今、\nどちらが反転しているの？\nあなたが反転側に来たのなら──あなた自身が鏡像になったのよ。" },
    { speaker: "narrator", expression: "", text: "鏡の向こう側にいるもう一人のワディーが、こちらを見ている。\n同じ顔。同じ体。だが──左右が逆。" },
    { speaker: "ruriko", expression: "鏡の前に立って", text: "私はね、ずっと鏡の中にいたの。\n誰かが鏡を覗き込んだとき──私は「見られる側」だった。\nでもある日気づいたの。\n鏡の中から見れば、覗き込む人こそが「映っている側」なのよ。" },
    { speaker: "waddy", expression: "", text: "……主従が逆転するのか。" },
    { speaker: "ruriko", expression: "", text: "そう。どちらが主で、どちらが従かは──\n観測する場所で決まる。\n鏡像は実像の奴隷。そう思っていたでしょう。\nでも鏡の中から見れば、実像こそが奴隷よ。\n鏡像の動きを忠実になぞっている──つもりの、奴隷。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "鏡像は実像の奴隷──それは一方からの視点に過ぎない。\n鏡の中に入った者は、自分自身の鏡像になる。\n実像のない鏡像。主のない影。\n永遠に映り続ける、誰のものでもない顔。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。鏡の回廊。\n別の世界線では、実像と鏡像の区別がつかなくなった。" },
    { ending: { title: "鏡像の奴隷", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-5: 看板の墓場
// ──────────────────────────────────────
write(`${DATE}_看板の墓場.json`, {
  title: "看板の墓場", subtitle: "─ 幻界の記録 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, dejiko: { name: "でじこ（幻影）", color: "#32cd32", emoji: "🐱" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、看板を追い続けた世界線の記録。\nもう存在しない店のネオンが、彼を導いた。\nたどり着いた先は──看板の墓場だった。" },
    { bg: "akihabara" },
    { speaker: "narrator", expression: "", text: "逆転秋葉原。看板が全部逆さまに書いてある。\nその中に、一枚だけ正しい向きの看板があった。「ゲーマーズ」。\nワディーはその看板について歩き始めた。" },
    { speaker: "narrator", expression: "", text: "看板が増えていく。\n「ラオックス」。「石丸電気」。「ヤマギワ電気」。「ロケットビル」。\n全部、もう存在しない店の看板。\nネオンだけが、夢の中で光り続けている。" },
    { speaker: "dejiko", expression: "看板の前にしゃがみ込んで", text: "にょ……ここに、ゲーマーズがあったにょ。\n看板が残ってるのに、中身がないにょ。\n扉を開けても──壁にょ。" },
    { speaker: "waddy", expression: "", text: "……でじこ。お前もいたのか。" },
    { speaker: "dejiko", expression: "立ち上がって", text: "でじこはね、ずっとここにいるにょ。\n看板がある限り、でじこはいるにょ。看板がでじこの家だから。" },
    { speaker: "waddy", expression: "", text: "だが──ゲーマーズはもうないぞ。" },
    { speaker: "dejiko", expression: "声が震えて", text: "……知ってるにょ。\nでもね、看板は残ってるにょ。名前は残ってるにょ。\n名前が残っていれば──まだ存在するにょ。\n……そう思ってたにょ。" },
    { speaker: "waddy", expression: "", text: "思ってた。過去形だな。" },
    { speaker: "dejiko", expression: "少し黙って", text: "……名前だけじゃ、足りなかったにょ。\n名前を呼ぶ声が必要だったにょ。\n「ゲーマーズ」って呼ぶ人がいて、初めて「ゲーマーズ」が存在するにょ。\n看板だけじゃ──ただの板にょ。文字が書いてある板にょ。" },
    { speaker: "narrator", expression: "", text: "看板の墓場が広がっていく。\n何十枚、何百枚の看板が暗い空間に浮かんでいる。\n全て、もう誰も呼ばなくなった名前。" },
    { speaker: "dejiko", expression: "小さな声で", text: "にょ……でじこも、いつか看板だけになるのかにょ。\n名前は残ってるけど、呼ぶ人がいない。\n「でじこ」って看板があって、でも扉を開けたら──壁。\n……それは、存在するって言えるのかにょ。" },
    { speaker: "waddy", expression: "言葉を探して", text: "……俺は昨日、お前の名前を呼んだぞ。「でじこの庭」と。" },
    { speaker: "dejiko", expression: "", text: "にょ……。それは、顕界の話にょ。\nここは幻界にょ。呼ぶ声は届かないにょ。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "消えた看板を追う者は、やがて自分も看板になる。\n名前だけが残り、声が消える。\n秋葉原という街は、看板の新陳代謝で出来上がっている。\n古い看板が消えて、新しい看板が立つ。\nだが消えた看板を追う者は──新しい看板を見なくなる。\n過去だけを見続ける目は、現在を映せなくなる。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。逆転秋葉原。\n別の世界線では、看板だけが永遠にネオンを灯していた。" },
    { ending: { title: "看板の墓場", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-6: 琥珀色の溺死
// ──────────────────────────────────────
write(`${DATE}_琥珀色の溺死.json`, {
  title: "琥珀色の溺死", subtitle: "─ 幻界の記録 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, feiris: { name: "フェイリス（幻影）", color: "#ff6699", emoji: "🐱" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、飽和した液体にさらに注ぎ続けた世界線の記録。\n琥珀色の酒場で、彼はグラスを止めなかった。" },
    { bg: "twilight" },
    { speaker: "narrator", expression: "", text: "琥珀の酒場。看板に「金子屋」。\nカウンターにウイスキーのボトルが無限に並んでいる。" },
    { speaker: "feiris", expression: "グラスを磨きながら", text: "お客さんニャ〜♪　いらっしゃいませニャン。\n今日のおすすめは──夢の蒸留酒ニャ。\n原料は昨日の記憶。蒸留は無意識。熟成は二日酔い。\n度数は……∞！　にゃはは。" },
    { speaker: "waddy", expression: "", text: "イチローズモルト。ストレートで。" },
    { speaker: "feiris", expression: "グラスに注いで", text: "はいニャ〜。蜂蜜とピートの48度。\n……お客さん、昨日もたくさん飲んだニャ？" },
    { speaker: "waddy", expression: "", text: "……わかるのか。" },
    { speaker: "feiris", expression: "", text: "バーテンダーは全部わかるニャ。\nお客さんの血中アルコール飽和度──まだ高いニャ。\n過飽和溶液ニャ。これ以上溶質を入れると──" },
    { speaker: "waddy", expression: "", text: "もう一杯。" },
    { speaker: "feiris", expression: "少し困った顔で", text: "……もう飽和してるニャ。溶けきれないニャ。\n過飽和溶液に衝撃を与えると──一気に結晶化するニャ。\nこれ以上注ぐと──お客さん自身が、溶質になっちゃうニャ。" },
    { speaker: "waddy", expression: "", text: "かまわない。もう一杯。" },
    { speaker: "feiris", expression: "声が低くなって", text: "……フェイリスはね、お客さんの意思を尊重するニャ。\nそれがバーテンダーの仕事ニャ。\nでもね──止まるタイミングを教えるのも、仕事なんだニャ。" },
    { speaker: "narrator", expression: "", text: "三杯目。四杯目。五杯目。\nカウンターの上の液体が増えていく。グラスが溢れている。\n琥珀色の液体が広がる。膝まで。腰まで。胸まで。" },
    { speaker: "feiris", expression: "首まで琥珀色に浸かりながら", text: "お客さん、最後のお知らせニャ。\n過飽和溶液にさらに溶かそうとすると──\n溶媒と溶質が逆転するニャ。\nあなたが溶かしていたつもりのアルコールが──あなたを溶かすニャ。" },
    { speaker: "waddy", expression: "口元まで沈みながら", text: "……温かい。甘い。苦い。全部同時に。\n血中アルコール飽和度──もう計測不能。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "過飽和溶液に衝撃を与えると、一気に結晶化する。\n彼はグラスの底で、琥珀色の結晶になった。\nイチローズモルト。秩父蒸溜所。48度。\n最後のグラスの中には──彼自身が入っていた。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。琥珀の酒場。\n別の世界線では、グラスを止めなかった。" },
    { ending: { title: "琥珀色の溺死", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-7: 凍った秒針
// ──────────────────────────────────────
write(`${DATE}_凍った秒針.json`, {
  title: "凍った秒針", subtitle: "─ 幻界の記録 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, minagi: { name: "美凪（幻影）", color: "#a0c0e0", emoji: "☁️" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、時計を止めた世界線の記録。\n22時43分。すべてが凍結した世界。" },
    { bg: "void" },
    { speaker: "narrator", expression: "", text: "時計塔。文字盤が複数ある。16:00、22:43、∞。\nワディーは22:43の文字盤に手を伸ばした。針を掴んだ。止めた。" },
    { speaker: "narrator", expression: "", text: "世界が凍った。空気が固まった。光が止まった。\n漂っていた埃が空中で静止している。\n音がない。風がない。何も動かない。" },
    { speaker: "minagi", expression: "口だけが動く", text: "……時間が止まったからです。\nあなたも時間の中にいます。時間が止まれば、あなたも止まります。\n……声が出るのは、止まる直前の振動がまだ残っているからです。" },
    { speaker: "waddy", expression: "", text: "残響か。……それもすぐ消えるのか。" },
    { speaker: "minagi", expression: "静かに", text: "はい。あと少しで声も止まります。\n……空が見えますか。" },
    { speaker: "waddy", expression: "", text: "見える。止まった空。雲が動かない。" },
    { speaker: "minagi", expression: "", text: "空は、動いているから美しいのです。\n雲が流れて、色が変わって、光が移ろう。\nでもここでは──空も止まっています。\n雲が止まると……空を見上げる理由がなくなります。" },
    { speaker: "minagi", expression: "微かに", text: "私は──空を見上げるのが好きでした。\nでもここでは、見上げても何も変わりません。\n永遠に同じ空。永遠に同じ雲。\n美しいけれど──生きていないのです。" },
    { speaker: "waddy", expression: "", text: "22時43分。酒が抜けてきた時間だ。ここで止めたかった。" },
    { speaker: "minagi", expression: "", text: "止めたかった時間。あなたにとって心地よい時間。\nでも──心地よさは、変化があるから心地よいのです。\n永遠の心地よさは──感覚を失うことと同じです。" },
    { speaker: "narrator", expression: "", text: "声が小さくなっていく。残響が消えていく。\n美凪の口も動かなくなった。ワディーの意識だけが残っている。\nだがそれも──凍っていく。\n矛盾だけが、この世界の最後の動きだった。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "時間を止めた者は、時間の外側に出る。\n外側からは中が見える。だが中に戻る方法は──ない。\n22時43分。彼がいちばん心地よかった時間。\nその時間の中で、彼は永遠に凍っている。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。時計塔の下。\n別の世界線では、秒針が永遠に22:43を指していた。" },
    { ending: { title: "凍った秒針", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-8: 自由落下の定義
// ──────────────────────────────────────
write(`${DATE}_自由落下の定義.json`, {
  title: "自由落下の定義", subtitle: "─ 幻界の記録 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, kud: { name: "くど（幻影）", color: "#d4a76a", emoji: "🚀" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、上にも下にも属さなかった世界線の記録。\n螺旋階段の手すりを越えて、彼は──飛んだ。" },
    { bg: "void" },
    { speaker: "narrator", expression: "", text: "螺旋階段。上にも下にも続いている。\nワディーは手すりを越えた。落ちる。落ち続ける。\n壁が遠ざかっていく。階段が小さくなっていく。" },
    { speaker: "kud", expression: "隣で一緒に落ちている", text: "わふっ……！　ワディーさん、落ちてますです！\nえっと、えっと、でも大丈夫ですよ！" },
    { speaker: "waddy", expression: "", text: "大丈夫？　落ちているのに？" },
    { speaker: "kud", expression: "必死に解説しながら", text: "は、はい！　自由落下中は無重力と同じなんですよ！\nアインシュタインの等価原理です！\n重力場の中での自由落下は、無重力空間と物理的に区別できないんです！" },
    { speaker: "waddy", expression: "", text: "落ちているのに無重力。矛盾しているな。" },
    { speaker: "kud", expression: "人差し指を立てて", text: "矛盾じゃないですよ！　重力と加速度は区別できないんです！\nエレベーターの中で宇宙にいるのと同じ体験ができるんです！\n……まあ、ケーブルが切れた場合ですけど。" },
    { speaker: "waddy", expression: "", text: "……それは怖い例えだな。" },
    { speaker: "kud", expression: "少し考えて", text: "でもですね、ワディーさん。\n自由落下には一つだけ問題があるんです。着地です。" },
    { speaker: "waddy", expression: "", text: "着地。" },
    { speaker: "kud", expression: "", text: "はい。宇宙では着地しなくていいんです。\nずっと落ち続けることが「軌道」になるんです。\n地球の周りを落ち続けるのが人工衛星です。\nでも──ここに軌道はありますか？" },
    { speaker: "narrator", expression: "", text: "周りを見た。壁も階段も消えている。\n上もない。下もない。ただ落ちている。どこにも向かっていない。" },
    { speaker: "kud", expression: "声が小さくなって", text: "……着地できない自由は──自由って言えるんでしょうか。\n軌道のない落下は──飛行とは言えないです。\n行き先のない各駅停車が各駅停車ではないように──\n着地のない落下は──ただの消失です。" },
    { speaker: "waddy", expression: "", text: "各駅停車は停まることで各駅停車になる。" },
    { speaker: "kud", expression: "頷いて", text: "はい……停まる駅がない電車は──名前がないんです。\n各駅停車でも、急行でも、特急でもない。\n何にも止まらない電車。何にも着かない落下。\nわふ……それって、すごく寂しいですね。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "各駅停車は停まることで各駅停車になる。\n停まる駅のない電車は定義を失う。\n落下し続ける者には、何の名前もない。\n重力だけが友。永遠の加速度。永遠の無重力。\nそして──永遠の無名。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。螺旋階段の天辺と底の間。\n別の世界線では、彼は今も落ち続けている。" },
    { ending: { title: "自由落下の定義", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-9: 乗車拒否
// ──────────────────────────────────────
write(`${DATE}_乗車拒否.json`, {
  title: "乗車拒否", subtitle: "─ 幻界の記録 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, ayu: { name: "あゆ（幻影）", color: "#e0a040", emoji: "🎒" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、切符を自ら破り捨てた世界線の記録。\nプラットホームに立ったまま、帰りの電車を──拒んだ。" },
    { bg: "station_night" },
    { speaker: "narrator", expression: "", text: "幻影のプラットホーム。手に切符を握っていた。行き先は書いていない。\nワディーはその切符を──両手で裂いた。\n二つに割れた紙片が、風に飛ばされた。" },
    { speaker: "narrator", expression: "", text: "線路の向こうの光が消えた。電車は来ない。\n時刻表の文字が消えていく。プラットホームに一人。" },
    { speaker: "ayu", expression: "ベンチで足をぶらぶら", text: "うぐぅ……切符、破っちゃったの？　もったいないなー。" },
    { speaker: "waddy", expression: "", text: "……あゆ。お前は切符を持っているのか。" },
    { speaker: "ayu", expression: "ポケットをまさぐって", text: "ボクの切符はね……もうずっと前に、なくしちゃったの。\n破ったんじゃなくて、なくしたの。\nどこかに落としたの。雪の日に。" },
    { speaker: "waddy", expression: "", text: "なくしたのと、破ったのは違うのか。" },
    { speaker: "ayu", expression: "真面目な顔で", text: "ぜんぜん違うよ。\nなくした切符は──探せば見つかるかもしれないの。\nどこかの落とし物入れにあるかもしれないの。\nでも、破った切符は──もうないの。" },
    { speaker: "ayu", expression: "少し声を落として", text: "でもね、切符って──約束みたいなものなの。\n「ここからあそこまで行きます」っていう約束。\nお金を払って、約束を買うの。その約束が乗る権利になるの。" },
    { speaker: "waddy", expression: "", text: "約束を破ったのか、俺は。" },
    { speaker: "ayu", expression: "", text: "約束を破ったんじゃなくて──約束自体を壊しちゃったの。\n「破る」と「壊す」は違うんだよ。\n破った約束はね、テープで貼れば修理できるの。\n遅れてごめんね、って言えば──まだ約束は生きてるの。\nでも壊した約束は──もう約束の形をしてないの。\n破片を集めても、元の形がわからないの。" },
    { speaker: "waddy", expression: "線路を見つめて", text: "……電車は来るのか。" },
    { speaker: "ayu", expression: "首を振って", text: "来ないよ。切符がないから。\n電車はね、切符を持ってる人のために走るの。\n約束を持ってる人のために。\n約束を壊した人のところには──電車は停まらないの。" },
    { speaker: "narrator", expression: "", text: "プラットホームが少しずつ暗くなっていく。ベンチだけが残る。\n時刻表は空白。線路の軋みも聞こえない。完全な静寂。" },
    { speaker: "ayu", expression: "立ち上がって小さな声で", text: "うぐぅ……ボクもね、約束をなくしたまま、ここにいるの。\nきっとどこかに──ボクの切符も落ちてるの。\nでも探しに行けない。電車がないから。\n……一緒に待つ？" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "帰路を自ら絶った者。\nプラットホームに一人。時刻表は空白。電車は来ない。\n夢の中の永住者になった。\n来なかった電車を待つことだけが──彼の日課になった。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n顕界に、戻りなさい。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。幻影のプラットホーム。\n別の世界線では、切符の破片が風に散った。" },
    { ending: { title: "乗車拒否", subtitle: "幻界の記録。" } }
  ]
});

// ──────────────────────────────────────
// GEN-10: 永遠の微睡み
// ──────────────────────────────────────
write(`${DATE}_永遠の微睡み.json`, {
  title: "永遠の微睡み", subtitle: "─ 幻界の記録 ─", genre: "幻界ノベル", date: DATE,
  chars: { ...COMMON_CHARS, hinata: { name: "ひなた（幻影）", color: "#ffb6c1", emoji: "🌻" } },
  scenario: [
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "これは、最後の扉を開けなかった世界線の記録。\n光は見えていた。朝の光が。\nだが彼は──背を向けた。" },
    { bg: "void" },
    { speaker: "narrator", expression: "", text: "特異点。最後の扉。扉の向こうから光が差している。\nスマートウォッチの振動が──遠くから聞こえる。\nだがワディーは扉に背を向けた。" },
    { speaker: "waddy", expression: "目を閉じて", text: "もう少しだけ。もう少しだけ寝かせてくれ。" },
    { speaker: "narrator", expression: "", text: "白い空間が暗くなっていく。扉の光が遠ざかる。\n替わりに──布団が現れた。夢の中の布団。" },
    { speaker: "hinata", expression: "布団を引っ張りながら", text: "おにいちゃん……起きて？　朝だよ？\nお日様出てるよ？　ご飯食べないと！" },
    { speaker: "waddy", expression: "布団に潜って", text: "もう少しだけ。あと五分。" },
    { speaker: "hinata", expression: "困った顔で", text: "もー！　おにいちゃん、さっきも「あと五分」って言ったよ！\nその前も「あと五分」って！\nもう何回目の「五分」なの！" },
    { speaker: "waddy", expression: "", text: "……何回目だ。覚えていない。" },
    { speaker: "hinata", expression: "指折り数えて", text: "えっとね、ひなが数えてたの。\n一回目の「あと五分」。二回目の「あと五分」。三回目……。\n……ごめん、ひなも途中で数えるのやめちゃった。\nだって──おにいちゃん、ずっと「あと五分」って言うんだもん。" },
    { speaker: "narrator", expression: "", text: "布団が温かい。重くない。ちょうどいい重さ。\n最適な温度。最適な暗さ。起きる理由がない。\nここにいれば──何も起きない。\n何も起きないことが、こんなに心地よい。" },
    { speaker: "hinata", expression: "だんだん声が小さくなって", text: "おにいちゃん……ひなの声、聞こえてる……？\n……聞こえて、ないのかな……。" },
    { speaker: "hinata", expression: "涙声で", text: "ひなね、ずっと一緒に歩いてきたんだよ？\n水没した電気街口も、書架の森も、鏡の回廊も……\n全部一緒だったのに……最後の最後で……\nおにいちゃんが起きてくれないの……。" },
    { speaker: "waddy", expression: "布団の中で声だけ", text: "……ごめん。もう少しだけ。" },
    { speaker: "hinata", expression: "声が遠くなる", text: "うん……わかった。ひな、待ってるね。\n……ずっと待ってるから。\nおにいちゃんが「起きる」って言うまで。" },
    { speaker: "narrator", expression: "", text: "ひなたの声が消えた。布団の外が静かになった。\n扉の光も消えた。スマートウォッチの振動も消えた。\n何もない。何も聞こえない。ただ布団の温もりだけが残っている。" },
    { speaker: "narrator", expression: "", text: "「もう少しだけ」。その言葉が、永遠になった。\n五分後、また「もう少しだけ」。さらに五分後、また「もう少しだけ」。\n終わりのない五分間。\n目覚まし時計は止まった。止めたのは彼自身。" },
    { bg: "abyss" },
    { speaker: "narrator", expression: "", text: "「もう少し」の先にあるのは、「もう少し」。\nその先にも「もう少し」。\n彼はまだ眠っている。永遠に。\nひなたの声は、もう届かない。\n彼自身が「届かない場所」を選んだから。" },
    { speaker: "narrator", expression: "", text: "おやすみなさい、観測者。" },
    { speaker: "narrator", expression: "", text: "────────────────" },
    { speaker: "narrator", expression: "静かに", text: "幻界の記録は、ここまでだ。\n……戻る場所は、もうないけれど。" },
    { speaker: "narrator", expression: "", text: "2026年3月21日、春。最後の扉の前。\n別の世界線では、「もう少しだけ」が永遠になった。" },
    { ending: { title: "永遠の微睡み", subtitle: "幻界の記録。" } }
  ]
});

console.log('\n✓ All 10 sub-scenarios generated!');
