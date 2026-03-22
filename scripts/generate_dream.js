const fs = require('fs');

const scenario = {
  title: "百夢回廊",
  subtitle: "─ 百の扉、千の幻影 ─",
  genre: "幻界迷宮ノベル",
  date: "2026-03-21",
  chars: {
    narrator: { name: "", color: "#504060", emoji: "" },
    waddy: { name: "ワディー", color: "#b0a0d0", emoji: "🖥️" },
    hinata: { name: "ひなた", color: "#ffb6c1", emoji: "🌻" },
    kotomi_echo: { name: "ことみ（記憶）", color: "#6050a0", emoji: "🎻" },
    dejiko_echo: { name: "でじこ（記憶）", color: "#32cd32", emoji: "🐱" },
    multi_echo: { name: "マルチ（記憶）", color: "#00ced1", emoji: "🧹" }
  },
  scenario: []
};

const S = scenario.scenario;

// ═══════════════════════════════════════════
// プロローグ
// ═══════════════════════════════════════════
S.push({ bg: "abyss" });

S.push({ speaker: "waddy", expression: "うめくように", text: "……血中アルコール飽和度。過飽和溶液。\n昨日の秋葉原が、全部……効いている。" });

S.push({ speaker: "narrator", expression: "", text: "スマートウォッチの光が遠ざかる。\n血中酸素飽和度98%という数字が、ぼやけて消えた。" });

S.push({ speaker: "narrator", expression: "", text: "布団の中。意識が沈んでいく。\n各駅停車の記憶が歪み始める。\nミルクスタンドの瓶が浮かび、金子屋のカウンターが傾き、\nテキーラの観覧車が回転しながら遠ざかる。" });

S.push({ speaker: "narrator", expression: "", text: "そして──目の前に、扉が現れた。" });

// ═══════════════════════════════════════════
// ① ゲストハウスの幻影
// ═══════════════════════════════════════════
S.push({ label: "zone_1" });

S.push({ speaker: "narrator", expression: "", text: "見覚えのあるリビング。\nだが何かが違う。窓の外が真っ暗。時計の針がない。\nソファの上に毛布が放り出されている。" });

S.push({ speaker: "hinata", expression: "遠くから", text: "おにいちゃーん！　こっちだよー！\n迷子になっちゃうよー！" });

S.push({ choices: [
  { text: "ひなたの声についていく", goto: "node_1A", flag: "took_hinata" },
  { text: "一人で廊下を歩く", goto: "node_1B", flag: "alone" },
  { text: "ソファに沈む", goto: "GEN_1" }
]});

// node_1A ── ひなたとの邂逅
S.push({ label: "node_1A" });

S.push({ speaker: "hinata", expression: "笑顔で", text: "えへへ、来てくれた！　ひなね、ずっと待ってたんだよ。\nここはね、おにいちゃんの無意識の中。\n昨日飲んだお酒が全部、夢になって溢れてるの。" });

S.push({ speaker: "waddy", expression: "少し戸惑って", text: "……お前は本当のひなたか？\nそれとも夢の中のひなたか？" });

S.push({ speaker: "hinata", expression: "首をかしげて", text: "んー、ひなにはわかんない。\nでも、おにいちゃんが「ひなただ」って思ったら、\nひなはひなたなんじゃないかな？" });

S.push({ speaker: "hinata", expression: "元気よく", text: "ひなが案内してあげるから、安心してね！\nさ、行こ行こ！" });

S.push({ goto: "zone_2" });

// node_1B ── 廊下
S.push({ label: "node_1B" });

S.push({ speaker: "narrator", expression: "", text: "暗い廊下。自分の足音だけが反響する。\n壁に掛けてあるはずの写真立ての中身が、全部白紙になっている。" });

S.push({ speaker: "waddy", expression: "立ち止まって", text: "……写真が消えている。記憶が欠落しているのか。\nそれとも、この夢が僕の記憶を食っているのか。" });

S.push({ speaker: "narrator", expression: "", text: "廊下の奥に、青白い光が見えた。\n水の音が聞こえる。進むしかない。" });

S.push({ goto: "zone_2" });

// GEN-1: シームレスにサブシナリオへ
S.push({ label: "GEN_1" });

S.push({ speaker: "narrator", expression: "", text: "ソファに沈む。重力が増している気がする。\n立ち上がれない。立ち上がる必要を感じない。\n毛布が重い。温かい。何もしなくていい。" });

