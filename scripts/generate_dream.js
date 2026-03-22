const fs = require('fs');

// ═══════════════════════════════════════════════════════════════
// 百夢回廊 ── 「酒は蒸留装置。二日酔いの朝に、昨日が記憶に変わる」
// ═══════════════════════════════════════════════════════════════
// みとらは出さない。顕界のみ。
// ひなたは「起きなよ」と引き戻す存在。案内人ではない。
// BAD END（幻界サブシナリオ）= 記憶に溺れて留まってしまうこと。
// GOOD END = 「頭痛いけど、昨日は悪くなかった」と思って目を覚ますこと。
// ═══════════════════════════════════════════════════════════════

const scenario = {
  title: "百夢回廊",
  subtitle: "─ 酒は蒸留装置 ─",
  genre: "顕界迷宮ノベル",
  date: "2026-03-21",
  chars: {
    narrator: { name: "", color: "#504060", emoji: "" },
    waddy: { name: "ワディー", color: "#b0a0d0", emoji: "🖥️" },
    hinata: { name: "ひなた", color: "#ffb6c1", emoji: "🌻" },
    kotomi_echo: { name: "ことみ（残響）", color: "#6050a0", emoji: "🎻" },
    dejiko_echo: { name: "でじこ（残響）", color: "#32cd32", emoji: "🐱" }
  },
  scenario: []
};

const S = scenario.scenario;

// ═══════════════════════════════════════════
// プロローグ ── 布団の中
// ═══════════════════════════════════════════
S.push({ bg: "abyss" });

S.push({ speaker: "narrator", expression: "", text: "頭が痛い。" });

S.push({ speaker: "narrator", expression: "", text: "スマートウォッチが振動している。血中酸素飽和度98%。\n体は正常。でも頭が痛い。\n胃の底に残っているのは、イチローズモルトの48度と\n金子屋のもつ煮込みの残り香。" });

S.push({ speaker: "waddy", expression: "布団の中で", text: "……昨日、飲みすぎた。\nいや──飲みすぎたのか？\n楽しかったのは確かだ。楽しかったから飲んだ。\n飲んだから頭が痛い。因果関係は明快だ。" });

S.push({ speaker: "narrator", expression: "", text: "目を閉じる。\nまだ起きたくない。もう少しだけ。\n……意識が沈んでいく。\n昨日の記憶が、二日酔いの熱で発酵し始める。" });

S.push({ speaker: "narrator", expression: "", text: "酒は蒸留装置だ。\n体験という原酒を、アルコールの熱で蒸留する。\n頭痛という残滓を残して、記憶だけが透き通っていく。\n──蒸留が、始まる。" });

// ═══════════════════════════════════════════
// ① 二百円の記憶 ── ミルクスタンド
// ═══════════════════════════════════════════
S.push({ label: "zone_1" });

S.push({ speaker: "narrator", expression: "", text: "最初に浮かんできたのは、コーヒー牛乳の味だった。\n二百円。立ち飲み。秋葉原駅のミルクスタンド。\n何も買わなくてもいい。瓶を一本飲めば、秋葉原に来たと言える。\n──そう日記に書いた。" });

S.push({ speaker: "waddy", expression: "味を思い出しながら", text: "二百円の証明書。\n秋葉原に行った証拠なんて、瓶一本で十分だ。\nPCパーツを買わなくても。フィギュアを買わなくても。\n立って飲む。それだけで十分だった。" });

S.push({ speaker: "narrator", expression: "", text: "夢の中でも、あの味がする。\n甘くて、少し薄くて、紙パックとは違う瓶の感触。\n冷たいガラスの重さ。飲み終えた後の、空っぽの軽さ。" });

S.push({ ifNot: "took_hinata", goto: "zone_1_choice" });

S.push({ speaker: "hinata", expression: "遠くから", text: "おにいちゃーん、起きてー！\nいつまでも昨日のこと考えてないでー！" });

S.push({ label: "zone_1_choice" });

S.push({ choices: [
  { text: "味を反芻して、先へ進む", goto: "node_1A", flag: "took_hinata" },
  { text: "瓶を握ったまま立ち止まる", goto: "node_1B", flag: "lingered_milk" },
  { text: "二百円の味に沈んでいく", goto: "GEN_1" }
]});

// node_1A ── 味を噛み締めて
S.push({ label: "node_1A" });

S.push({ speaker: "waddy", expression: "少し笑って", text: "……二百円で買えるものの中で、いちばん価値がある。\n立って飲むコーヒー牛乳。\n座って飲んだら、たぶん味が変わる。\n立っているから、あの味になるんだ。" });

S.push({ speaker: "hinata", expression: "嬉しそうに", text: "おにいちゃん、ちゃんと思い出せてるね。\n昨日のこと、全部忘れちゃうかと思ったー。" });

