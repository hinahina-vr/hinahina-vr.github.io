import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { armPoint, corePoint, armAngles, ARM_SCALE, ARM_ATTACH, HAND_SCALE, ARM_PINS, sleevePoint, rotate } from '../src/chat/hinata-rig-math.mjs';

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('Head motion keeps the eyes, mouth and chin in one rigid face', () => {
  const landmarks = [[165, 240], [295, 240], [230, 290], [230, 312]];
  for (const angle of [-.14, -.05, 0, .05, .14]) {
    const moved = landmarks.map(([x, y]) => corePoint(x, y, angle, .8));
    for (let i = 0; i < landmarks.length; i++) {
      for (let j = i + 1; j < landmarks.length; j++) {
        close(distance(moved[i], moved[j]), distance(landmarks[i], landmarks[j]));
      }
    }
  }
});

test('The neck transition stays continuous and the lower blouse stays anchored', () => {
  for (const angle of [-.14, .14]) {
    for (const x of [100, 230, 370]) {
      for (const boundary of [330, 425]) {
        assert.ok(distance(corePoint(x, boundary - 1e-4, angle), corePoint(x, boundary + 1e-4, angle)) < .001);
      }
      assert.deepEqual(corePoint(x, 500, angle, 1), [x, 500]);
    }
  }
});

test('Painted shoulder pins stay attached throughout the gesture', () => {
  for(const right of [false,true]) {
    const {shoulder}=ARM_PINS[right?'right':'left'];
    for(let t=0;t<14;t+=.7) for(const wave of [0,.5,1]) close(distance(armPoint(...shoulder,armAngles(t,1.25,wave,1,right),right),[0,0]),0);
  }
});

test('Pose-based articulation preserves the shoulder-elbow and elbow-wrist bone lengths', () => {
  for(const right of [false,true]) {
    const {shoulder:S,elbow:E,wrist:W}=ARM_PINS[right?'right':'left'];
    for(let t=0;t<14;t+=.7) for(const wave of [0,.5,1]) {
      const pose=armAngles(t,1.25,wave,1,right),e=armPoint(...E,pose,right),w=armPoint(...W,pose,right);
      close(distance(e,[0,0]),distance(E,S));close(distance(w,e),distance(W,E));
    }
  }
});

test('A wave moves the hand visibly while keeping a small offset from the painted bent elbow', () => {
  const tip=[620,85],rest=armPoint(...tip,armAngles(.34,1.25,0,0,true),true),raised=armPoint(...tip,armAngles(.34,1.25,1,0,true),true);
  assert.ok(distance(rest,raised)*ARM_SCALE>70);
  for(let t=0;t<30;t+=.2) for(const wave of [0,.25,.5,.75,1]) {
    const [shoulder,elbow,wrist]=armAngles(t,1.25,wave,1,true);
    assert.ok(Math.abs(shoulder)<.12);
    assert.ok(Math.abs(elbow)<.31,'Do not fold a straight texture through a large angle again');
    assert.ok(Math.abs(wrist)<=.14);
  }
});

test('Wrist waving moves fingers without pulling the elbow and wrist pins', () => {
  const {elbow,wrist}=ARM_PINS.right;
  for(const p of [elbow,wrist])close(distance(armPoint(...p,[-.09,-.28,0],true),armPoint(...p,[-.09,-.28,.14],true)),0);
  assert.ok(distance(armPoint(620,85,[-.09,-.28,0],true),armPoint(620,85,[-.09,-.28,.14],true))*ARM_SCALE>7);
});

test('Sleeves follow shoulder rotation without moving facial landmarks', () => {
  for(const angle of [-.12,0,.08]) {
    for(const right of [false,true]){
      const pivot=ARM_ATTACH[right?'right':'left'],x=right?350:120,y=430;
      const moved=sleevePoint(x,y,right?0:angle,right?angle:0);
      const expected=rotate(x-pivot[0],(y-pivot[1])*.85,angle).map((n,i)=>n+pivot[i]);
      close(distance(moved,expected),0);
    }
    for(const p of [[165,240],[295,240],[230,290],[230,500]])assert.deepEqual(sleevePoint(...p,angle,angle),p);
  }
});

test('Actual painted arm pixels remain locally continuous and never fold during waving', () => {
  const sample=JSON.parse(fs.readFileSync(new URL('./fixtures/hinata-posed-arm-samples.json',import.meta.url)));
  const image=fs.readFileSync(new URL('../assets/chat/hina-rig/arms-posed-v5.png',import.meta.url));
  assert.equal(createHash('sha256').update(image).digest('hex'),sample.sha256,'Resample the actual texture after changing the artwork');
  let minimum=Infinity;
  for(let t=0;t<14;t+=.7) for(const wave of [0,.25,.5,.75,1]) for(const [right,x,y]of sample.points){
    const pose=armAngles(t,1.25,wave,1,right),p=armPoint(x,y,pose,right);
    const dx=armPoint(x+.01,y,pose,right),dy=armPoint(x,y+.01,pose,right);
    const determinant=((dx[0]-p[0])*(dy[1]-p[1])-(dx[1]-p[1])*(dy[0]-p[0]))/.0001;
    minimum=Math.min(minimum,determinant);
    assert.ok(p.every(Number.isFinite)&&distance(p,dx)<.03&&distance(p,dy)<.03);
    assert.ok(determinant>.4, 'Reject folds or heavily compressed skin');
  }
  assert.ok(minimum>.5);
});
