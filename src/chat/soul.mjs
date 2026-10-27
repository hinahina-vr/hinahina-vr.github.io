const BACKGROUND_VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() { vUv = aPosition; gl_Position = vec4(aPosition, 0., 1.); }
`;
const BACKGROUND_FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec3 uTint;
uniform float uTime;
uniform float uBrightness;
uniform lowp float uRoom;
uniform float uScale;
uniform lowp float uTheme;
uniform float uEnergy;
uniform vec2 uPointer;
float ellipse(vec2 p, vec2 radius) { return 1. - smoothstep(.9, 1., length(p / radius)); }
float star(vec2 p) { float a = atan(p.y, p.x); float r = .047 * (.72 + .28 * cos(a * 5.)); return 1. - smoothstep(r - .004, r + .004, length(p)); }
float heart(vec2 p) { p *= 16.; float a = dot(p, p) - 1.; float d = a * a * a - p.x * p.x * p.y * p.y * p.y; return 1. - smoothstep(-.03, .04, d); }
void main() {
  vec2 p = vUv; p.x *= uResolution.x / uResolution.y;
  vec2 q = (p - vec2(0., .14)) / uScale;
  float halo = exp(-length(q) * 3.2);
  float innerGlow = exp(-dot(q, q) * 22.);
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  if (uTheme < 3.5) {
    vec3 top = vec3(1., .91, .95), bottom = vec3(1., .975, .925);
    if (uTheme > .5 && uTheme < 1.5) { top = vec3(.88, .94, 1.); bottom = vec3(1., .98, .95); }
    if (uTheme > 1.5 && uTheme < 2.5) { top = vec3(.87, .97, .93); bottom = vec3(.98, 1., .94); }
    if (uTheme > 2.5) { top = vec3(1., .94, .81); bottom = vec3(1., .985, .945); }
    vec3 color = mix(bottom, top, (vUv.y + 1.) * .5) + (grain - .5) * .007;
    vec2 floating = vec2(sin(uTime * .45) * .015, cos(uTime * .6) * .018);
    if (uTheme < .5) {
      float hearts = heart(q - vec2(.55, .27) - floating) + heart(q + vec2(.52, .2) + floating);
      color = mix(color, vec3(.97, .64, .77), clamp(hearts, 0., 1.) * .7);
    } else if (uTheme < 1.5) {
      float stars = star(q - vec2(.51, .30) - floating) + star(q + vec2(.51, .19) + floating) + star(q - vec2(-.37, .47));
      color = mix(color, vec3(1., .79, .45), clamp(stars, 0., 1.) * .8);
    } else if (uTheme < 2.5) {
      float bubbles = (1. - smoothstep(.002, .005, abs(length(q - vec2(.53, .22) - floating) - .045))) + (1. - smoothstep(.002, .005, abs(length(q + vec2(.50, .16) + floating) - .03)));
      color = mix(color, vec3(.48, .78, .71), clamp(bubbles, 0., 1.) * .55);
    } else {
      float stars = star(q - vec2(.55, .30) - floating) + star(q + vec2(.52, .25) + floating);
      color = mix(color, vec3(.95, .7, .34), clamp(stars, 0., 1.) * .75);
    }
    gl_FragColor = vec4(color, mix(1., .12, uRoom)); return;
  }
  vec3 night = vec3(.012, .017, .033);
  vec3 color = night + uTint * halo * .075 * uBrightness;
  color += mix(uTint, vec3(1., .85, .75), .45) * innerGlow * .17 * uBrightness;
  color += vec3(.006, .003, .01) * sin(p.x * 2. + p.y + uTime * .035);
  color += (grain - .5) * .012;
  gl_FragColor = vec4(color, 1.);
}
`;
const SOUL_VERTEX = `
precision highp float;
attribute vec4 aParam;
uniform float uTime;
uniform float uEnergy;
uniform float uDpr;
uniform float uScale;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform vec3 uTint;
uniform lowp float uTheme;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float seed = aParam.z;
  if (aParam.w > 1.5) {
    vec2 p = aParam.xy;
    p += vec2(sin(uTime * .025 + seed * 40.), cos(uTime * .018 + seed * 30.)) * .012;
    gl_Position = vec4(p, 0., 1.);
    gl_PointSize = (seed > .94 ? 2.4 : 1.1) * uDpr;
    vColor = mix(vec3(.55, .65, .9), uTint, seed);
    vAlpha = .12 + .23 * pow(.5 + .5 * sin(uTime * .4 + seed * 60.), 3.);
  } else {
    float theta = aParam.x;
    float phi = aParam.y + .06 * sin(theta * 3. + uTime * .2 + seed * 7.);
    float breath = .025 * sin(uTime * .8) + uEnergy * .045 * sin(uTime * 2.1 + phi * 2.);
    float radius = .86 + .08 * sin(theta * 3. + phi * 5. + uTime * .35) + .028 * sin(theta * 11. - uTime * .6) + breath;
    if (aParam.w > .5) radius *= .14 + .75 * pow(seed, .6);
    vec3 p = radius * vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
    float angle = uTime * .08 + uPointer.x * .14;
    p.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p.xz;
    float tilt = -.2 + uPointer.y * .08;
    p.xy = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p.xy;
    p.x += .035 * sin(p.y * 8. + uTime * .3) * (1. + uEnergy);
    vec2 projected = p.xy / (3.1 - p.z) * 1.95 * uScale;
    projected.x *= uResolution.y / uResolution.x;
    projected += uPointer * vec2(.009, .006);
    gl_Position = vec4(projected + vec2(0., .14), 0., 1.);
    float depth = (p.z + 1.) * .5;
    gl_PointSize = (1.2 + depth * 2.4 + (aParam.w > .5 ? 3. : 0.) + uEnergy * .6) * uDpr;
    vec3 cool = vec3(.48, .65, .96);
    vec3 pearl = vec3(1., .9, .78);
    vColor = mix(cool, uTint, .5 + .5 * sin(theta * .5 + seed * 4.));
    vColor = mix(vColor, pearl, pow(max(0., p.z), 2.) * .8);
    vAlpha = (aParam.w > .5 ? .13 : .26) * (.35 + depth * .8);
    if (uTheme < 3.5) vAlpha *= aParam.w > .5 ? .04 : .18;
  }
}
`;
const SOUL_FRAGMENT = `
precision mediump float;
uniform float uBrightness;
uniform lowp float uTheme;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord * 2. - 1.);
  if (d > 1.) discard;
  float light = exp(-d * d * 4.) * .45 + exp(-d * d * 18.) * .7;
  if (uTheme > 3.5) gl_FragColor = vec4(vColor * light * vAlpha * uBrightness, 1.);
  else gl_FragColor = vec4(vColor * .5 + .48, light * vAlpha * uBrightness);
}
`;