S.push({ loadScenario: "2026-03-21_沈黙のリビング" });

// ═══════════════════════════════════════════
// ② 水没した電気街口
// ═══════════════════════════════════════════
S.push({ label: "zone_2" });

S.push({ speaker: "narrator", expression: "", text: "扉を開けると、水が流れていた。\n足首まで。膝まで。腰まで──いや、足首だけだ。\n秋葉原の電気街口に似ている。\nだが看板が全部水面下に沈んでいる。" });

S.push({ speaker: "waddy", expression: "見回しながら", text: "ここは……秋葉原？　水没した電気街口。\nミルクスタンドがあったはずの場所に、瓶が浮かんでいる。" });

S.push({ ifNot: "took_hinata", goto: "zone_2_choice" });

S.push({ speaker: "hinata", expression: "指差して", text: "あっ、見て！　コーヒー牛乳の瓶だよ！\nおにいちゃんの記憶の欠片かも！" });

S.push({ label: "zone_2_choice" });

S.push({ choices: [
  { text: "瓶を拾う", goto: "node_2A", flag: "found_bottle" },
  { text: "無視して進む", goto: "node_2B", flag: "ignored_bottle" },
  { text: "水に飛び込む", goto: "GEN_2" }
]});

// node_2A
S.push({ label: "node_2A" });

S.push({ speaker: "narrator", expression: "", text: "コーヒー牛乳の瓶。中は空っぽだ。\nだが手に持った瞬間、ミルクスタンドの記憶が蘇る。\n二百円の証明書。立って飲むコーヒー牛乳。" });

S.push({ speaker: "narrator", expression: "", text: "でじこの声が聞こえた気がした。\n「二百円にょ」と。\nだが姿はどこにもない。声だけが水面を伝って消えた。" });

S.push({ goto: "zone_3" });

// node_2B
S.push({ label: "node_2B" });

S.push({ speaker: "narrator", expression: "", text: "瓶を見て見ぬふりをした。\n水面に映った自分の顔が、少しだけ老けて見えた。\n──いや、疲れているだけだ。二日酔いの顔だ。" });

S.push({ goto: "zone_3" });

// GEN-2: シームレスにサブシナリオへ
S.push({ label: "GEN_2" });

S.push({ speaker: "narrator", expression: "", text: "水に潜る。深く。もっと深く。\n水底に沈んだ看板が見える。\n「ゲーマーズ」。「ミルクスタンド」。「金子屋」。\n昨日の秋葉原が、全部沈んでいる。" });

S.push({ loadScenario: "2026-03-21_水底の秋葉原" });

// ═══════════════════════════════════════════
// ③ 書架の森
// ═══════════════════════════════════════════
S.push({ label: "zone_3" });

S.push({ speaker: "narrator", expression: "", text: "水が引いた先は、天井まで続く書架だった。\n本の背表紙に書いてある文字が、全部ワディーの日記の抜粋。" });

S.push({ speaker: "narrator", expression: "", text: "「旅情はローレンツ収縮により速度の二乗に反比例する」\n「PCパーツを買わなくても、コーヒー牛乳を一本飲めば\n秋葉原に行ったと言える」" });

S.push({ speaker: "waddy", expression: "背表紙を見つめて", text: "俺の日記だ。全部俺の書いたものが本になっている。\n……恥ずかしいな。" });

S.push({ ifNot: "took_hinata", goto: "zone_3_choice" });

S.push({ speaker: "hinata", expression: "目を丸くして", text: "すごーい！　おにいちゃん、こんなにたくさん書いてたんだ！\nこの本、全部おにいちゃんの言葉なの？" });

S.push({ label: "zone_3_choice" });

S.push({ choices: [
  { text: "一冊手に取って読む", goto: "node_3A" },
  { text: "奥へ走り抜ける", goto: "node_3B" },
  { text: "本の中に入ってみる", goto: "GEN_3" }
]});

// node_3A
S.push({ label: "node_3A" });

S.push({ speaker: "narrator", expression: "", text: "手に取った本のタイトル──「各駅停車の形而上学」。\n開くと、ことみの声が聞こえた。" });

S.push({ speaker: "narrator", expression: "", text: "「各駅停車は全部の駅に停まるの。\nでも全部の駅で降りる人は、それぞれ違うの。\n同じ電車に乗っていても、\n見ている景色は一人ずつ違うの」" });