S.push({ speaker: "waddy", expression: "", text: "忘れない。二百円分の記憶は、ちゃんと残ってる。" });

S.push({ goto: "zone_2" });

// node_1B ── 少し長く味わう
S.push({ label: "node_1B" });

S.push({ speaker: "narrator", expression: "", text: "瓶を長く握りすぎた。手が冷たくなった。\nでも離す気にならない。\nこの冷たさが、昨日の証拠だから。" });

S.push({ speaker: "waddy", expression: "静かに", text: "……手が記憶を覚えている。\n頭は忘れても、手は覚えている。" });

S.push({ goto: "zone_2" });

// GEN-1: 沈黙のリビング
S.push({ label: "GEN_1" });

S.push({ speaker: "narrator", expression: "", text: "コーヒー牛乳の味が広がっていく。\n口の中だけじゃない。体全体に染み込んでいく。\n瓶の中に自分が入っていく。小さく、小さく。\n二百円の世界は、二百円で完結してしまう。" });

S.push({ loadScenario: "2026-03-21_沈黙のリビング" });

// ═══════════════════════════════════════════
// ② 電気街の地層 ── 消えた店と残った店
// ═══════════════════════════════════════════
S.push({ label: "zone_2" });

S.push({ speaker: "narrator", expression: "", text: "次に浮かんだのは、看板だった。\n昨日歩いた秋葉原。でも夢の中の秋葉原は、\n時間軸が折り重なっている。" });

S.push({ speaker: "narrator", expression: "", text: "ゲーマーズがあった場所。ラオックスがあった場所。\n石丸電気がCD売ってた頃の記憶。\n全部重なって、同時に見えている。\n昨日の秋葉原と、十年前の秋葉原が、同じ景色の中にある。" });

S.push({ speaker: "waddy", expression: "歩きながら", text: "秋葉原は地層だ。\n古い店が消えて、新しい店が建つ。\nでも地面の下には全部残ってる。\n歩くたびに、靴の裏から振動が伝わってくる。\n……ここに何があったか、足が知っている。" });

S.push({ ifNot: "took_hinata", goto: "zone_2_choice" });

S.push({ speaker: "hinata", expression: "きょろきょろして", text: "おにいちゃん、ここ変だよ。\n看板がいっぱいあるけど、半分は読めないの。\n……消えかけてる文字。昔の看板？" });

S.push({ label: "zone_2_choice" });

S.push({ choices: [
  { text: "今ある店の方を見る", goto: "node_2A", flag: "looked_present" },
  { text: "消えた看板を読もうとする", goto: "node_2B", flag: "read_old_signs" },
  { text: "消えた看板を追いかける", goto: "GEN_2" }
]});

// node_2A
S.push({ label: "node_2A" });

S.push({ speaker: "waddy", expression: "前を向いて", text: "消えた店のことばかり考えてもしょうがない。\n秋葉原はまだ生きてる。新しい店もある。\n……変わることを嘆くより、\n変わっても残るものの方を見たい。" });

S.push({ speaker: "dejiko_echo", expression: "どこかから", text: "にょ……でじこの庭は変わっても、\nでじこは変わらないにょ。" });

S.push({ speaker: "waddy", expression: "少し笑って", text: "……そうだな。お前は変わらない。" });

S.push({ goto: "zone_3" });

// node_2B
S.push({ label: "node_2B" });

S.push({ speaker: "narrator", expression: "", text: "消えかけた看板に目を凝らす。\n「石丸電気」──読めた。「ヤマギワ」──読めた。\nでも読めたからといって、店が戻るわけではない。\n文字が読めることだけが、残った記憶の証拠。" });

S.push({ speaker: "waddy", expression: "立ち止まって", text: "……名前を覚えているうちは、まだ消えていない。\n名前を忘れたとき、本当に消える。" });

S.push({ goto: "zone_3" });

// GEN-2: 水底の秋葉原
S.push({ label: "GEN_2" });

S.push({ speaker: "narrator", expression: "", text: "消えた看板を追い始めた。一枚また一枚。\n奥へ。もっと奥へ。古い記憶の地層へ。\n気づいたら、水の中にいた。\n秋葉原ごと、記憶の水底に沈んでいく。" });

S.push({ loadScenario: "2026-03-21_水底の秋葉原" });

// ═══════════════════════════════════════════
// ③ 金子屋の湯気 ── もつ煮込みとウイスキー
// ═══════════════════════════════════════════
S.push({ label: "zone_3" });

S.push({ speaker: "narrator", expression: "", text: "匂いが来た。もつ煮込みの匂い。\n金子屋。UDXの裏。昨日の夜。\nカウンターに座って、最初に頼んだのはビール。\n次にもつ煮込み。最後にイチローズモルト。" });

S.push({ speaker: "waddy", expression: "目を閉じたまま", text: "金子屋の匂いが、夢の中でも再生されている。\nこれが蒸留だ。体験が匂いに変わる。\n匂いは、記憶のいちばん古い層に届く。" });

