import { Application, Sprite, Texture } from './vendor/pixi-hinata.mjs';
import { portraitUrl } from './portraits.mjs?v=20261030-cute1';

const load = url => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(Texture.from(image));
  image.onerror = () => reject(new Error('Unable to load Hinata pose'));
  image.src = url;
});
const poseUrl = pose => new URL('../../assets/chat/characters/hina-cute-' + pose + '-v1.webp?v=20261030-cute1', import.meta.url).href;

/** Complete illustrated poses preserve the new proportions and connected anatomy. */
export class HinataMotion {
  constructor(image, button) {
    this.image = image; this.button = button; this.host = image.parentElement;
    this.touch = document.getElementById('hinata-touch');
    this.waveButton = document.getElementById('hinata-wave');
    this.canvas = document.createElement('canvas'); this.canvas.id = 'hinata-live';
    this.canvas.hidden = true; this.canvas.setAttribute('aria-hidden', 'true'); this.host.append(this.canvas);
    this.active = false; this.loaded = false; this.reduced = false; this.strength = 1;
    this.look = [0, 0]; this.target = [0, 0]; this.phase = 'idle'; this.frames = 0;
    this.happyUntil = 0; this.waveUntil = 0; this.frame = 0;
    button.addEventListener('click', () => this.pat());
    this.waveButton.addEventListener('click', () => this.react('wave'));
    this.touch.addEventListener('click', () => this.pat());
    this.touch.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const r = this.touch.getBoundingClientRect();
      this.setPointer((event.clientX-r.left)/r.width*2-1, 1-(event.clientY-r.top)/r.height*2);
    });
    this.touch.addEventListener('pointerleave', () => this.setPointer(0, 0));
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.image); this.observer.observe(this.host);
    document.addEventListener('visibilitychange', () => document.hidden ? this.stop() : this.start());
    window.addEventListener('pagehide', () => this.stop());
    window.addEventListener('pageshow', () => this.start());
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.stop(); this.show(false); });
    this.canvas.addEventListener('webglcontextrestored', () => this.setActive(this.active));
    this.init().catch(error => { this.show(false); console.warn('Hinata illustration fallback:', error.message); });
  }
  async init() {
    this.app = new Application();
    await this.app.init({canvas:this.canvas,width:600,height:900,backgroundAlpha:0,antialias:true,preference:'webgl',autoStart:false,sharedTicker:false,manageImports:false});
    const textures = await Promise.all([load(portraitUrl('hina')), load(poseUrl('wave')), load(poseUrl('happy'))]);
    this.textures = {idle:textures[0],wave:textures[1],happy:textures[2]};
    this.sprite = new Sprite(this.textures.idle); this.sprite.anchor.set(.5,.5); this.app.stage.addChild(this.sprite);
    this.loaded = true; this.setActive(this.active);
  }
  isHinata() { return document.body.dataset.soulCharacter === 'hina' && /hina-cute-v1.webp/.test(this.image.src) && this.image.complete && this.image.naturalWidth > 0; }
  show(yes) {
    this.canvas.hidden = !yes;
    for (const button of [this.button,this.touch,this.waveButton]) button.hidden = !yes;
    document.body.dataset.hinaMotion = yes ? 'ready' : 'off';
  }
  setActive(active) {
    this.active = active;
    if (!active || !this.loaded || !this.isHinata() || this.app.renderer.gl.isContextLost()) { this.stop(); this.show(false); return; }
    this.show(true); this.resize(); this.start();
  }
  configure(reduced, strength) {
    this.reduced = reduced; this.strength = Math.max(.5,Math.min(1.25,Number(strength)||1));
    if (reduced) this.stop();
    if (this.loaded && this.active) { this.draw(performance.now()); this.start(); }
  }
  setPhase(phase) { this.phase = phase; if (phase !== 'replying') this.speechUntil = 0; }
  speech() { if (this.active && !this.reduced) { this.speechUntil = performance.now()+1000; this.draw(performance.now()); } }
  setPointer(x,y) { this.target = [Math.max(-1,Math.min(1,x)),Math.max(-1,Math.min(1,y))]; }
  react(kind) {
    if (!this.active || this.canvas.hidden) return;
    if (kind === 'wave') { this.waveUntil = performance.now()+4500; this.happyUntil = 0; }
    else { this.happyUntil = performance.now()+4500; this.waveUntil = 0; }
    clearTimeout(this.reactionTimer); this.draw(performance.now());
    this.reactionTimer = setTimeout(() => { this.happyUntil=0;this.waveUntil=0;this.draw(performance.now());this.button.classList.remove('is-happy'); },4500);
  }
  pat() { this.react('happy'); this.button.classList.add('is-happy'); }
  resize() {
    if (!this.loaded || !this.active || this.canvas.hidden) return;
    const host = this.host.getBoundingClientRect(), img = this.image.getBoundingClientRect();
    const height = Math.min(img.height,Math.max(0,host.bottom-img.top));
    const width = Math.min(host.width,img.width);
    if (!width || !height) return;
    Object.assign(this.canvas.style,{left:(img.left-host.left)+'px',top:(img.top-host.top)+'px',width:width+'px',height:height+'px',maskImage:'none'});
    this.width=width;this.height=height;this.cropToTop=getComputedStyle(this.host).overflow==='hidden';this.imageHeight=this.image.clientHeight;
    this.app.renderer.resize(width,height,Math.min(devicePixelRatio||1,2));
    Object.assign(this.touch.style,{left:img.left+'px',top:img.top+'px',width:width+'px',height:height+'px'});
    const top = Math.min(host.bottom-46,innerHeight-50);
    Object.assign(this.button.style,{left:Math.max(8,Math.min(innerWidth-110,host.right-110))+'px',top:top+'px'});
    Object.assign(this.waveButton.style,{left:Math.max(8,host.left+8)+'px',top:top+'px'});
    this.draw(performance.now());
  }
  draw(now) {
    if (!this.loaded || this.canvas.hidden || !this.width || this.app.renderer.gl.isContextLost()) return;
    const pose = now < this.waveUntil ? 'wave' : (now < this.happyUntil || now < (this.speechUntil || 0)) ? 'happy' : 'idle';
    this.sprite.texture = this.textures[pose];
    const texture = this.sprite.texture;
    // Uniform contain scaling only: no stretched limbs, mesh warping or opacity fades.
    const scale = Math.min(this.width/texture.width,(this.cropToTop?this.imageHeight:this.height)/texture.height)*.97;
    this.sprite.scale.set(scale);
    this.look = this.look.map((value,i)=>value+(this.target[i]-value)*.08);
    const energy = this.reduced ? 0 : this.strength;
    this.sprite.position.set(this.width/2+this.look[0]*2*energy,(this.cropToTop?texture.height*scale/2+4:this.height/2)+Math.sin(now/1500)*1.5*energy);
    this.sprite.rotation=(this.look[0]*.007+Math.sin(now/2200)*.003)*energy;
    this.sprite.alpha=1;this.app.render();
    Object.assign(this.canvas.dataset,{renderer:'pixi-illustrated-poses',pose,frames:String(++this.frames),phase:this.phase,artSource:this.sprite.texture.source.resource.src,uniformScale:'true',opacity:'1'});
  }
  tick = now => { this.frame=0;if(!this.active||this.reduced||document.hidden||this.canvas.hidden)return;this.draw(now);this.frame=requestAnimationFrame(this.tick); };
  start() { if(this.loaded&&this.active&&!this.reduced&&!document.hidden&&!this.canvas.hidden&&!this.frame)this.frame=requestAnimationFrame(this.tick); }
  stop() { cancelAnimationFrame(this.frame);this.frame=0; }
}
