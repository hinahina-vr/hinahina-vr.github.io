# Dejiko Discord Worker

Discord Slash Command から `Dify Cloud advanced-chat` を叩く、`Cloudflare Workers + D1` 前提の小規模 Discord Bot です。Gateway 常駐は使わず、`/dejiko` `/newchat` `/profile` の 3 コマンドで動きます。

## Files

- `src/index.ts`: Worker 本体。署名検証、即時 defer、Dify 呼び出し、Discord 返信更新。
- `src/discord.ts`: Discord interaction helpers と署名検証。
- `src/dify.ts`: Dify `chat-messages` と会話変数取得。
- `src/db.ts`: D1 ストレージとテスト用メモリストレージ。
- `src/persona.ts`: ローカル側の距離感・話題推定、プロフィール整形。
- `dify/dejiko_discord_bot.dsl.yml`: Dify import 用 DSL。
- `dify/knowledge/dejiko_lore.md`: Dify Knowledge Base に入れる lore 整理版。

## Setup

1. `npm install`
2. Cloudflare D1 を作る  
   `npx wrangler d1 create dejiko-discord-worker`
3. `wrangler.toml` の `database_id` を作成結果で置き換える
4. `.dev.vars.example` を `.dev.vars` にコピーして値を入れる
5. ローカル D1 にマイグレーションを適用する  
   `npx wrangler d1 migrations apply DB --local`
6. リモート D1 にも適用する  
   `npx wrangler d1 migrations apply DB --remote`
7. Dify Cloud に `dify/dejiko_discord_bot.dsl.yml` を import する
8. Discord アプリの `Interactions Endpoint URL` を Worker の `/discord/interactions` に向ける

## Env Vars

Worker に必要なのは以下です。

- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`
- `DIFY_API_BASE`
- `DIFY_API_KEY`
- `ALLOWED_GUILD_ID`
- `ALLOWED_CHANNEL_IDS`
- `BOT_TIMEOUT_MS`

## Discord Commands

アプリコマンドは以下です。

- `/dejiko message:string`
- `/newchat`
- `/profile`

登録は Bot Token を使って Discord API に upsert します。例:

```bash
curl -X PUT "https://discord.com/api/v10/applications/$DISCORD_APPLICATION_ID/guilds/$DISCORD_GUILD_ID/commands" \
  -H "Authorization: Bot $DISCORD_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "dejiko",
      "description": "でじこに話しかける",
      "options": [
        {
          "type": 3,
          "name": "message",
          "description": "でじこへのメッセージ",
          "required": true,
          "max_length": 1000
        }
      ]
    },
    {
      "name": "newchat",
      "description": "でじことの会話を最初からやり直す"
    },
    {
      "name": "profile",
      "description": "でじこが覚えているプロフィールを見る"
    }
  ]'
```

## Dify Notes

`dify/dejiko_discord_bot.dsl.yml` は import してすぐ会話できる最小構成です。  
ただし `Knowledge Retrieval` ノードのデータセット ID は環境依存なので、この成果物では自動配線していません。

Knowledge を足したい場合は:

1. `dify/knowledge/dejiko_lore.md` を Dify Knowledge Base に登録する
2. Dify UI 上で `Knowledge Retrieval` ノードを追加する
3. `sys.query` を入力にして LLM ノードの context に渡す

## Run

```bash
npm run dev
```

型チェックとテスト:

```bash
npm run check
```

## Behavior Notes

- `/dejiko` は公開返信
- `/newchat` と `/profile` は ephemeral
- 許可外ギルドやチャンネルでは即時に拒否
- Dify が 25 秒以内に返らなければ、でじこ口調のフォールバックへ切り替え
- Dify の会話変数が薄くても、Worker 側の D1 キャッシュで `/profile` と距離感を補完
