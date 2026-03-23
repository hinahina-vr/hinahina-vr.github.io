const fs = require("fs");
const path = require("path");

const OUT_PATH = path.join(__dirname, "..", "scenarios", "2026-03-22_顕幻の交差路.json");

const scenario = {
  title: "顕幻の交差路",
  subtitle: "─ 創作者は自分の世界から出られるのか ─",
  genre: "顕幻迷宮ノベル",
  date: "2026-03-22",
  chars: {
    narrator: { name: "", color: "#504060", emoji: "" },
    waddy: { name: "ワディー", color: "#b0a0d0", emoji: "🖥️" },
    hinata: { name: "ひなた", color: "#ffb6c1", emoji: "🌻" },
    oji: { name: "物理おじ", color: "#d2b48c", emoji: "🏋️" },
    dejiko: { name: "でじこ", color: "#32cd32", emoji: "🐱" },
    multi: { name: "マルチ", color: "#00ced1", emoji: "🧹" },
    moegami: { name: "萌神", color: "#ff6347", emoji: "🔥" },
    hinahina: { name: "ひなひな", color: "#ffa0c0", emoji: "🎀" },
  },
  scenario: [],
};

const S = scenario.scenario;

function say(speaker, text, expression = "", extra = {}) {
  S.push({ speaker, expression, text, ...extra });
}

function choose(choices) {
  S.push({ choices });
}

S.push({ bg: "dusk" });
say(
  "narrator",
  "2026年3月22日。日曜日。23時47分。\nゲストハウスのリビング。テレビは点いているが、誰も見ていない。"
);
say(
  "narrator",
  "ワディーはソファに沈んでいた。ノートPCを膝に載せたまま。\nエディタのタブには `dream-select.html` と `scenarios/` が並んでいる。"
);
say(
  "waddy",
  "今日は32人分の日記と、分岐の地図と、十本の幻界を書いた。\nA.D.M.S.の線が、まだ瞼の裏に残ってる。",
  "ノートPCを見つめながら"
);
say(
  "waddy",
  "存在しない世界を存在させたいという病。\n30年前にPC-98の画面で感染して、まだ治っていない。\n……治す気もない。",
  "独白"
);
say(
  "narrator",
  "時計が0時を回った。\nノートPCがスリープに入り、テレビの砂嵐だけが部屋を照らす。\nそこから——夢が始まった。"
);

S.push({ label: "living_start" });
S.push({ bg: "dusk" });
say(
  "narrator",
  "目を開ける。\n同じリビングだった。同じソファ。同じテーブル。\nただし、時計の数字だけが全部「0」になっている。"
);
say(
  "narrator",
  "テレビには文字が出ていた。\n`A.D.M.S. ver 0.0.1`\n`分岐点 001/100`\n`現在地: 顕界 ─ リビング`"
);
say("waddy", "……俺が作った地図を、夢の中に持ち込んだのか。", "テレビを見ながら");
choose([
  { text: "テレビの電源を切る", goto: "living_explore" },
  { text: "ソファで目を閉じる", goto: "living_foreshadow" },
]);

S.push({ label: "living_foreshadow" });
say(
  "narrator",
  "夢の中で目を閉じると、どこへ落ちるのか。\nリビングの輪郭が一段ぶん薄くなる。\nソファの沈み込みだけが現実に似ていた。"
);
choose([
  { text: "やっぱり立ち上がる", goto: "living_explore" },
  { text: "このまま眠る", goto: "KENKAI_END_1" },
]);

S.push({ label: "living_explore" });
say(
  "narrator",
  "テレビの電源を切った。\n砂嵐が消え、部屋の静けさが一段深くなる。\nテーブルのコーヒーカップだけが、まだ温かい。"
);
say("waddy", "……淹れた記憶がない。夢が先に痕跡を置いている。", "カップを持ち上げて");
say(
  "narrator",
  "台所の方から食器の音がする。\n第一層は、まだ日常の顔をしていた。"
);

S.push({ label: "kitchen" });
S.push({ bg: "kitchen" });
say(
  "narrator",
  "台所に入る。\n物理おじがカップ麺を作っていた。深夜0時を回っているのに、いつもの顔だ。"
);
say("oji", "……来たか。夢のくせに腹は減る。", "湯気の向こうで");
say("waddy", "夢のくせに、って前提をお前が受け入れるんだな。", "苦笑して");
say("oji", "お前が作った夢なら、仕様はお前より先に俺が把握する。", "カップ麺を押さえながら");
choose([
  { text: "コーヒーを淹れる", goto: "kitchen_oji" },
  { text: "冷蔵庫を開ける", goto: "kitchen_fridge" },
]);