S.push({ speaker: "waddy", expression: "静かに", text: "昨日の記憶だ。夢の中で、昨日が本になっている。\n……ちゃんと覚えている。" });

S.push({ goto: "zone_4" });

// node_3B
S.push({ label: "node_3B" });

S.push({ speaker: "narrator", expression: "", text: "本に触れずに走る。背表紙の文字が流れていく。\n速く走るほど文字が読めなくなった。\n──いや、文字が消えていく。" });

S.push({ speaker: "waddy", expression: "走りながら", text: "ローレンツ収縮。速く動くと情報が縮む。旅情も縮む。\n……夢の中でも物理法則は有効なのか。" });

S.push({ goto: "zone_4" });

// GEN-3: シームレスにサブシナリオへ
S.push({ label: "GEN_3" });

S.push({ speaker: "narrator", expression: "", text: "本を開いたら、文字が飛び出してきた。\nいや──自分が文字の中に吸い込まれた。\n紙の繊維の間に閉じ込められる。" });

S.push({ loadScenario: "2026-03-21_活字の牢獄" });

// ═══════════════════════════════════════════
// ④ 鏡の回廊
// ═══════════════════════════════════════════
S.push({ label: "zone_4" });

S.push({ speaker: "narrator", expression: "", text: "書架を抜けると、鏡だらけの廊下。\n自分の姿が無数に映っている。\nだが──映り方がそれぞれ違う。" });

S.push({ speaker: "narrator", expression: "", text: "ある鏡の中のワディーは笑っている。\nある鏡の中のワディーは泣いている。\nある鏡の中のワディーは、ウイスキーのボトルを抱えて眠っている。" });

S.push({ speaker: "waddy", expression: "立ち止まって", text: "並行世界の自分か。ADMS──Auto Diverge Mapping System。\n分岐した世界線の記録。" });

S.push({ ifNot: "took_hinata", goto: "zone_4_choice" });

S.push({ speaker: "hinata", expression: "きょろきょろして", text: "おにいちゃん、この鏡、全部違うおにいちゃんが映ってるよ！\nどれが本物のおにいちゃんなの？" });

S.push({ label: "zone_4_choice" });

S.push({ choices: [
  { text: "鏡の中の自分と話す", goto: "node_4A", flag: "mirror_self" },
  { text: "鏡を割って先に進む", goto: "node_4B", flag: "broke_mirror" },
  { text: "鏡に近づきすぎる", goto: "GEN_4" }
]});

// node_4A
S.push({ label: "node_4A" });

S.push({ speaker: "waddy", expression: "鏡に向かって", text: "お前は誰だ。" });

S.push({ speaker: "narrator", expression: "", text: "鏡の中のワディーが口を開いた。声はない。\nだが唇が動いた。読唇できた。\n「お前こそ誰だ」と。" });

S.push({ speaker: "narrator", expression: "", text: "鏡の中の自分は、昨日の秋葉原にまだいるような顔をしていた。\n金子屋のカウンターで、まだビールを飲んでいるような。" });

S.push({ speaker: "waddy", expression: "静かに", text: "……俺は俺だ。二日酔いの俺。\n過飽和溶液が結晶化した後の俺。" });

S.push({ goto: "zone_5" });

// node_4B
S.push({ label: "node_4B" });

S.push({ speaker: "narrator", expression: "", text: "拳で鏡を叩いた。割れなかった。\nもう一度。割れない。\n三度目──亀裂が走った。\n破片が床に散らばる。踏んでも痛くない。夢だから。" });

S.push({ speaker: "waddy", expression: "拳を見て", text: "夢だから痛くない。夢だから何でもできる。\n──本当にそうか？" });

S.push({ goto: "zone_5" });

// GEN-4: シームレスにサブシナリオへ
S.push({ label: "GEN_4" });

S.push({ speaker: "narrator", expression: "", text: "鏡に触れた瞬間、表面が水のように波打った。\n手が、腕が、肩が──吸い込まれていく。\n鏡の向こう側に引きずり込まれた。" });

S.push({ loadScenario: "2026-03-21_鏡像の奴隷" });

// ═══════════════════════════════════════════
// ⑤ 逆転秋葉原
// ═══════════════════════════════════════════
S.push({ label: "zone_5" });

