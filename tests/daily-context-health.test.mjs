import assert from "node:assert/strict";
import {
  buildBungouStyleRecommendation,
  buildSearchDateRangeForLocalDay,
  buildCandidateTopics,
  renderDailyContextBlock,
  renderBungouStyleBlock,
  upsertBungouStyleBlock,
} from "../scripts/lib/daily-context.mjs";
import {
  buildHealthCandidateTopics,
  normalizeHealthExport,
  renderHealthSourceLines,
} from "../scripts/lib/health-context.mjs";

const CONFIG = {
  source: "huawei-health-kit-android",
};

function createBaseNormalized(overrides = {}) {
  return {
    date: "2026-03-16",
    timezone: "Asia/Tokyo",
    generatedAt: "2026-03-16T14:51:55.018Z",
    sources: {
      swarm: {
        status: "ok",
        note: null,
        sourceUrl: "https://ja.swarmapp.com/history",
        items: [
          {
            checkedInAt: "2026-03-16T11:15:00.000Z",
            venueName: "華強北路",
            venueArea: "深圳",
            venueUrl: "https://example.com/venues/1",
            shout: "基板を見てまわった",
            sourceUrl: "https://example.com/checkin/1",
          },
        ],
      },
      x: {
        status: "ok",
        note: null,
        sourceUrl: "https://x.com/hinahina_vr",
        items: [
          {
            postedAt: "2026-03-16T12:00:00.000Z",
            tweetId: "1",
            text: "深圳の部材街を歩き回った",
            tweetUrl: "https://x.com/hinahina_vr/status/1",
            kind: "post",
            mediaUrls: [],
          },
        ],
      },
      health: {
        status: "ok",
        note: null,
        source: "huawei-health-kit-android",
        exportedAt: "2026-03-16T14:51:55.018Z",
        device: {
          watchModel: "HUAWEI WATCH FIT 4 Pro",
          phonePlatform: "android",
        },
        summary: {
          sleep: {
            totalMinutes: 372,
            deepMinutes: 83,
            lightMinutes: 208,
            remMinutes: 61,
            awakeMinutes: 20,
            startAt: "2026-03-15T18:42:00.000Z",
            endAt: "2026-03-16T00:54:00.000Z",
          },
          activity: {
            steps: 8431,
            distanceMeters: 5920,
            activeCaloriesKcal: 524,
            exerciseMinutes: 47,
          },
          vitals: {
            restingHeartRateBpm: 63,
            averageHeartRateBpm: 71,
            minSpO2Pct: 96,
          },
        },
      },
    },
    candidateTopics: [],
    ...overrides,
  };
}

function testNormalizeHealthExport() {
  const normalized = normalizeHealthExport({
    status: "ok",
    date: "2026-03-16",
    timezone: "Asia/Tokyo",
    exportedAt: "2026-03-16T23:58:12+09:00",
    device: {
      watchModel: "HUAWEI WATCH FIT 4 Pro",
      phonePlatform: "android",
    },
    summary: {
      sleep: {
        totalMinutes: 372,
        deepMinutes: 83,
        lightMinutes: 208,
        remMinutes: 61,
        awakeMinutes: 20,
      },
      activity: {
        steps: 8431,
        distanceMeters: 5920,
        activeCaloriesKcal: 524.4,
        exerciseMinutes: 47,
      },
      vitals: {
        restingHeartRateBpm: 63,
        averageHeartRateBpm: 71,
        minSpO2Pct: 96,
      },
    },
  }, {
    date: "2026-03-16",
    timezone: "Asia/Tokyo",
    config: CONFIG,
  });

  assert.equal(normalized.status, "ok");
  assert.equal(normalized.summary.sleep.totalMinutes, 372);
  assert.equal(normalized.summary.activity.distanceMeters, 5920);
  assert.equal(normalized.summary.vitals.minSpO2Pct, 96);
}

function testNormalizeHealthExportErrorStatus() {
  const normalized = normalizeHealthExport({
    health: {
      status: "error",
      date: "2026-03-16",
      note: "permission denied",
      device: {
        watchModel: "HUAWEI WATCH FIT 4 Pro",
      },
    },
  }, {
    date: "2026-03-16",
    timezone: "Asia/Tokyo",
    config: CONFIG,
  });

  assert.equal(normalized.status, "error");
  assert.equal(normalized.note, "permission denied");
  assert.equal(normalized.summary.sleep.totalMinutes, null);
}

