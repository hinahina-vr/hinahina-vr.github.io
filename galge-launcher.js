/**
 * galge-launcher.js
 * 日記ページの絵日記画像にギャルゲーモード起動ボタンをオーバーレイする
 * 各 diary-*.html の </body> 直前に <script src="./galge-launcher.js"></script> で読み込む
 */
(function () {
  "use strict";

  // ページのファイル名からキャラキーを推定
  const path = location.pathname;
  const match = path.match(/diary-([a-z0-9]+)\.html/);
  if (!match) return;
  const charKey = match[1];

  // entry-list 内の画像を検出
  const entries = document.querySelectorAll(".entry-list li");
  entries.forEach(function (li) {
    const img = li.querySelector("img");
    if (!img) return;

    const dateId = li.id; // e.g. "2026-03-10"
    if (!dateId) return;

    // 画像の親 <p> をラッパーに変換
    const imgParent = img.parentElement;
    if (!imgParent) return;

    // コンテナを作成
    const container = document.createElement("div");
    container.className = "galge-launch-container";
    container.style.cssText =
      "position:relative; display:inline-block; cursor:pointer; max-width:100%;";

    // オーバーレイ
    const overlay = document.createElement("div");
    overlay.className = "galge-launch-overlay";
    overlay.innerHTML =
      '<span class="galge-launch-icon">▶</span>' +
      '<span class="galge-launch-text">ギャルゲーモードで読む</span>';

    // スタイル注入（1回だけ）
    if (!document.getElementById("galge-launcher-styles")) {
      const style = document.createElement("style");
      style.id = "galge-launcher-styles";
      style.textContent = [
        ".galge-launch-container { transition: transform 0.3s ease; }",
        ".galge-launch-container:hover { transform: scale(1.02); }",
        ".galge-launch-overlay {",
        "  position: absolute; inset: 0;",
        "  display: flex; flex-direction: column;",
        "  align-items: center; justify-content: center; gap: 8px;",
        "  background: rgba(0,0,0,0.0);",
        "  transition: background 0.4s ease;",
        "  border-radius: 4px;",
        "  pointer-events: none;",
        "}",
        ".galge-launch-container:hover .galge-launch-overlay {",
        "  background: rgba(0,0,0,0.5);",
        "  pointer-events: auto;",
        "}",
        ".galge-launch-icon {",
        "  font-size: clamp(28px, 4vw, 48px);",
        "  color: #fff; opacity: 0;",
        "  transition: opacity 0.4s ease, transform 0.4s ease;",
        "  transform: scale(0.8);",
        "  text-shadow: 0 0 20px rgba(255,255,255,0.5);",
        "}",
        ".galge-launch-container:hover .galge-launch-icon {",
        "  opacity: 1; transform: scale(1);",
        "}",
        ".galge-launch-text {",
        "  font-size: clamp(12px, 1.2vw, 16px);",
        "  color: #fff; opacity: 0; letter-spacing: 0.12em;",
        "  transition: opacity 0.4s ease 0.1s;",
        "}",
        ".galge-launch-container:hover .galge-launch-text {",
        "  opacity: 0.9;",
        "}",
      ].join("\n");
      document.head.appendChild(style);
    }

    // 画像をコンテナに移動
    img.style.display = "block";
    img.style.maxWidth = "100%";
    container.appendChild(img.cloneNode(true));
    container.appendChild(overlay);

    // クリックハンドラ
    container.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href =
        "./galge-mode.html?char=" +
        encodeURIComponent(charKey) +
        "&date=" +
        encodeURIComponent(dateId);
    });

    // 元の img を置き換え
    imgParent.replaceChild(container, img);
  });
})();