S.push({ speaker: "narrator", expression: "", text: "鏡の回廊を抜けると、見覚えのある街並み。\n秋葉原。だが看板が全部逆さまに書いてある。\n空が地面にあり、地面が空にある。重力が反転している。" });

S.push({ speaker: "waddy", expression: "見上げて", text: "逆さまの秋葉原。電気街口が……天井にある。" });

S.push({ ifNot: "took_hinata", goto: "zone_5_choice" });

S.push({ speaker: "hinata", expression: "はしゃいで", text: "わー！　逆さまだー！\nひな、逆立ちしたらちょうどいいかもー！" });

S.push({ label: "zone_5_choice" });

S.push({ choices: [
  { text: "電気街口を探す", goto: "node_5A" },
  { text: "裏路地に入る", goto: "node_5B" },
  { text: "逆さまの看板について行く", goto: "GEN_5" }
]});

// node_5A
S.push({ label: "node_5A" });

S.push({ speaker: "narrator", expression: "", text: "逆さまの電気街口。改札が天井にぶら下がっている。\nでじこの声が聞こえた気がした。" });

S.push({ speaker: "narrator", expression: "", text: "「ここはでじこの庭にょ！」\n\nだが姿はない。声だけが反響している。\n夢の中のでじこは、声だけの存在になっていた。" });

S.push({ goto: "zone_6" });

// node_5B
S.push({ label: "node_5B" });

S.push({ speaker: "narrator", expression: "", text: "裏路地。「Iv」の看板が地面に埋まっている。\n扉だけが垂直に立って、どこにも繋がっていない。" });

S.push({ speaker: "waddy", expression: "看板を見下ろして", text: "名前だけが残っている。中身のない店。\n……でじこが言っていた。\n「名前が残っていればまだ存在する」と。" });

S.push({ goto: "zone_6" });

// GEN-5: シームレスにサブシナリオへ
S.push({ label: "GEN_5" });

S.push({ speaker: "narrator", expression: "", text: "逆さまの看板について歩いた。\n「ゲーマーズ」の看板。「ラオックス」の看板。「石丸電気」の看板。\n全部、もう存在しない店の看板。亡霊の電気街。" });

S.push({ loadScenario: "2026-03-21_看板の墓場" });

// ═══════════════════════════════════════════
// ⑥ 琥珀の酒場
// ═══════════════════════════════════════════
S.push({ label: "zone_6" });

S.push({ speaker: "narrator", expression: "", text: "逆転秋葉原の奥に、一軒だけ正しい向きで建っている店があった。\n看板には「金子屋」。だが中は変わっている。\nカウンターにウイスキーのボトルが無限に並んでいる。\n全部、琥珀色に光っている。" });

S.push({ speaker: "waddy", expression: "立ち止まって", text: "……金子屋。いや、金子屋の幻影か。\nイチローズモルト。秩父蒸溜所。48度。\n昨日のあの味が、夢の中で蒸留されている。" });

S.push({ ifNot: "took_hinata", goto: "zone_6_choice" });

S.push({ speaker: "hinata", expression: "心配そうに", text: "おにいちゃん、ここのお酒、全部光ってるよ！　きれー！\nでもね、飲みすぎちゃダメだよ？\n昨日ので懲りたでしょ！" });

S.push({ label: "zone_6_choice" });

S.push({ choices: [
  { text: "カウンターに座って一杯だけ", goto: "node_6A", flag: "entered_bar" },
  { text: "通過する", goto: "node_6B", flag: "passed_bar" },
  { text: "ボトルを全部空ける", goto: "GEN_6" }
]});

// node_6A
S.push({ label: "node_6A" });

S.push({ speaker: "narrator", expression: "", text: "イチローズモルトを一杯。氷はない。\n夢の中だからストレートで。\n蜂蜜とピート。昨日と同じ味。\nだが一口で十分だった。もう飽和している。" });

S.push({ speaker: "waddy", expression: "グラスを置いて", text: "過飽和溶液にこれ以上は入らない。\n一杯で十分だ。" });

S.push({ goto: "zone_7" });

// node_6B
S.push({ label: "node_6B" });

S.push({ speaker: "narrator", expression: "", text: "酒場の誘惑を振り切って通過した。\n背中にボトルの光が当たっている。\n振り返りたいが、振り返らない。" });

S.push({ speaker: "waddy", expression: "歩きながら", text: "昨日のアルコールがまだ体内にある。\n夢の中で飲んだらどうなるか……試す気にはなれない。" });

