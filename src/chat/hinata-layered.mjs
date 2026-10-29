import { Application, Container, Texture } from './vendor/pixi-hinata.mjs';
import { HinataRig } from './hinata-rig.mjs?v=20261029-r11';

// Articulated arms and four hair meshes surround a connected face-neck core.
const ART = new URL('../../assets/chat/hina-rig/', import.meta.url);
const clamp = (x, max = 1) => Math.max(-max, Math.min(max, x));
const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const spring = (j, target, dt, stiffness, damping) => {
  j.v += ((target - j.x) * stiffness - j.v * damping) * dt;
  j.x += j.v * dt; return j.x;
};
const loadImage = name => new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Portrait asset unavailable'));
  img.src = new URL(name, ART).href;
});

export class HinataMotion {
  constructor(image, button) {
    this.image = image; this.button = button; this.host = image.parentElement;
    this.touch = document.getElementById('hinata-touch');
    this.waveButton = document.getElementById('hinata-wave');
    this.canvas = document.createElement('canvas'); this.canvas.id = 'hinata-live';
    this.canvas.setAttribute('aria-hidden', 'true'); this.canvas.hidden = true; this.host.append(this.canvas);
    this.active = false; this.loaded = false; this.reduced = false; this.strength = 1.25;
    this.phase = 'idle'; this.time = 0; this.last = 0; this.frame = 0; this.frames = 0;
    this.look = [0, 0]; this.targetLook = [0, 0]; this.interaction = null;
    this.nextBlink = 1.8; this.happyUntil = 0; this.speechUntil = 0; this.greetUntil = 0; this.pats = 0;
    this.joints = Object.fromEntries(['head', 'body', 'hair', 'bounce', 'wave'].map(n => [n, { x:0, v:0 }]));
    this.waveUntil = 0;
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.stop(); this.show(false); });
    this.canvas.addEventListener('webglcontextrestored', () => requestAnimationFrame(() => this.setActive(this.active)));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(image); this.resizeObserver.observe(this.host);
    document.addEventListener('visibilitychange', () => document.hidden ? this.stop() : this.start());
    window.addEventListener('pagehide', () => this.stop()); window.addEventListener('pageshow', () => this.start());
    button.addEventListener('click', () => this.pat());
    this.waveButton.addEventListener('click', () => { if (!this.reduced) this.waveUntil = performance.now() + 3600; });
    this.bindTouch();
    this.initializing = this.init().catch(error => { this.loaded = false; this.stop(); this.show(false); console.warn('Hinata illustration fallback:', error.message); });
  }
  async init() {
    this.app = new Application();
    await this.app.init({ canvas:this.canvas, width:800, height:1200, backgroundAlpha:0, antialias:true, preference:'webgl', autoStart:false, sharedTicker:false, manageImports:false, eventFeatures:{ move:false, globalMove:false, click:false, wheel:false } });
    const images = await Promise.all(['core-v2.png', 'arms-posed-v5.png', 'hair-v2.png', 'outfit-lower-v1.png'].map(loadImage));
    this.sources = images.map(i => Texture.from(i).source); this.build();
    this.loaded = true; this.setActive(this.active);
  }
  build() {
    this.scene = new Container({ label:'hinata-stage', eventMode:'none' }); this.app.stage.addChild(this.scene);
    this.rig = new HinataRig(this.sources); this.scene.addChild(this.rig.root);
  }
  bindTouch() {
    this.touch.addEventListener('pointerdown', e => {
      if (!this.active || e.isPrimary === false || e.button !== 0) return;
      clearTimeout(this.lookTimer); this.interaction = { id:e.pointerId, x:e.clientX, y:e.clientY, moved:false };
      this.touch.setPointerCapture(e.pointerId); this.follow(e);
    });
    this.touch.addEventListener('pointermove', e => {
      if (this.interaction && this.interaction.id !== e.pointerId) return;
      if (this.interaction && Math.hypot(e.clientX - this.interaction.x, e.clientY - this.interaction.y) > 5) this.interaction.moved = true;
      if (e.pointerType !== 'touch' || this.interaction) this.follow(e);
    });
    const release = e => {
      if (this.interaction?.id !== e.pointerId) return;
      this.suppressClick = this.interaction.moved || e.type === 'pointercancel'; this.endInteraction();
      if (e.pointerType === 'touch') this.lookTimer = setTimeout(() => this.setPointer(0, 0), 500);
    };
    this.touch.addEventListener('pointerup', release); this.touch.addEventListener('pointercancel', release);
    this.touch.addEventListener('lostpointercapture', () => { this.interaction = null; });
    this.touch.addEventListener('pointerleave', () => { if (!this.interaction) this.setPointer(0, 0); });
    this.touch.addEventListener('click', e => { if (!this.suppressClick || e.detail === 0) this.pat(); this.suppressClick = false; });
  }
  follow(e) {
    if (!this.active || document.querySelector('#chat-drawer')?.open) return;
    const r = this.image.getBoundingClientRect(), s = this.scene.scale.x;
    const x = r.left + r.width / 2, y = r.top + this.scene.y + 350 * s;
    this.setPointer((e.clientX - x) / Math.max(65, 210 * s), (y - e.clientY) / Math.max(75, 240 * s));
  }
  endInteraction() {
    const id = this.interaction?.id; this.interaction = null;
    if (id !== undefined && this.touch.hasPointerCapture(id)) this.touch.releasePointerCapture(id);
  }
  isHinata() { return /\/hina(?:\.webp|-indoor\.png)(?:\?|$)/.test(this.image.currentSrc || this.image.src) && this.image.complete && this.image.naturalWidth > 0; }
  show(yes) {
    this.canvas.hidden = !yes; this.button.hidden = !yes; this.touch.hidden = !yes; this.waveButton.hidden = !yes;
    if (!yes) { this.endInteraction(); clearTimeout(this.lookTimer); this.setPointer(0, 0); }
    document.body.dataset.hinaMotion = yes ? 'ready' : 'off';
  }
  setActive(active) {
    const fresh = active && (!this.active || this.canvas.hidden); this.active = active;
    if (!active || !this.loaded || this.app.renderer.gl.isContextLost() || !this.isHinata()) { this.stop(); this.show(false); return; }
    if (fresh) this.greetUntil = performance.now() + 4200;
    this.show(true); this.resize(); this.start();
  }
  configure(reduced, strength = this.strength) {
    this.strength = Math.max(.5, Math.min(1.25, Number(strength) || 1.25));
    if (this.reduced === reduced) return;
    this.reduced = reduced; this.stop(); this.look = [0, 0]; this.targetLook = [0, 0]; this.endInteraction();
    this.waveButton.disabled = reduced;
    for (const j of Object.values(this.joints)) { j.x = 0; j.v = 0; }
    this.happyUntil = 0; this.button.classList.remove('is-happy');
    if (this.active) { this.draw(performance.now(), 0); this.start(); }
  }
  setPhase(phase) { this.phase = phase; if (phase !== 'replying') this.speechUntil = 0; }
  speech() { if (this.active && !this.reduced) this.speechUntil = performance.now() + 750; }
  setPointer(x, y) { this.targetLook = [clamp(x), clamp(y)]; }
  pat() {
    if (!this.active || this.canvas.hidden) return;
    this.pats++; this.happyUntil = performance.now() + 1900;
    this.button.classList.remove('is-happy'); void this.button.offsetWidth; this.button.classList.add('is-happy');
    clearTimeout(this.patTimer);
    this.patTimer = setTimeout(() => { this.happyUntil = 0; this.button.classList.remove('is-happy'); if (this.reduced) this.draw(performance.now(), 0); }, 1900);
    if (this.reduced) this.draw(performance.now(), 0);
  }
  resize() {
    if (!this.loaded || !this.active || this.canvas.hidden || this.app.renderer.gl.isContextLost()) return;
    const host = this.host.getBoundingClientRect(), img = this.image.getBoundingClientRect();
    const w = Math.min(host.width, Math.max(this.image.clientWidth, this.image.clientHeight * 1.15));
    const visibleHeight = Math.min(this.image.clientHeight, Math.max(0, host.bottom - img.top));
    const panel = document.getElementById('transcript').getBoundingClientRect();
    // Continue the opaque outfit behind the dialogue box on desktop. Mobile's
    // character viewport already clips against the solid conversation panel.
    const h = getComputedStyle(this.host).overflow === 'hidden' ? visibleHeight
      : Math.max(visibleHeight, panel.top - img.top + 36);
    if (!w || !h) return;
    const canvasLeft = img.left + (img.width - w) / 2;
    Object.assign(this.canvas.style, { left:(canvasLeft - host.left) + 'px', top:this.image.offsetTop + 'px', width:w + 'px', height:h + 'px' });
    const dpr = Math.min(devicePixelRatio || 1, 2, 1400 / Math.max(w, h));
    this.app.renderer.resize(w, h, dpr);
    // Fit the gestures to the visible character area, including a raised hand
    // at the widest point of its arc. Mobile's static portrait is deliberately
    // oversized; using its height would hide both arms behind the chat panel.
    const s = Math.min(this.image.clientWidth / 800, visibleHeight / 1100, w / 1200);
    this.scene.scale.set(s); this.scene.position.set((w - 800 * s) / 2, Math.max(0, (visibleHeight - 1200 * s) / 2));
    this.canvas.style.maskImage = 'none';
    const left = Math.max(host.left, canvasLeft), top = Math.max(host.top, img.top);
    Object.assign(this.touch.style, { left:left + 'px', top:top + 'px', width:Math.max(0, Math.min(host.right, canvasLeft + w) - left) + 'px', height:Math.max(0, Math.min(host.bottom, img.top + h) - top) + 'px' });
    this.button.style.left = Math.max(10, Math.min(innerWidth - 106, host.right - 102, canvasLeft + w - 106)) + 'px';
    this.button.style.top = Math.max(host.top + 8, host.bottom - 48) + 'px';
    this.waveButton.style.top = this.button.style.top;
    this.waveButton.style.left = Math.max(10, canvasLeft + 14) + 'px';
    this.draw(performance.now(), 0);
  }
  draw(now, dt) {
    if (!this.loaded || this.canvas.hidden || this.app.renderer.gl.isContextLost()) return;
    const t = this.time, energy = this.reduced ? 0 : this.strength;
    const happy = this.happyUntil > now ? this.reduced ? 1 : ease((this.happyUntil - now) / 300) * ease((1900 - this.happyUntil + now) / 150) : 0;
    const greet = !this.reduced && this.greetUntil > now ? ease((this.greetUntil - now) / 500) * ease((4200 - this.greetUntil + now) / 500) : 0;
    const talking = !this.reduced && this.phase === 'replying' && now < this.speechUntil;
    this.look = this.look.map((n, i) => n + (this.targetLook[i] - n) * (1 - Math.exp(-dt * 6)));
    let blink = 0;
    if (!this.reduced) {
      const b = t - this.nextBlink;
      if (b >= 0 && b < .28) blink = b < .1 ? ease(b / .1) : 1 - ease((b - .13) / .15);
      if (b >= .28) this.nextBlink = t + 2.6 + Math.random() * 2.2;
    }
    const expression = happy > .6 ? (this.pats % 3 === 0 ? 'wink' : 'smile')
      : talking ? (Math.sin(t * 8) > -.15 ? 'talk' : 'idle')
      : blink > .55 ? 'blink' : 'idle';
    const head = spring(this.joints.head, energy * (Math.sin(t * .65) * .007 + this.look[0] * .055 + happy * .02), dt, 42, 13);
    const body = spring(this.joints.body, energy * (Math.sin(t * .65) * .003 + this.look[0] * .004), dt, 30, 11);
    const hairLag = spring(this.joints.hair, -this.joints.head.v * .55, dt, 20, 9);
    const bounce = spring(this.joints.bounce, energy * happy, dt, 40, 13);
    const requested = this.waveUntil > now ? ease((this.waveUntil-now)/650) * ease((3600-this.waveUntil+now)/650) : 0;
    const wave = spring(this.joints.wave, this.reduced ? 0 : Math.max(greet, requested), dt, 32, 12);
    const pose = this.rig.update({time:t,energy,head,body,bounce,hairLag,expression,wave,talking:talking?1:0,happy,lookY:this.look[1]});
    const eyes = expression === 'wink' ? 'wink' : ['blink', 'smile'].includes(expression) ? 'closed' : 'open';
    const mouth = ['smile', 'wink'].includes(expression) ? 'smile' : expression === 'talk' ? 'talk' : 'closed';
    this.app.render();
    Object.assign(this.canvas.dataset, {
      renderer:'pixi-articulated', parts:String(pose.parts), vertices:String(pose.vertices), expression, frames:String(++this.frames), phase:this.phase,
      eyes, mouthFrame:mouth, mouth:mouth === 'closed' ? '0' : '.7', blink:(happy > .6 ? .96 : blink).toFixed(3), happy:happy.toFixed(3),
      tilt:head.toFixed(4), wave:wave.toFixed(3), body:body.toFixed(4), hair:pose.hairTip.toFixed(3),
      lookX:this.look[0].toFixed(3), lookY:this.look[1].toFixed(3), dragging:String(!!this.interaction), strength:String(this.strength),
      rightShoulder:pose.rightShoulder.toFixed(4), rightElbow:pose.rightElbow.toFixed(4), rightWrist:pose.rightWrist.toFixed(4), leftElbow:pose.leftElbow.toFixed(4), faceRigid:'true', handScale:String(pose.handScale)
    });
  }
  tick = now => {
    if (!this.active || document.hidden || this.reduced || this.canvas.hidden) { this.frame = 0; return; }
    if (now - this.last >= 16) {
      const dt = this.last ? Math.min(.04, (now - this.last) / 1000) : 0;
      this.time += dt; this.last = now; this.draw(now, dt);
    }
    this.frame = requestAnimationFrame(this.tick);
  };
  start() { if (!this.loaded || !this.active || document.hidden || this.reduced || this.frame || this.canvas.hidden) return; this.last = 0; this.frame = requestAnimationFrame(this.tick); }
  stop() { cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0; }
}
