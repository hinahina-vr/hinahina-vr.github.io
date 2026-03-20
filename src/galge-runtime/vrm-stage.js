import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { LRUCache } from "./lru-cache.js";

const CACHE_LIMIT = 3;
const EMOTION_KEYS = ["happy", "angry", "sad", "surprised"];
const DEFAULT_Y_POSE = {
  leftUpperArm: { z: 0.92, y: -0.14 },
  rightUpperArm: { z: -0.92, y: 0.14 },
  leftLowerArm: { z: 0.08 },
  rightLowerArm: { z: -0.08 },
};

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isSameModelRecord(left, right) {
  if (!left || !right) {
    return false;
  }
  return (
    left.fileName === right.fileName &&
    left.size === right.size &&
    left.updatedAt === right.updatedAt
  );
}

export class VRMStage {
  constructor({ host, canvas, placeholder, getLipSyncLevel }) {
    this.host = host;
    this.canvas = canvas;
    this.placeholder = placeholder;
    this.getLipSyncLevel = getLipSyncLevel;
    this.cache = new LRUCache(CACHE_LIMIT);
    this.currentEntry = null;
    this.currentSpeakerKey = null;
    this.currentEmotion = "neutral";
    this.stageToken = 0;
    this.disabled = false;
    this.elapsed = 0;
    this.nextBlinkAt = 1.5;
    this.blinkWeight = 0;
    this.lookAtTarget = new THREE.Object3D();

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
      });
    } catch (error) {
      console.warn("VRM stage disabled:", error);
      this.disabled = true;
      this.host.classList.add("is-disabled");
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 40);
    this.camera.position.set(0, 1.45, 1.8);
    this.scene.add(this.lookAtTarget);

    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
    const directional = new THREE.DirectionalLight(0xffffff, 1.8);
    directional.position.set(1, 1.4, 1.2);
    this.scene.add(ambient);
    this.scene.add(directional);

    this.clock = new THREE.Clock();
    this.resize();
    this.renderLoop();
  }

  resize() {
    if (this.disabled) {
      return;
    }

    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  renderLoop = () => {
    if (this.disabled) {
      return;
    }

    requestAnimationFrame(this.renderLoop);
    const delta = this.clock.getDelta();
    this.elapsed += delta;
    this.updateBlink(delta);
    this.updateLookAtTarget();
    this.updateActiveEntry(delta);
    this.renderer.render(this.scene, this.camera);
  };

  updateBlink(delta) {
    if (!this.currentEntry) {
      return;
    }

    if (this.elapsed >= this.nextBlinkAt) {
      const phase = (this.elapsed - this.nextBlinkAt) / 0.16;
      if (phase >= 1) {
        this.blinkWeight = 0;
        this.nextBlinkAt = this.elapsed + 2 + Math.random() * 2.5;
      } else {
        const fold = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
        this.blinkWeight = clamp(fold, 0, 1);
      }
    } else {
      this.blinkWeight = 0;
    }
  }

  updateLookAtTarget() {
    if (!this.currentEntry) {
      return;
    }

    this.lookAtTarget.position.set(0, this.camera.position.y, 0.2);
  }

  updateActiveEntry(delta) {
    if (!this.currentEntry) {
      return;
    }

    const { entry } = this.currentEntry;
    const manager = entry.vrm.expressionManager;
    const lipSyncLevel = clamp(this.getLipSyncLevel(), 0, 1);

    if (manager) {
      for (const emotion of EMOTION_KEYS) {
        manager.setValue(emotion, emotion === this.currentEmotion ? 1 : 0);
      }
      manager.setValue("blink", this.blinkWeight);
      manager.setValue("aa", this.currentEmotion === "neutral" ? lipSyncLevel * 0.6 : lipSyncLevel * 0.3);
    }

    const sway = Math.sin(this.elapsed * 1.3) * 0.015;
    entry.container.rotation.y = sway;
    entry.container.rotation.z = Math.cos(this.elapsed * 1.1) * 0.012;
    entry.container.position.x = Math.sin(this.elapsed * 0.5) * 0.02;
    entry.vrm.update(delta);
  }

  disposeEntry(entry) {
    if (!entry || entry === this.currentEntry?.entry) {
      return;
    }
    VRMUtils.deepDispose(entry.vrm.scene);
  }

  async resolveEntry(record) {
    const cacheKey = `${record.fileName}:${record.updatedAt}:${record.size}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const objectUrl = URL.createObjectURL(record.blob);
    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await loader.loadAsync(objectUrl);
      const vrm = gltf.userData.vrm;
      if (!vrm) {
        throw new Error("VRM metadata not found");
      }
      VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse((object3d) => {
        object3d.frustumCulled = false;
      });
      const container = new THREE.Group();
      container.add(vrm.scene);
      if (vrm.lookAt) {
        vrm.lookAt.target = this.lookAtTarget;
      }
      const entry = { cacheKey, vrm, container };
      const eviction = this.cache.set(cacheKey, entry);
      if (eviction) {
        this.disposeEntry(eviction.evictedValue);
      }
      return entry;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  clearCurrentFromScene() {
    if (this.currentEntry?.entry?.container?.parent === this.scene) {
      this.scene.remove(this.currentEntry.entry.container);
    }
  }

  applyTuning(entry, record) {
    const scale = Number.isFinite(record.scale) ? record.scale : 1;
    const yOffset = Number.isFinite(record.yOffset) ? record.yOffset : 0;
    entry.container.scale.setScalar(scale);
    entry.container.position.set(0, yOffset, 0);
  }

  applyBasePose(entry) {
    const humanoid = entry.vrm.humanoid;
    if (!humanoid?.getNormalizedBoneNode) {
      return;
    }

    humanoid.resetNormalizedPose?.();

    for (const [boneName, rotation] of Object.entries(DEFAULT_Y_POSE)) {
      const bone = humanoid.getNormalizedBoneNode(boneName);
      if (!bone) {
        continue;
      }
      bone.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
    }
  }

  autoFrame(entry) {
    entry.container.updateMatrixWorld(true);
    const headNode = entry.vrm.humanoid?.getNormalizedBoneNode?.("head");
    const headPosition = headNode
      ? headNode.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3(0, 1.4, 0);
    this.camera.position.set(0, headPosition.y + 0.08, 1.85);
    this.lookAtTarget.position.set(headPosition.x, headPosition.y, 0.2);
    this.camera.lookAt(this.lookAtTarget.position);
  }

  async setSpeaker({ speakerKey, modelRecord, emotion }) {
    this.stageToken += 1;
    const token = this.stageToken;
    this.currentEmotion = emotion || "neutral";

    if (this.disabled || !modelRecord) {
      this.currentSpeakerKey = speakerKey;
      this.hide();
      return { visible: false };
    }

    if (
      this.currentSpeakerKey === speakerKey &&
      this.currentEntry &&
      isSameModelRecord(this.currentEntry.record, modelRecord)
    ) {
      this.currentEntry.record = modelRecord;
      this.applyBasePose(this.currentEntry.entry);
      this.applyTuning(this.currentEntry.entry, modelRecord);
      this.autoFrame(this.currentEntry.entry);
      this.placeholder.textContent = modelRecord.fileName || "モデルを表示中";
      this.host.classList.add("is-visible");
      return { visible: true, reused: true };
    }

    this.currentSpeakerKey = speakerKey;

    this.host.classList.remove("is-visible");
    await sleep(120);
    if (token !== this.stageToken) {
      return { visible: false };
    }

    try {
      const entry = await this.resolveEntry(modelRecord);
      if (token !== this.stageToken) {
        return { visible: false };
      }

      this.clearCurrentFromScene();
      this.currentEntry = { record: modelRecord, entry };
      this.applyBasePose(entry);
      this.applyTuning(entry, modelRecord);
      this.autoFrame(entry);
      this.scene.add(entry.container);
      this.placeholder.textContent = modelRecord.fileName || "モデルを表示中";
      this.host.classList.add("is-visible");
      return { visible: true };
    } catch (error) {
      console.warn(`VRM load failed for ${speakerKey}:`, error);
      this.hide();
      return { visible: false, error };
    }
  }

  hide() {
    this.currentEmotion = "neutral";
    this.clearCurrentFromScene();
    this.currentEntry = null;
    this.placeholder.textContent = "モデル未設定";
    this.host.classList.remove("is-visible");
  }
}