S.push({ speaker: "narrator", expression: "", text: "カウンターの温度。ビールの泡。もつのやわらかさ。\n隣に座っていた誰かの笑い声。\n自分も笑っていた。何がおかしかったか忘れたけど、\n笑っていたことだけは覚えている。" });

S.push({ speaker: "waddy", expression: "ふと", text: "……笑えた夜だった。\nいつから笑えてなかったんだろう。\nいや──笑えてないわけじゃない。\nでも昨日の笑いは、なんか……本物だった。\n酒の力かもしれないけど。" });

S.push({ ifNot: "took_hinata", goto: "zone_3_choice" });

S.push({ speaker: "hinata", expression: "匂いを嗅いで", text: "うわ、いい匂い……。\nおにいちゃん、これ昨日のご飯の記憶でしょ？\nひなもお腹すいてきちゃった。えへへ。" });

S.push({ label: "zone_3_choice" });

S.push({ choices: [
  { text: "匂いを深呼吸して、先へ", goto: "node_3A", flag: "savored_smell" },
  { text: "カウンターに座りなおす", goto: "node_3B", flag: "sat_down" },
  { text: "もう一杯だけ飲んでいく", goto: "GEN_3" }
]});

// node_3A
S.push({ label: "node_3A" });

S.push({ speaker: "waddy", expression: "深呼吸して", text: "……蜂蜜とピートの48度。鼻の奥に残ってる。\n夢の中で飲み直すのは野暮だ。\nこの匂いだけで十分。持って帰れる記憶。" });

S.push({ goto: "zone_4" });

// node_3B
S.push({ label: "node_3B" });

S.push({ speaker: "narrator", expression: "", text: "夢の中のカウンターに腰を下ろした。\n椅子の高さが、昨日と同じ。\n隣には誰もいない。記憶の中の自分だけ。" });

S.push({ speaker: "waddy", expression: "カウンターに肘をついて", text: "一人で飲む酒と、誰かと飲む酒は違う。\n同じイチローズモルトでも、\nカウンターの隣に声があるかないかで、度数が変わる。\n……昨日は、ちょうどいい度数だった。" });

S.push({ goto: "zone_4" });

// GEN-3: 活字の牢獄
S.push({ label: "GEN_3" });

S.push({ speaker: "narrator", expression: "", text: "もう一杯だけ。もう一杯だけ。\n夢の中の金子屋で、グラスが際限なく注がれる。\n一杯目。二杯目。三杯目。\n昨日の楽しさを再現しようとしている。\nでも、再現された楽しさは──偽物だ。" });

S.push({ loadScenario: "2026-03-21_活字の牢獄" });

// ═══════════════════════════════════════════
// ④ 二日酔いの物理学 ── 体と頭のずれ
// ═══════════════════════════════════════════
S.push({ label: "zone_4" });

S.push({ speaker: "narrator", expression: "", text: "記憶が揺れた。画面がスクロールする。\n夢の中で、自分の体の状態を自覚する。\n頭痛。軽い吐き気。喉の渇き。\n──夢の中でも二日酔いは存在するのか。" });

S.push({ speaker: "waddy", expression: "苦笑して", text: "代償だ。楽しかった分だけ、体が請求書を出してくる。\n等価交換。質量保存の法則。\n飲んだ分のアルコールは、体のどこかで変換される。\n楽しさに変換された分と、頭痛に変換された分。\n……配分は、たぶん半々だ。" });

S.push({ speaker: "narrator", expression: "", text: "ことみの声が反響した。\n昨日、金子屋で彼女が言ったこと。\n──いや、彼女が言ったのではない。\nワディーが彼女の声で覚えている言葉。" });

S.push({ speaker: "kotomi_echo", expression: "記憶の声", text: "アルコールの分子量は46.07なの。\n水よりも軽いの。だから揮発するの。\n……楽しい記憶も、揮発しやすいの。\n重い記憶──後悔の方が、体に残りやすいの。" });

S.push({ speaker: "waddy", expression: "考え込んで", text: "楽しい記憶は揮発する。後悔は沈殿する。\n……だから二日酔いの朝は後悔ばかりが残るのか。\nでも──だからこそ、楽しかったことを書き留めるんだ。\n日記に。揮発する前に。" });

S.push({ ifNot: "took_hinata", goto: "zone_4_choice" });

S.push({ speaker: "hinata", expression: "心配そうに", text: "おにいちゃん、頭痛い？\n……えっと、お水持ってこようか？\nあ、夢の中だから水ないかー。えへへ。" });

S.push({ label: "zone_4_choice" });

S.push({ choices: [
  { text: "日記に書くことを頭の中で整理する", goto: "node_4A", flag: "organized_diary" },
  { text: "頭痛に身を任せる", goto: "node_4B", flag: "accepted_pain" },
  { text: "後悔だけが残った記憶に沈む", goto: "GEN_4" }
]});

