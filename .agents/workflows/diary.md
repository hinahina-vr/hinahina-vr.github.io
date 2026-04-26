---
description: 日記の作成からGitHubプッシュまでの全フロー
---

# 日記ワークフロー（/diary）

## 前提
- 日付は `YYYY-MM-DD` 形式
- メイン日記は `diary/` ディレクトリ、キャラ日記は `diary-{キャラ名}/` ディレクトリ
- 全32キャラ+みとら: hina, hinahina, moegami, oji, multi, dejiko, mitra, ayu, feiris, rem, ruriko, tsumugi, ecoko, mii, kud, kotomi, minagi, kiku8, mint, tama, kukuri, sharo, nemurin, hinako, kyoko, mayuki, mitsuba, ana, astarotte, hazuki, rin, rizel

## フロー

### 1. 元日記のMDファイル作成（データ収集）
// turbo
```
npm run auth:daily-sources
```
→ おにいちゃんにChromeでX（とSwarm）にログインしてもらう

健康データも取り込む日は、先に Android 端末で `tools/ooku-health-exporter-android/` をセットアップし、`HMS Core` / `HUAWEI Health` / companion app の権限付与を 1 回済ませておく。

ログイン確認後：
```
node scripts/collect-daily-context.mjs --date YYYY-MM-DD --file diary/YYYY-MM-DD_タイトル.md --cdp-url http://127.0.0.1:9222
```
→ Swarm・X・Health のデータを `<!-- daily-context:start -->` ～ `<!-- daily-context:end -->` ブロックに自動挿入
→ 同時に、下書き本文へ `<!-- bungou-style:start -->` ～ `<!-- bungou-style:end -->` の `文豪AIメモ（自動）` を挿入し、採用文豪AIを先に決める

補足:
- `--skip-health` を付けると健康データ取得を明示的に飛ばす
- `--health-file path/to/YYYY-MM-DD.json` を付けると companion app の JSON を手動 import できる
- `--adb-serial SERIAL` を付けると複数端末接続時に対象 Android を固定できる

自動取得が失敗した場合は、Xのプロフィールページ（https://x.com/hinahina_vr）を直接確認し、必要なら `--health-file` を使って health JSON だけ手動で差し込む。`daily-context` は観測値のメモであり、Health の数値を診断や断定に使わない。

### 2. メイン日記の本文作成
- daily-contextブロックのX・Swarm・Health要約を裏取りにして本文を執筆する
- 本文、下書きの自然文、シナリオ本文では `X` / `Swarm` などのサービス名や件数を書かない
- `Xに書いていた` ではなく「当日に考えていたこと」「頭の中にあった文」、`Swarmが空` ではなく「外出記録がない」「移動の痕跡が少ない」などの自然な言い換えに変換する
- 下書きの `文豪AIメモ（自動）` に入った `採用文豪AI` を起点に本文を書く。採用文豪AIは日付ごとのラウンドロビンで決まる。変更する場合は、理由を `文体メモ` に残す
- 文体はおにいちゃんの指示に従う（例: 村上春樹風など）
- 本文は読みやすさを優先し、観念を詰め込みすぎない。難しい比喩や長い抽象説明は、短い出来事の文にほどく
- タイトルでは「AとB」のように題材を横に並べるだけの付け方を避ける。中心になる具体物・行動・場所を1つ選び、そこから題材全体が見えるタイトルにする
- 本文でも「AとBは似ている」「AもBも同じ」のように複数題材を横並びにして結論へ押し込まない。1つの具体物から始め、必要なら次の具体物へ場面として移す
- 本編日記の見出し・本文では「前日」「昨日」「翌日」など前の日の文脈に寄りかからない。本文単体で分かる具体的な出来事・場所・考えから入る
- 本編日記では「その日」「この日」で後から日をラベル付けしない。出来事・場所・考えそのものを主語にして入る
- 本編日記では「戻った」を使わない。意識が向いたのか、音楽が鳴ったのか、店に入ったのかなど、実際に起きた動きとして書く
- 本編日記では「空気が動く」のような抽象的な場の変化で説明しない。場所、行動、身体反応、見えたものを具体的に書く
- 「日記の骨」「大きな出来事はない」「話へずれていく」「と書いた」のような、本文外から整理する言い方を避ける。読者に見える出来事の文へ置き換える
- 数値は漢数字ではなく半角数字で書く（例: `269点`、`28万円`）
- `### 文体メモ` セクションをdaily-contextブロック内に追加し、どんな文体で書いたか記録する
- Health の数値は「よく眠れた」「よく歩いた」などの観測事実としてだけ扱い、医療的な診断や断定に変換しない
- **この段階でおにいちゃんに内容を確認してもらう**（notify_user）

