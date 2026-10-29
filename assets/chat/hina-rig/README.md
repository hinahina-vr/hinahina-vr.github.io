# ひなたの関節アニメーション（20261029-r11・公開対象版）

2026-10-29、前回停止していたChrome確認を再開し、最終補正後の笑顔・ウインク・会話の表情を目視した。顎の二重表示は解消している。390×844のスマホ幅で、顔と会話欄が重ならないこと、手振り、キーなし会話、動きオフ、動きを抑える設定を確認した。通常表示との往復と別キャラのみぃのデモ会話も確認した。スマホ実機、実OpenRouter通信、実時間のフレームレート測定は今回未検証。

## r11の変更と検証範囲

- 下端のCSS透過マスクを撤去。白い上着の裾とスカートを描き足し、会話欄の後ろまで描画する。上着の末端30ピクセルだけを不透明な衣装の上でなじませる。背景へ体をフェードさせない。
- 待機中の周期的な手振り、なでた時や会話時に重なる手振りを撤去。挨拶と手振りボタン、なでる反応、視線追従は残す。髪・体・手首の動きを小さくゆっくりにした。
- 胴体は通常の絵を固定。表情の描画を顔の内側に限定し、表情素材の位置ずれ（最大18px）を補正した。PixiJS、9メッシュ、7616頂点。
- tests/fixtures/hinata-calm-review.htmlで製品のHinataMotionを使い6件の回帰検査を実行。旧r10と同じ腰の座標の描画アルファは旧36/3/0/0、修正後255/254/253/252。表情切り替えで胴体のピクセルが変わらず、20秒相当の待機で自動手振りが起きないこと等を検査した。時間を進める試験であり、実時間の性能試験とは区別する。
- 実チャットで透過の解消と衣装のつなぎ目を目視し、隣のhinata-r11-review-20261029/after-chat.jpgに保存した。
- 初回動画は背景タブで間引かれ19.3秒に27フレームしかなく、滑らかさの証拠には使わない。さらに録画で笑顔の顎の二重表示を発見した。rejected-low-fps-unaligned-face.webmとして不採用にした。
- 最終補正後にChromeの6件の回帰検査を再実行し全件合格。nodeの23件も合格。33人のデモ挨拶と165通りの返事を確認した。build:hinataの出力は検証したランタイムとハッシュ一致。build:chatも完了。公開前の証跡は隣のhinata-r11-release-20261029/に保存する。
- tests/chat-hinata-motion.test.cjsは今ターン構文確認のみ。スマホ実機・実OpenRouter通信は今回未検証。公開先の確認結果は公開記録に保存する。数値テストを見た目の合格の代わりにしない。

## 今回の画像生成

outfit-lower-v1.pngは内蔵image_genで生成し、RGBAをそのままコピーした。参照はcore-v2.png。生成元は E:/CodexData/home/generated_images/01a0dba2-8b40-7701-830b-a38e6126aeeb/exec-28cdc066-cfad-4d7f-8c4c-ccba5b92eb46.png。プロンプト全文は隣のhinata-r11-review-20261029/outfit-prompt.txtに保存した。

## r10時点の記録（以下は過去版）



r9の見た目の合格判定を撤回した。細長い腕、肘の形、袖との境目が不自然なままだった。旧テストの合格は絵としての自然さを証明しない。旧記録はREADME-r9-rejected.mdと、作業フォルダー隣のhinata-anatomy-evidence-20261029/に残す。

## 腕の作り直し

内蔵image_genで、下ろした腕と、肘を曲げて手を振る腕を描き直した。顔・首・胴体・髪の素材は変更していない。

新素材 arms-posed-v5.png は1536×1024 RGBA、左右2列（各768×1024）。曲げた肘の輪郭と内側の折れ目を絵として持つ。リグは絵に合わせた肩・肘・手首の支点を使い、元のポーズから小さな角度を足して動かす。まっすぐな腕を100度以上折り曲げる方式をやめた。待機時にも右の前腕を軽く上げ、手振りでさらに上げて手首を振る。

肩・肘・手首の骨の長さを保持し、手の大きさは手首周辺で滑らかにつなぐ。袖は肩について動く。腕のメッシュは33×97頂点、顔と髪を合わせて7メッシュ・7531頂点。表示にPixiJSを使い、Cubismのmoc3モデルではない。音声リップシンク・立体的な顔の振り向きは含まない。

## 確認方法と範囲