// node_4A
S.push({ label: "node_4A" });

S.push({ speaker: "waddy", expression: "指を折って", text: "書くべきことを整理しよう。\nミルクスタンド。二百円。立ち飲み。\n金子屋。もつ煮込み。イチローズモルト。\n大阪王将。餃子。テキーラ。\n……全部書けば、揮発しない。永久に残る。" });

S.push({ speaker: "narrator", expression: "", text: "日記は蒸留の記録だ。\n原酒──体験。蒸留──睡眠と二日酔い。\n記録──日記。\n蒸留されたものだけが、瓶に残る。" });

S.push({ goto: "zone_5" });

// node_4B
S.push({ label: "node_4B" });

S.push({ speaker: "narrator", expression: "", text: "頭痛に抗わない。これも体験の一部だ。\n痛みは、昨日が本当にあった証拠。\n享楽の代償。等価交換の残滓。\n──受け入れる。" });

S.push({ speaker: "waddy", expression: "目を閉じたまま", text: "痛い。でも、嫌じゃない。\nこの痛みが消えたら、昨日の証拠もなくなる。\n……もう少しだけ痛んでいてくれ。" });

S.push({ goto: "zone_5" });

// GEN-4: 鏡像の奴隷
S.push({ label: "GEN_4" });

S.push({ speaker: "narrator", expression: "", text: "後悔が膨らんでいく。\n飲みすぎた。言いすぎた。笑いすぎた。\n全部が裏返しになって、昨日の自分と今の自分が\n鏡の中で睨み合っている。\nどちらが本当の自分か、わからなくなる。" });

S.push({ loadScenario: "2026-03-21_鏡像の奴隷" });

// ═══════════════════════════════════════════
// ⑤ 友人の輪郭 ── 一緒に飲んだ人たち
// ═══════════════════════════════════════════
S.push({ label: "zone_5" });

S.push({ speaker: "narrator", expression: "", text: "記憶の中に、声が残っている。\n昨日一緒にいた人たちの声。\n名前がうまく思い出せないのに、\n声のトーンと、笑い方だけは鮮明に再生される。" });

S.push({ speaker: "waddy", expression: "思い出しながら", text: "不思議だな。\n顔より先に声を覚えている。\n何を話したかより、どう笑ったかを覚えている。\n……酒の席の記憶って、そういうものなのか。" });

S.push({ speaker: "narrator", expression: "", text: "でじこの声が聞こえた。\n「にょ」という語尾。\n……いや、それは昨日の友人の声ではなく、\nワディーの無意識が再構成した声だ。\n記憶は正確ではない。でも、温度だけは正確だ。" });

S.push({ speaker: "waddy", expression: "静かに", text: "一人で飲んでも酔える。一人で飲んでも楽しい。\nでも昨日の酒は、一人じゃ絶対にあの味にならなかった。\n……人と飲む酒は、共同蒸留だ。\n自分の原酒と、相手の原酒が混ざって、\n一人じゃ作れない味になる。" });

S.push({ ifNot: "took_hinata", goto: "zone_5_choice" });

S.push({ speaker: "hinata", expression: "嬉しそうに", text: "おにいちゃん、それ、いいこと言ってるよ！\nひなね、おにいちゃんが誰かと笑ってるの見ると、\nなんか安心するの。えへへ。" });

S.push({ label: "zone_5_choice" });

S.push({ choices: [
  { text: "声の記憶を大事にしまう", goto: "node_5A", flag: "kept_voices" },
  { text: "名前を思い出そうとする", goto: "node_5B", flag: "recalled_names" },
  { text: "声に引きずられていく", goto: "GEN_5" }
]});

// node_5A
S.push({ label: "node_5A" });

S.push({ speaker: "waddy", expression: "少し笑って", text: "名前は忘れてもいい。声は忘れない。\n次に会ったとき、「ああ、この声だ」って思えれば、\nそれで十分だ。" });

S.push({ goto: "zone_6" });

// node_5B
S.push({ label: "node_5B" });

S.push({ speaker: "narrator", expression: "", text: "名前を思い出そうとする。出てこない。\n顔の輪郭は──ぼやけている。\nでも、乾杯のときにぶつけたグラスの感触は覚えている。\nカチン、という音。" });

S.push({ speaker: "waddy", expression: "", text: "……グラスの音の方が、名前より確かだ。\nおかしな話だけど。" });

S.push({ goto: "zone_6" });

// GEN-5: 看板の墓場
S.push({ label: "GEN_5" });

S.push({ speaker: "narrator", expression: "", text: "声を追い始める。\nあの笑い声。あの乾杯の音。あの「にょ」。\n追えば追うほど遠ざかる。\n声が看板になった。名前だけの看板。\n呼ぶ声がないから、看板は看板でしかない。" });