S.push({ goto: "zone_7" });

// GEN-6: シームレスにサブシナリオへ
S.push({ label: "GEN_6" });

S.push({ speaker: "narrator", expression: "", text: "一杯目。二杯目。三杯目。\nもう何杯目かわからない。\nカウンターが琥珀色の液体で満ちていく。\n膝まで。腰まで。胸まで。" });

S.push({ loadScenario: "2026-03-21_琥珀色の溺死" });

// ═══════════════════════════════════════════
// ⑦ 時計塔
// ═══════════════════════════════════════════
S.push({ label: "zone_7" });

S.push({ speaker: "narrator", expression: "", text: "酒場を出ると、巨大な時計塔が聳えていた。\n文字盤が複数ある。それぞれ違う時間を指している。" });

S.push({ speaker: "narrator", expression: "", text: "ひとつは「16:00」──スマートウォッチが光った時間。\nひとつは「22:43」──酒が抜けてきた時間。\nひとつは「∞」。" });

S.push({ speaker: "waddy", expression: "見上げて", text: "∞。無限時。夢の中には終わりがない……のか。" });

S.push({ ifNot: "took_hinata", goto: "zone_7_choice" });

S.push({ speaker: "hinata", expression: "指差して", text: "ねーおにいちゃん、あの時計、針がぐるぐる回ってるよ！\n22時43分で止まったりしないかなー？" });

S.push({ label: "zone_7_choice" });

S.push({ choices: [
  { text: "時計を見上げて待つ", goto: "node_7A" },
  { text: "素通りする", goto: "node_7B" },
  { text: "時計を止める", goto: "GEN_7" }
]});

// node_7A
S.push({ label: "node_7A" });

S.push({ speaker: "narrator", expression: "", text: "時計を見上げて立ち止まった。\n16:00を指していた針が、ゆっくりと動き始めた。\n17:00。18:00。19:00。\n──昨日の時間を早送りしている。" });

S.push({ speaker: "narrator", expression: "", text: "20:00。21:00。22:00。\n22:43──針が止まった。\n「ようやく酒が抜けてきた」。あの瞬間。\n時計塔全体が、微かに振動した。" });

S.push({ goto: "zone_8" });

// node_7B
S.push({ label: "node_7B" });

S.push({ speaker: "narrator", expression: "", text: "時計塔を無視して通り過ぎた。\n背後で時計が鳴った。ゴーン、ゴーン、ゴーン──\n何回鳴ったか数えなかった。" });

S.push({ speaker: "waddy", expression: "歩きながら", text: "数えない。夢の中で時間を数えたら負けだ。" });

S.push({ goto: "zone_8" });

// GEN-7: シームレスにサブシナリオへ
S.push({ label: "GEN_7" });

S.push({ speaker: "narrator", expression: "", text: "時計を掴んで止めた。針が止まった。\nすべての時間が凍結する。\n空気が固まる。光が止まる。" });

S.push({ loadScenario: "2026-03-21_凍った秒針" });

// ═══════════════════════════════════════════
// ⑧ 螺旋階段
// ═══════════════════════════════════════════
S.push({ label: "zone_8" });

S.push({ speaker: "narrator", expression: "", text: "時計塔の奥に、螺旋階段があった。\n上にも下にも果てしなく続いている。\nエッシャーの版画のように、上っても下りても\n同じ場所に戻るかもしれない。" });

S.push({ speaker: "waddy", expression: "階段を見て", text: "上か下か。各駅停車には上りと下りがある。\n上りは目的地へ。下りは帰り道。\n──だがここでは、どちらが上りだ？" });

S.push({ ifNot: "took_hinata", goto: "zone_8_choice" });

S.push({ speaker: "hinata", expression: "上を見上げて", text: "ひなは上がいいなー！\n上に行ったら空が見えるかもしれないよ！" });

S.push({ label: "zone_8_choice" });

S.push({ choices: [
  { text: "上る", goto: "node_8A", flag: "climbed_stairs" },
  { text: "下る", goto: "node_8B", flag: "descended_stairs" },
  { text: "手すりから身を投げる", goto: "GEN_8" }
]});

// node_8A
S.push({ label: "node_8A" });

S.push({ speaker: "narrator", expression: "", text: "上る。上る。上る。\n50段。100段。200段。\n息が切れない。夢だから体力は無限だ。" });

