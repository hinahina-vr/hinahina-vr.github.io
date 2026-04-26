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
→ 同時に、下書き本文へ `<!-- bungou-style:start -->` ～ `<!-- bungou-style:end -->` の `文豪AIメモ（自動）` を挿入し、その日の採用文豪AIを先に決める

補足:
- `--skip-health` を付けると健康データ取得を明示的に飛ばす
- `--health-file path/to/YYYY-MM-DD.json` を付けると companion app の JSON を手動 import できる
- `--adb-serial SERIAL` を付けると複数端末接続時に対象 Android を固定できる

自動取得が失敗した場合は、Xのプロフィールページ（https://x.com/hinahina_vr）を直接確認し、必要なら `--health-file` を使って health JSON だけ手動で差し込む。`daily-context` は観測値のメモであり、Health の数値を診断や断定に使わない。

### 2. メイン日記の本文作成
- daily-contextブロックのX・Swarm・Health要約を裏取りにして本文を執筆する
- 本文、下書きの自然文、シナリオ本文では `X` / `Swarm` などのサービス名や件数を書かない
- `Xに書いていた` ではなく「その日に考えていたこと」「頭の中にあった文」、`Swarmが空` ではなく「外出記録がない」「移動の痕跡が少ない」などの自然な言い換えに変換する
- 下書きの `文豪AIメモ（自動）` に入った `採用文豪AI` を起点に本文を書く。変更する場合は、理由を `文体メモ` に残す
- 文体はおにいちゃんの指示に従う（例: 村上春樹風など）
- 数値は漢数字ではなく半角数字で書く（例: `269点`、`28万円`）
- `### 文体メモ` セクションをdaily-contextブロック内に追加し、どんな文体で書いたか記録する
- Health の数値は「よく眠れた」「よく歩いた」などの観測事実としてだけ扱い、医療的な診断や断定に変換しない
- **この段階でおにいちゃんに内容を確認してもらう**（notify_user）

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

#### 口調・呼称チェック
以下を目視確認する：
- [ ] 各キャラの語尾がガイドライン通りか（例：ことみ→「〜なの」、でじこ→「にょ」）
- [ ] インサイト内でもキャラの口調・呼称を維持しているか
  - ひなた→「おにいちゃん」、りぜる→「だんなさま」、キク8号→「ワディーさん」等
  - 分析的なキャラ（物理おじ、ひなひな）以外は、インサイトもキャラ口調で書く
- [ ] 口癖・定型フレーズが1日記1回以内か（金太郎飴禁止）
- [ ] `本日の話題` が分散していて、同じ1〜2話題の量産になっていないか

### 4. 絵日記用の画像プロンプト提案
- メイン日記・キャラ日記の内容から、絵日記用のイラストプロンプトを提案
- おにいちゃんが手動で画像を生成

### 5. 絵を日記に挿入
- 生成された画像を該当する日記MDに挿入
- 画像フォーマット例：
```html
<img src="./diary-{キャラ名}/{ファイル名}" alt="説明" style="display:block;width:100%;margin:0 auto;">
```

### 6. ビルド＆プッシュ
// turbo
```
npm run build
```
確認後：
```
git add -A && git commit -m "YYYY-MM-DD の日記追加：{テーマの要約}" && git push
```