S.push({ loadScenario: "2026-03-21_看板の墓場" });

// ═══════════════════════════════════════════
// ⑥ 酔いの哲学 ── なぜ飲むのか
// ═══════════════════════════════════════════
S.push({ label: "zone_6" });

S.push({ speaker: "narrator", expression: "", text: "記憶の蒸留が進む。\n雑味が抜けていく。頭痛は残っているが、\n記憶の方は少しずつ透き通ってきた。" });

S.push({ speaker: "waddy", expression: "反芻するように", text: "なぜ飲むのか。\n楽しいから飲む。楽しくなくても飲む。\n一人で飲む。誰かと飲む。\n……全部理由が違う。でも共通しているのは、\n「飲んだ翌朝に、何か残る」ということだ。" });

S.push({ speaker: "narrator", expression: "", text: "残るのは頭痛だけじゃない。\n昨日の会話の断片。料理の味。街の匂い。\n友人の声。自分の笑い声。\n全部、酒が蒸留した結晶だ。" });

S.push({ speaker: "waddy", expression: "確信を持って", text: "酒は夢と現実をつなぐものだ。\n飲んでいるときは夢に近づいていく。\n現実の輪郭が溶ける。時間の境界が曖昧になる。\n翌朝、夢から覚めると──昨日が記憶になっている。\n体験が、記憶に蒸留されている。" });

S.push({ ifNot: "took_hinata", goto: "zone_6_choice" });

S.push({ speaker: "hinata", expression: "うなずいて", text: "おにいちゃん、なんか詩人みたいだよー。\nでもね、ひな思うの。\n蒸留するだけじゃもったいないよ。\n蒸留したら、ちゃんと瓶に詰めなきゃ。\n……日記って、瓶詰めのことでしょ？" });

S.push({ label: "zone_6_choice" });

S.push({ choices: [
  { text: "瓶詰めの約束をする", goto: "node_6A", flag: "promised_diary" },
  { text: "蒸留のプロセスをもう少し味わう", goto: "node_6B", flag: "tasted_process" },
  { text: "蒸留をやめない──永遠に飲み続ける", goto: "GEN_6" }
]});

// node_6A
S.push({ label: "node_6A" });

S.push({ speaker: "waddy", expression: "頷いて", text: "……そうだな。蒸留しただけじゃ、揮発する。\n書かないと。瓶に詰めないと。\n起きたら、まず水を飲んで、それから書こう。\n昨日の全部を。頭痛込みで。" });

S.push({ goto: "zone_7" });

// node_6B
S.push({ label: "node_6B" });

S.push({ speaker: "narrator", expression: "", text: "蒸留のプロセスそのものが、心地よい。\n記憶が透き通っていく感覚。\n雑味が抜けて、芯だけが残る。\n……でも、いつまでも蒸留しているわけにはいかない。" });

S.push({ goto: "zone_7" });

// GEN-6: 琥珀色の溺死
S.push({ label: "GEN_6" });

S.push({ speaker: "narrator", expression: "", text: "蒸留をやめない。注ぎ続ける。\nグラスが溢れる。カウンターが濡れる。\n琥珀色の液体が、膝まで。腰まで。胸まで。\n楽しさを再現し続けようとして──溺れる。" });

S.push({ loadScenario: "2026-03-21_琥珀色の溺死" });

// ═══════════════════════════════════════════
// ⑦ 各駅停車の残響 ── 昨日の移動
// ═══════════════════════════════════════════
S.push({ label: "zone_7" });

S.push({ speaker: "narrator", expression: "", text: "電車の揺れが伝わってきた。\n昨日の各駅停車。秋葉原までの道のり。\n急行に乗らなかった。各駅停車を選んだ。\n理由は──「停まるから」。" });

S.push({ speaker: "waddy", expression: "揺れを感じながら", text: "各駅停車は全部の駅に停まる。\n急行は飛ばす。特急はもっと飛ばす。\nでも飛ばした駅には何があったのか、永遠にわからない。\n俺はわかりたい。全部の駅で何があるか。" });

S.push({ speaker: "narrator", expression: "", text: "これが各駅停車の形而上学。\n昨日のシナリオのタイトルであり、\nワディーの人生哲学そのもの。\n──停まることで、初めて見える景色がある。" });

S.push({ speaker: "waddy", expression: "窓の外を見て", text: "二日酔いもそうだ。\n飲んだ翌朝に停車する。強制的に。\n体が「止まれ」と言っている。\n止まって初めて、昨日がどんな旅だったか見える。" });

S.push({ ifNot: "took_hinata", goto: "zone_7_choice" });

S.push({ speaker: "hinata", expression: "隣の席に座って", text: "おにいちゃん、電車だねー。\n各停かー。ひな、急行の方が好きなんだけどなー。\n……でもおにいちゃんは各停が好きなんだよね。\nひな、それでもいいよ。一緒に乗ってるから。" });