- tests/fixtures/hinata-anatomy-comparison.html：左に不合格のr9、右にr10を大きく表示。待機・途中・手振り・表情を操作して比較できる。
- tests/fixtures/hinata-pose-review.html：r10単体の拡大表示。
- node --test tests/hinata-rig-math.test.mjs tests/chat-core.test.mjs：23件合格。顔の形、骨の長さ、肩の固定、手振りの移動、肌の折り返しを検査する。
- Chromeで待機・中間・手振りと笑顔の絵を目視。実際のチャットで手振り、なでる反応、キーなし会話、通常表示との往復、390×844の配置を確認した。
- スクリーンショット、プロンプト、ログ、ハッシュは隣のhinata-r10-review-20261029/。数値テストと見た目の確認は別に記録する。

公開サイト・スマホ実機・実OpenRouter通信は未検証。今回のブラウザ自動試験ファイルは構文確認のみで、全項目を実行したとは扱わない。反映先はローカルプレビュー。

## 採用素材

| ファイル | 用途 |
| --- | --- |
| core-v2.png | 通常・まばたき・会話・笑顔・ウインク・挨拶。顔・首・胴体と短い髪は一体 |
| arms-posed-v5.png | 新しく描いた、下ろした腕と曲げた腕 |
| hair-v2.png | 前後左右の長い髪4束 |
| ../characters/hina-indoor.png | 動作オフ・読み込み失敗時の全身絵。白い靴下を継続使用 |

arms-v3.png / arms-v4.png / portraits-v1.pngは過去版・比較用。通常のアニメーションでは読み込まない。

新しい腕の生成元は E:/CodexData/home/generated_images/01a0dba2-8b40-7701-830b-a38e6126aeeb/exec-a6ea4554-aee0-49bf-87e5-53c432b36765.png。内蔵image_genを使用し、生成RGBAをそのままプロジェクトへコピーした。参照画像はcore-v2.pngとhina-indoor.png。顔・髪の既存の生成記録はREADME-r9-rejected.md、室内絵はREADME-r6.mdを参照。

## 腕の生成プロンプト


```text
Use case: stylized-concept.
Asset type: production RGBA arm-pose atlas for a cute anime avatar.
Input images: Image 1 is the FACE/CLOTHING painting style reference, not an edit target. Image 2 is the approved full-character anatomy and rendering reference. Preserve their delicate soft anime style and warm ivory skin.
Produce exactly TWO isolated complete arms in a 2-column atlas on a landscape 1536x1024 transparent canvas. Each column 768x1024. NO body, head, hair, sleeves, clothing, letters, grid, glow or backdrop. Arms will be placed behind existing puff sleeves. Rounded shoulder caps may extend upward to hide under the sleeves.
CRITICAL: These must be attractive natural anime arms with convincing elbow anatomy, not pipes, tubes, sticks or rubber bands. Forearms gently taper, elbows have a small bony outside point and a believable inner crease, wrist is narrow but substantial, palms have correct volume and 5 natural fingers. Match the character's soft petite proportions and skin shading, not adult realistic muscular anatomy.
LEFT COLUMN: A relaxed hanging arm with a subtle 10-degree elbow bend, viewed from the front. Shoulder center near (250,80), elbow (245,470), wrist (180,800), fingertips around (200,960), coordinates local to the cell. A small relaxed hand, fingers gently curled/grouped, natural thumb. Upper arm width about 110 px, forearm about 95 px, wrist about 55 px, hand length about 155 px. Do not exaggerate the bulge below the elbow.
RIGHT COLUMN: A naturally bent friendly waving arm for the character's screen-right side. Draw the bent elbow itself beautifully and convincingly. Local coordinates: shoulder center (180,80), upper arm descends almost vertically to elbow (215,470), forearm rises diagonally outward to wrist (485,200), a compact open waving palm with fingertips near (570,80). The elbow is bent about 130 degrees from straight. Upper arm width about 110 px, forearm about 95 px, wrist 55 px. Five fingers grouped in a soft friendly wave, no spiky fingers; thumb on the upper-left side of the raised palm. The upper arm and forearm must NOT merge or cross; keep a visible triangular open space inside the bent arm. No detached pieces or seams.
Softly shaded peach-ivory skin with a thin clean rose-brown silhouette contour, subtle interior shading around elbow/palm, same finished anime illustration quality as the reference. No dark dashed edges, no jagged outline, no halo. Both arm silhouettes fully inside their respective cells, separated by transparent space. TRUE transparent background.
```
