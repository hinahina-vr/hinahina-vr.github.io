const fs = require('fs');

const NUM_NODES = 100;
const NUM_ENDINGS = 10;

const endings = [
    { id: 'END_1', title: '目覚めぬ朝', desc: '時計の針が止まったまま、あなたは微睡み続ける。' },
    { id: 'END_2', title: 'ひなたの教室', desc: '誰もいない教室で、ひなたと一緒に絵本を読む。' },
    { id: 'END_3', title: 'みとらの神託', desc: '全ての境界線が消え、あなたは一つの概念になった。' },
    { id: 'END_4', title: '無限回廊', desc: '開けても開けても同じ扉。夢のバグに囚われた。' },
    { id: 'END_5', title: '電子の海', desc: 'ワディー自身がスクリプトの一部となって消滅した。' },
    { id: 'END_6', title: '秋葉原の幻影', desc: 'あり得ない店舗が並ぶ電気街で、永遠に宝探しをする。' },
    { id: 'END_7', title: '空っぽのゲストハウス', desc: '誰もいないリビングで、コーヒーだけが冷めていく。' },
    { id: 'END_8', title: 'ウイスキーの底', desc: 'グラスの底から見上げた世界。琥珀色に溺れる。' },
    { id: 'END_9', title: '特異点', desc: 'すべての夢が収束する中心。世界線の記録者となる。' },
    { id: 'END_10', title: '夢の終わり', desc: '唐突に意識が浮上し、見慣れた天井が目に入る。' }
];

const rooms = [];
// Generate a binary tree-like structure, but slightly randomized
// children of i are 2*i and 2*i + 1 approx.
for (let i = 1; i <= NUM_NODES; i++) {
    let targetA = i * 2;
    let targetB = i * 2 + 1;
    
    let choiceA, choiceB;

    if (targetA > NUM_NODES) {
        choiceA = { type: 'END', target: endings[Math.floor(Math.random() * NUM_ENDINGS)].id };
    } else {
        choiceA = { type: 'NODE', target: targetA };
    }

    if (targetB > NUM_NODES) {
        choiceB = { type: 'END', target: endings[Math.floor(Math.random() * NUM_ENDINGS)].id };
    } else {
        choiceB = { type: 'NODE', target: targetB };
    }
    
    // Add some random cross-links to make it a complex graph instead of just a pure tree
    if (Math.random() < 0.1 && i > 10) {
        const randomTarget = Math.floor(Math.random() * 50) + 1;
        choiceB = { type: 'NODE', target: randomTarget };
    }

    rooms.push({ id: i, choiceA, choiceB });
}

// Ensure specific endings are reachable early on some paths
rooms[5].choiceA = { type: 'END', target: 'END_2' };
rooms[10].choiceB = { type: 'END', target: 'END_8' };
rooms[15].choiceA = { type: 'END', target: 'END_6' };

const scenarioJson = {
    title: "✦ 夢を見る",
    subtitle: "─ 百の扉、千の幻影 ─",
    genre: "幻界迷宮ノベル",
    date: "2026-03-21",
    chars: {
        narrator: { name: "", color: "#504060", emoji: "" },
        mitra: { name: "みとら", color: "#9080a0", emoji: "🌘" },
        hinata: { name: "ひなた", color: "#ffb6c1", emoji: "🌻" },
        waddy: { name: "ワディー", color: "#606060", emoji: "🖥️" }
    },
    scenario: []
};

scenarioJson.scenario.push({ bg: "abyss" });
scenarioJson.scenario.push({ speaker: "narrator", expression: "", text: "ここは夢と現実の狭間。\n幾重にも分岐する、意識の樹海。" });
scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: "よく来たわね、観測者。\nあなたの選択一つで、世界は完全に枝分かれするわ。\n二度と同じ場所には戻れないかもしれない。" });
scenarioJson.scenario.push({ speaker: "hinata", expression: "笑顔で", text: "おーっ、いらっしゃいませー、おにいちゃん！\nひなね、今日はここで道案内をする係なの！" });
scenarioJson.scenario.push({ speaker: "waddy", expression: "困惑して", text: "道案内？　ここはどこだ？" });
scenarioJson.scenario.push({ speaker: "hinata", expression: "元気よく", text: "ここはね、おにいちゃんの無意識が作った迷路。\n今度こそ、選んだ道によって全く違う場所に繋がってるから！\nえへへ、一緒に迷子になろっか？" });
scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: "さあ、最初の選択を。\n右か、左か。" });
scenarioJson.scenario.push({ choices: [
    { text: "光の射す左の扉へ", goto: "route_room_2" },
    { text: "漆黒の右の扉へ", goto: "route_room_3" }
] });