function testRenderHealthSourceLines() {
  const lines = renderHealthSourceLines(createBaseNormalized().sources.health);
  assert(lines.some((line) => line.includes("睡眠: 6時間12分")));
  assert(lines.some((line) => line.includes("8,431歩")));
  assert(lines.some((line) => line.includes("安静時心拍 63bpm")));
  assert(lines.at(-1).includes("診断用途では使わない"));

  const sparse = renderHealthSourceLines({
    status: "ok",
    note: null,
    summary: {
      sleep: {
        totalMinutes: 120,
        deepMinutes: null,
        lightMinutes: null,
        remMinutes: null,
        awakeMinutes: null,
      },
      activity: {
        steps: null,
        distanceMeters: null,
        activeCaloriesKcal: null,
        exerciseMinutes: null,
      },
      vitals: {
        restingHeartRateBpm: null,
        averageHeartRateBpm: null,
        minSpO2Pct: null,
      },
    },
  });
  assert.equal(sparse.filter((line) => line.startsWith("- 生体:")).length, 0);
}

function testDailyContextBlockIncludesHealth() {
  const normalized = createBaseNormalized();
  normalized.candidateTopics = buildCandidateTopics(normalized);
  const block = renderDailyContextBlock(normalized);

  assert(block.includes("### Health"));
  assert(block.includes("- 睡眠: 6時間12分"));
  assert(block.includes("- 活動: 8,431歩 / 5.9km / 524kcal / 運動 47分"));
  assert(block.includes("- 生体: 安静時心拍 63bpm / 平均 71bpm / 最低SpO2 96%"));
}

function testDailyContextBlockKeepsFullXPostText() {
  const longText = "最終回のつづきを勝手に考えてしまって、丘と風と青空と挿入歌が全部そろったので、これは完全に泣くための装置として完成している気がするし、まだ終わってないと言い張りたくなる。";
  const normalized = createBaseNormalized({
    sources: {
      ...createBaseNormalized().sources,
      x: {
        status: "ok",
        note: null,
        sourceUrl: "https://x.com/hinahina_vr",
        items: [
          {
            postedAt: "2026-03-16T12:00:00.000Z",
            tweetId: "99",
            text: longText,
            tweetUrl: "https://x.com/hinahina_vr/status/99",
            kind: "post",
            mediaUrls: [],
          },
        ],
      },
    },
  });
  normalized.candidateTopics = buildCandidateTopics(normalized);

  const block = renderDailyContextBlock(normalized);

  assert(block.includes(`- 21:00 post: ${longText}`));
  assert(!block.includes("まだ終わってないと言い張りたくなる…"));
}

function testHealthTopicsLimit() {
  const topics = buildHealthCandidateTopics(createBaseNormalized().sources.health);
  assert.equal(topics.length, 2);
  assert.deepEqual(topics, ["睡眠 6時間12分", "8,431歩あるいた"]);

  const normalized = createBaseNormalized();
  normalized.candidateTopics = buildCandidateTopics(normalized);
  assert(normalized.candidateTopics.length <= 6);
  const healthTopics = normalized.candidateTopics.filter((topic) => /睡眠|歩あるいた|心拍/.test(topic));
  assert(healthTopics.length <= 2);
}

function testCandidateTopicsStaySourceNeutral() {
  const normalized = createBaseNormalized();
  normalized.sources.health = {
    status: "error",
    note: "skipped",
  };
  normalized.sources.swarm.items[0].shout = null;
  normalized.candidateTopics = buildCandidateTopics(normalized);

  assert(normalized.candidateTopics.some((topic) => topic === "深圳の部材街を歩き回った"));
  assert(normalized.candidateTopics.every((topic) => !topic.includes("華強北路")));
  assert(normalized.candidateTopics.every((topic) => !topic.includes("に行った")));
  assert(normalized.candidateTopics.every((topic) => !topic.includes("に立ち寄った")));
  assert(normalized.candidateTopics.every((topic) => !topic.includes("Swarm")));
  assert(normalized.candidateTopics.every((topic) => !topic.includes("Xの投稿")));
}

function testBuildSearchDateRangeForLocalDay() {
  assert.deepEqual(
    buildSearchDateRangeForLocalDay("2026-04-07", "Asia/Tokyo"),
    { sinceDate: "2026-04-06", untilDate: "2026-04-08" },
  );

  assert.deepEqual(
    buildSearchDateRangeForLocalDay("2026-04-07", "UTC"),
    { sinceDate: "2026-04-07", untilDate: "2026-04-08" },
  );

  assert.deepEqual(
    buildSearchDateRangeForLocalDay("2026-11-01", "America/Los_Angeles"),
    { sinceDate: "2026-11-01", untilDate: "2026-11-03" },
  );
}