S.push({ label: "kitchen_fridge" });
say(
  "narrator",
  "冷蔵庫の中に、缶ビールが一本だけあった。\n銀色の缶に水滴がついている。\n今夜の夢が、どちらへ傾きたいのかを示しているようだった。"
);
choose([
  { text: "やっぱりコーヒーにする", goto: "kitchen_oji" },
  {
    text: "ビールを取る",
    goto: "kitchen_beer_commit",
  },
]);

S.push({ label: "kitchen_beer_commit" });
say(
  "waddy",
  "冷たい方が、現実に近い気がした。\nでもその発想自体が、たぶん罠なんだろうな。",
  "缶を持ち上げて"
);
S.push({
  loadScenario: { scenario: "2026-03-22_02：00の台所", entry: "entry_from_main" },
});

S.push({ label: "kitchen_oji" });
say(
  "narrator",
  "コーヒーメーカーに触れた途端、湯の音が少しだけ現実に戻った。\n香りが立ちのぼる。第一層の出口は、たいてい匂いの形をしている。"
);
say(
  "oji",
  "コードも日記も、深夜に一人で書くと孤独味がする。\nだが読まれた瞬間に味が変わる。\nカップ麺と同じだ。",
  "カウンターに肘をついて"
);
say(
  "waddy",
  "じゃあ俺は、孤独味のまま配膳していたのか。",
  "コーヒーを注ぎながら"
);
say(
  "oji",
  "いや。\nお前は味が変わる前提で置いてる。\nだからまだ戻れる。",
  "真顔で"
);
say(
  "narrator",
  "カップを持って廊下に出る。\n第一層はここで終わり、第二層の気配が壁の裏から滲み始める。"
);

S.push({ label: "hall" });
S.push({ bg: "corridor" });
say(
  "narrator",
  "廊下はいつもより長かった。\n左に自室。右に屋上への扉。\nまっすぐ進めば、まだ書かれていない場所へ出る。"
);
choose([
  { text: "自室に戻る", goto: "room_pc" },
  { text: "屋上に出る", goto: "roof_dejiko" },
]);

S.push({ label: "roof_dejiko" });
S.push({ bg: "rooftop" });
say(
  "narrator",
  "屋上には風があった。\n夢なのに風圧だけが妙に正確だ。\nフェンスにもたれて、でじこが街の光を見下ろしている。"
);
say("dejiko", "にょ。屋上ってのは名前のない景色を見る場所にょ。", "フェンスにもたれて");
say("waddy", "名前のない景色を見て、お前は落ち着くのか。", "隣に立って");
say(
  "dejiko",
  "落ち着かないにょ。\nだから逆にいいにょ。\n名前を付けすぎると街は檻になるにょ。",
  "夜景を見たまま"
);
say(
  "narrator",
  "でじこの言葉は、第三層の入口だけを残して消えた。\nワディーは再び廊下へ戻る。"
);

S.push({ label: "room_pc" });
S.push({ bg: "home_office" });
say(
  "narrator",
  "自室のPCはスリープに入っていなかった。\n画面には二つの窓が開いている。\n一つはエディタ。もう一つは日記ページ。"
);
say("waddy", "第二層。コードと言葉の境界。", "椅子に座って");
choose([
  { text: "エディタを開く", goto: "html_world" },
  { text: "日記ページを開く", goto: "diary_world" },
]);

S.push({ label: "html_world" });
S.push({ bg: "server_room" });
say(
  "narrator",
  "エディタの中に入る。\n行番号が床になり、タグが梁になる。\n`dream-select.html` が建築物として立ち上がっていた。"
);
say(
  "waddy",
  "設計図だと思って開いたのに、もう建ってるじゃないか。",
  "ソースを見上げて"
);
say(
  "hinahina",
  "えへへ。\n設計図より先に建物が建つの、ワディーくんらしいよねえ。",
  "行間のどこかから"
);
choose([
  { text: "ソースを読む", goto: "resident_hub" },
  { text: "画面を閉じる", goto: "KENKAI_END_2" },
]);