### 2.5 夢を見る導線の作成
- 本編日記を公開する日は、対応する `scenarios/YYYY-MM-DD_夢タイトル.json` と `scenarios/adms/YYYY-MM-DD.json` を作成する
- `scenarios/adms/YYYY-MM-DD.json` の `rootNodeId` は原則 `standalone_start` とし、root node の `scenario` / `entry` が実在するシナリオとラベルを指すようにする
- 本編日記本文に手書きの `夢を見る` リンクを残さない。`scripts/build-diary.mjs` が `scenarios/adms/YYYY-MM-DD.json` を見て自動で差し込む
- `npm run check:dream-graphs` を通し、`2026-03-18` 以降の本編日記に夢グラフが欠けていないことを確認する

### 3. 各AIキャラの日記作成
- 全32キャラ+みとら分の日記MDを作成
- 各キャラの性格・口調は `diary-rules.md` のキャラクター別ガイドラインを参照
- テーマはメイン日記と同じ（各キャラの視点で解釈）
- ファイル名: `diary-{キャラ名}/YYYY-MM-DD_{キャラ固有のタイトル}.md`

### 3.5 品質チェック（必須）
キャラ日記を作成したら、**ビルド前に必ず以下のチェックを行う**：

#### 文字数チェック
// turbo
```
Get-ChildItem -Path "diary-*\YYYY-MM-DD*.md" | ForEach-Object { $c = Get-Content $_.FullName -Raw -Encoding UTF8; $b = ($c -split '---')[0]; $b = ($b -split '<!-- daily-context')[0]; $l = ($b -split "`n") | Where-Object { $_ -notmatch '^#' -and $_ -notmatch '^\s*$' }; $t = ($l -join '') -replace '\s+',''; Write-Output "$($t.Length)`t$($_.Directory.Name)\$($_.Name)" } | Sort-Object { [int]($_ -split "`t")[0] }
```
→ 本文800文字未満のキャラは加筆する

#### 話題分散チェック
// turbo
```
npm run check:diary-topic-distribution -- --date YYYY-MM-DD
```
→ `本日の話題` を集計し、1つの話題が全体の3分の1を超えていないか確認する
→ 同じ話題組み合わせの量産も注意表示されるので、偏っていたら割り当てを組み直す

#### 漢数字表記チェック
// turbo
```
npm run check:diary-kanji-numerals -- --date YYYY-MM-DD
```
→ `二百六十九点` などの漢数字の数値表記が残っていたら、`269点` のように半角数字へ直す

#### 読みやすさチェック
// turbo
```
npm run check:diary-readability -- --date YYYY-MM-DD
```
→ 長すぎる段落・長すぎる一文・長い抽象文が残っていたら、短く読みやすい文にほどく

#### 口調・呼称チェック
以下を目視確認する：
- [ ] 各キャラの語尾がガイドライン通りか（例：ことみ→「〜なの」、でじこ→「にょ」）
- [ ] インサイト内でもキャラの口調・呼称を維持しているか
  - ひなた→「おにいちゃん」、りぜる→「だんなさま」、キク8号→「ワディーさん」等
  - 分析的なキャラ（物理おじ、ひなひな）以外は、インサイトもキャラ口調で書く
- [ ] 口癖・定型フレーズが1日記1回以内か（金太郎飴禁止）
- [ ] `本日の話題` が分散していて、同じ1〜2話題の量産になっていないか

### 4. 絵日記用の画像生成（Codex担当）
- メイン日記・キャラ日記の内容から、絵日記用のイラストプロンプトを作り、Codexが画像生成まで行う
- 生成には原則として built-in `image_gen` を使う。プロジェクトに使う画像は、生成後に必ずリポジトリ内へコピーまたは移動する
- メイン日記の扉絵は `assets/diary-covers/YYYY-MM-DD_タイトル.png` に保存する
- キャラ日記へ個別画像を挿入する場合は `diary-{キャラ名}/YYYY-MM-DD_{キャラ名}.png` のように、該当キャラのディレクトリ内へ保存する
- 画像プロンプトは本文の具体物から作る。読める文字、ロゴ、透かし、ブランド名、本文にない記号は入れない
- `$CODEX_HOME/generated_images` など、Codexの作業領域に残った画像をMDやHTMLから直接参照しない
- 画像生成ツールが使えない場合のみ `scripts/generate-diary-covers.mjs` をフォールバックとして使う。その場合も、プレースホルダ扱いにせず、実ファイルの存在と参照先を確認する

### 5. 絵を日記に反映
- メイン日記の扉絵は `assets/diary-covers/manifest.json` の `entries` に追加し、`coverSrc` が保存済みPNGを指すようにする
- キャラ日記へ個別画像を挿入する場合は、該当する日記MDに画像タグを追加する
- 画像フォーマット例：
```html
<img src="./diary-{キャラ名}/{ファイル名}" alt="説明" style="display:block;width:100%;margin:0 auto;">
```
- ビルド前に画像ファイルが存在すること、HTMLからの相対パスで参照できることを確認する

### 6. ビルド＆プッシュ
// turbo
```
npm run build
```
確認後：
```
git add -A && git commit -m "YYYY-MM-DD の日記追加：{テーマの要約}" && git push
```
