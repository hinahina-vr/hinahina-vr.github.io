> r9の見た目の合格判定は撤回。ユーザーの拡大画像で腕の比率・肘の形・袖の境目の不自然さを再確認した。r10へ作り直し中。以下のr9の合格記述は過去の誤判定として残しており、現行版の品質保証ではない。

# ひなたの関節アニメーション（20261029-r9）

PixiJS 8.22.0のMeshPlaneを7枚、合計2011頂点で使用する。顔・首・胴体は一体の絵で、頭部を剛体として傾け、首だけ滑らかにつなぐ。顔の目や口を別々に貼り付けない。両腕は肩・肘・手首の3関節、髪は前後左右の4束を独立して動かす。髪の根元は頭に追従し、毛先へ向かって揺れと遅れを増やす。腕の肌は連続したメッシュでつなぎ、肩を衣装の下へ重ねる。

「手を振って」、登場時、待機中、なでる操作、返事中の動きがある。スマホでは会話欄の上の表示領域に合わせて上半身と手振りを収める。胴体の下端はPixiJSのフィルターでぼかし、手の透明度とは分ける。Cubismモデルではなく、立体的な顔の振り向き・音声リップシンクは含まない。

## r9の修正と検証（2026-10-29）

r8の目視確認は不十分だった。上腕が袖に隠れすぎて肘が高く、前腕との比率が崩れていた。曲げた肘では、二つの回転を混ぜたことで幅が細い折り目へつぶれていた。r8の検証記録を、この問題の解消を証明するものとして扱わない。

r9では、上腕・前腕・手の長さと幅を別々に調整し、袖も肩と同じ支点へ追従させた。腕の中心線と断面を別々に計算し、肘を曲げても断面の幅を維持する。手はimage_genで描き直し、開きすぎた細い指を、丸く自然に寄せた指へ変更した。顔・髪の素材と表情は継続使用する。

目視用の回帰検査画面：
- `tests/fixtures/hinata-anatomy-comparison.html`：上段r8、下段r9。同じ顔・髪・時刻・表情で、待機から手上げまで5段階を比較。
- `tests/fixtures/hinata-pose-review.html`：本番のHinataRigと素材を拡大表示。手首の角度や表情も操作できる。

数値テストは `node --test tests/hinata-rig-math.test.mjs tests/chat-core.test.mjs`。27件合格。顔・骨の長さ・肩の固定・肘の幅・肌の輪郭上の折り返し・手首の接続を検査する。同じ曲げ角度と倍率で、旧変形の肘幅は11.89、新変形は22.00となり、静止時の幅22.00を維持した。数値だけで目視確認を済ませない。

今回、Chromeのローカル画面で、5段階の姿勢、手首、笑顔、本画面の手振り、なでる反応、キーなし会話、390×844の配置、動作オフの保存と再有効化、動きを抑える設定を確認した。スマホ実機・実API・公開サイトの検証ではない。既存の `chat-hinata-motion.test.cjs` は今回、構文確認のみ。過去のブラウザ試験をr9で再実行したとは扱わない。

保存済みのスクリーンショット・試験ログ・ファイルハッシュは、作業フォルダー隣の `hinata-anatomy-evidence-20261029/` に記録する。

## 採用素材

| ファイル | 寸法 | 内容 |
| --- | --- | --- |
| core-v2.png | 1254×1254 | 3列×2行、各418×627。通常・まばたき・会話・笑顔・ウインク・挨拶。顔・首・胴体と短い頭髪は一体 |
| arms-v4.png | 1024×1536 | 左右の連続した腕。小さく丸い手と自然に寄せた指。各512×1536。袖の下へ重ねる |
| arms-v3.png | 1024×1536 | r8比較用の旧腕素材。通常画面では読み込まない |
| hair-v2.png | 1536×1024 | 後ろ髪2束と前髪の横の長い房2束。実際の切り出し範囲はhinata-rig.mjsに定義 |
| portraits-v1.png | 1254×1254 | r5の完成立ち絵。比較用として保持し、r9の動作時には読み込まない |