function testBungouRecommendationUsesRoundRobinPrimaryAndTopicAlternates() {
  const normalized = createBaseNormalized({
    sources: {
      ...createBaseNormalized().sources,
      swarm: {
        status: "ok",
        note: null,
        sourceUrl: "https://ja.swarmapp.com/history",
        items: [
          {
            checkedInAt: "2026-03-16T11:15:00.000Z",
            venueName: "港の居酒屋",
            venueArea: "横浜",
            venueUrl: "https://example.com/venues/2",
            shout: "旅先で魚とハイボール",
            sourceUrl: "https://example.com/checkin/2",
          },
        ],
      },
      x: {
        status: "ok",
        note: null,
        sourceUrl: "https://x.com/hinahina_vr",
        items: [
          {
            postedAt: "2026-03-16T12:00:00.000Z",
            tweetId: "2",
            text: "旅先の駅前で魚をつつきながら酒を飲んだ",
            tweetUrl: "https://x.com/hinahina_vr/status/2",
            kind: "post",
            mediaUrls: [],
          },
        ],
      },
    },
  });

  normalized.candidateTopics = buildCandidateTopics(normalized);
  const recommendation = buildBungouStyleRecommendation(normalized);

  assert.equal(recommendation.primary.key, "mukouda");
  assert(recommendation.reasons.some((reason) => reason.includes("ラウンドロビン")));
  assert(recommendation.alternates.some((style) => style.key === "kaiko"));
}

function testBungouRecommendationIgnoresVenueOnlySwarm() {
  const normalized = createBaseNormalized({
    sources: {
      ...createBaseNormalized().sources,
      swarm: {
        status: "ok",
        note: null,
        sourceUrl: "https://ja.swarmapp.com/history",
        items: [
          {
            checkedInAt: "2026-03-16T11:15:00.000Z",
            venueName: "港の居酒屋",
            venueArea: "横浜",
            venueUrl: "https://example.com/venues/2",
            shout: null,
            sourceUrl: "https://example.com/checkin/2",
          },
        ],
      },
      x: {
        status: "ok",
        note: null,
        sourceUrl: "https://x.com/hinahina_vr",
        items: [
          {
            postedAt: "2026-03-16T12:00:00.000Z",
            tweetId: "3",
            text: "AIと世界の構造を考えている",
            tweetUrl: "https://x.com/hinahina_vr/status/3",
            kind: "post",
            mediaUrls: [],
          },
        ],
      },
    },
  });

  normalized.candidateTopics = buildCandidateTopics(normalized);
  const recommendation = buildBungouStyleRecommendation(normalized);

  assert(normalized.candidateTopics.every((topic) => !topic.includes("港の居酒屋")));
  assert(normalized.candidateTopics.every((topic) => !topic.includes("横浜")));
  assert(recommendation.reasons.every((reason) => !reason.includes("移動や現場の手触り")));
}

function testBungouStyleBlockIsInsertedBeforeDailyContext() {
  const recommendation = {
    primary: { key: "dazai", label: "太宰治", school: "知層塾" },
    alternates: [{ key: "banana", label: "吉本ばなな", school: "耽美塾" }],
    reasons: ["弱さや疲労や自己嫌悪が主題に近い"],
    notes: ["口語で、自意識とだめさを真正面から引き受ける"],
  };

  const block = renderBungouStyleBlock(recommendation);
  const original = `# 2026-04-10 下書き

## 元ネタ・話題候補

- 眠い

## 方針メモ

- 文豪AI【文】は \`hoshi\` / 星新一 で行く。古いメモ
- 既存のメモ

<!-- daily-context:start -->
## 今日のメモ（自動）
<!-- daily-context:end -->
`;

  const updated = upsertBungouStyleBlock(original, block);
  assert(updated.includes("## 文豪AIメモ（自動）"));
  assert(updated.includes("- 採用文豪AI: `dazai` / 太宰治（知層塾）"));
  assert(!updated.includes("- 文豪AI【文】は `hoshi` / 星新一 で行く。古いメモ"));
  assert(updated.indexOf("## 文豪AIメモ（自動）") < updated.indexOf("<!-- daily-context:start -->"));
}

function run() {
  testNormalizeHealthExport();
  testNormalizeHealthExportErrorStatus();
  testRenderHealthSourceLines();
  testDailyContextBlockIncludesHealth();
  testDailyContextBlockKeepsFullXPostText();
  testHealthTopicsLimit();
  testCandidateTopicsStaySourceNeutral();
  testBuildSearchDateRangeForLocalDay();
  testBungouRecommendationUsesRoundRobinPrimaryAndTopicAlternates();
  testBungouRecommendationIgnoresVenueOnlySwarm();
  testBungouStyleBlockIsInsertedBeforeDailyContext();
  console.log("daily-context health tests passed");
}

run();