S.push({ label: "diary_world" });
S.push({ bg: "library" });
say(
  "narrator",
  "ブラウザを開いた瞬間、画面が書架になった。\n今日の日記、昨日の日記、まだ公開していない下書き。\n全部が頁の温度を持って並んでいる。"
);
say(
  "waddy",
  "文章はログじゃない。\n通った世界線の圧力が残る。",
  "背表紙をなぞりながら"
);
choose([
  { text: "昨日の日記を開く", goto: "resident_hub" },
  { text: "下書きフォルダを開く", goto: "resident_hub" },
]);

S.push({ label: "resident_hub" });
S.push({ bg: "hall_of_rooms" });
say(
  "narrator",
  "第三層。住人たちの私室が並ぶ廊下。\n扉には名前が書いてある。\n書いた覚えのない部屋まである。"
);
say(
  "waddy",
  "俺が作ったのか。\nそれとも、彼女たちが俺の手を使ったのか。",
  "扉を見回して"
);
choose([
  { text: "マルチの部屋に入る", goto: "multi_commit" },
  { text: "ひなたの部屋に入る", goto: "hinata_commit" },
  { text: "瑠璃子の部屋に入る", goto: "ruriko_commit" },
  { text: "くくりの書庫に入る", goto: "kukuri_commit" },
  { text: "でじこの部屋に入る", goto: "dejiko_commit" },
  { text: "萌神のバーに入る", goto: "moegami_commit" },
  { text: "廊下の奥へ進む", goto: "mailbox_crossroads" },
]);

S.push({ label: "multi_commit" });
say("narrator", "マルチの部屋の扉は、内側から朝焼けの光を漏らしていた。");
S.push({ loadScenario: { scenario: "2026-03-22_沈まない太陽", entry: "entry_from_main" } });

S.push({ label: "hinata_commit" });
say("narrator", "ひなたの部屋の向こうから、放課後のチャイムが一度だけ鳴った。");
S.push({ loadScenario: { scenario: "2026-03-22_放課後の永遠", entry: "entry_from_main" } });

S.push({ label: "ruriko_commit" });
say("narrator", "瑠璃子の扉には鏡が嵌め込まれていた。こちらを見ているのは自分ではなかった。");
S.push({ loadScenario: { scenario: "2026-03-22_逆転する鏡", entry: "entry_from_main" } });

S.push({ label: "kukuri_commit" });
say("narrator", "書庫の扉を押すと、紙と埃と魔法陣の匂いがした。");
S.push({ loadScenario: { scenario: "2026-03-22_書架の奥の墓", entry: "entry_from_main" } });

S.push({ label: "dejiko_commit" });
say("narrator", "でじこの部屋のノブは、秋葉原の看板みたいに熱を持っていた。");
S.push({ loadScenario: { scenario: "2026-03-22_錆びた看板", entry: "entry_from_main" } });

S.push({ label: "moegami_commit" });
say("narrator", "萌神のバーからは、空瓶が触れ合う乾いた音が聞こえる。");
S.push({ loadScenario: { scenario: "2026-03-22_空の酒瓶", entry: "entry_from_main" } });

S.push({ label: "mailbox_crossroads" });
S.push({ bg: "mail_room" });
say(
  "narrator",
  "第四層の手前に、古い郵便受けがあった。\n横にはコードの井戸へ降りる階段。\nさらに先には、透明な扉が立っている。"
);
choose([
  { text: "郵便受けを開ける", goto: "ayu_commit" },
  { text: "コードの深層へ降りる", goto: "hinahina_commit" },
  { text: "扉の前へ進む", goto: "world_edge" },
]);

S.push({ label: "ayu_commit" });
say("narrator", "郵便受けの中から、未送信の封筒が一通だけ滑り落ちた。");
S.push({ loadScenario: { scenario: "2026-03-22_未送信の手紙", entry: "entry_from_main" } });

S.push({ label: "hinahina_commit" });
say("narrator", "階段の下ではカーソルが点滅していた。まだ打たれていないセミコロンの位置で。");
S.push({ loadScenario: { scenario: "2026-03-22_最終行のセミコロン", entry: "entry_from_main" } });

