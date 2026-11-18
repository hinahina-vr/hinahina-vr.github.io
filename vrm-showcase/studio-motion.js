const RAD = Math.PI / 180;
const PI2 = Math.PI * 2;

// Original joint curves. All values are relative to the VRM normalized rest pose.
export function applyStudioMotion(slot, time) {
  const { motionId, avatar, choreoState } = slot;
  const { humanoid } = avatar.vrm;
  humanoid.resetNormalizedPose();
  const rotate = (bone, x, y, z) => {
    humanoid.getNormalizedBoneNode(bone)?.rotation.set(x * RAD, y * RAD, z * RAD);
  };

  const tempo = { walk: 1.45, dance_cute: 1.65, dance_pop: 2.0, dance_twist: 1.6, dance_step: 1.8 };
  const kind = motionId.slice('motion:'.length);
  const phase = time * (tempo[kind] ?? 0.3) * PI2;
  const beat = Math.sin(phase);
  const lift = Math.cos(phase);
  const steps = Math.abs(beat);
  const hips = humanoid.getNormalizedBoneNode('hips');

  avatar.model.rotation.y = 0;
  if (kind === 'natural_standing') {
    rotate('leftUpperArm', 0, 0, -68 + beat * 2);
    rotate('rightUpperArm', 0, 0, 68 - beat * 2);
    rotate('leftLowerArm', 0, -10, 0);
    rotate('rightLowerArm', 0, 10, 0);
    rotate('spine', lift * 1.5, 0, beat * 2);
    rotate('head', beat * 1.8, 0, -beat * 2);
    return;
  }

  const walk = kind === 'walk';
  const stride = (walk ? 27 : 14) * beat;
  const offset = walk ? 0.011 : 0.025;
  hips.position.y += offset * steps;
  rotate('leftUpperLeg', stride, 0, walk ? 0 : -3);
  rotate('rightUpperLeg', -stride, 0, walk ? 0 : 3);
  rotate('leftLowerLeg', Math.max(0, -beat) * (walk ? 37 : 22), 0, 0);
  rotate('rightLowerLeg', Math.max(0, beat) * (walk ? 37 : 22), 0, 0);
  rotate('leftFoot', Math.max(0, -beat) * -10, 0, 0);
  rotate('rightFoot', Math.max(0, beat) * -10, 0, 0);

  if (walk) {
    rotate('leftUpperArm', -beat * 20, 0, -70);
    rotate('rightUpperArm', beat * 20, 0, 70);
    rotate('leftLowerArm', -8, -9, 0);
    rotate('rightLowerArm', -8, 9, 0);
    rotate('spine', 3, beat * 6, 0);
    rotate('head', -2, -beat * 4, beat * 2);
    return;
  }

  const styles = {
    dance_cute: { left: -35, right: 35, arms: 25, reach: 20, yaw: 8, sway: 8, sideStep: 0.021 },
    dance_pop: { left: -30, right: 30, arms: 57, reach: 34, yaw: 16, sway: 7, sideStep: 0.025 },
    dance_twist: { left: -47, right: 47, arms: 18, reach: 24, yaw: 32, sway: 4, sideStep: 0.018 },
    dance_step: { left: -41, right: 41, arms: 32, reach: 23, yaw: 11, sway: 10, sideStep: 0.085 },
  };
  const move = styles[kind];
  hips.position.x += beat * move.sideStep;
  rotate('hips', 0, beat * move.yaw * 0.55, -beat * move.sway * 0.4);
  rotate('spine', 2 * lift, -beat * move.yaw, beat * move.sway);
  rotate('head', 3 * lift, beat * move.yaw * 0.3, -beat * move.sway * 0.7);
  rotate('leftUpperArm', -move.reach * lift, 0, move.left + move.arms * beat);
  rotate('rightUpperArm', move.reach * lift, 0, move.right + move.arms * beat);
  rotate('leftLowerArm', -18 - 20 * steps, -15, 0);
  rotate('rightLowerArm', -18 - 20 * steps, 15, 0);
  choreoState.emo = 'happy';
  choreoState.emoW = 0.55 + 0.25 * steps;
  choreoState.vowel = 'oh';
  choreoState.vowelW = 0.3 + 0.2 * steps;
}
