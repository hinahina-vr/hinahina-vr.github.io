import { AnimationMixer, Group, LoadingManager } from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from './vendor/three-vrm.module.js';
import {
  createVRMAnimationClip,
  VRMAnimationLoaderPlugin,
  VRMLookAtQuaternionProxy,
} from './vendor/three-vrm-animation.module.js';

function requireEmbeddedGlb(bytes) {
  if (bytes.byteLength < 20) throw new Error('バイナリ形式のVRMまたはVRMAを指定してください。');
  const header = new DataView(bytes);
  const jsonLength = header.getUint32(12, true);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 ||
      header.getUint32(8, true) !== bytes.byteLength || header.getUint32(16, true) !== 0x4e4f534a ||
      jsonLength > bytes.byteLength - 20) {
    throw new Error('バイナリ形式のVRMまたはVRMAを指定してください。');
  }
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength)));
  const resources = [...(json.buffers ?? []), ...(json.images ?? [])];
  if (resources.some(resource => resource.uri && !/^data:/i.test(resource.uri))) {
    throw new Error('外部リソースを参照しています。埋め込み形式のファイルを使用してください。');
  }
}

function embeddedFileLoader(plugin) {
  const manager = new LoadingManager();
  manager.setURLModifier(url => {
    if (/^(blob:|data:)/i.test(url)) return url;

    throw new Error('外部リソースを参照しています。埋め込み形式のファイルを使用してください。');
  });
  return new GLTFLoader(manager).register(plugin);
}

export async function parseAvatar(bytes) {
  requireEmbeddedGlb(bytes);
  const file = await embeddedFileLoader(parser => new VRMLoaderPlugin(parser)).parseAsync(bytes, '');
  const vrm = file.userData.vrm;
  if (!vrm?.humanoid) {
    VRMUtils.deepDispose(file.scene);
    throw new Error('VRM 0.x または VRM 1.0 のモデルを指定してください。');
  }

  VRMUtils.rotateVRM0(vrm);
  vrm.scene.updateMatrixWorld(true);
  return vrm;
}

export function disposeAvatar(vrm) {
  vrm.scene.removeFromParent();
  VRMUtils.deepDispose(vrm.scene);
}

export class StudioAvatar {
  constructor(scene) {
    this.vrm = null;
    this.stageRoot = new Group();
    scene.add(this.stageRoot);
    this.mixer = null;
    this.action = null;
    this.playing = false;
    this.lookAtProxy = null;
  }

  get model() {
    return this.vrm ? this.stageRoot : null;
  }

  get springManager() {
    return this.vrm?.springBoneManager;
  }

  use(vrm) {
    this.clearAnimation();
    if (this.vrm) disposeAvatar(this.vrm);
    this.vrm = vrm;
    this.stageRoot.rotation.set(0, 0, 0);
    this.stageRoot.position.set(0, 0, 0);
    this.stageRoot.add(vrm.scene);
    vrm.scene.updateMatrixWorld(true);

    if (vrm.lookAt) {
      this.lookAtProxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
      this.lookAtProxy.name = 'studioLookAt';
      vrm.scene.add(this.lookAtProxy);
    }
  }

  clearAnimation() {
    this.playing = false;
    this.mixer?.stopAllAction();
    if (this.mixer) this.mixer.uncacheRoot(this.vrm.scene);
    this.mixer = null;
    this.action = null;
    this.lookAtProxy?.removeFromParent();
    this.lookAtProxy = null;
  }

  async readAnimation(file) {
    const bytes = await file.arrayBuffer();
    requireEmbeddedGlb(bytes);
    const parsed = await embeddedFileLoader(parser => new VRMAnimationLoaderPlugin(parser)).parseAsync(bytes, '');
    try {
      const animation = parsed.userData.vrmAnimations?.[0];
      if (!animation) throw new Error('VRMA のモーションが見つかりませんでした。');
      return animation;
    } finally {
      VRMUtils.deepDispose(parsed.scene);
    }
  }

  useAnimation(animation) {
    const clip = createVRMAnimationClip(animation, this.vrm);
    this.mixer?.stopAllAction();
    if (this.mixer) this.mixer.uncacheRoot(this.vrm.scene);
    this.mixer = new AnimationMixer(this.vrm.scene);
    this.action = this.mixer.clipAction(clip);
  }

  tick(delta) {
    if (this.playing) this.mixer.update(delta);
    this.vrm?.update(delta);
  }
}
