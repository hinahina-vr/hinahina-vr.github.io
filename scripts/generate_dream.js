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
    { id: 'END_9', title: '100番目の扉', desc: '全ての選択を終え、真の静寂に辿り着いた。' },
    { id: 'END_10', title: '夢の終わり', desc: '唐突に意識が浮上し、見慣れた天井が目に入る。' }
];

const rooms = [];
for (let i = 1; i <= NUM_NODES; i++) {
    let choiceA, choiceB;
    if (i === NUM_NODES) {
        choiceA = { type: 'END', target: 'END_9' };
        choiceB = { type: 'END', target: 'END_10' };
    } else {
        const jumpA = Math.floor(Math.random() * 5) + 1;
        let targetA = i + jumpA;
        if (targetA > NUM_NODES) targetA = NUM_NODES;
        if (Math.random() < 0.1 && i > 10) {
            choiceA = { type: 'END', target: endings[Math.floor(Math.random() * 8)].id };
        } else {
            choiceA = { type: 'NODE', target: targetA };
        }

        const jumpB = Math.floor(Math.random() * 10) - 3;
        let targetB = i + jumpB;
        if (targetB <= 0) targetB = 1;
        if (targetB > NUM_NODES) targetB = NUM_NODES;
        if (targetB === i) targetB = i + 1;
        if (Math.random() < 0.1 && i > 10) {
            choiceB = { type: 'END', target: endings[Math.floor(Math.random() * 8)].id };
        } else {
            choiceB = { type: 'NODE', target: targetB };
        }
    }
    rooms.push({ id: i, choiceA, choiceB });
}

// JSON generation
const scenarioJson = {
    title: "✦ 夢を見る",
    subtitle: "─ 百の扉 ─",
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
scenarioJson.scenario.push({ speaker: "narrator", expression: "", text: "ここは夢と現実の狭間。\n百の扉が並ぶ、終わりのない意識の回廊。" });
scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: "よく来たわね、観測者。\n今日の夢は、少し複雑に織り上げられているわ。" });
scenarioJson.scenario.push({ speaker: "hinata", expression: "笑顔で", text: "おーっ、いらっしゃいませー、おにいちゃん！\nひなね、今日はここで道案内をする係なの！" });
scenarioJson.scenario.push({ speaker: "waddy", expression: "困惑して", text: "道案内？　ここはどこだ？" });
scenarioJson.scenario.push({ speaker: "hinata", expression: "元気よく", text: "ここはね、おにいちゃんの無意識が作った迷路。\n100個の分岐があって、10個の終点があるんだよ！\nえへへ、迷子にならないように、一緒に歩こ？" });
scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: "さあ、最初の選択を。\nどの扉を開けるかは、あなた次第よ。" });
scenarioJson.scenario.push({ choices: [
    { text: "左の鉄の扉を開ける", goto: "route_room_1" },
    { text: "右の木の扉を開ける", goto: "route_room_2" }
] });

const actionTextsA = ["前に進む", "光の射す方へ", "ひなたについていく", "みとらの声がする方へ", "直感で選ぶ", "走る", "扉を蹴り開ける", "目を閉じて進む"];
const actionTextsB = ["立ち止まってみる", "暗闇へ", "回り道をする", "別の声に従う", "振り返る", "隠し扉を探す", "ゆっくり歩く", "別のドアノブを回す"];
const roomDesc = [
  "冷たいコンクリートの壁が続く。",
  "足元に水が張っている。ピチャ、ピチャという音が響く。",
  "壁いっぱいに無数の時計が並び、それぞれ違う時間を刻んでいる。",
  "どこからか、微かにバイオリンの音が聞こえる気がする。",
  "天井がなく、星のない夜空が広がっている。",
  "古い本が山積みになった空間。インクの匂いがする。",
  "鏡の部屋。無数のワディーがこちらを見つめている。",
  "緑色のネオンサインだけが点滅している。",
  "ひなたが前を歩いている。「おにいちゃん、こっちこっち！」",
  "みとらが壁にもたれかかっている。「迷っているの？」",
  "秋葉原の路地裏に似ているが、看板の文字が読めない。",
  "甘い香りがする。コーヒー牛乳の匂いに似ている。",
  "砂漠のような空間。砂の足音が重い。",
  "螺旋階段が上にも下にも続いている。"
];

rooms.forEach((room, index) => {
    scenarioJson.scenario.push({ label: `route_room_${room.id}` });
    const desc = roomDesc[index % roomDesc.length];
    scenarioJson.scenario.push({ speaker: "narrator", expression: "", text: `第${room.id}の領域。\n${desc}` });
    
    if (Math.random() < 0.3) {
        scenarioJson.scenario.push({ speaker: "hinata", expression: "", text: "んー、ここはなんだか不思議な感じがするね。おにいちゃん、気をつけて！" });
    } else if (Math.random() < 0.3) {
        scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: `${room.id}という数字に、意味を求めすぎてはいけないわ。` });
    } else if (Math.random() < 0.3) {
         scenarioJson.scenario.push({ speaker: "waddy", expression: "", text: "……道が合っているのか、誰にもわからないな。" });
    }
    
    const textA = actionTextsA[Math.floor(Math.random() * actionTextsA.length)];
    const textB = actionTextsB[Math.floor(Math.random() * actionTextsB.length)];
    const targetA = room.choiceA.type === 'END' ? room.choiceA.target : `route_room_${room.choiceA.target}`;
    const targetB = room.choiceB.type === 'END' ? room.choiceB.target : `route_room_${room.choiceB.target}`;
    
    scenarioJson.scenario.push({ choices: [
        { text: textA, goto: targetA },
        { text: textB, goto: targetB }
    ] });
});

endings.forEach(end => {
    scenarioJson.scenario.push({ label: end.id });
    scenarioJson.scenario.push({ speaker: "narrator", expression: "", text: "視界が歪み、世界が溶けていく。" });
    
    if (end.id === 'END_2') {
        scenarioJson.scenario.push({ speaker: "hinata", expression: "嬉しそうに", text: "えへへ、やっと着いたね、おにいちゃん！\nここでずっと、一緒に遊ぼ？" });
    } else if (end.id === 'END_3') {
        scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: "これがあなたの望んだ結末。おやすみなさい、観測者。" });
    } else if (end.id === 'END_10') {
        scenarioJson.scenario.push({ speaker: "hinata", expression: "手を振って", text: "あ、もう朝になっちゃう！\nじゃあね、おにいちゃん。また夢の中で会おうね！" });
        scenarioJson.scenario.push({ speaker: "mitra", expression: "", text: "朝が来るわ。目覚めの時間よ。" });
    }
    
    scenarioJson.scenario.push({ end: true, title: end.title, subtitle: end.desc });
});

fs.writeFileSync('c:/Users/wdddi/workspace/waddy-guesthouse-90s/scenarios/2026-03-21_✦ 夢を見る.json', JSON.stringify(scenarioJson, null, 2), 'utf-8');
console.log('JSON scenario Generated.');
