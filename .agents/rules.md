# ワークスペースルール

## 日記作成

> [!CAUTION]
> 以下のキーワードが会話に含まれたら、**何よりも先にワークフローを読むこと**。手動でデータを書いてはいけない。
> トリガーワード: `日記`, `元ネタ`, `diary`, `daily-context`, `今日のメモ`

日記を書く・日記の作成を依頼された場合は、必ず以下の2つのワークフローを参照し、その手順に従うこと：
1. `.agents/workflows/diary.md` — 作成フロー（データ収集〜プッシュ）
2. `.agents/workflows/diary-rules.md` — キャラ別ガイドライン・フォーマット

**手順の要点:**
1. まず `npm run auth:daily-sources` でChromeを起動し、ユーザーにXログインしてもらう
2. `collect-daily-context.mjs` でX・Swarmデータを自動収集する
3. 自動収集されたデータを元に日記を作成する（手動でSwarm/Xデータを捏造しない）

