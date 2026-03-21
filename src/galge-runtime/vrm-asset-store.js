const DB_NAME = "waddyGalgeAssets";
import { normalizeVoiceApiConfig } from "./voice-api-config.js";

const DB_VERSION = 2;
const SPEAKER_STORE = "speakerModels";
const SPEAKER_VOICE_STORE = "speakerVoiceConfigs";
const META_STORE = "appMeta";
const SHARED_FALLBACK_KEY = "sharedFallbackModel";

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withTransaction(db, storeNames, mode, handler) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    handler(tx);
  });
}

export class VRMAssetStore {
  constructor() {
    this.dbPromise = null;
  }

  async open() {
    if (!("indexedDB" in window)) {
      throw new Error("このブラウザでは IndexedDB が利用できません。");
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(SPEAKER_STORE)) {
            db.createObjectStore(SPEAKER_STORE, { keyPath: "speakerKey" });
          }
          if (!db.objectStoreNames.contains(SPEAKER_VOICE_STORE)) {
            db.createObjectStore(SPEAKER_VOICE_STORE, { keyPath: "speakerKey" });
          }
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE, { keyPath: "key" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  async getSpeakerModel(speakerKey) {
    const db = await this.open();
    const tx = db.transaction(SPEAKER_STORE, "readonly");
    const store = tx.objectStore(SPEAKER_STORE);
    return promisifyRequest(store.get(speakerKey));
  }

  async getSpeakerModels(speakerKeys) {
    const pairs = await Promise.all(
      speakerKeys.map(async (speakerKey) => [speakerKey, await this.getSpeakerModel(speakerKey)])
    );
    return Object.fromEntries(pairs);
  }

  async getSpeakerVoiceConfig(speakerKey) {
    const db = await this.open();
    const tx = db.transaction(SPEAKER_VOICE_STORE, "readonly");
    const store = tx.objectStore(SPEAKER_VOICE_STORE);
    const record = await promisifyRequest(store.get(speakerKey));
    if (!record) {
      return null;
    }
    const config = normalizeVoiceApiConfig(record);
    return config
      ? {
          speakerKey,
          ...config,
          updatedAt: record.updatedAt || 0,
        }
      : null;
  }

  async getSpeakerVoiceConfigs(speakerKeys) {
    const pairs = await Promise.all(
      speakerKeys.map(async (speakerKey) => [
        speakerKey,
        await this.getSpeakerVoiceConfig(speakerKey),
      ])
    );
    return Object.fromEntries(pairs);
  }

  async saveSpeakerVoiceConfig(speakerKey, config) {
    const normalized = normalizeVoiceApiConfig(config);
    if (!normalized) {
      return null;
    }

    const record = {
      speakerKey,
      provider: normalized.provider,
      settings: normalized.settings,
      updatedAt: Date.now(),
    };

    const db = await this.open();
    await withTransaction(db, [SPEAKER_VOICE_STORE], "readwrite", (tx) => {
      tx.objectStore(SPEAKER_VOICE_STORE).put(record);
    });

    return record;
  }

  async deleteSpeakerVoiceConfig(speakerKey) {
    const db = await this.open();
    await withTransaction(db, [SPEAKER_VOICE_STORE], "readwrite", (tx) => {
      tx.objectStore(SPEAKER_VOICE_STORE).delete(speakerKey);
    });
  }

  async saveSpeakerModel(speakerKey, file) {
    const db = await this.open();
    const existing = await this.getSpeakerModel(speakerKey);
    const record = {
      speakerKey,
      blob: file,
      fileName: file.name || existing?.fileName || `${speakerKey}.vrm`,
      size: file.size,
      updatedAt: Date.now(),
      scale: existing?.scale ?? 1,
      yOffset: existing?.yOffset ?? 0,
    };

    await withTransaction(db, [SPEAKER_STORE], "readwrite", (tx) => {
      tx.objectStore(SPEAKER_STORE).put(record);
    });

    return record;
  }

  async deleteSpeakerModel(speakerKey) {
    const db = await this.open();
    await withTransaction(db, [SPEAKER_STORE], "readwrite", (tx) => {
      tx.objectStore(SPEAKER_STORE).delete(speakerKey);
    });
  }

  async updateSpeakerModelTuning(speakerKey, tuning) {
    const record = await this.getSpeakerModel(speakerKey);
    if (!record) {
      return null;
    }

    const nextRecord = {
      ...record,
      scale: Number.isFinite(tuning.scale) ? tuning.scale : record.scale,
      yOffset: Number.isFinite(tuning.yOffset) ? tuning.yOffset : record.yOffset,
      updatedAt: Date.now(),
    };

    const db = await this.open();
    await withTransaction(db, [SPEAKER_STORE], "readwrite", (tx) => {
      tx.objectStore(SPEAKER_STORE).put(nextRecord);
    });

    return nextRecord;
  }

  async saveSharedFallbackFromSpeaker(speakerKey) {
    const record = await this.getSpeakerModel(speakerKey);
    if (!record) {
      return null;
    }

    const sharedRecord = {
      key: SHARED_FALLBACK_KEY,
      blob: record.blob,
      fileName: record.fileName,
      size: record.size,
      updatedAt: Date.now(),
      scale: record.scale,
      yOffset: record.yOffset,
    };

    const db = await this.open();
    await withTransaction(db, [META_STORE], "readwrite", (tx) => {
      tx.objectStore(META_STORE).put(sharedRecord);
    });

    return sharedRecord;
  }

  async getSharedFallbackModel() {
    const db = await this.open();
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    return promisifyRequest(store.get(SHARED_FALLBACK_KEY));
  }

  async deleteSharedFallbackModel() {
    const db = await this.open();
    await withTransaction(db, [META_STORE], "readwrite", (tx) => {
      tx.objectStore(META_STORE).delete(SHARED_FALLBACK_KEY);
    });
  }

  async getSummaryForScenario(chars) {
    const speakerKeys = Object.keys(chars).filter((speakerKey) => speakerKey !== "narrator");
    const records = await this.getSpeakerModels(speakerKeys);
    const dedicatedCount = speakerKeys.filter((speakerKey) => Boolean(records[speakerKey])).length;
    const fallbackRecord = await this.getSharedFallbackModel();

    return {
      speakerKeys,
      dedicatedCount,
      relevantCount: speakerKeys.length,
      fallbackRecord,
      records,
    };
  }
}