内蔵image_genで、承認済みの表情絵と元のひなたを参照して作成。生成元：

- core-v2.png: E:/CodexData/home/generated_images/01a0dba2-8b40-7701-830b-a38e6126aeeb/exec-b062960a-b5ca-40be-8fea-e4a4ce08a150.png
- arms-v4.png: E:/CodexData/home/generated_images/01a0dba2-8b40-7701-830b-a38e6126aeeb/exec-1c3739f3-4646-43cc-9a63-a61e2a8ebeaf.png
- arms-v3.png: E:/CodexData/home/generated_images/01a0dba2-8b40-7701-830b-a38e6126aeeb/exec-f65796b8-8f1f-446f-bc10-543e93e2be22.png
- hair-v2.png: E:/CodexData/home/generated_images/01a0dba2-8b40-7701-830b-a38e6126aeeb/exec-fa4db78f-f494-4a28-bf2e-f03636aa69e5.png

動作無効・読み込み失敗時の室内用全身絵は ../characters/hina-indoor.png。白い靴下を残して黒い靴だけ脱いだr6の絵を継続使用する。元画像hina.webpは保持。

## 生成プロンプト

### 顔・首・胴体
```text
Use case: identity-preserve. Production 2D puppet body-core expression atlas.
Image 1 is the approved expression portrait atlas; preserve its exact cute face proportions, purple eyes, soft pale pink hair palette, white sailor blouse, charcoal sailor collar and pink ribbon. Image 2 is the full character identity reference.
Create the CORE LAYER for a layered animation rig. Six aligned waist-up sprites in a strict 3 columns by 2 rows grid on a square transparent canvas, same layout as image 1, each cell exactly the same size. Each cell is the SAME completely connected head, neck and fully covered torso, cropped just below the waist. Face and neck are drawn together without any joint or seam.
Remove BOTH ARMS AND BOTH PUFF SLEEVES entirely because the arms will be separate animated layers. Reconstruct the white blouse shoulder caps behind the arm sockets; modest fully covered torso, no exposed chest. Remove the long back and side hair that hangs below the jaw; this will be a separate flowing hair layer behind the core. Keep the FULL complete head of hair including crown, straight fringe, and face-framing locks ending neatly just below the jaw. Do not leave bald patches. No loose eyes or mouths.
Preserve the same face and size in all six cells. Reuse the identical head outline, neck, body and clothing fold positions in every cell. Body straight-on; gentle friendly face.
Expressions reading order: 1 eyes open, small closed-mouth smile; 2 eyes softly closed for blink, closed mouth; 3 eyes open, small open speaking mouth; 4 both eyes softly closed, happy open-mouth smile; 5 one eye winking and small smile; 6 eyes open, small delighted smile.
Keep each core centered with crown at 4% cell height, eyes at 31%, chin at 43%, shoulders at 52%, waist at 98%. Head width about 58% of cell width; shoulders about 62%. No part crossing a cell boundary. High quality delicate anime lineart and soft clean shading faithful to image 1. All background truly transparent, no labels, no grid lines, no outlines around cutouts.
```