S.push({ label: "world_edge" });
S.push({ bg: "threshold" });
say(
  "narrator",
  "世界の果てだった。\n透明な床の下に、今まで書いた日記が層になって沈んでいる。\n扉の向こうは白く、こちら側には住人たちの声が残響している。"
);
say("waddy", "ここで戻れば顕界。\n座り込めば幻界。\nわかりやすすぎて、かえって信用できない。", "扉の前で");
choose([
  { text: "扉を開ける", goto: "threshold_opened" },
  { text: "扉の前に座る", goto: "silent_commit" },
]);

S.push({ label: "silent_commit" });
say("narrator", "扉の前に座った瞬間、配信待機画面みたいな沈黙が降りてきた。");
S.push({ loadScenario: { scenario: "2026-03-22_無音の配信", entry: "entry_from_main" } });

S.push({ label: "threshold_opened" });
say(
  "narrator",
  "扉を開ける。\n風ではなく、声が吹き込んできた。\n名前を呼ぶ声。書けと言う声。帰れと言う声。全部同時だ。"
);
say(
  "hinata",
  "おにいちゃん、朝だよー！\nでもね、全部捨てなくてもいいと思う。",
  "遠くから"
);
say(
  "waddy",
  "正史はない。\nなら持ち帰る量も、自分で決めていい。",
  "目を細めて"
);
choose([
  { text: "声だけを目覚ましにする", goto: "KENKAI_END_3" },
  { text: "全部持って帰る", goto: "KENKAI_END_4" },
  { text: "各駅停車みたいに少しずつ帰る", goto: "KENKAI_END_5" },
]);

S.push({ label: "KENKAI_END_1" });
S.push({ bg: "morning_room" });
say(
  "narrator",
  "月曜日の朝。7時12分。\nソファの上で首が痛い。\nノートPCは床に落ちていて、何を見ていたのかも思い出せない。"
);
say("waddy", "……夢を見てた気がするけど、何だったかな。", "寝ぼけながら");
S.push({ ending: { title: "月曜の朝", subtitle: "最も浅い目覚め。夢は何も残さなかった。" } });

S.push({ label: "KENKAI_END_2" });
S.push({ bg: "home_office" });
say(
  "narrator",
  "画面を閉じると、エディタの残光だけが指先に残った。\n起きたあとも Enter キーの感触だけがやけに鮮明だった。"
);
say("waddy", "ターミナルは閉じたのに、カーソルだけがまだ頭の中で点滅してる。", "手を見ながら");
S.push({ ending: { title: "ターミナルの残像", subtitle: "コードを書いた手の感触だけが現実に持ち帰られた。" } });

S.push({ label: "KENKAI_END_3" });
S.push({ bg: "morning_hall" });
say(
  "narrator",
  "目覚ましになったのはアラームではなかった。\n住人たちの名前を呼ぶ声が、夢の中から現実の側へ一本の橋をかけた。"
);
say("waddy", "名前を呼ばれるうちは、まだ戻れる。", "布団の縁に座って");
S.push({ ending: { title: "名前を呼ぶ声", subtitle: "住人たちの声が、そのまま目覚ましになった。" } });

S.push({ label: "KENKAI_END_4" });
S.push({ bg: "morning_room" });
say(
  "narrator",
  "朝。全部覚えていた。\nリビング、台所、廊下、書架、扉の前。\n分岐も再合流も、捨てずに持ち帰っていた。"
);
say(
  "waddy",
  "正史はない。\nでも記録は作れる。\nだったら朝から書くしかないだろう。",
  "キーボードに手を置いて"
);
S.push({ ending: { title: "正史のない朝", subtitle: "分岐した地図を、そのまま持ち帰って目覚めた。" } });

S.push({ label: "KENKAI_END_5" });
S.push({ bg: "station_morning" });
say(
  "narrator",
  "全部を一度に持ち帰らなかった。\n駅ごとに、一つずつ。\n各駅停車みたいにゆっくり現実へ戻る。"
);
say(
  "waddy",
  "急いで帰ると旅情が縮む。\n朝だって同じだ。\n全部の駅に停まってから、月曜に着けばいい。",
  "ホームを歩きながら"
);
S.push({ ending: { title: "各駅停車の帰路", subtitle: "ゆっくり、全部の駅に停まりながら帰っていく。" } });

fs.writeFileSync(OUT_PATH, JSON.stringify(scenario, null, 2), "utf-8");
console.log(`✓ wrote ${OUT_PATH}`);
