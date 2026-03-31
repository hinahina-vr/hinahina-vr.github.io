import { describe, expect, it } from "vitest";

import { deriveProfileSnapshot } from "../src/persona";

describe("deriveProfileSnapshot", () => {
  it("learns topic affinity and changes stage over time", () => {
    const snapshot = deriveProfileSnapshot(null, "秋葉原でプリン食べたい", 4);

    expect(snapshot.favoriteTopics).toContain("秋葉原");
    expect(snapshot.favoriteTopics).toContain("プリン");
    expect(snapshot.akibaMode).toBe(true);
    expect(snapshot.relationshipStage).toBe("regular");
  });

  it("detects low mood without becoming formal", () => {
    const snapshot = deriveProfileSnapshot(null, "今日はちょっとしんどいし寂しい", 1);

    expect(snapshot.lastMood).toBe("しょんぼり");
    expect(snapshot.relationshipStage).toBe("new_friend");
  });
});