S.push({ label: "zone_7_choice" });

S.push({ choices: [
  { text: "次の駅で降りる準備をする", goto: "node_7A", flag: "ready_to_stop" },
  { text: "もう少し乗っている", goto: "node_7B" },
  { text: "電車を止めてしまう", goto: "GEN_7" }
]});

// node_7A
S.push({ label: "node_7A" });

S.push({ speaker: "waddy", expression: "立ち上がって", text: "次の駅。終点じゃなくても、降りるべき駅はある。\n各駅停車は降りたいところで降りればいい。\n……起きたいときに起きればいい。" });

S.push({ goto: "zone_8" });

// node_7B
S.push({ label: "node_7B" });

S.push({ speaker: "narrator", expression: "", text: "もう少し乗っている。揺れが心地いい。\n車窓から見える景色は、昨日の記憶のダイジェスト。\n一駅ごとに、一つの場面が流れていく。" });

S.push({ goto: "zone_8" });

// GEN-7: 凍った秒針
S.push({ label: "GEN_7" });

S.push({ speaker: "narrator", expression: "", text: "電車を止めた。時間を止めた。\nこの心地よい揺れが永遠に続けばいい。\n降りなくていい。着かなくていい。\n──でも止まった電車は、各駅停車ではなくなる。" });

S.push({ loadScenario: "2026-03-21_凍った秒針" });

// ═══════════════════════════════════════════
// ⑧ 書くということ ── 日記と記録
// ═══════════════════════════════════════════
S.push({ label: "zone_8" });

S.push({ speaker: "narrator", expression: "", text: "デスクが見えた。自分のデスク。\nキーボードとモニター。\n昨日帰ってきてから、何を書いたか。\n……たぶん、何も書けなかった。酔いすぎて。" });

S.push({ speaker: "waddy", expression: "デスクに向かって", text: "書くのは翌朝だ。いつもそうだ。\n体験したその日には書けない。\n一晩寝かせて、蒸留が終わってから書く。\n……二日酔いの頭痛が、ペンのインクになる。" });

S.push({ speaker: "narrator", expression: "", text: "日記を書くのは、自分のためだけじゃない。\n書くことで、体験が言葉になる。\n言葉になった体験は、他の人にも伝わる。\n「旅情はローレンツ収縮に反比例する」。\n自分で書いた言葉が、誰かの記憶に残ることもある。" });

S.push({ speaker: "waddy", expression: "キーボードに触れて", text: "飲んで、笑って、頭痛くなって、起きて、書く。\nこのサイクルが、俺の蒸留工程だ。\n原酒は体験。蒸留器は睡眠。樽は日記。\n……何年後かに読み返したとき、ちゃんと味がするように。" });

S.push({ ifNot: "took_hinata", goto: "zone_8_choice" });

S.push({ speaker: "hinata", expression: "覗き込んで", text: "おにいちゃん、何書くの？\nひなのことも書いてくれるー？　えへへ。" });

S.push({ label: "zone_8_choice" });

S.push({ choices: [
  { text: "書く覚悟を決める", goto: "node_8A", flag: "decided_to_write" },
  { text: "まだ蒸留が足りないと感じる", goto: "node_8B" },
  { text: "書けない──自分の言葉に押しつぶされる", goto: "GEN_8" }
]});

// node_8A
S.push({ label: "node_8A" });

S.push({ speaker: "waddy", expression: "決意して", text: "起きたら書く。\n二百円のコーヒー牛乳のこと。\n金子屋のもつ煮込みのこと。\n各駅停車の車窓のこと。\n……頭痛のことも、ちゃんと書く。" });

S.push({ goto: "zone_9" });

// node_8B
S.push({ label: "node_8B" });

S.push({ speaker: "narrator", expression: "", text: "まだ書けない。まだ蒸留が終わっていない。\nあと少しだけ、夢の中で処理する時間が必要だ。\n書くのは──起きてから。" });

S.push({ goto: "zone_9" });

// GEN-8: 自由落下の定義
S.push({ label: "GEN_8" });

S.push({ speaker: "narrator", expression: "", text: "書こうとした。でも書けない。\n言葉が足りない。言葉が多すぎる。\n書いた文字が自分を見つめ返している。\n自分の書いた言葉の重さに、押しつぶされていく。\n落ちる。自分の文章の底に向かって。" });

S.push({ loadScenario: "2026-03-21_自由落下の定義" });

// ═══════════════════════════════════════════
// ⑨ 帰り道 ── 約束と代償
// ═══════════════════════════════════════════
S.push({ label: "zone_9" });

S.push({ speaker: "narrator", expression: "", text: "記憶が最後の場面に近づいている。\n昨日の帰り道。タクシーか電車か。\nたぶん電車だった。各駅停車で。\n……切符はあったか。ICカードだったか。覚えていない。" });