S.push({ speaker: "narrator", expression: "", text: "上った先に、光が見えた。\n白い光。眩しい。でも温かくはない。\n冷たい光。概念の光。" });

S.push({ goto: "zone_9" });

// node_8B
S.push({ label: "node_8B" });

S.push({ speaker: "narrator", expression: "", text: "下る。下る。下る。\n暗くなっていく。だが不思議と恐怖はない。\n暗闇は敵ではない。暗闇は、ただ光がないだけだ。" });

S.push({ speaker: "narrator", expression: "", text: "底に辿り着いた。小さな扉がある。\n扉の向こうから、かすかに声が聞こえる。" });

S.push({ goto: "zone_9" });

// GEN-8: シームレスにサブシナリオへ
S.push({ label: "GEN_8" });

S.push({ speaker: "narrator", expression: "", text: "手すりを越えた。落ちる。落ち続ける。\n壁が遠ざかっていく。階段が小さくなっていく。\n底がない。永遠に落ち続ける。" });

S.push({ loadScenario: "2026-03-21_自由落下の定義" });

// ═══════════════════════════════════════════
// ⑨ みとらの間
// ═══════════════════════════════════════════
S.push({ label: "zone_9" });

S.push({ speaker: "narrator", expression: "", text: "階段の先に、何もない空間があった。\n白い。何もない。だが──声がある。" });

S.push({ speaker: "mitra", expression: "", text: "ここまで来たのね、観測者。\nあなたの夢は、想像以上に深い。" });

S.push({ speaker: "mitra", expression: "", text: "各駅停車の記憶。コーヒー牛乳の瓶。鏡の中の自分。\n全部、あなたの無意識が作った駅よ。\n一つずつ停まってきた。各駅停車のように。" });

S.push({ speaker: "waddy", expression: "周りを見回して", text: "……お前は夢の管理者か？" });

S.push({ speaker: "mitra", expression: "", text: "管理者ではないわ。観測者を観測する者。\nメタ観測者。\n……最後の選択よ。" });

S.push({ choices: [
  { text: "みとらの声に従う", goto: "node_9A", flag: "heard_mitra" },
  { text: "みとらに逆らう", goto: "node_9B", flag: "resisted_mitra" },
  { text: "みとらに全てを委ねる", goto: "GEN_9" }
]});

// node_9A
S.push({ label: "node_9A" });

S.push({ speaker: "mitra", expression: "静かに", text: "正しい選択よ。いえ──「正しい」なんてものは存在しないわ。\nでも、声を聞くことができる人は、\n目覚める資格がある。" });

S.push({ speaker: "mitra", expression: "", text: "さあ──最後の扉を開けなさい。" });

S.push({ goto: "zone_10" });

// node_9B
S.push({ label: "node_9B" });

S.push({ speaker: "waddy", expression: "はっきりと", text: "俺は俺の判断で進む。お前の声には従わない。" });

S.push({ speaker: "mitra", expression: "微かに笑って", text: "そう。それもまた、一つの回答。\n自分の意志で動く者は、自分の意志で目覚めることもできるわ。\n……行きなさい。" });

S.push({ goto: "zone_10" });

// GEN-9: シームレスにサブシナリオへ
S.push({ label: "GEN_9" });

S.push({ speaker: "narrator", expression: "", text: "手に持っていた切符を見た。行き先は書いていない。\nワディーはその切符を──両手で裂いた。" });

S.push({ loadScenario: "2026-03-21_乗車拒否" });

// ═══════════════════════════════════════════
// ⑩ 特異点 ── エンディング分岐
// ═══════════════════════════════════════════
S.push({ label: "zone_10" });

S.push({ speaker: "narrator", expression: "", text: "白い空間の奥に、最後の扉がある。\n扉の向こうから──光が差している。\n目覚まし時計の音が、遠くから聞こえる。" });

S.push({ speaker: "narrator", expression: "", text: "……いや、それはスマートウォッチの振動かもしれない。\n血中酸素飽和度──98%。あの数字が、また点滅している。" });

// ひなたの台詞（フラグ依存）
S.push({ if: "took_hinata", goto: "zone_10_hinata" });
S.push({ goto: "zone_10_mitra_check" });

S.push({ label: "zone_10_hinata" });
S.push({ speaker: "hinata", expression: "嬉しそうに", text: "おにいちゃん、あの光──もしかして朝の光じゃない？\n起きられるかもしれないよ！" });