### 旧腕（r8比較用）
```text
Use case: identity-preserve. Transparent game rigging texture.
Reference image 1 supplies the exact soft anime painting style and skin colors of the character. Produce ONE atlas containing TWO separate complete arms, including hands, and NOTHING ELSE.
Two equal columns on a tall transparent canvas. Left column is character's left arm, right column character's right arm, mirrored natural anatomy. Both arms are straight down in a relaxed anatomical rest pose, shoulder at top, fingertips at bottom. Each arm is a single continuous connected painted shape, no cut or elbow seam.
Do not include any torso, face, hair, sleeves, clothes, text, labels or background. These layers will go UNDER the existing white puff sleeves in the rig, so draw rounded fully painted upper shoulder caps to allow overlap. The upper arms are slender and naturally proportioned, elbows halfway along the arm, hands small and graceful with all five fingers softly separated, palm facing the viewer, thumb on the correct side. Soft warm ivory skin matches the reference, subtle rose shadows and delicate lineart. Non-photorealistic, same delicate anime art.
Keep a wide clear transparent gap between the two arms. Both arms exactly the same height. Top shoulder caps at 5% height, elbow at 43%, wrist at 72%, fingertips at 95%. Each arm occupies only the middle 35% width of its column; all fingers and shoulder caps fully within the canvas. Genuine transparent RGBA, clean edges, no shadow halo.
```

### 髪
```text
Use case: identity-preserve. Transparent 2D animation rig hair texture atlas.
Use the reference character's very long, pale pink-lilac, fluffy wavy hair, the same delicate anime lineart and glossy soft shading. Produce FOUR isolated vertical flowing hair pieces in FOUR equal columns, side by side, on one landscape transparent canvas. No head, face, skin, clothes, arms or accessories.
Column 1: broad LEFT back-hair curtain, root at top, long flowing slightly outward S curves and curled tapered ends at bottom.
Column 2: broad RIGHT back-hair curtain, mirrored counterpart.
Column 3: slimmer LEFT front hair lock, flowing long wavy strand with a gently curled fine tip.
Column 4: slimmer RIGHT front hair lock, mirrored counterpart.
Each piece is one continuous connected hair layer from root to ends, numerous fine strands drawn together naturally. Back curtains should be substantially fuller than front locks. Roots smoothly taper so they can hide behind the existing painted head near the ears. The shape is mostly VERTICAL for a mesh to bend later, not a semicircle or an S laid horizontally. No detached tiny hair fragments.
All four pieces have same vertical range, with roots at 5% and ends at 95% of the image height. Center each in its column. Leave at least 8% column width transparent margin on each side. Nothing crosses cell boundaries. True transparent RGBA background, no text, no frame, no shadow halo. Match the reference's pale pink hue precisely.
```

r5の表情絵とr6の室内用全身絵の生成記録はREADME-r6.mdを参照。


### 腕の描き直し（r9 / arms-v4.png）

内蔵image_genを使用。参照画像はarms-v3.pngとcore-v2.png。生成されたRGBA画像をそのまま採用した。

```text
Use case: precise-object-edit. Production transparent arm texture atlas for a cute anime character puppet. Image 1 is the EDIT TARGET, a two-column arm atlas. Image 2 is the character/style REFERENCE. Redraw ONLY the arms and hands in image 1, matching the soft rounded youthful anime anatomy, gentle ivory-pink skin, clean thin rose outlines and soft shading of image 2. Preserve the layout: portrait 1024x1536, exactly two separate full continuous arms in two equal 512-pixel columns. Arms point straight down. Shoulder center about (270,100) in left cell and (240,100) in right cell; elbow y620; wrist y1140; fingertips y1450. No sleeves or torso. The current hands look skeletal and spidery. Make the hands compact, soft and rounded, with a clear palm, four gently grouped fingers of sensible length, rounded finger tips and one clearly attached thumb. Five digits each. Palms face the viewer. Fingers relaxed close together, not widely splayed, not needles, no long pointed fingertips, no extra fingers or wrist joints. Arms have a softly rounded upper arm, identifiable but smooth elbow, and a gently tapering forearm that meets the wrist. Match reference illustration style rather than realism. Both arms mirror each other. Keep the full arm silhouettes within their respective columns with a generous transparent gap. Absolutely transparent RGBA background and crisp transparent edges: NO black/gray background, NO halo, no glowing skin edges, no labels, no objects, no head, no body. Do not redraw the reference character or include any part of it; output only the two arms and hands.
```