S.push({ speaker: "waddy", expression: "帰り道を思い出して", text: "帰り道のことは、いつもぼんやりしている。\n行きは鮮明なのに、帰りはいつもぼやける。\n酔いが深くなるからだけじゃない。\n……帰りたくなかったからだ。\nもう少しだけ、あの場所にいたかった。" });

S.push({ speaker: "narrator", expression: "", text: "「また飲もう」と誰かが言った。\nそれは約束か。社交辞令か。\nどちらでもいい。その言葉が、帰り道を歩ける理由になった。\n「また」がある。だから今日は帰れる。" });

S.push({ speaker: "waddy", expression: "静かに", text: "「また」があるから帰れる。\n「また」がなかったら、帰りたくなくなる。\n……二日酔いの朝に「また」を思い出せるのは、\nたぶん、昨日がちゃんと楽しかった証拠だ。" });

S.push({ ifNot: "took_hinata", goto: "zone_9_choice" });

S.push({ speaker: "hinata", expression: "笑顔で", text: "「また」って、いい言葉だよね。\nひなも、おにいちゃんに「また」って言いたいな。\n……また明日ね、おにいちゃん。" });

S.push({ label: "zone_9_choice" });

S.push({ choices: [
  { text: "「また」を握りしめて先へ", goto: "node_9A", flag: "held_promise" },
  { text: "帰り道をもう一度歩いてみる", goto: "node_9B" },
  { text: "帰らない──ここに留まる", goto: "GEN_9" }
]});

// node_9A
S.push({ label: "node_9A" });

S.push({ speaker: "waddy", expression: "少し笑って", text: "また飲もう。また行こう。また笑おう。\n「また」は約束じゃない。でも嘘でもない。\n……願いに近い。次も楽しくあってくれ、という。" });

S.push({ goto: "zone_10" });

// node_9B
S.push({ label: "node_9B" });

S.push({ speaker: "narrator", expression: "", text: "帰り道をもう一度歩く。夢の中だから、\n同じ道を何度でも歩ける。\n……でも二度目は風景が薄くなっている。\n記憶は再生のたびに劣化する。\n一度で十分だ。帰ろう。" });

S.push({ goto: "zone_10" });

// GEN-9: 乗車拒否
S.push({ label: "GEN_9" });

S.push({ speaker: "narrator", expression: "", text: "帰りたくない。ここにいたい。\n昨日のあの瞬間に留まりたい。\n帰りの切符を──破った。\n電車は来ない。もう帰れない。" });

S.push({ loadScenario: "2026-03-21_乗車拒否" });

// ═══════════════════════════════════════════
// ⑩ 覚醒の淵 ── 起きるか、眠るか
// ═══════════════════════════════════════════
S.push({ label: "zone_10" });

S.push({ speaker: "narrator", expression: "", text: "蒸留が終わりに近づいている。\n記憶は透き通った。頭痛はまだある。\nスマートウォッチが振動している。\n血中酸素飽和度98%。体は正常。朝が来ている。" });

S.push({ speaker: "narrator", expression: "", text: "目の奥に、光が差している。\nカーテンの隙間からの朝日。\n夢と現実の境界線。その境界線の上に、今いる。" });

// ひなたの台詞（フラグ依存）
S.push({ if: "took_hinata", goto: "zone_10_hinata" });
S.push({ goto: "zone_10_final_choice" });

S.push({ label: "zone_10_hinata" });
S.push({ speaker: "hinata", expression: "手を差し伸べて", text: "おにいちゃん、もう朝だよ。\n昨日のこと、全部ちゃんと覚えてるでしょ？\n頭痛いのは知ってるけど──起きよ？\nご飯食べて、水飲んで、それから日記書こ？" });

// 最終選択
S.push({ label: "zone_10_final_choice" });

S.push({ choices: [
  { text: "目を開ける", goto: "ending_router" },
  { text: "もう少しだけ……", goto: "GEN_10" }
]});

// ═══════════════════════════════════════════
// エンディングルーター（フラグ判定）
// ═══════════════════════════════════════════
S.push({ label: "ending_router" });

// KEN-A: took_hinata + savored_smell + promised_diary → 正常覚醒
S.push({ if: "took_hinata", goto: "check_KEN_A_2" });
S.push({ goto: "check_KEN_B" });

S.push({ label: "check_KEN_A_2" });
S.push({ if: "promised_diary", goto: "KEN_A" });
S.push({ if: "savored_smell", goto: "KEN_D" });
S.push({ goto: "KEN_C" });

// KEN-B: lingered + organized_diary → 明晰夢
S.push({ label: "check_KEN_B" });
S.push({ if: "organized_diary", goto: "check_KEN_B_2" });
S.push({ if: "decided_to_write", goto: "KEN_E" });
S.push({ goto: "KEN_C" });

S.push({ label: "check_KEN_B_2" });
S.push({ if: "held_promise", goto: "KEN_B" });
S.push({ goto: "KEN_C" });

