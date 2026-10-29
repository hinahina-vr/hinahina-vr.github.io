# ひなたの表情差分（20261029-r5）

内蔵 image_gen で生成。参照は `../characters/hina.webp`。採用画像は `portraits-v1.png`（1254×1254、透過PNG）。3列×2行、各418×627。順に通常・まばたき・会話・笑顔・ウインク・挨拶。

顔・首・肩・衣装まで描かれた完成した立ち絵を切り替える。目・眉・口を別々に重ねる方式は廃止した。PixiJSは表情の切り替えと控えめな立ち絵全体の傾きに使う。Cubismモデルではない。全フレームの描画倍率と基準点は共通。PC表示の裁ち落とし部分はCSSマスクでなじませる。

旧パーツは作業記録の `hinata-coherent-20261029/old-art` に退避し、サイトでは配信しない。元の立ち絵は資料として保持する。20261029-r6から、しぐさ無効・読み込み失敗・WebGL無効時には、白い靴下を残して黒い靴だけ脱いだ室内用の `../characters/hina-indoor.png` を表示する。

生成元: `E:/CodexData/home/generated_images/01a0dba2-8b40-7701-830b-a38e6126aeeb/exec-10b40918-e800-4fdb-8a65-ec34406e6f8c.png`

## 生成プロンプト

```text
Use case: identity-preserve.
Asset type: production anime visual-novel character expression sprite atlas for a website.
Input image 1 is the character identity and illustration style reference: Hakamada Hinata from Ro-Kyu-Bu. Preserve her soft fluffy very long pale pink-lilac hair, straight fringe, big purple eyes, petite round face, white sailor blouse with charcoal collar and pink ribbon, short puff sleeves. Innocent, fully clothed, wholesome and adorable.
Create ONE transparent PNG atlas with EXACTLY SIX complete waist-up portrait sprites, arranged in a precise 3 columns by 2 rows grid. Desired full canvas 1536x1536; each cell 512x768. No labels, no grid lines, no text. Transparent background, no shadows/background cards.
Each cell shows the SAME coherent fully painted character from crown to hips, centered, straight on, no head tilt. Face, eyes, mouth, ears, hair, neck, shoulders, arms and clothing must be one anatomically integrated illustration. No detachable parts or blank faces. Thin delicate lineart, soft watercolor-like shading, detailed airy hair, natural face proportions matching the reference.
All six are animation replacement frames: EXACT same camera, head size, skull outline, facial landmark placement, shoulder height, body silhouette, hair silhouette, and clothing folds. Copy the base drawing across frames and change only the requested expression, except the last raised hand. Crown at cell y=30, eye baseline at y=205, chin at y=285, shoulders at y=350, waist near y=710. Character centered x=256. Hair contained between x=25 and x=487. Hands relaxed near waist in frames 1-5. Keep identical body and hair in frames 1-5.
Reading order:
1 top left: relaxed warm closed-mouth smile, both purple eyes open.
2 top middle: natural blink, both eyelids closed softly, SAME relaxed closed-mouth smile.
3 top right: speaking, both eyes open, small softly open smiling mouth. No large black mouth.
4 bottom left: delighted smile, both eyes gently closed into happy curves, small open happy mouth, subtle blush.
5 bottom middle: playful wink, one purple eye open, other closed, gentle smiling mouth. Same head and body alignment.
6 bottom right: greeting, both purple eyes open and small open smile, one hand lifted beside shoulder in a small friendly wave, anatomically correct fingers, same head, face and torso placement.
Priority: consistency and beautiful complete faces. Never floating eyes or pasted mouth. No exposed joints, neck seams, duplicated limbs, disembodied features. No deformation, fisheye, photorealism, sexualization, logos or watermark.
```

## 室内用の全身絵（20261029-r6）

内蔵 image_gen で `hina.webp` を参照して生成。保存先: `../characters/hina-indoor.png`（1024×1536 RGBA、透過背景）。白い靴下を残して、両足の黒い靴・ストラップ・靴底を除いた。元のWebPは保存している。生成元: `E:/CodexData/home/generated_images/01a0dba2-8b40-7701-830b-a38e6126aeeb/exec-495480ad-1e0e-444b-a98d-53e66470340c.png`。

```text
Edit this full-body illustration for an indoor scene. Keep the character's existing white socks on. Replace only the black shoes with the visible continuation of those opaque white cotton socks, covering the entire foot. Remove the black straps, heels and soles. Do not expose any additional skin. Keep the face, hairstyle, clothes, body pose, leg positions, framing and all other details unchanged. Keep both feet inside the frame. Transparent background. No text, no props. This is a normal clothing edit for a game character standing indoors.
```