function program(gl, vertexSource, fragmentSource, attribute) {
  const shaders = [];
  const result = gl.createProgram();
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
      const shader = gl.createShader(type); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Soul shader compilation failed: ' + gl.getShaderInfoLog(shader));
      gl.attachShader(result, shader);
    }
    gl.bindAttribLocation(result, 0, attribute); gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error('Soul shader linking failed: ' + gl.getProgramInfoLog(result));
    return result;
  } catch (error) { gl.deleteProgram(result); throw error; }
  finally { shaders.forEach(shader => gl.deleteShader(shader)); }
}

function makePoints() {
  const values = [];
  const random = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let strand = 0; strand < 76; strand++) {
    for (let step = 0; step < 128; step++) {
      values.push(step / 128 * Math.PI * 2 + strand * .17, Math.acos(1 - 2 * (strand + .5) / 76), strand / 76, 0);
    }
  }
  for (let i = 0; i < 3000; i++) values.push(i * 2.399963, Math.acos(1 - 2 * (i + .5) / 3000), random(i), 1);
  for (let i = 0; i < 700; i++) values.push(random(i + 5100) * 2 - 1, random(i + 7100) * 2 - 1, random(i + 9300), 2);
  return new Float32Array(values);
}

export class SoulRenderer {
  constructor(canvas, onAvailability) {
    this.canvas = canvas; this.onAvailability = onAvailability;
    this.active = false; this.reduced = false; this.energy = 0; this.targetEnergy = .03;
    this.brightness = 1; this.room = true; this.theme = 0; this.tint = [.83, .65, .87]; this.pointer = [0, 0]; this.pointerTarget = [0, 0];
    this.time = 0; this.lastFrame = 0; this.frame = 0; this.frameCount = 0;
    this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!this.gl) { this.onAvailability(false); return; }
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.stop(); this.onAvailability(false); });
    canvas.addEventListener('webglcontextrestored', () => { try { this.setup(); this.onAvailability(true); if (this.active) this.start(); } catch { this.onAvailability(false); } });
    try { this.setup(); this.onAvailability(true); } catch (error) { console.warn(error.message); this.gl = null; this.onAvailability(false); }
  }
  setup() {
    const gl = this.gl;
    this.background = program(gl, BACKGROUND_VERTEX, BACKGROUND_FRAGMENT, 'aPosition');
    this.soul = program(gl, SOUL_VERTEX, SOUL_FRAGMENT, 'aParam');
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.points = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.points);
    const points = makePoints(); this.pointCount = points.length / 4; gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    this.locations = new Map();
    for (const p of [this.background, this.soul]) this.locations.set(p, Object.fromEntries(['uTime', 'uEnergy', 'uDpr', 'uScale', 'uResolution', 'uPointer', 'uTint', 'uBrightness', 'uTheme', 'uRoom'].map(name => [name, gl.getUniformLocation(p, name)])));
    gl.disable(gl.DEPTH_TEST); this.resize();
  }
  resize() {
    if (!this.gl) return;
    this.width = this.canvas.clientWidth || innerWidth; this.height = this.canvas.clientHeight || innerHeight;
    this.dpr = Math.min(devicePixelRatio || 1, 1.5, 1800 / Math.max(this.width, this.height));
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height); this.draw();
  }
  uniforms(p) {
    const gl = this.gl, u = this.locations.get(p);
    gl.uniform1f(u.uTime, this.time); gl.uniform1f(u.uEnergy, this.energy); gl.uniform1f(u.uDpr, this.dpr);
    gl.uniform1f(u.uScale, Math.min(1, this.width / this.height * 1.35));
    gl.uniform2f(u.uResolution, this.width, this.height); gl.uniform2f(u.uPointer, ...this.pointer);
    gl.uniform3f(u.uTint, ...this.tint); gl.uniform1f(u.uBrightness, this.brightness);
    gl.uniform1f(u.uTheme, this.theme); gl.uniform1f(u.uRoom, this.room ? 1 : 0);
  }
  draw() {
    const gl = this.gl;
    if (!gl || gl.isContextLost() || !this.background) return;
    gl.disable(gl.BLEND); gl.useProgram(this.background); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); this.uniforms(this.background); gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.BLEND); gl.blendFunc(this.theme === 4 ? gl.ONE : gl.SRC_ALPHA, this.theme === 4 ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(this.soul); gl.bindBuffer(gl.ARRAY_BUFFER, this.points);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); this.uniforms(this.soul); gl.drawArrays(gl.POINTS, 0, this.pointCount);
    this.canvas.dataset.frames = String(++this.frameCount);
  }
  tick = now => {
    if (!this.active || document.hidden || !this.gl) { this.frame = 0; return; }
    if (now - this.lastFrame >= 32) {
      this.time += Math.min((now - (this.lastFrame || now)) / 1000, .1); this.lastFrame = now;
      this.energy += (this.targetEnergy - this.energy) * .09;
      this.pointer = this.pointer.map((p, i) => p + (this.pointerTarget[i] - p) * .035);
      this.draw();
    }
    this.frame = this.reduced ? 0 : requestAnimationFrame(this.tick);
  };
  start() { if (!this.gl || !this.active || document.hidden || this.frame) return; this.lastFrame = 0; this.resize(); if (!this.reduced) this.frame = requestAnimationFrame(this.tick); }
  stop() { cancelAnimationFrame(this.frame); this.frame = 0; }
  setActive(active) { this.active = active; active ? this.start() : this.stop(); }
  configure({ reduced, brightness }) { this.reduced = reduced; this.brightness = brightness; this.stop(); if (this.active) { this.draw(); this.start(); } }
  setTint(tint) { this.tint = tint; if (this.active && this.reduced) this.draw(); }
  setScene(scene) { this.room = scene === 'bedroom'; if (this.active) this.draw(); }
  setTheme(theme) { this.theme = theme; if (this.active) this.draw(); }
  setEnergy(value) { this.targetEnergy = value; if (this.reduced && this.active) { this.energy = value; this.draw(); } }
  pulse() { if (!this.reduced) this.energy = Math.min(1, this.energy + .1); }
  setPointer(x, y) { this.pointerTarget = this.reduced ? [0, 0] : [x, y]; }
}