const actionTextsA = ["ひなたを信じて進む", "みとらの声の方向へ", "本能の赴くままに左へ", "明るい方へ", "水の音がする方へ", "慎重に扉を開ける"];
const actionTextsB = ["一人で暗い道を進む", "振り返らずに右へ", "不気味な気配がする方へ", "かすかな光を追う", "目を閉じて飛び込む", "強行突破する"];
const roomDesc = [
  "冷たいコンクリートの壁が続く。どこまでも無機質な廊下。",
  "足元に水が張っている。ピチャ、ピチャという音が響く。",
  "壁いっぱいに無数の時計が並び、それぞれ違う時間を刻んでいる。",
  "どこからか、微かにバイオリンの音が聞こえる気がする。",
  "天井がなく、星のない夜空が広がっている。",
  "古い本が山積みになった空間。インクと埃の匂いがする。",
  "鏡の部屋。無数のワディーがこちらを見つめ、違う表情をしている。",
  "緑色のネオンサインだけが点滅している。バグったコンピュータの内部のようだ。",
  "秋葉原の路地裏に似ているが、看板の文字がすべて逆さまになっている。",
  "甘い香りがする。コーヒー牛乳の匂いに似ている。",
  "砂漠のような空間。砂の足音が重く、風が吹き荒れている。",
  "螺旋階段が上にも下にも続いている。永遠に登り続けるしかないのか。"
];
const hinataDialogues = [
  "んー、ここはなんだか不思議な感じがするね。おにいちゃん、気をつけて！",
  "あっ、見て見て！　あそこになにかあるよ！……気のせいだったかも。",
  "えへへ、ひなとおにいちゃん、二人きりの探検だねー。",
  "むむっ、右の道、ちょっと怖い匂いがするかも……。",
  "おー！　ここは広いねー。走ってみよっか！"
];
const mitraDialogues = [
  "分岐点よ。あなたの意志が試されているわ。",
  "その選択が、別の可能性を消去する。それが並行世界のルールよ。",
  "幻界の奥深くへ進んでいるわね。気をつけて。",
  "振り返っても無駄よ。道はすでに閉ざされているから。",
  "観測者の目で、真実を見極めなさい。"
];

rooms.forEach((room) => {
    scenarioJson.scenario.push({ label: `route_room_${room.id}` });
    const desc = roomDesc[(room.id * 7) % roomDesc.length]; // Deterministic random-like
    scenarioJson.scenario.push({ speaker: "narrator", expression: "", text: `【深層深度：${room.id}】\n${desc}` });
    
    // Add flavor dialogue based on node ID to make paths feel distinct
    if (room.id % 3 === 0) {
        scenarioJson.scenario.push({ speaker: "hinata", expression: "", text: hinataDialogues[room.id % hinataDialogues.length] });
    } else if (room.id % 2 === 0) {
        scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: mitraDialogues[room.id % mitraDialogues.length] });
    } else {
         scenarioJson.scenario.push({ speaker: "waddy", expression: "", text: "……道が合っているのか、誰にもわからないな。" });
    }
    
    const textA = actionTextsA[(room.id * 3) % actionTextsA.length];
    const textB = actionTextsB[(room.id * 5) % actionTextsB.length];
    const targetA = room.choiceA.type === 'END' ? room.choiceA.target : `route_room_${room.choiceA.target}`;
    const targetB = room.choiceB.type === 'END' ? room.choiceB.target : `route_room_${room.choiceB.target}`;
    
    scenarioJson.scenario.push({ choices: [
        { text: textA, goto: targetA },
        { text: textB, goto: targetB }
    ] });
});

endings.forEach(end => {
    scenarioJson.scenario.push({ label: end.id });
    scenarioJson.scenario.push({ speaker: "narrator", expression: "", text: "視界が歪み、世界が溶けていく……。" });
    
    if (end.id === 'END_2') {
        scenarioJson.scenario.push({ speaker: "hinata", expression: "嬉しそうに", text: "えへへ、やっと着いたね、おにいちゃん！\nここでずっと、一緒に遊ぼ？" });
    } else if (end.id === 'END_3') {
        scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: "これがあなたの望んだ結末。おやすみなさい、観測者。" });
    } else if (end.id === 'END_6') {
        scenarioJson.scenario.push({ speaker: "waddy", expression: "驚き", text: "ここは……秋葉原？　いや、ゲーマーズの看板が……浮いている？" });
    } else if (end.id === 'END_8') {
        scenarioJson.scenario.push({ speaker: "waddy", expression: "ため息", text: "結局、酒に溺れる夢を見るのか……。" });
    } else if (end.id === 'END_10') {
        scenarioJson.scenario.push({ speaker: "hinata", expression: "手を振って", text: "あ、もう朝になっちゃう！\nじゃあね、おにいちゃん。また夢の中で会おうね！" });
        scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: "朝が来るわ。目覚めの時間よ。" });
    }
    
    scenarioJson.scenario.push({ end: true, title: end.title, subtitle: end.desc });
});

fs.writeFileSync('c:/Users/wdddi/workspace/waddy-guesthouse-90s/scenarios/2026-03-21_✦ 夢を見る.json', JSON.stringify(scenarioJson, null, 2), 'utf-8');
console.log('JSON scenario Generated.');
