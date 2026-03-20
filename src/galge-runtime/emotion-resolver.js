const VALID_EMOTIONS = new Set([
  "neutral",
  "happy",
  "sad",
  "angry",
  "surprised",
]);

const EMOTION_RULES = [
  { emotion: "happy", pattern: /笑|微笑|穏|えへへ|ふふ/ },
  { emotion: "surprised", pattern: /驚|目を見開|きらきら|輝/ },
  { emotion: "sad", pattern: /悲|寂|涙|沈黙|かすれ|痛み/ },
  { emotion: "angry", pattern: /怒|険|強|ビーム|ふいっと|睨/ },
];

export function resolveEmotion(explicitEmotion, expression = "") {
  if (VALID_EMOTIONS.has(explicitEmotion)) {
    return explicitEmotion;
  }

  for (const rule of EMOTION_RULES) {
    if (rule.pattern.test(expression)) {
      return rule.emotion;
    }
  }

  return "neutral";
}

export function isValidEmotion(value) {
  return VALID_EMOTIONS.has(value);
}
