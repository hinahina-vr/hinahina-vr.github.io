# Ooku Health Exporter Android

Huawei Health Kit から日次サマリーを取得し、`/sdcard/Download/OokuHealth/YYYY-MM-DD.json` に書き出す companion app。

## 目的

- `HUAWEI WATCH FIT 4 Pro` の睡眠・活動量・生体情報を Android 側で集約する
- PC 側の `scripts/collect-daily-context.mjs` から `adb` で export を起動できるようにする
- 生成された JSON を `daily-context` の `sources.health` に取り込む

## セットアップ

1. AppGallery Connect で Android アプリ `io.waddy.ookuhealthexporter` を作成し、Health Kit を有効化する
2. `app/agconnect-services.json` をダウンロードしてこのディレクトリに置く
3. `local.properties` に少なくとも以下を書く

```properties
sdk.dir=C\\:\\Users\\<YOU>\\AppData\\Local\\Android\\Sdk
ooku.health.huaweiAppId=123456789
ooku.health.watchModel=HUAWEI WATCH FIT 4 Pro
```

この PC では次で Android SDK を自動導入できる:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-android-sdk.ps1
```

4. Android Studio でこのディレクトリを開く
5. 端末に `HMS Core` と `HUAWEI Health` を入れ、USB デバッグを有効化して接続する
6. アプリを端末にインストールする
7. アプリ起動後、`Authorize Huawei ID / Health Kit` を 1 回実行して権限を付与する

`local.properties` と `agconnect-services.json` は `.gitignore` 済み。

ビルドと実機インストールは次でまとめて実行できる:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-and-install-debug.ps1
```

## ADB export

```powershell
adb shell am broadcast `
  -a io.waddy.ookuhealthexporter.EXPORT_HEALTH `
  -n io.waddy.ookuhealthexporter/.ExportHealthReceiver `
  --es date 2026-03-16
```

成功すると `/sdcard/Download/OokuHealth/2026-03-16.json` が更新される。

## 注意

- このプロジェクトはこのワークスペース内ではビルド未検証。現在のマシンに Android toolchain が入っていないため。
- Health Kit の値は観測値として扱い、医療診断には使わない。
