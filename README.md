# ワディーゲストハウス

個人サイトを、静的HTML/CSS/JSだけで実装したページです。  
GitHub Pages ユーザーサイト方式（`hinahina-vr.github.io`）での公開を想定しています。

## ファイル構成

```text
waddy-guesthouse-90s/
  index.html
  videos.html
  styles.css
  main.js
  assets/
    tile-grid.svg
    button-youtube.svg
    button-x.svg
    button-github.svg
    banner-waddy.svg
    under-construction.svg
```

## ローカル確認

このフォルダで以下のどちらかを実行:

```bash
python -m http.server 8000
```

または任意の静的サーバーを利用してください。  
`http://localhost:8000` で確認できます。

## GitHub Pages 公開手順 (ユーザーサイト方式)

1. GitHub で `hinahina-vr.github.io` リポジトリを作成（未作成なら）。  
2. このフォルダの中身を、`hinahina-vr.github.io` のリポジトリ直下に配置。  
3. `main` ブランチへ push。  
4. GitHub の `Settings > Pages` で以下を設定。  
   - Source: `Deploy from a branch`  
   - Branch: `main`  
   - Folder: `/ (root)`  
5. 数分待つと `https://hinahina-vr.github.io/` で公開されます。

## 実装メモ

- `#visitor-counter`: ページ読み込みごとにランダム値を表示
- `#update-log`: 更新履歴表示領域
- サーバー通信はありません。
- `videos.html`: YouTube動画紹介コーナーページ