S.push({ label: "zone_10_mitra_check" });
// みとらの台詞 (heard_mitra時)
S.push({ if: "heard_mitra", goto: "zone_10_mitra_line" });
S.push({ goto: "zone_10_final_choice" });

S.push({ label: "zone_10_mitra_line" });
S.push({ speaker: "mitra", expression: "", text: "最後の選択よ。目覚めるか、留まるか。\nあなたの通ってきた道が、答えを教えてくれるわ。" });

// 最終選択
S.push({ label: "zone_10_final_choice" });

S.push({ choices: [
  { text: "扉を開けて目覚める", goto: "ending_router" },
  { text: "夢に留まる", goto: "GEN_10" }
]});

// ═══════════════════════════════════════════
// エンディングルーター（フラグ判定）
// ═══════════════════════════════════════════
S.push({ label: "ending_router" });

// KEN-A: took_hinata + found_bottle + heard_mitra
S.push({ if: "took_hinata", goto: "check_KEN_A_2" });
S.push({ goto: "check_KEN_B" });

S.push({ label: "check_KEN_A_2" });
S.push({ if: "found_bottle", goto: "check_KEN_A_3" });
S.push({ goto: "check_KEN_D" });

S.push({ label: "check_KEN_A_3" });
S.push({ if: "heard_mitra", goto: "KEN_A" });
S.push({ goto: "check_KEN_D" });

// KEN-B: alone + mirror_self + climbed_stairs
S.push({ label: "check_KEN_B" });
S.push({ if: "alone", goto: "check_KEN_B_2" });
S.push({ goto: "check_KEN_E" });

S.push({ label: "check_KEN_B_2" });
S.push({ if: "mirror_self", goto: "check_KEN_B_3" });
S.push({ goto: "check_KEN_E" });

S.push({ label: "check_KEN_B_3" });
S.push({ if: "climbed_stairs", goto: "KEN_B" });
S.push({ goto: "KEN_C" }); // fallback

// KEN-D: took_hinata + entered_bar + resisted_mitra
S.push({ label: "check_KEN_D" });
S.push({ if: "entered_bar", goto: "check_KEN_D_2" });
S.push({ goto: "KEN_C" });

S.push({ label: "check_KEN_D_2" });
S.push({ if: "resisted_mitra", goto: "KEN_D" });
S.push({ goto: "KEN_C" });

// KEN-E: found_bottle + mirror_self + heard_mitra (non-hinata route)
S.push({ label: "check_KEN_E" });
S.push({ if: "found_bottle", goto: "check_KEN_E_2" });
S.push({ goto: "KEN_C" });

S.push({ label: "check_KEN_E_2" });
S.push({ if: "mirror_self", goto: "check_KEN_E_3" });
S.push({ goto: "KEN_C" });

S.push({ label: "check_KEN_E_3" });
S.push({ if: "heard_mitra", goto: "KEN_E" });
S.push({ goto: "KEN_C" });

// ═══════════════════════════════════════════
// 顕界エンディング
// ═══════════════════════════════════════════

// KEN-A: 正常覚醒（ひなたの導きEND）
S.push({ label: "KEN_A" });

S.push({ speaker: "hinata", expression: "手を振って", text: "じゃあね、おにいちゃん。\n目が覚めたら、ちゃんとごはん食べてね！\nまた夢の中で会おうね！　えへへ。" });

S.push({ speaker: "narrator", expression: "", text: "意識が浮上する。天井が見える。見慣れた天井。\nスマートウォッチが振動している。血中酸素飽和度98%。\n頭痛はまだある。だが──昨日よりは軽い。\nコーヒー牛乳が飲みたくなった。" });

S.push({ end: true, title: "正常覚醒", subtitle: "ひなたの声に導かれて、夢の出口を見つけた。" });

// KEN-B: 明晰夢
S.push({ label: "KEN_B" });

S.push({ speaker: "waddy", expression: "確信を持って", text: "──これは夢だ。俺は知っている。\n鏡の中の自分に「誰だ」と聞いた時から気づいていた。\n階段を上ったのも、自分で選んだ。" });

S.push({ speaker: "waddy", expression: "静かに", text: "夢の中でも、俺は各駅停車だ。\n一つずつ停まって、一つずつ確認する。\n全部確認した。もういい。起きる。" });

S.push({ speaker: "narrator", expression: "", text: "意識がクリアになる。\n夢のエッジが鮮明に見え始めた。\nそして目覚めた。自力で。" });

