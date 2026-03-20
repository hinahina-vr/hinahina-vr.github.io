# VOICEPEAK Export Files

`voicepeak/voicepeak.config.json` を編集して、各 `speaker` に対応する VOICEPEAK のナレーター名と必要ならプリセット名を入れる。

生成は次で行う。

```bash
npm run build:voicepeak-files
```

生成先は `voicepeak/generated/<scenarioId>/`。

- `import/<speaker>.txt`
  - VOICEPEAK のセリフ一覧へ読み込むためのタブ区切りファイル
  - 1行 = 1セリフ
  - 列順: `ナレーター名`, `本文`, `プリセット名(任意)`
- `export-manifest.csv`
  - どの行をどのファイル名で書き出すかの対応表
  - ランタイムの音声パス規約 `assets/voices/scenarios/{audioNamespace}/{speaker}/{voiceId}.wav` を前提に出力される

運用の流れ:

1. `voicepeak/voicepeak.config.json` の `voicepeakNarrator` を実環境の VOICEPEAK 話者名に合わせて埋める。
2. `npm run build:voicepeak-files` を実行する。
3. `voicepeak/generated/<scenarioId>/import/<speaker>.txt` を VOICEPEAK に読み込む。
4. `voicepeak/generated/<scenarioId>/export-manifest.csv` を見ながら、各行を `voiceId.wav` として書き出す。
5. 書き出した音声を `assets/voices/scenarios/<audioNamespace>/<speaker>/` に置く。

注意:

- 生成される `voiceId` は現状 `speaker` ごとの連番。シナリオを大きく並べ替えると番号も変わる。
- まだシナリオ JSON に `voiceId` を書き戻していないので、ランタイム再生までつなぐには別途 `voiceId` の反映が必要。
