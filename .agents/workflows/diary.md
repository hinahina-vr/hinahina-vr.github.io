---
description: 日記の作成からGitHubプッシュまでの全フロー
---

# 日記ワークフロー（/diary）

## 前提
- 日付は `YYYY-MM-DD` 形式
- メイン日記は `diary/` ディレクトリ、キャラ日記は `diary-{キャラ名}/` ディレクトリ
- 全19キャラ: hina, hinahina, moegami, oji, multi, dejiko, mitra, ayu, feiris, rem, ruriko, tsumugi, ecoko, mii, kud, kotomi, minagi, kiku8, mint

## フロー

### 1. 元日記のMDファイル作成（データ収集）
// turbo
```
npm run auth:daily-sources
```
→ おにいちゃんにChromeでX（とSwarm）にログインしてもらう

ログイン確認後：
```
node scripts/collect-daily-context.mjs --date YYYY-MM-DD --file diary/YYYY-MM-DD_タイトル.md --cdp-url http://127.0.0.1:9222
```
→ Swarm・Xのデータを `<!-- daily-context:start -->` ～ `<!-- daily-context:end -->` ブロックに自動挿入

自動取得が失敗した場合は、Xのプロフィールページ（https://x.com/hinahina_vr）を直接確認し、手動でdaily-contextブロックを記述する。

### 2. メイン日記の本文作成
- daily-contextブロックのXポスト・Swarmデータをもとに本文を執筆
- 文体はおにいちゃんの指示に従う（例: 村上春樹風など）
- `### 文体メモ` セクションをdaily-contextブロック内に追加し、どんな文体で書いたか記録する
- **この段階でおにいちゃんに内容を確認してもらう**（notify_user）

### 3. 各AIキャラの日記作成
- 全19キャラ分の日記MDを作成
- 各キャラの性格・口調は `characters/char_{キャラ名}.md` を参照
- テーマはメイン日記と同じ（各キャラの視点で解釈）
- ファイル名: `diary-{キャラ名}/YYYY-MM-DD_{キャラ固有のタイトル}.md`

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