S.push({ end: true, title: "明晰夢", subtitle: "自分の力で夢を制御し、自分の意志で目覚めた。" });

// KEN-C: 目覚まし時計（フォールバックEND）
S.push({ label: "KEN_C" });

S.push({ speaker: "narrator", expression: "", text: "遠くから鳴り響く電子音。\n目覚まし時計──いや、スマートウォッチのアラーム。\n夢の壁を突き破って、現実の音が侵入してきた。" });

S.push({ speaker: "waddy", expression: "目を開けて", text: "……あ。アラーム。何時だ。もう朝か。" });

S.push({ speaker: "mitra", expression: "どこからともなく", text: "外部からの干渉。夢の管理者としては不本意だけれど──\nあなたは呼ばれている。現実に。" });

S.push({ speaker: "narrator", expression: "", text: "唐突に意識が浮上し、見慣れた天井が目に入る。\n夢の残滓が急速に薄れていく。\n……何を見ていたのか、もう思い出せない。" });

S.push({ end: true, title: "目覚まし時計", subtitle: "現実からの呼び声が、夢の迷宮を打ち破った。" });

// KEN-D: 半覚醒
S.push({ label: "KEN_D" });

S.push({ speaker: "narrator", expression: "", text: "目覚めたのか、夢の続きなのか、判然としない。\n天井は見える。だがまだ琥珀色に揺れている気がする。\n二日酔いの残滓なのか、夢の残滓なのか。" });

S.push({ speaker: "waddy", expression: "天井を見つめて", text: "……起きた、のか？　まだ寝ている、のか？\n……どっちでもいい。腹が減った。" });

S.push({ speaker: "narrator", expression: "", text: "琥珀色の残像が視界の端で揺れている。\n酒場の記憶か、二日酔いの幻覚か。\n区別がつかないまま、体を起こした。" });

S.push({ end: true, title: "半覚醒", subtitle: "夢と現実の境界線。どちらにいるのかは、まだわからない。" });

// KEN-E: 各駅停車の残響
S.push({ label: "KEN_E" });

S.push({ speaker: "narrator", expression: "", text: "目覚めた瞬間、手に何かを握っていた。\n──何もない。だがコーヒー牛乳の瓶の感触が残っている。\n夢から持ち帰った記憶。鏡の中で見た自分の顔。" });

S.push({ speaker: "waddy", expression: "手を見つめて", text: "……あの夢は何だったんだ。\nいや──何だったかは覚えている。\n昨日の秋葉原が、全部夢になっていた。\n各駅停車の記憶が歪んで、再構成されて、戻ってきた。" });

S.push({ speaker: "waddy", expression: "少し笑って", text: "……悪くない二日酔いだったのかもしれない。" });

S.push({ end: true, title: "各駅停車の残響", subtitle: "昨日の記録が、夢の中で蒸留された。二度目の各駅停車。" });

// ═══════════════════════════════════════════
// GEN-10: 永遠の微睡み
// ═══════════════════════════════════════════
S.push({ label: "GEN_10" });

S.push({ speaker: "narrator", expression: "", text: "光から目を背けた。\n目覚まし時計の音を無視した。\n二日酔いの体を引きずって、布団に潜った──夢の中の布団に。" });

S.push({ loadScenario: "2026-03-21_永遠の微睡み" });

// ═══════════════════════════════════════════
// 書き出し
// ═══════════════════════════════════════════
const outPath = 'c:/Users/wdddi/workspace/waddy-guesthouse-90s/scenarios/2026-03-21_百夢回廊.json';
fs.writeFileSync(outPath, JSON.stringify(scenario, null, 2), 'utf-8');
console.log(`✓ Generated: ${outPath}`);
console.log(`  Total scenario steps: ${S.length}`);

// 統計
const labels = S.filter(s => s.label).length;
const choices = S.filter(s => s.choices).length;
const ends = S.filter(s => s.end).length;
const flags = S.filter(s => s.choices).flatMap(s => s.choices.filter(c => c.flag).map(c => c.flag));
const uniqueFlags = [...new Set(flags)];
console.log(`  Labels: ${labels}`);
console.log(`  Choice points: ${choices}`);
console.log(`  Endings: ${ends}`);
console.log(`  Unique flags: ${uniqueFlags.length} (${uniqueFlags.join(', ')})`);