// ═══════════════════════════════════════════
// 顕界エンディング
// ═══════════════════════════════════════════

// KEN-A: 正常覚醒（ひなたの声と日記の約束）
S.push({ label: "KEN_A" });

S.push({ speaker: "narrator", expression: "", text: "目を開けた。\n天井が見える。見慣れた天井。\n頭が痛い。でも──昨日の記憶は透き通っている。" });

S.push({ speaker: "hinata", expression: "笑顔で", text: "おはよう、おにいちゃん！\n昨日、楽しかったんでしょ？　えへへ。\n頭痛くても、ちゃんと起きれたね。\nさ、お水持ってくるからね！" });

S.push({ speaker: "waddy", expression: "布団の中で笑って", text: "……ああ。起きた。\n頭は痛い。胃もまだ重い。\nでも──昨日は悪くなかった。\n書こう。全部書こう。二百円のことから。" });

S.push({ speaker: "narrator", expression: "", text: "スマートウォッチの表示。血中酸素飽和度98%。\n蒸留は完了した。\n原酒は記憶に変わった。あとは瓶に詰めるだけ。\n──日記を開こう。" });

S.push({ end: true, title: "正常覚醒", subtitle: "頭は痛い。でも昨日は悪くなかった。書こう、全部。" });

// KEN-B: 明晰夢（自力で処理を終えた）
S.push({ label: "KEN_B" });

S.push({ speaker: "waddy", expression: "静かに目を開けて", text: "……わかった。これは夢だ。\n蒸留が終わった音がした。\n記憶は整理された。頭痛は代償。\n「また」は約束じゃなくて願い。\n全部わかった。だから起きる。" });

S.push({ speaker: "narrator", expression: "", text: "意識がクリアになる。\n夢の輪郭が鮮明に見え始める。\nそして──解ける。朝日の中に。" });

S.push({ end: true, title: "明晰夢", subtitle: "蒸留完了。記憶は透き通った。起きよう。" });

// KEN-C: 目覚まし時計（フォールバックEND）
S.push({ label: "KEN_C" });

S.push({ speaker: "narrator", expression: "", text: "アラームが鳴った。\n夢を突き破って、現実の音が侵入してきた。\n蒸留は──中途半端なまま。\nでも、起きないといけない。" });

S.push({ speaker: "waddy", expression: "アラームを止めて", text: "……何を見てたんだ。\n昨日のこと……だったような。\n思い出せる分だけ、書こう。" });

S.push({ end: true, title: "目覚まし時計", subtitle: "蒸留は途中で終わった。でも書けるだけ書こう。" });

// KEN-D: 半覚醒（匂いだけが残った）
S.push({ label: "KEN_D" });

S.push({ speaker: "narrator", expression: "", text: "起きたのか、まだ夢の中なのか。\n判然としない。\nでも──もつ煮込みの匂いだけが、はっきりと残っている。\n鼻の奥に。昨日の金子屋の匂い。" });

S.push({ speaker: "waddy", expression: "鼻をくんくんさせて", text: "……匂いだけ持って帰ってきた。\nまあいい。匂いは記憶のいちばん深い層だ。\nここから全部思い出せる。\n……腹が減った。もつ煮込み食いたい。朝から。" });

S.push({ end: true, title: "半覚醒", subtitle: "匂いだけが残った。でも、それで十分。" });

// KEN-E: 各駅停車の残響（書く覚悟だけ持ち帰った）
S.push({ label: "KEN_E" });

S.push({ speaker: "narrator", expression: "", text: "目覚めた瞬間、指がキーボードを探していた。\n枕の横にあるはずのキーボード。\n──まだ布団の中だった。" });

S.push({ speaker: "waddy", expression: "起き上がって", text: "書きたい。今すぐ書きたい。\n昨日の全部が、言葉になりたがっている。\n各駅停車の記憶。二百円の味。金子屋の匂い。\n頭痛は──インクだ。これで書ける。" });

S.push({ speaker: "narrator", expression: "", text: "蒸留は終わった。樽に詰める時間だ。\nパソコンを開いて、最初の一行を打つ。\n「旅情はローレンツ収縮により──」\n……いや、今日はもっとシンプルに始めよう。\n「昨日、秋葉原で飲んだ。」" });

S.push({ end: true, title: "各駅停車の残響", subtitle: "昨日の全部が、言葉になりたがっている。" });

// ═══════════════════════════════════════════
// GEN-10: 永遠の微睡み
// ═══════════════════════════════════════════
S.push({ label: "GEN_10" });

S.push({ speaker: "narrator", expression: "", text: "もう少しだけ。もう少しだけ。\n蒸留が心地いい。夢の中で昨日を反芻するのが心地いい。\n起きたら──この心地よさは消えてしまう。\n頭痛だけが残る。" });

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
