// PIE HARD level 6 – TWOC. One lap of St Helens in six motors that aren't yours.
import * as THREE from 'three';
import * as T from './track.js';
import { buildWorld, canvasTex } from './world.js';
import { loadCars, makeCar, makeBike, pose, blues, SPECS } from './cars.js';
import { loadCharacters, makeCharacter } from '../characters.js';
import { makeAnt, makeGoose } from '../creatures.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, rand = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
const angd = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const Q = new URLSearchParams(location.search), TEST = Q.has('test');
const TOUCH = !Q.has('desktop') && (Q.has('touch') || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches));
const STORE = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const MPH = 2.237 * 1.3;                    // the speedo flatters you, like every speedo in a nicked car
if (TOUCH) document.body.classList.add('touch');

// ------------------------------------------------------------ renderer and world
let quality = Q.get('q') || (TEST ? 'low' : TOUCH ? 'med' : 'high');
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: !TOUCH, powerPreference: 'high-performance' });
let pxr = TEST ? 1 : Math.min(window.devicePixelRatio || 1, TOUCH ? 1.5 : 2);
renderer.setPixelRatio(pxr); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = quality !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(62, 16 / 9, .4, 3200);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
let W = null;

// ------------------------------------------------------------ sound
let AC = null, master, sfxBus, musBus, eng = null, muted = STORE.get('ph-drive-mute', false), musicOn = STORE.get('ph-drive-music', true);
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = AC.createGain(); master.gain.value = muted ? 0 : .9; const comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
  sfxBus = AC.createGain(); sfxBus.connect(master); musBus = AC.createGain(); musBus.gain.value = musicOn ? .42 : 0; musBus.connect(master);
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain(); o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.Q.value = 4; g.gain.value = 0; o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus); o1.start(); o2.start();
  const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const loop = (type, freq, q) => { const s = AC.createBufferSource(); s.buffer = nb; s.loop = true; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = freq; fl.Q.value = q; const gg = AC.createGain(); gg.gain.value = 0; s.connect(fl); fl.connect(gg); gg.connect(sfxBus); s.start(); return { f: fl, g: gg }; };
  const voice = (type, lp) => { const o = AC.createOscillator(), gg = AC.createGain(), fl = AC.createBiquadFilter(); o.type = type; fl.type = 'lowpass'; fl.frequency.value = lp; gg.gain.value = 0; o.connect(fl); fl.connect(gg); gg.connect(sfxBus); o.start(); return { o, g: gg }; };
  eng = { o1, o2, f, g, skid: loop('bandpass', 1900, 5), wind: loop('lowpass', 520, .6), dirt: loop('lowpass', 210, .8), siren: voice('square', 1700), rival: voice('sawtooth', 1100), chop: loop('lowpass', 130, 2), nb };
}
function noise(dur, freq, type, vol, sweepTo) {
  if (!AC) return; const len = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = AC.createBufferSource(); s.buffer = buf; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, AC.currentTime + dur);
  const g = AC.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(sfxBus); s.start();
}
function tone(f, dur, type = 'square', vol = .1, to, when = 0, bus) {
  if (!AC) return; const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + .02);
}
const SFX = {
  crash: (k) => { noise(.5, 900, 'lowpass', .9 * k, 120); tone(90, .3, 'sine', .5 * k, 35); noise(.25, 3200, 'highpass', .25 * k); }, scrape: () => noise(.18, 2600, 'bandpass', .25),
  thud: () => { tone(70, .18, 'sine', .5, 38); noise(.1, 300, 'lowpass', .4); }, smash: () => { noise(.3, 2400, 'bandpass', .5, 700); tone(160, .1, 'square', .12, 70); },
  whoosh: () => noise(.35, 700, 'bandpass', .45, 2600), pop: (n) => tone(520 + n * 70, .09, 'square', .07), good: () => { tone(660, .09, 'square', .09); tone(990, .14, 'square', .09, 0, .08); },
  bad: () => tone(220, .4, 'sawtooth', .14, 80), horn: () => { tone(415, .35, 'square', .1); tone(520, .35, 'square', .1); }, splat: () => { noise(.25, 600, 'lowpass', .8, 180); tone(95, .12, 'sine', .3, 50); },
  flash: () => { noise(.06, 5000, 'highpass', .4); tone(1800, .05, 'square', .06); }, boost: () => noise(.5, 500, 'bandpass', .5, 3000), beep: (hi) => tone(hi ? 1320 : 660, hi ? .5 : .16, 'square', .12),
  radio: () => { tone(880, .05, 'square', .05); tone(660, .07, 'square', .05, 0, .07); }, quack: () => tone(380, .12, 'sawtooth', .1, 260), bonk: () => { tone(300, .1, 'triangle', .3, 120); noise(.08, 800, 'lowpass', .3); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .22, 'square', .1, 0, i * .11)), siren1: () => tone(700, .25, 'square', .08, 900),
};
// Scouse-house-ish donk on a loop: kick, off-beat bass, hats, and a stab that turns up when you're boosting
const MUS = { on: false, step: 0, next: 0, bar: 0, heat: 0 };
function musicTick() {
  if (!AC || !MUS.on) return; const spb = 60 / 142 / 4;
  while (MUS.next < AC.currentTime + .12) { const t = MUS.next - AC.currentTime, st = MUS.step % 16, bar = Math.floor(MUS.step / 16), root = [55, 55, 65.4, 49][bar % 4];
    if (st % 4 === 0) { tone(120, .16, 'sine', .7, 42, t, musBus); }
    if (st % 4 === 2) { tone(root * 4, .11, 'square', .22, root * 2, t, musBus); tone(root, .16, 'sawtooth', .3, 0, t, musBus); }
    if (st % 2 === 1 && AC) { const len = Math.floor(AC.sampleRate * .03), b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len); const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter(); s.buffer = b; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = .16; s.connect(f); f.connect(g); g.connect(musBus); s.start(AC.currentTime + Math.max(0, t)); }
    if (MUS.heat > .3 && (st === 3 || st === 6 || st === 11 || st === 14)) for (const m of [1, 1.26, 1.5]) tone(root * 4 * m, .12, 'sawtooth', .07 * MUS.heat, 0, t, musBus);
    if (bar % 4 === 3 && st > 11) tone(root * 8 * (1 + (st - 12) * .12), .06, 'square', .08, 0, t, musBus);
    MUS.step++; MUS.next += spb; }
}

// ------------------------------------------------------------ input
const keys = {}, inp = { steer: 0, gas: 0, brake: 0, hand: false, boost: false, back: false }, touch = { l: 0, r: 0, gas: 0, brake: 0, hand: 0, boost: 0 };
const KEYMAP = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'gas', w: 'gas', ArrowDown: 'brake', s: 'brake', ' ': 'hand', Shift: 'boost', x: 'boost', c: 'back' };
addEventListener('keydown', (e) => { const k = KEYMAP[e.key] || KEYMAP[(e.key || '').toLowerCase()]; if (k) keys[k] = true; if (k || e.key === 'Enter') e.preventDefault(); if (!e.repeat) onKey(e.key); });
addEventListener('keyup', (e) => { const k = KEYMAP[e.key] || KEYMAP[(e.key || '').toLowerCase()]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.mode === 'run') pause(true); });
function readInput(dt) {
  let st = (keys.l || touch.l ? 1 : 0) - (keys.r || touch.r ? 1 : 0), gas = keys.gas || touch.gas ? 1 : 0, brake = keys.brake || touch.brake ? 1 : 0, hand = !!(keys.hand || touch.hand), boost = !!(keys.boost || touch.boost);
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) { if (!p || !p.connected) continue; if (Math.abs(p.axes[0]) > .15) st = -p.axes[0]; const b = (i) => p.buttons[i] && p.buttons[i].value || 0; gas = Math.max(gas, b(7), b(0)); brake = Math.max(brake, b(6), b(1)); hand = hand || b(2) > .5; boost = boost || b(3) > .5 || b(5) > .5; break; }
  if (TOUCH && G.autoGas && !brake) gas = 1;
  inp.steer += clamp(st - inp.steer, -dt * (st === 0 || st * inp.steer < 0 ? 10 : 7), dt * (st === 0 || st * inp.steer < 0 ? 10 : 7));
  inp.gas = gas; inp.brake = brake; inp.hand = hand; inp.boost = boost; inp.back = !!keys.c;
}

// ------------------------------------------------------------ state
const G = { scoops: 0, mode: 'load', stage: 0, t: 0, score: 0, chain: 0, chainT: 0, slow: 0, shake: 0, autoGas: STORE.get('ph-drive-autogas', true), auto: false, results: [], heat: 0, time: 0, attract: true, penalty: 0, free: false };
const P = { car: null, kind: 'nova', spec: SPECS.nova, x: 0, z: 0, y: 0, vy: 0, yaw: 0, vx: 0, vz: 0, vf: 0, om: 0, slip: 0, air: 0, airMax: 0, ground: true, i: -1, s: 0, d: 0, prog: 0, hp: 100, boost: .4, boosting: false, driftT: 0, rpm: 0, gear: 0, roll: 0, pitch: 0,
  stuck: 0, wrong: 0, stun: 0, surf: 'road', gyPrev: 0, vfPrev: 0, pave: false, inv: 0, hitCool: 0 };
const A = {}, B = {}, L = {};
const H = {}; for (const id of ['stage', 'obj', 'pos', 'time', 'score', 'chain', 'mph', 'gear', 'rev', 'boost', 'dmg', 'map', 'pop', 'radio', 'road', 'big', 'wrong', 'splats', 'cargo', 'heat', 'fxspeed', 'fxflash', 'hud', 'title', 'card', 'pause', 'load', 'gap', 'note']) H[id] = $(id);

function setCar(kind) { if (P.car) scene.remove(P.car.g); P.kind = kind; P.spec = SPECS[kind]; P.car = makeCar(kind); scene.add(P.car.g); P.hp = P.spec.hp; }
function placePlayer(s, d, speed = 0) { T.at(s, A); P.x = A.x + A.nx * d; P.z = A.z + A.nz * d; P.y = A.y; P.gyPrev = A.y; P.vy = 0; P.yaw = Math.atan2(A.tx, A.tz); P.vx = A.tx * speed; P.vz = A.tz * speed; P.vf = speed; P.slip = 0; P.om = 0; P.air = 0; P.ground = true; P.i = -1; T.locate(P.x, P.z, -1, L); P.i = L.i; P.s = L.s; P.d = L.d; P.stuck = 0; P.wrong = 0; P.stun = 0; P.roll = 0; P.pitch = 0; camSnap = true; }

// ------------------------------------------------------------ bits: smoke, sparks, skid marks, flying wheelie bins
const PMAX = 420, pGeo = new THREE.BufferGeometry(), pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 4), pSize = new Float32Array(PMAX), parts = []; let pNext = 0, particles = null;
function initParticles() {
  for (let i = 0; i < PMAX; i++) { parts.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 0, a: 1 }); pPos[i * 3 + 1] = -999; }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('col', new THREE.BufferAttribute(pCol, 4)); pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
  particles = new THREE.Points(pGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: W.tex.glow }, sc: { value: 400 } },
    vertexShader: 'attribute float size; attribute vec4 col; varying vec4 vc; uniform float sc; void main(){ vc = col; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * sc / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec4 vc; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vc.rgb, vc.a * a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }));
  particles.frustumCulled = false; particles.renderOrder = 5; scene.add(particles);
}
const _c = new THREE.Color();
function puff(x, y, z, col, size, life, vx = 0, vy = 0, vz = 0, grow = 1, a = .6) { const i = pNext; pNext = (pNext + 1) % PMAX; const p = parts[i]; p.life = p.max = life; p.vx = vx; p.vy = vy; p.vz = vz; p.grow = grow; p.a = a; pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z; _c.set(col); pCol[i * 4] = _c.r; pCol[i * 4 + 1] = _c.g; pCol[i * 4 + 2] = _c.b; pCol[i * 4 + 3] = a; pSize[i] = size; }
function burst(x, y, z, col, n, sp, size = .35, life = .6) { for (let i = 0; i < n; i++) puff(x, y, z, col, size * rand(.6, 1.4), life * rand(.6, 1.3), rand(-sp, sp), rand(0, sp), rand(-sp, sp), -.3, 1); }
function updateParticles(dt) { for (let i = 0; i < PMAX; i++) { const p = parts[i]; if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { pPos[i * 3 + 1] = -999; continue; } pPos[i * 3] += p.vx * dt; pPos[i * 3 + 1] += p.vy * dt; pPos[i * 3 + 2] += p.vz * dt; p.vy -= (p.grow < 0 ? 9 : -.4) * dt; pSize[i] += p.grow * dt; pCol[i * 4 + 3] = p.a * Math.min(1, p.life / p.max * 1.6); }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.col.needsUpdate = true; pGeo.attributes.size.needsUpdate = true; particles.material.uniforms.sc.value = renderer.domElement.height * .55; }
const SMAX = 700, sGeo = new THREE.BufferGeometry(), sPos = new Float32Array(SMAX * 18); let sNext = 0, skidMesh = null; const skidLast = [null, null];
function initSkids() { sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); skidMesh = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: 0x0c0c0e, transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); skidMesh.frustumCulled = false; scene.add(skidMesh); }
function skid(k, x, y, z, nx, nz) { const l = skidLast[k]; if (l && (l.x - x) ** 2 + (l.z - z) ** 2 < 49) { const o = sNext * 18, w = .13; sNext = (sNext + 1) % SMAX;
    sPos.set([l.x - l.nx * w, l.y, l.z - l.nz * w, l.x + l.nx * w, l.y, l.z + l.nz * w, x + nx * w, y, z + nz * w, l.x - l.nx * w, l.y, l.z - l.nz * w, x + nx * w, y, z + nz * w, x - nx * w, y, z - nz * w], o); sGeo.attributes.position.needsUpdate = true; }
  skidLast[k] = { x, y, z, nx, nz }; }
const bits = [], _m4 = new THREE.Matrix4(), propMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const pieGeo = new THREE.CylinderGeometry(.34, .28, .2, 10), pieMat = new THREE.MeshLambertMaterial({ color: 0xd9a441 }), brickGeo = new THREE.BoxGeometry(.3, .16, .2), brickMat = new THREE.MeshLambertMaterial({ color: 0x8a4634 }), bottleGeo = new THREE.CylinderGeometry(.08, .1, .34, 6), bottleMat = new THREE.MeshLambertMaterial({ color: 0xf4f4f4 });
function bit(geo, mat, x, y, z, vx, vy, vz, life = 3.5, kind = 'debris', col) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.position.set(x, y, z); if (col !== undefined) { m.material = mat.clone(); m.material.color.set(col); } scene.add(m); const b = { m, vx, vy, vz, rx: rand(-9, 9), rz: rand(-9, 9), life, kind, hit: false }; bits.push(b); return b; }
function updateBits(dt) { for (let i = bits.length - 1; i >= 0; i--) { const b = bits[i], p = b.m.position; b.life -= dt; b.vy -= 18 * dt; p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt; b.m.rotation.x += b.rx * dt; b.m.rotation.z += b.rz * dt;
    const gy = T.H(p.x, p.z) + .15; if (p.y < gy) { p.y = gy; if (b.kind !== 'debris' && !b.hit) { b.life = Math.min(b.life, .05); burst(p.x, gy + .2, p.z, b.kind === 'pie' ? 0xb8782a : 0xcccccc, 5, 2, .3, .4); } b.vy *= -.35; b.vx *= .6; b.vz *= .6; b.rx *= .5; b.rz *= .5; }
    if (b.kind !== 'debris' && !b.hit && P.inv <= 0 && Math.abs(p.x - P.x) < 1.4 && Math.abs(p.z - P.z) < 1.9 && p.y < P.y + 1.9 && p.y > P.y) { b.hit = true; b.life = 0; projectileHit(b.kind); }
    if (b.life < .4) b.m.scale.setScalar(Math.max(.01, b.life / .4)); if (b.life <= 0) { scene.remove(b.m); bits.splice(i, 1); } } }
function hideProp(p) { p.alive = false; _m4.makeScale(0, 0, 0); p.inst.setMatrixAt(p.idx, _m4); p.inst.instanceMatrix.needsUpdate = true; if (p.glow !== undefined) { W.lampGlow.geometry.attributes.position.setY(p.glow, -999); W.lampGlow.geometry.attributes.position.needsUpdate = true; } }

// ------------------------------------------------------------ HUD odds and ends
let radioT = 0; const radioQ = [];
function radio(who, text, delay = 0) { radioQ.push({ who, text, delay }); }
function updateRadio(dt) { if (radioT > 0) { radioT -= dt; if (radioT <= 0) H.radio.classList.remove('on'); return; } if (!radioQ.length) return; radioQ[0].delay -= dt; if (radioQ[0].delay > 0) return;
  const r = radioQ.shift(); H.radio.innerHTML = `<b>📻 ${r.who}</b>${r.text}`; H.radio.classList.add('on'); radioT = Math.max(4.2, r.text.length * .062); SFX.radio(); }
function pop(label, pts = 0, col = '#fda138', big = false) {
  if (G.mode !== 'run') return; let gain = 0;
  if (pts > 0) { G.chain = G.chainT > 0 ? Math.min(8, G.chain + 1) : 1; G.chainT = 3.2; gain = Math.round(pts * (1 + (G.chain - 1) * .5)); G.score += gain; P.boost = Math.min(1, P.boost + pts / 1500); SFX.pop(G.chain); }
  else if (pts < 0) { G.score = Math.max(0, G.score + pts); gain = pts; }
  const el = document.createElement('div'); el.className = 'p' + (big ? ' big' : ''); el.style.color = col; el.innerHTML = `${label}${gain ? ` <b>${gain > 0 ? '+' : ''}${gain}</b>` : ''}`; H.pop.prepend(el); while (H.pop.children.length > 4) H.pop.lastChild.remove(); setTimeout(() => el.remove(), 2100);
}
function big(text, col = '#fda138', ms = 1300) { H.big.innerHTML = text; H.big.style.color = col; H.big.classList.remove('go'); void H.big.offsetWidth; H.big.classList.add('go'); clearTimeout(big.t); big.t = setTimeout(() => H.big.classList.remove('go'), ms); }
function flash(col = '#fff', a = .8) { H.fxflash.style.transition = 'none'; H.fxflash.style.background = col; H.fxflash.style.opacity = a; requestAnimationFrame(() => { H.fxflash.style.transition = 'opacity .5s'; H.fxflash.style.opacity = 0; }); }
function splat(kind = 'pie') { const el = document.createElement('div'); el.className = 'splat ' + kind; el.style.left = rand(8, 72) + '%'; el.style.top = rand(5, 55) + '%'; el.style.transform = `rotate(${rand(0, 360)}deg) scale(${rand(.8, 1.5)})`; H.splats.appendChild(el); setTimeout(() => el.classList.add('fade'), 1400); setTimeout(() => el.remove(), 3600); }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function bubble(text, bg = '#fff', ink = '#111') { const t = canvasTex(512, 96, (g, w, h) => { g.font = 'bold 36px Arial'; const tw = Math.min(w - 20, g.measureText(text).width + 36); g.fillStyle = bg; roundRect(g, (w - tw) / 2, 8, tw, 64, 14); g.fill(); g.beginPath(); g.moveTo(w / 2 - 12, 70); g.lineTo(w / 2, 90); g.lineTo(w / 2 + 12, 70); g.fill(); g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 41, w - 40); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); s.scale.set(5.2, .98, 1); s.renderOrder = 6; return s; }
function say(e, text, dur = 2.6) { if (e.bub) { e.root.remove(e.bub); e.bub.material.map.dispose(); } e.bub = bubble(text); const k = 1 / (e.root.scale.x || 1); e.bub.scale.multiplyScalar(k); e.bub.position.y = (e.bubY || 3) * k; e.root.add(e.bub); e.bubT = dur; }

// ------------------------------------------------------------ the player's motor
function damage(n, why) { if (P.inv > 0 || G.mode !== 'run') return; P.hp -= n; G.chain = 0; G.chainT = 0; H.chain.textContent = ''; if (P.hp <= 0) writeOff(); }
function writeOff() { burst(P.x, P.y + 1, P.z, 0xff8a1a, 26, 7, .7, .9); burst(P.x, P.y + 1, P.z, 0x222222, 14, 4, 1.2, 1.4); SFX.crash(1.2); flash('#ff8a1a', .5); G.shake = 1; G.penalty += 5; pop('WRITE-OFF! Nicked another one (+5s)', -300, '#ff5a3b', true);
  placePlayer(P.s, clamp(P.d, -A.hw + 1.5, A.hw - 1.5), 6); P.hp = P.spec.hp * .7; P.inv = 2.5; }
function hitWall(vn) { const k = clamp(vn / 14, .2, 1); SFX.crash(k); G.shake = Math.max(G.shake, k * .8); burst(P.x, P.y + .5, P.z, 0xffd070, 8, 5, .2, .35); damage(vn * 1.15 * (P.spec.mass < 1 ? 1.15 : 1)); loseCargo(Math.round(vn * .35)); }
function land(impact) { const t = P.airMax; if (t > .35) { SFX.thud(); G.shake = Math.max(G.shake, clamp(-impact / 16, .15, .8)); burst(P.x, P.y + .1, P.z, P.surf === 'dirt' ? 0x8a6a48 : 0xbbbbbb, 8, 3, .5, .5); if (t > .55) pop(`AIR ${t.toFixed(1)}s`, Math.round(t * 260), '#39e0ff'); if (impact < -13) damage(-impact - 11); loseCargo(t > .8 ? 2 : 0); } }
function projectileHit(kind) { if (kind === 'pie') { splat('pie'); SFX.splat(); pop('PIED!', 0, '#d9a441'); damage(2); } else if (kind === 'bottle') { splat('wkd'); SFX.smash(); damage(2); } else { SFX.thud(); G.shake = .4; damage(5); pop('AARF-KNACKER!', 0, '#ff5a3b'); } }
function carHits(x, z, r) { const f0 = Math.sin(P.yaw), f1 = Math.cos(P.yaw), h = P.car.hl - P.car.hw * .7; for (let k = -1; k <= 1; k++) { const cx = P.x + f0 * h * k, cz = P.z + f1 * h * k; if ((x - cx) ** 2 + (z - cz) ** 2 < (r + P.car.hw) ** 2) return true; } return false; }
function smashProp(p) { const t = W.PT[p.type], sp = Math.hypot(P.vx, P.vz); if (sp < 3 && !t.sturdy) return; hideProp(p);
  bit(t.geo, propMat, p.x, p.y + .2, p.z, P.vx * rand(.6, 1) + rand(-3, 3), 4 + sp * .16, P.vz * rand(.6, 1) + rand(-3, 3), 3.5, 'debris', p.col).m.rotation.y = p.ry;
  if (t.sturdy) { P.vx *= .76; P.vz *= .76; SFX.crash(.6); G.shake = Math.max(G.shake, .5); damage(6); burst(p.x, p.y + 1, p.z, 0xffd070, 10, 6, .2, .4); } else { P.vx *= .965; P.vz *= .965; SFX.smash(); G.shake = Math.max(G.shake, .18); burst(p.x, p.y + .6, p.z, p.type === 'bale' ? 0xd8b84a : 0xdddddd, 7, 4, .25, .5); }
  if (p.type === 'phone' || p.type === 'shelter') burst(p.x, p.y + 1.4, p.z, 0xbfe6ff, 16, 6, .16, .7);
  pop(p.type === 'cam' ? 'GATSO FETTLED' : `CRIMINAL DAMAGE · ${t.name}`, t.pts, '#ffe14f'); }
function hitProps() { const nb = W.buckets.length, b = Math.floor(P.s / 25); for (let k = -1; k <= 1; k++) { const list = W.buckets[(b + k + nb) % nb]; if (!list) continue; for (const p of list) { if (!p.alive || Math.abs(p.x - P.x) > 5 || Math.abs(p.z - P.z) > 5) continue; if (carHits(p.x, p.z, p.r)) smashProp(p); } } }

function stepPlayer(dt) {
  const sp = P.spec, car = P.car;
  T.at(P.s, A); let ad = Math.abs(P.d); const kind = T.SECTIONS[T.SEC_KEYS[A.sec]].kind, onPave = A.pw > .4 && ad > A.hw + .1 && ad < A.hw + A.pw, onApron = ad > A.hw + A.pw + .05 && A.off > .5, dirt = kind === 'park' || onApron;
  P.surf = dirt ? 'dirt' : onPave ? 'pave' : 'road';
  const grip = sp.grip * (dirt ? (sp.dirt ? .94 : .72) : 1) * (P.hp < 20 ? .92 : 1), aLat = 21 * grip;
  let f0 = Math.sin(P.yaw), f1 = Math.cos(P.yaw), vf = P.vx * f0 + P.vz * f1, vl = P.vx * f1 - P.vz * f0;
  const gas = P.stun > 0 ? 0 : inp.gas, brake = P.stun > 0 ? 1 : inp.brake, hand = inp.hand && P.ground;
  const was = P.boosting; P.boosting = inp.boost && P.boost > .02 && gas > 0 && P.stun <= 0; if (P.boosting) { P.boost = Math.max(0, P.boost - dt * .21); if (!was) SFX.boost(); }
  const vmax = sp.vmax * (P.boosting ? 1.25 : 1) * (onApron && !sp.dirt ? .78 : 1) * (kind === 'park' && !sp.dirt ? .9 : 1) * (P.hp < 20 ? .88 : 1);
  if (P.ground) {
    if (gas > 0 && vf < vmax) vf += gas * sp.acc * (P.boosting ? 1.85 : 1) * Math.max(.1, 1 - Math.pow(Math.max(0, vf) / vmax, 1.7)) * (dirt && !sp.dirt ? .82 : 1) * dt;
    if (brake > 0) vf -= (vf > .6 ? 28 : vf > -9 ? 8 : 0) * brake * dt;
    if (!gas && !brake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 2.4 * dt);
    if (vf > vmax) vf -= Math.min(vf - vmax, 10 * dt);
    vf -= vf * Math.abs(vf) * .001 * dt; if (hand) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 3 * dt);
    const sv = Math.abs(vf); P.om = inp.steer * Math.min(.2 * sp.turn * sv, 1.18 * aLat / Math.max(sv, 4)) * (hand ? 1.4 : 1) * (vf < 0 ? -1 : 1); P.yaw += P.om * dt;
  } else { P.yaw += inp.steer * .45 * dt; P.om *= .96; }
  P.vx = f0 * vf + f1 * vl; P.vz = f1 * vf - f0 * vl; f0 = Math.sin(P.yaw); f1 = Math.cos(P.yaw); vf = P.vx * f0 + P.vz * f1; vl = P.vx * f1 - P.vz * f0;
  if (P.ground) { const ang = Math.atan2(Math.abs(vl), Math.max(vf, 1)), mx = aLat * (hand ? .5 : 1) * (1 + Math.max(0, ang - .6) * 3) * dt; vl -= clamp(vl, -mx, mx); const slip = Math.abs(vl); vf -= vf * Math.min(1, slip / 26) * (hand ? .3 : .6) * dt;
    if (slip > 1.2 && vf > 5) P.yaw += angd(Math.atan2(P.vx, P.vz), P.yaw) * Math.min(1, (hand ? .8 : 2.4) * dt); }
  P.slip = Math.abs(vl); P.vf = vf; f0 = Math.sin(P.yaw); f1 = Math.cos(P.yaw); P.vx = f0 * vf + f1 * vl; P.vz = f1 * vf - f0 * vl;
  P.x += P.vx * dt; P.z += P.vz * dt;
  // where that leaves us on the road, and whether we've run out of it
  T.locate(P.x, P.z, P.i, L); P.i = L.i; P.prog += T.sdiff(L.s, P.s); P.s = L.s; P.d = L.d; T.at(P.s, A); ad = Math.abs(P.d);
  const lim = A.hw + A.pw + A.off - car.hw * .85;
  if (ad > lim) { const sg = Math.sign(P.d), nx = A.nx * sg, nz = A.nz * sg, vn = P.vx * nx + P.vz * nz; P.x -= nx * (ad - lim); P.z -= nz * (ad - lim); P.d = sg * lim;
    if (vn > 0) { P.vx -= nx * vn * 1.4; P.vz -= nz * vn * 1.4; P.vx *= .97; P.vz *= .97; const back = P.vx * A.tx + P.vz * A.tz < 0 ? Math.PI : 0; P.yaw += angd(Math.atan2(A.tx, A.tz) + back, P.yaw) * clamp(.12 + vn * .05, 0, .7);
      if (vn > 3.2) hitWall(vn); else if (Math.abs(P.vf) > 8) { if (Math.random() < .3) SFX.scrape(); puff(P.x + nx * car.hw, P.y + .5, P.z + nz * car.hw, 0xffd070, .2, .3, rand(-3, 3), rand(1, 4), rand(-3, 3), -.3, 1); } } }
  const nowPave = A.pw > .4 && ad > A.hw + .1 && ad < A.hw + A.pw; if (nowPave !== P.pave) { P.pave = nowPave; if (Math.abs(P.vf) > 9) { SFX.thud(); G.shake = Math.max(G.shake, .16); } }
  const gy = A.y + (nowPave ? .14 : 0), gvy = (gy - P.gyPrev) / dt; P.gyPrev = gy; P.vy -= 20 * dt; P.y += P.vy * dt;
  if (P.y <= gy) { const impact = P.vy - gvy; if (P.air > .25) { P.airMax = P.air; land(impact); } P.y = gy; P.vy = gvy; P.air = 0; } else P.air += dt;
  P.ground = P.air < .07;
  const along = P.vx * A.tx + P.vz * A.tz; P.wrong = along < -5 ? P.wrong + dt : 0; P.stuck = Math.abs(P.vf) < 1.5 && inp.gas ? P.stuck + dt : 0;
  if (P.stun > 0) P.stun -= dt; if (P.inv > 0) P.inv -= dt; if (P.hitCool > 0) P.hitCool -= dt;
  // gears, for the noise
  const tops = [.2, .38, .58, .8, 1.3], u = Math.max(0, P.vf) / sp.vmax; let gi = 0; while (gi < 4 && u > tops[gi]) gi++; if (gi !== P.gear) { P.gear = gi; P.shiftT = .12; } P.rpm = lerp(P.rpm, clamp(.22 + .78 * (u - (gi ? tops[gi - 1] : 0)) / (tops[gi] - (gi ? tops[gi - 1] : 0)), .15, 1.1) + (P.ground ? 0 : .25), Math.min(1, dt * 12));
  // style: drifting
  if (P.slip > 4.5 && P.ground && P.vf > 12) { P.driftT += dt; } else { if (P.driftT > .7) pop(`DRIFT ${P.driftT.toFixed(1)}s`, Math.round(P.driftT * 90), '#ff4fd8'); P.driftT = 0; }
  hitProps();
  // pose and effects
  const acc = (P.vf - P.vfPrev) / dt; P.vfPrev = P.vf; P.roll = lerp(P.roll, clamp(-P.om * P.vf * .0042 - vl * .012, -.16, .16) * (sp.mass > 1.5 ? 1.5 : 1), Math.min(1, dt * 7)); P.pitch = lerp(P.pitch, P.ground ? clamp(-acc * .0035, -.06, .08) : clamp(-P.vy * .02, -.2, .25), Math.min(1, dt * 7));
  car.g.position.set(P.x, P.y, P.z); car.g.rotation.y = P.yaw; pose(car, dt, P.vf, inp.steer, P.roll, P.pitch, brake > 0 && P.vf > 1); car.g.visible = !(P.inv > 0 && Math.floor(P.inv * 12) % 2);
  car.blob.position.y = .06 + Math.min(0, gy - P.y) ; car.blob.material.opacity = clamp(1 - (P.y - gy) * .35, .25, 1);
  const rx = P.x - f0 * car.hl * .8, rz = P.z - f1 * car.hl * .8;
  if (P.ground && Math.abs(P.vf) > 6) { const sk = P.slip > 3.5 || (hand && P.vf > 8) || (brake && P.vf > 14);
    if (P.surf === 'dirt') { if (Math.random() < .5) puff(rx + rand(-.7, .7), P.y + .2, rz + rand(-.7, .7), 0x8a6a48, rand(.6, 1.1), .9, rand(-1, 1), rand(.5, 2), rand(-1, 1), 2.2, .5); }
    else if (sk) { if (Math.random() < .7) puff(rx + rand(-.8, .8), P.y + .15, rz + rand(-.8, .8), 0xe8e8e8, rand(.5, .9), .8, rand(-1, 1), rand(.5, 1.6), rand(-1, 1), 2.4, .42);
      for (const k of [0, 1]) { const o = (k ? 1 : -1) * car.hw * .8; skid(k, rx + f1 * o, gy + .05, rz - f0 * o, f1, -f0); } }
    if (!sk || P.surf === 'dirt') skidLast[0] = skidLast[1] = null; } else skidLast[0] = skidLast[1] = null;
  if (P.boosting) for (const k of [-1, 1]) puff(rx + f1 * k * .4, P.y + .35, rz - f0 * k * .4, Math.random() < .5 ? 0x60b0ff : 0xffb040, .35, .22, -P.vx * .1, .5, -P.vz * .1, -.5, 1);
  if (P.hp < P.spec.hp * .4 && Math.random() < .3) puff(P.x + f0 * car.hl * .7, P.y + 1, P.z + f1 * car.hl * .7, P.hp < P.spec.hp * .18 ? 0x1a1a1a : 0x888888, .7, 1.1, rand(-.5, .5), 2.2, rand(-.5, .5), 1.8, .5);
}

// ------------------------------------------------------------ camera
let camSnap = true, camYaw = 0, camFov = 62; const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _v = new THREE.Vector3();
function updateCamera(dt, orbit) {
  const sp = Math.hypot(P.vx, P.vz), want = orbit !== undefined ? orbit : (sp > 7 && P.vf > 0 ? Math.atan2(P.vx * .6 + Math.sin(P.yaw) * sp * .4, P.vz * .6 + Math.cos(P.yaw) * sp * .4) : P.yaw) + (inp.back ? Math.PI : 0);
  camYaw = camSnap || inp.back ? want : camYaw + angd(want, camYaw) * Math.min(1, dt * (orbit !== undefined ? 20 : 5.5));
  const dist = (orbit !== undefined ? 8.5 : 7 + sp * .04) + (P.car.hl > 2.3 ? 1.6 : 0), hgt = 2.55 + sp * .012 + (P.car.top > 1.9 ? .5 : 0);
  _v.set(P.x - Math.sin(camYaw) * dist, P.y + hgt, P.z - Math.cos(camYaw) * dist);
  T.locate(_v.x, _v.z, P.i, L); T.at(L.s, B); const cl = B.hw + B.pw + B.off - .5; if (Math.abs(L.d) > cl) { const o = Math.abs(L.d) - cl, sg = Math.sign(L.d); _v.x -= B.nx * sg * o; _v.z -= B.nz * sg * o; }
  _v.y = Math.max(_v.y, B.y + 1.3);
  if (camSnap) { camPos.copy(_v); camSnap = false; } else camPos.lerp(_v, Math.min(1, dt * 9));
  camLook.set(P.x + Math.sin(camYaw) * 5, P.y + 1.25, P.z + Math.cos(camYaw) * 5);
  camera.position.copy(camPos); if (G.shake > 0) { camera.position.x += rand(-1, 1) * G.shake * .35; camera.position.y += rand(-1, 1) * G.shake * .3; G.shake = Math.max(0, G.shake - dt * 2.2); }
  if (P.boosting || sp > 40) { const j = (P.boosting ? .03 : 0) + Math.max(0, sp - 40) * .002; camera.position.x += rand(-j, j); camera.position.y += rand(-j, j); }
  camera.lookAt(camLook); camera.rotateZ(clamp(P.om * .035 + P.roll * .25, -.07, .07));
  camFov = lerp(camFov, 60 + 22 * Math.pow(clamp(sp / 50, 0, 1.2), 1.3) + (P.boosting ? 10 : 0), Math.min(1, dt * 4)); if (Math.abs(camera.fov - camFov) > .05) { camera.fov = camFov; camera.updateProjectionMatrix(); }
}

// ------------------------------------------------------------ everybody else on the road
const vehicles = [], kindA = (a) => T.SECTIONS[T.SEC_KEYS[a.sec]].kind;
const laneD = (a, lane) => (a.hw > 8 ? (lane ? 7 : 2.5) : Math.max(1.45, (a.hw - 2.1) / 2 + .1));
function addVehicle(kind, role, o = {}) {
  const car = kind === 'bike' ? makeBike(o.col, o.hood) : makeCar(kind, o.tint); scene.add(car.g);
  const V = Object.assign({ car, kind, role, s: 0, d: 0, v: 0, dir: 1, td: 0, lane: 0, vd: 0, dRate: 0, x: 0, z: 0, y: 0, yaw: 0, hw: car.hw, hl: car.hl, mass: (car.spec && car.spec.mass) || 1, missed: false, cool: 0, wreck: 0, prog: 0, name: (car.spec && car.spec.name) || '', stall: 0, wait: 0, hitT: 9, i: -1, bike: !!car.bike, roll: 0 }, o);
  vehicles.push(V); vPlace(V, 0); return V;
}
function removeVehicle(V) { scene.remove(V.car.g); const i = vehicles.indexOf(V); if (i >= 0) vehicles.splice(i, 1); }
function clearVehicles(keep) { for (let i = vehicles.length - 1; i >= 0; i--) if (!keep || !keep(vehicles[i])) removeVehicle(vehicles[i]); }
function vPlace(V, dt) {
  T.at(V.s, B); V.x = B.x + B.nx * V.d; V.z = B.z + B.nz * V.d; V.y = B.y + (B.pw > .4 && Math.abs(V.d) > B.hw + .1 ? .14 : 0);
  V.yaw = Math.atan2(B.tx, B.tz) + (V.dir < 0 ? Math.PI : 0) + Math.atan2(V.dRate, Math.max(Math.abs(V.v), 5)) * V.dir;
  V.car.g.position.set(V.x, V.y, V.z); V.car.g.rotation.y = V.yaw;
  if (dt) { V.roll = lerp(V.roll, V.bike ? clamp(B.k * V.v * V.v * .05 + V.dRate * .08, -.6, .6) : clamp(-B.k * V.v * V.v * .006, -.1, .1), Math.min(1, dt * 6)); pose(V.car, dt, V.v, clamp(B.k * 14 + V.dRate * .2, -1, 1) * V.dir, V.roll, V.bike && V.wheelie > 0 ? -.55 : 0, V.braking); }
}
// --- ordinary traffic
function spawnTraffic(dir, sAt) {
  T.at(sAt, B); if (kindA(B) === 'park' || B.hump > .2) return null; for (const O of vehicles) if (Math.abs(T.sdiff(O.s, sAt)) < 18 && (O.dir === dir || O.role !== 'traffic')) return null;
  const r = Math.random(), kind = r < .3 ? 'car0' : r < .58 ? 'car1' : r < .8 ? 'car2' : r < .9 ? 'taxi' : r < .96 ? 'float' : 'bus', dual = B.hw > 8, lane = dual && Math.random() < .45 ? 1 : 0;
  const V = addVehicle(kind, 'traffic', { dir, s: sAt, lane, d: dir * laneD(B, lane) }); V.td = V.d; V.v0 = (dual ? rand(19, 25) : rand(10, 14.5)) * (kind === 'float' ? .45 : kind === 'bus' ? .8 : 1); V.v = V.v0; return V;
}
function manageTraffic() {
  let same = 0, onc = 0; for (let i = vehicles.length - 1; i >= 0; i--) { const V = vehicles[i]; if (V.role === 'parked' || V.persist) { V.car.g.visible = Math.abs(T.sdiff(V.s, P.s)) < 300; continue; } if (V.role !== 'traffic' && !(V.role === 'wreck' && V.was === 'traffic')) continue;
    const rel = T.sdiff(V.s, P.s); if (rel < -100 || rel > 640 || (V.role === 'wreck' && V.wreck <= 0)) { removeVehicle(V); continue; } if (V.role === 'traffic') { if (V.dir > 0) same++; else onc++; } }
  const tr = G.free ? [3, 3] : STAGES[G.stage].traffic; if (same < tr[0] && Math.random() < .1) spawnTraffic(1, T.wrap(P.s + rand(300, 560))); if (onc < tr[1] && Math.random() < .1) spawnTraffic(-1, T.wrap(P.s + rand(330, 600)));
}
function stepTraffic(V, dt) {
  T.at(V.s, B); let vt = V.v0;
  for (const O of vehicles) { if (O === V || O.dir !== V.dir) continue; const gap = T.sdiff(O.s, V.s) * V.dir; if (gap > 0 && gap < 12 + V.v && Math.abs(O.d - V.d) < 2.2) vt = Math.min(vt, Math.max(0, O.v - 1 + (gap - 9) * .4)); }
  { const gap = T.sdiff(P.s, V.s) * V.dir, pv = (P.vx * B.tx + P.vz * B.tz) * V.dir; if (gap > 0 && gap < 11 + V.v * .8 && Math.abs(P.d - V.d) < 2.1 && pv < V.v) { vt = Math.min(vt, Math.max(0, pv - 1)); if (!(V.honk > 0) && gap < 9) { V.honk = 4; if (AC) { tone(430, .3, 'square', .05); tone(540, .3, 'square', .05); } } } }
  if (V.honk > 0) V.honk -= dt; V.braking = vt < V.v - .5; V.v += clamp(vt - V.v, -15 * dt, 5 * dt); V.s = T.wrap(V.s + V.v * V.dir * dt);
  V.td = V.dir * laneD(B, V.lane); if (G.blues && V.dir > 0 && B.hw > 8) { const gap = T.sdiff(V.s, P.s); if (gap > 0 && gap < 110) V.td = 7.2; }
  if (kindA(B) === 'park') V.gone = true;
  const pd = V.d; V.d += clamp(V.td - V.d, -2.4 * dt, 2.4 * dt); V.dRate = (V.d - pd) / dt; vPlace(V, dt);
}
// --- anything that's been clattered
function wreckIt(V, vx, vz) { V.was = V.was || V.role; V.role = 'wreck'; V.wvx = vx; V.wvz = vz; V.wspin = rand(-4, 4); V.wreck = V.was === 'parked' ? 1e9 : 6; V.v = 0; V.i = -1;
  if (V.was === 'parked' && !V.alarm) { V.alarm = true; pop('CAR ALARM', 40, '#ffe14f'); for (let k = 0; k < 6; k++) tone(k % 2 ? 950 : 1250, .14, 'square', .05, 0, k * .16); } }
function stepWreck(V, dt) {
  V.x += V.wvx * dt; V.z += V.wvz * dt; V.yaw += V.wspin * dt; const fr = Math.max(0, 1 - 2.4 * dt); V.wvx *= fr; V.wvz *= fr; V.wspin *= Math.max(0, 1 - 1.8 * dt); V.wreck -= dt;
  T.locate(V.x, V.z, V.i, L); V.i = L.i; V.s = L.s; V.d = L.d; T.at(L.s, B); const lim = B.hw + B.pw + B.off - V.hw * .7, ad = Math.abs(L.d);
  if (ad > lim) { const sg = Math.sign(L.d), nx = B.nx * sg, nz = B.nz * sg, vn = V.wvx * nx + V.wvz * nz; V.x -= nx * (ad - lim); V.z -= nz * (ad - lim); if (vn > 0) { V.wvx -= nx * vn * 1.5; V.wvz -= nz * vn * 1.5; } }
  V.y = B.y; V.car.g.position.set(V.x, V.y, V.z); V.car.g.rotation.y = V.yaw; if (V.was !== 'parked' && Math.random() < .12 && Math.abs(T.sdiff(V.s, P.s)) < 120) puff(V.x, V.y + 1.2, V.z, 0x444444, .8, 1.2, 0, 2, 0, 1.6, .5);
  if (V.recover && V.wreck < 6 - V.recover) { V.role = V.was; V.was = null; V.dir = 1; V.v = 4; V.vd = 0; V.dRate = 0; V.d = clamp(V.d, -(B.hw - 1.3), B.hw - 1.3); }
}
// --- dealers and scramblers: they race you
function stepRacer(V, dt) {
  T.at(V.s, B); const dirt = kindA(B) === 'park'; let kmx = 0; const look = 12 + V.v * 1.5;
  for (let ds = 3; ds < look; ds += 5) { const k = T.K[Math.round(T.wrap(V.s + ds) / T.DS) % T.N]; if (Math.abs(k) > Math.abs(kmx)) kmx = k; }
  const gap = P.prog - V.prog, rb = clamp(1 + gap * .003, .8, 1.16), grip = (V.bike ? (dirt ? 20 : 15) : (dirt ? 11 : 17.5)) * V.skill;
  const vmaxR = V.vmax * rb * (V.bike ? (dirt ? 1.1 : .92) : (dirt ? .85 : 1)); let vt = Math.min(vmaxR, Math.sqrt(grip / (Math.abs(kmx) + .0008)));
  const wide = B.hw - 1.5 + (dirt ? B.off * .6 : 0); let td = clamp(Math.sign(kmx) * Math.min(wide, Math.abs(kmx) * 140) + V.bias, -wide, wide);
  for (const O of vehicles) { if (O === V) continue; const g2 = T.sdiff(O.s, V.s), closing = V.v - O.v * O.dir; if (g2 > -2.5 && g2 < 8 + Math.max(0, closing) * .9 && Math.abs(O.d - td) < O.hw + V.hw + .5) { td = clamp(O.d + (O.d > V.d ? -1 : 1) * (O.hw + V.hw + 1), -wide, wide); if (g2 > 0 && g2 < 6 && Math.abs(O.d - V.d) < O.hw + V.hw + .2) vt = Math.min(vt, Math.max(4, O.v * O.dir - 1)); } }
  { const g2 = T.sdiff(P.s, V.s), pv = P.vx * B.tx + P.vz * B.tz; if (g2 > -2.5 && g2 < 7 + Math.max(0, V.v - pv) * .8 && Math.abs(P.d - td) < P.car.hw + V.hw + .4) td = clamp(P.d + (P.d > V.d ? -1 : 1) * (P.car.hw + V.hw + .9), -wide, wide); }
  if (V.stall > 0) { V.stall -= dt; vt = Math.min(vt, 5); } if (G.mode !== 'run') vt = 0;
  V.braking = vt < V.v - 1; const dv = clamp(vt - V.v, -18 * dt, V.acc * rb * dt * Math.max(.15, 1 - Math.pow(V.v / (vmaxR + 2), 2))); V.v = Math.max(0, V.v + dv); V.wheelie = V.bike && dv > 5 * dt && V.v < 22 && V.v > 3 ? 1 : 0;
  const pd = V.d; V.vd *= Math.max(0, 1 - 3 * dt); V.d += clamp(td - V.d, -5.5 * dt, 5.5 * dt) + V.vd * dt; V.dRate = (V.d - pd) / dt; const ds = V.v * dt; V.s = T.wrap(V.s + ds); V.prog += ds; V.hitT += dt;
  if (Math.abs(V.d) > B.hw + B.pw + B.off - V.hw) crashOut(V, B);
  if (dirt && V.v > 10 && Math.abs(T.sdiff(V.s, P.s)) < 90 && Math.random() < .35) puff(V.x, V.y + .2, V.z, 0x8a6a48, rand(.5, 1), .8, rand(-1, 1), 1.5, rand(-1, 1), 2, .45);
  vPlace(V, dt);
}
function crashOut(V, a) { const lim = a.hw + a.pw + a.off - V.hw; V.d = clamp(V.d, -lim + .3, lim - .3); V.vd = 0; V.stall = 2.6; V.v = Math.min(V.v, 3); burst(V.x, V.y + .8, V.z, 0xffd070, 12, 6, .25, .5); if (Math.abs(T.sdiff(V.s, P.s)) < 60) SFX.crash(.7);
  if (V.hitT < 2.5) { pop(`FETTLED · ${V.name}`, 500, '#39ff14', true); V.hitT = 9; if (V.role === 'chaser') V.wait = 7; } }
// --- doormen and bizzies: they want a word
function stepChaser(V, dt) {
  if (V.wait > 0) { if (G.mode === 'run') V.wait -= dt; V.car.g.visible = false; if (V.wait <= 0) { V.s = T.wrap(P.s - 60); V.prog = P.prog - 60; T.at(V.s, B); V.d = -laneD(B, 0); V.v = Math.max(14, P.vf); V.car.g.visible = true; } V.x = 1e6; return; }
  T.at(V.s, B); const gap = T.sdiff(P.s, V.s), pv = P.vx * B.tx + P.vz * B.tz; let kmx = 0;
  for (let ds = 3; ds < 12 + V.v * 1.4; ds += 5) { const k = T.K[Math.round(T.wrap(V.s + ds) / T.DS) % T.N]; if (Math.abs(k) > Math.abs(kmx)) kmx = k; }
  if (gap > 150 || gap < -70) { V.wait = 1.5; return; }
  let vt = Math.min(clamp(pv + gap * .55 + (gap > 3 ? 4 : -2), 4, V.vmax), Math.sqrt(18 / (Math.abs(kmx) + .0008))), wide = B.hw - 1.4, td = Math.abs(gap) < 8 ? clamp(P.d, -wide - 1, wide + 1) : clamp(P.d * .6 + V.bias, -wide, wide);
  if (gap > 9) for (const O of vehicles) { if (O === V) continue; const g2 = T.sdiff(O.s, V.s); if (g2 > -2 && g2 < 9 + Math.max(0, V.v - O.v * O.dir) && Math.abs(O.d - td) < O.hw + V.hw + .5) td = clamp(O.d + (O.d > V.d ? -1 : 1) * (O.hw + V.hw + 1), -wide, wide); }
  if (V.cool > 0) { V.cool -= dt; td = clamp(V.d + (V.d > P.d ? 2 : -2), -wide, wide); vt = Math.min(vt, pv - 3); } if (V.stall > 0) { V.stall -= dt; vt = Math.min(vt, 4); } if (G.mode !== 'run') vt = 0;
  V.braking = vt < V.v - 1; V.v = Math.max(0, V.v + clamp(vt - V.v, -20 * dt, V.acc * dt)); const pd = V.d; V.vd *= Math.max(0, 1 - 3 * dt); V.d += clamp(td - V.d, -4.6 * dt, 4.6 * dt) + V.vd * dt; V.dRate = (V.d - pd) / dt; V.s = T.wrap(V.s + V.v * dt); V.hitT += dt;
  if (Math.abs(V.d) > B.hw + B.pw + B.off - V.hw) crashOut(V, B);
  if (Math.abs(gap) < 9 && Math.hypot(P.vx, P.vz) < 5.5 && Math.abs(P.d - V.d) < 5) G.caughtNow = true;
  V.car.g.visible = true; vPlace(V, dt); if (V.car.blues) blues(V.car, G.time, true);
}
// --- the Wigan Tours coach and the hen limo: all over the road and chucking things
function stepHog(V, dt) {
  T.at(V.s, B); const rel = T.sdiff(P.s, V.s); V.t = (V.t || 0) + dt; const lo = V.hw - .35, hi = B.hw - V.hw - .3;      // hogs our side of the road and a bit of the white line
  for (const O of vehicles) if (O.role === 'traffic' && O.dir > 0) { const g2 = T.sdiff(O.s, V.s); if (g2 > 0 && g2 < 30) O.v0 = Math.max(O.v0, V.v0 + 2.5); }   // anything in front of it wisely gets a move on
  V.v += clamp((rel > 25 ? V.v0 * .75 : V.v0 + (rel > -50 ? 3 : 0)) - V.v, -6 * dt, 4 * dt); V.s = T.wrap(V.s + V.v * dt); const pd = V.d; V.d = lerp(V.d, clamp((lo + hi) / 2 + Math.sin(V.t * V.weave) * (hi - lo) / 2 + (rel < 0 && rel > -30 ? clamp(P.d - V.d, -1, 1) * 1.4 : 0), lo, hi), Math.min(1, dt * 1.6)); V.dRate = (V.d - pd) / dt; vPlace(V, dt);
  V.throwT = (V.throwT || 1) - dt; if (rel < -6 && rel > -55 && V.throwT <= 0 && G.mode === 'run') { V.throwT = V.rate * rand(.6, 1.4); const sx = V.x + rand(-1, 1), sy = V.y + V.car.top - .3, sz = V.z + rand(-1, 1), tt = clamp(-rel / 26, .5, 1.3), tx = P.x + P.vx * tt + rand(-1.6, 1.6), tz = P.z + P.vz * tt + rand(-1.6, 1.6);
    bit(V.ammo === 'pie' ? pieGeo : bottleGeo, V.ammo === 'pie' ? pieMat : bottleMat, sx, sy, sz, (tx - sx) / tt, (P.y + 1 - sy) / tt + 9 * tt, (tz - sz) / tt, 3, V.ammo, V.ammo === 'bottle' ? 0x39a0ff : undefined); if (Math.random() < .25) radio(V.who, pick(V.lines)); }
  if (rel > 14 && !V.passed) { V.passed = true; pop(`OVERTOOK ${V.name}`, 500, '#39ff14', true); }
  if (V.riders) for (const r of V.riders) r.ctl.update(dt);
}
// --- clattering into any of the above
const cA = new Float32Array(10), cB = new Float32Array(10);
function circles(x, z, yaw, hw, hl, out) { const h = Math.max(0, hl - hw * .8), n = hl > 3.5 ? 5 : 3, f0 = Math.sin(yaw), f1 = Math.cos(yaw); for (let k = 0; k < n; k++) { const u = (k / (n - 1) * 2 - 1) * h; out[k * 2] = x + f0 * u; out[k * 2 + 1] = z + f1 * u; } return n; }
function collideVehicles() {
  const na = circles(P.x, P.z, P.yaw, P.car.hw, P.car.hl, cA);
  for (const V of vehicles) { if (V.wait > 0) continue; const dx = V.x - P.x, dz = V.z - P.z; if (dx * dx + dz * dz > (V.hl + P.car.hl + 3) ** 2) continue; nearMiss(V);
    const nb = circles(V.x, V.z, V.yaw, V.hw, V.hl, cB), rr = P.car.hw + V.hw; let best = 0, bx = 0, bz = 0;
    for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) { const ex = cA[i * 2] - cB[j * 2], ez = cA[i * 2 + 1] - cB[j * 2 + 1], d2 = ex * ex + ez * ez; if (d2 < rr * rr) { const d = Math.sqrt(d2) || .01; if (rr - d > best) { best = rr - d; bx = ex / d; bz = ez / d; } } }
    if (best > 0) hitVehicle(V, bx, bz, best); }
}
function nearMiss(V) { if (V.missed || V.role !== 'traffic' || G.mode !== 'run') return; const rel = T.sdiff(V.s, P.s), closing = P.vf - V.v * V.dir; if (Math.abs(rel) > 3.2 || closing < 9) return; const gap = Math.abs(P.d - V.d) - P.car.hw - V.hw; V.missed = true;
  if (gap < 1.2 && gap > -.3) { SFX.whoosh(); if (V.dir < 0) pop('OH MY GOD', 260, '#ff4fd8'); else pop('NEAR MISS', 110, '#39e0ff'); } }
function hitVehicle(V, nx, nz, pen) {
  let wx, wz; T.at(V.s, B); if (V.role === 'wreck') { wx = V.wvx; wz = V.wvz; } else { wx = B.tx * V.v * V.dir + B.nx * V.dRate; wz = B.tz * V.v * V.dir + B.nz * V.dRate; }
  const mP = P.spec.mass, mV = V.mass, inv = 1 / mP + 1 / mV, vr = (P.vx - wx) * nx + (P.vz - wz) * nz, nl = nx * B.nx + nz * B.nz;
  P.x += nx * pen * (1 / mP) / inv; P.z += nz * pen * (1 / mP) / inv; if (V.role === 'wreck') { V.x -= nx * pen * (1 / mV) / inv; V.z -= nz * pen * (1 / mV) / inv; } else V.d -= nl * pen * (1 / mV) / inv;
  if (vr >= 0) return; const j = -1.35 * vr / inv, hit = -vr; P.vx += nx * j / mP; P.vz += nz * j / mP; V.missed = true;
  if (V.role === 'traffic' || V.role === 'parked') wreckIt(V, wx - nx * j / mV, wz - nz * j / mV);
  else if (V.role === 'wreck') { V.wvx -= nx * j / mV; V.wvz -= nz * j / mV; V.wspin += rand(-3, 3); }
  else { V.vd -= nl * j / mV * 1.2; V.v = Math.max(2, V.v - (nx * B.tx + nz * B.tz) * j / mV); V.hitT = 0; if (V.role === 'chaser') V.cool = 1.4; if (V.role === 'racer' && hit > 3 && Math.random() < .5) radio(V.name.toUpperCase(), pick(['Watch the paintwork, dickhead!', 'That\'s coming out of your end!', 'Beak, mater?', 'Yer what?!'])); }
  if (P.hitCool <= 0 && hit > 2.5) { P.hitCool = .3; SFX.crash(clamp(hit / 18, .3, 1.2)); G.shake = Math.max(G.shake, clamp(hit / 15, .25, 1)); burst(P.x - nx * P.car.hw, P.y + .7, P.z - nz * P.car.hw, 0xffd070, 10, 6, .22, .4);
    damage(hit * .8 * (2 * mV / (mP + mV)) * (V.role === 'chaser' || V.role === 'racer' ? .55 : 1)); loseCargo(Math.round(hit * .3)); if (hit > 17) { G.slow = .5; flash('#fff', .3); burst(P.x, P.y + 1, P.z, 0xbfe6ff, 18, 7, .16, .7); } }
}

// ------------------------------------------------------------ people (and geese, and ants) who should not be in the road
const peds = [];
const LINES = { hen: ['Fucking dickhead!', 'Small penis!', 'Wanker!', 'Mind me WKD!', 'Giz a lift, love!'], bride: ['It\'s MY night!', 'Wanker!', 'Kelly\'s getting MARRIED!'], bouncer: ['Not tonight, pal!', 'That\'s MY motor!', 'Yer barred!', 'Give us your gear!'],
  wiganer: ['Pie-eater and proud!', 'Giz a pie!', 'Wigan! Wigan!', 'Yer soft melt!'], mum: ['Mind the pram!', 'I know yer mam!', 'Twenty\'s plenty, dickhead!'], scally: ['Nice motor, lad!', 'Do a wheelie!', 'Giz a go!', 'Yer mam!'],
  kid: ['MISTER! 99 wi\' a flake!', 'Two screwballs!', 'Giz a Fab!', 'Yer chimes are broke!'], drinker: ['Mind me pint!', 'Taxi!', 'Is this the bus to Clock Face?'], roadworker: ['Road\'s shut, pal!', 'Can yer not read?'], keeper: ['Keep off the grass!', 'No scramblers!'], warden: ['Yer can\'t park there!'] };
const ANGRY = ['Yer knobhead!', 'I\'m ringing the bizzies!', 'Me best keks!', 'Learn to drive!', 'I know where yer live!'];
function addPed(type, s, d, o = {}) {
  const creature = /^(goose|ant|soldier|spitter)$/.test(type), look = type === 'kid' ? 'scally' : type, c = creature ? (type === 'goose' ? makeGoose() : makeAnt(type)) : makeCharacter(look);
  if (type === 'kid') c.root.scale.multiplyScalar(.72); if (o.scale) c.root.scale.multiplyScalar(o.scale);
  const e = Object.assign({ c, root: c.root, type, s: T.wrap(s), d, st: 'idle', t: 0, r: type === 'goose' ? .5 : creature ? 1.25 * (o.scale || 1) : .45, creature, bubY: creature ? 2.4 : 3.2, lines: LINES[type], speed: 1.7, x: 0, z: 0, y: 0, sayT: rand(0, 4), face: null, cross: 0, done: false, dirX: 0 }, o);
  scene.add(c.root); c.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); c.ctl.loop(creature ? 'Idle' : (o.cheer ? 'Cheer' : 'Unarmed_Idle')); peds.push(e); pedPlace(e); return e;
}
function clearPeds() { for (const e of peds) { if (e.bub) { e.bub.material.map.dispose(); e.bub.material.dispose(); } scene.remove(e.root); } peds.length = 0; }
function pedPlace(e) { T.at(e.s, B); e.x = B.x + B.nx * e.d; e.z = B.z + B.nz * e.d; e.y = B.y + (B.pw > .4 && Math.abs(e.d) > B.hw + .1 ? .17 : .03); e.root.position.set(e.x, e.y, e.z);
  const sg = e.d >= 0 ? 1 : -1, f = e.st === 'cross' || e.st === 'dodge' ? Math.atan2(B.nx * e.dirX, B.nz * e.dirX) : e.face !== null ? e.face : Math.atan2(-B.nx * sg, -B.nz * sg); e.root.rotation.y += angd(f, e.root.rotation.y) * .3; return B; }
function bonk(e) {
  const sp = Math.hypot(P.vx, P.vz); if (sp < 4) { if (e.sayT <= 0 && !e.creature) { say(e, pick(ANGRY)); e.sayT = 3; } e.d += (e.d > P.d ? 1 : -1) * .3; return; }
  e.st = 'fly'; e.fvx = P.vx * .85 + rand(-2, 2); e.fvz = P.vz * .85 + rand(-2, 2); e.fvy = 5 + sp * .17; e.spin = rand(6, 12); SFX.bonk(); G.shake = Math.max(G.shake, .3); if (e.bub) { e.root.remove(e.bub); e.bub = null; }
  if (e.type === 'goose') { pop('HONK!', 0, '#fff'); SFX.quack(); e.c.ctl.once('Hit'); }
  else if (e.creature) { P.vx *= .8; P.vz *= .8; damage(8); pop('ANT FETTLED', 300, '#39ff14'); burst(e.x, e.y + 1, e.z, 0x7cff4f, 14, 5, .35, .6); e.c.ctl.once('Death'); e.dead = true; }
  else { P.vx *= .9; P.vz *= .9; damage(2); G.heat += .5; pop(e.type === 'mum' ? 'THAT WAS A PRAM (full of shopping)' : `SORRY ${({ hen: 'LOVE', bride: 'LOVE', bouncer: 'PAL', kid: 'KID' })[e.type] || 'MATE'}`, e.type === 'mum' ? -400 : -150, '#ff5a3b'); }
}
function stepPeds(dt) {
  for (const e of peds) {
    const rel = T.sdiff(e.s, P.s), vis = Math.abs(rel) < 190; e.root.visible = vis; if (!vis && e.st !== 'fly') continue;
    if (e.bubT > 0) { e.bubT -= dt; if (e.bubT <= 0 && e.bub) { e.root.remove(e.bub); e.bub.material.map.dispose(); e.bub.material.dispose(); e.bub = null; } } e.sayT -= dt;
    if (e.st === 'fly') { e.fvy -= 20 * dt; e.x += e.fvx * dt; e.z += e.fvz * dt; e.y += e.fvy * dt; e.root.rotation.x += e.spin * dt; T.locate(e.x, e.z, -1, L); T.at(L.s, B); const lim = B.hw + B.pw + B.off - .5; if (Math.abs(L.d) > lim) { e.fvx *= -.3; e.fvz *= -.3; const o = Math.abs(L.d) - lim, sg = Math.sign(L.d); e.x -= B.nx * sg * o; e.z -= B.nz * sg * o; }
      if (e.y <= B.y + .05 && e.fvy < 0) { e.y = B.y + .05; e.st = 'down'; e.t = e.dead ? 1e9 : 2.4; e.root.rotation.x = e.dead ? Math.PI : 0; e.s = L.s; e.d = clamp(L.d, -lim, lim); if (!e.creature) e.c.ctl.once('Death_A'); } e.root.position.set(e.x, e.y, e.z); e.c.ctl.update(dt); continue; }
    if (e.st === 'down') { e.t -= dt; e.c.ctl.update(dt); if (e.t <= 0) { e.st = 'idle'; if (!e.creature) { say(e, pick(ANGRY)); e.c.ctl.loop('Unarmed_Idle'); } } continue; }
    const near = rel > -5 && rel < 30, walk = e.creature ? 'Walk' : 'Walking_A', run = e.creature ? 'Run' : 'Running_A';
    if (e.st === 'idle') {
      if (e.cross && !e.done && rel > 0 && rel < e.cross && G.mode === 'run') { e.st = 'cross'; e.dirX = e.d > 0 ? -1 : 1; e.c.ctl.loop(e.speed > 3 ? run : walk, e.creature ? 1 : e.speed / 1.6); if (e.lines && Math.random() < .5) say(e, pick(e.lines)); }
      else if (near && Math.abs(P.d - e.d) < 3 && P.vf > 7 && !e.dead) { e.st = 'dodge'; e.t = .85; e.dirX = e.d > P.d ? 1 : -1; e.c.ctl.loop(run, 1.5); if (!e.creature && Math.random() < .6) say(e, pick(e.lines || ANGRY)); else if (e.type === 'goose') SFX.quack(); }
      else if (e.lines && Math.abs(rel) < 24 && e.sayT <= 0 && Math.random() < dt * 1.2) { say(e, pick(e.lines)); e.sayT = 7; }
    } else if (e.st === 'cross') { T.at(e.s, B); e.d += e.dirX * e.speed * dt; if (e.loopX) { if (Math.abs(e.d) > B.hw + .5 && Math.sign(e.d) === e.dirX) e.dirX = -e.dirX; } else if (Math.abs(e.d) > B.hw + 1.3 && Math.sign(e.d) === e.dirX) { e.st = 'idle'; e.done = true; e.c.ctl.loop(e.creature ? 'Idle' : 'Unarmed_Idle'); } }
    else if (e.st === 'dodge') { T.at(e.s, B); e.d = clamp(e.d + e.dirX * 5.5 * dt, -(B.hw + B.pw + B.off - .6), B.hw + B.pw + B.off - .6); e.t -= dt; if (e.t <= 0) { e.st = e.loopX ? 'cross' : 'idle'; e.c.ctl.loop(e.loopX ? walk : e.creature ? 'Idle' : 'Unarmed_Idle'); } }
    pedPlace(e); e.c.ctl.update(dt);
    if (P.inv <= 0 && Math.abs(rel) < 9 && !e.dead && carHits(e.x, e.z, e.r)) bonk(e);
  }
}

// ------------------------------------------------------------ the six jobs
const M = T.MARK;
const racer = (st, kind, i, o) => { const s = st.from + 10 + i * 7.5, V = addVehicle(kind, 'racer', Object.assign({ s, d: (i % 2 ? -1.7 : 1.7), prog: 10 + i * 7.5, skill: 1, acc: 12, vmax: 43, bias: (i - 1) * 1.1 }, o)); return V; };
const chaser = (kind, wait, o) => { const V = addVehicle(kind, 'chaser', Object.assign({ s: P.s, d: 0, vmax: 40, acc: 10, bias: 0, wait }, o)); V.car.g.visible = false; return V; };
const crowd = (type, s, sg, n, gap = 1.6, o) => { for (let k = 0; k < n; k++) { T.at(s + k * gap, B); addPed(Array.isArray(type) ? type[k % type.length] : type, s + k * gap, sg * (B.hw + (B.pw > .4 ? rand(.9, B.pw - .5) : rand(1, 3))), o); } };
const crossing = (type, s, n, o = {}) => { T.at(s, B); const sg = o.from || 1; for (let k = 0; k < n; k++) addPed(Array.isArray(type) ? type[k % type.length] : type, s + (o.spread ? rand(-o.spread, o.spread) : 0), sg * (B.hw + .7 + k * (o.gap || 1.05)), Object.assign({ cross: 80, speed: 1.8 }, o)); };
const STAGES = [
  { key: 'legit', name: 'LEG IT', car: 'nova', from: 40, to: M.thatto - 30, traffic: [2, 2], par: [38, 48],
    brief: 'You\'ve got the Pie Baron\'s recipe, tomorrow\'s front page, and no way of getting either to the SHCN office before the paper goes to press at six. The last bus to Clock Face went at ten past eleven. There\'s a Nova outside Nexus with the keys in.',
    obj: 'Get to Toll Bar before Shacklebottom\'s doormen get hold of you',
    radio: [[10, 'BRIAN THONG', 'That\'s Shacklebottom\'s Nova, that. He\'ll not be happy. Leg it, fettler.'], [120, 'BRIAN THONG', 'Hen party on the zebra. Whatever you do, don\'t spill owt on the bride\'s keks.'], [330, 'BRIAN THONG', 'SPACE is the handbrake. SHIFT is the go-faster, when you\'ve earned some. You\'ve done this before, I can tell.'], [520, 'BRIAN THONG', 'Taylor Park on your right. Dog shit levels are at an all time high and the geese have right of way.']],
    setup(st) { chaser('minibus', 3.5, { vmax: 31.5, acc: 9 }); crowd('bouncer', 52, 1, 3, 4); crossing(['bride', 'hen', 'hen', 'hen', 'hen'], 151.5, 5, { from: -1, speed: 1.75, cross: 78 }); crowd('drinker', 235, -1, 2, 30);
      crossing('wiganer', 455, 3, { speed: 1.25, cross: 70, spread: 5 }); crossing('goose', M.prescot + 205, 6, { from: -1, speed: 1.1, cross: 105, gap: 1.2, spread: 3 }); crowd('scally', 610, 1, 2, 3); } },
  { key: 'beak', name: 'BEAK STREET', car: 'xr', from: M.thatto - 22, to: M.park - 42, traffic: [2, 2], race: true,
    brief: 'Three of St Helens\' premier small businessmen are parked up at Toll Bar with blacked-out windows and not one MOT between them. They\'d like a race. You\'d like the XR3 some lad has left running outside the chippy.',
    obj: 'Beat the dealers to Sherdley Park',
    radio: [[5, 'BEAK STREET BARRY', 'Beak, mater? No? Race yer to Sherdley then. Loser gets grassed up.'], [250, 'BRIAN THONG', 'Thatto Heath station bridge coming up. It\'s a humpback. I\'m just saying.'], [620, 'BRIAN THONG', 'Flangefelter blames "them foreigners from past Thatto Heath". He means Scousers.'], [900, 'BRIAN THONG', 'Sherdley roundabout. Go round it. Or don\'t. I\'m not your mam.']],
    setup(st) { racer(st, 'dealer', 0, { vmax: 37.5, skill: .98, acc: 12 }); racer(st, 'dealer2', 1, { vmax: 36.5, skill: .94, acc: 11 }); racer(st, 'dealer3', 2, { vmax: 36, skill: .96, acc: 12.5 }); crowd(['scally', 'drinker'], st.from + 4, 1, 3, 2.5, { cheer: true });
      crossing('mum', M.thatto + 151.5, 2, { speed: 1.5, cross: 95 }); crowd('scally', M.elephant + 120, -1, 3, 14); crossing('drinker', M.elephant + 261.5, 2, { from: -1, speed: 1.3, cross: 85 }); crowd('warden', M.sherdleyrd + 60, 1, 1); } },
  { key: 'scramble', name: 'STRICTLY NO SCRAMBLERS', car: 'scooby', from: M.park - 30, to: M.junction + 238, traffic: [1, 2], race: true,
    brief: 'Four kids on scramblers have had the front page out of your window and gone straight through the St Helens Show with it. Barry\'s Scooby is sat there with the engine running. He did say loser gets grassed up.',
    obj: 'Beat the scramblers through Sherdley Park to the Junction',
    radio: [[5, 'BRIAN THONG', 'They\'re quicker than you on the mud. You\'re quicker on the black stuff. Mind the hay bales, they\'re for the dog show.'], [300, 'PARK KEEPER', 'NO SCRAMBLERS! NO SCOOBIES! KEEP OFF THE GRASS!'], [520, 'BRIAN THONG', 'Robins Lane. Black stuff. Give it some welly.'], [780, 'BRIAN THONG', 'Junction bridge. You know what to do.']],
    setup(st) { [[0x7cff4f, 0x22222a], [0xff4fd8, 0x3a3a8a], [0xffe14f, 0x6a1f2a], [0x39e0ff, 0x1a1a1a]].forEach((c, i) => racer(st, 'bike', i, { vmax: 35.5 + (i % 2), skill: .97 + (i - 1.5) * .02, acc: 15, col: c[0], hood: c[1], mass: .35, name: ['Kyle', 'Our Jordan', 'Little Ste', 'Deggsy'][i], bias: (i - 1.5) * 2 }));
      crowd('keeper', M.park + 70, 1, 2, 20); crowd(['mum', 'drinker', 'scally'], M.park + 180, -1, 4, 6, { cheer: true }); crossing('goose', M.park + 300, 4, { speed: 1.1, cross: 90, gap: 1.3, spread: 3 }); crossing('drinker', M.robins + 201.5, 2, { speed: 1.3, cross: 85 }); } },
  { key: 'fouracre', name: 'IT\'S ALL GOING OFF UP FOUR ACRE', car: 'pievan', from: M.junction + 246, to: M.eastlancs - 45, traffic: [2, 2], cargo: 60, par: [70, 82],
    brief: 'The Pie Baron\'s van is outside the station with sixty of Tellins\' finest in the back and the doors don\'t shut. Wigan Tours are on Fleet Lane, and it\'s all going off up Four Acre. Again.',
    obj: 'Get the pies to Carr Mill. The back doors don\'t shut.',
    radio: [[5, 'BRIAN THONG', 'Every pie you get to Carr Mill is a pie Wigan doesn\'t get. Corner gently. Or don\'t corner.'], [200, 'WIGAN TOURS', 'PIE-EATERS ON TOUR! PIE-EATERS ON TOUR!'], [560, 'BRIAN THONG', 'Four Acre. Lock your doors. Oh. They don\'t shut.'], [1180, 'DAVE PONDLIFE', 'They where all around us, big bastards. Twenty foot long. Mind the Burgies.'], [1380, 'BRIAN THONG', 'Giant ants. On the road. I\'ve stopped being surprised.']],
    setup(st) { const c = addVehicle('coach', 'hog', { s: st.from + 190, d: 1.5, v0: 16, v: 14, weave: .55, rate: 1.0, ammo: 'pie', who: 'WIGAN TOURS', lines: ['Have a pie, soft lad!', 'Giz us our pies back!', 'WIGAN! WIGAN!'], persist: true });
      crowd('scally', M.fouracre + 40, 1, 3, 9, { thrower: 'brick' }); crowd('scally', M.fouracre + 95, -1, 2, 12, { thrower: 'brick' }); crossing('mum', M.fouracre + 61.5, 2, { from: -1, speed: 1.5, cross: 90 }); crossing('mum', M.chain + 121.5, 2, { speed: 1.5, cross: 90 }); crowd(['wiganer', 'wiganer'], M.blackbrook + 30, 1, 3, 4);
      for (let k = 0; k < 6; k++) { T.at(M.carrmill + 40 + k * 34, B); addPed('soldier', M.carrmill + 40 + k * 34, (k % 2 ? 1 : -1) * (B.hw + 2), { cross: 400, loopX: true, speed: rand(4, 6.5), scale: 1.5, lines: null }); } } },
  { key: 'eastlancs', name: 'THE EAST LANCS', car: 'panda', from: M.eastlancs - 28, to: M.rainford - 48, traffic: [6, 5], par: [33, 39], blues: true,
    brief: 'Two bizzies have left a panda car outside the butty van at Carr Mill with the engine running and the blues on. It does a hundred and forty. There are three Gatsos between here and Windle Island.',
    obj: 'Flat out to Windle Island. Smile for the cameras.',
    radio: [[5, 'BRIAN THONG', 'You\'ve nicked a POLICE car. Leave the blues on, they\'ll all pull over. The faster you pass a Gatso, the better the photo.'], [420, 'BIG MICK', 'That\'s my split and gravy on your dashboard, that. £1.20 you owe me.'], [760, 'BRIAN THONG', 'The owners would like it back. They\'re behind you.'], [1150, 'BRIAN THONG', 'Windle Island. It\'s a sharp left. I\'d brake. I\'m not you, though.']],
    setup(st) { chaser('cop', 13, { vmax: 49, acc: 14, bias: -2.5 }); chaser('cop', 21, { vmax: 48.5, acc: 14, bias: 2.5 }); for (const c of W.cams) c.done = false; } },
  { key: 'home', name: 'HOME BEFORE THE PAPERS', car: 'whippy', from: M.rainford - 36, to: 8, traffic: [3, 3], par: [64, 76],
    brief: 'The panda car is on its roof and Mr Drippy is doing his rounds on Rainford Road. Everybody you\'ve annoyed tonight is behind you. The SHCN office is on Westfield Street. The paper goes to press in a minute and a half.',
    obj: 'Get the front page back to Westfield Street',
    radio: [[5, 'BRIAN THONG', 'An ICE CREAM van. Course it is. Every kid in Windle\'s going to run out for a 99. Do NOT stop.'], [330, 'BRIAN THONG', 'There\'s a hen limo all over Rainford Road and they\'re lobbing WKD. Blue ones.'], [700, 'BRIAN THONG', 'Dentons Green. Nearly home. I\'ve got the kettle on and the presses warm.'], [1150, 'BRIAN THONG', 'Right at the bottom into Westfield Street and you\'re done. Front page, fettler. FRONT PAGE.']],
    setup(st) { chaser('cop', 6, { vmax: 40, acc: 12, bias: -2 }); chaser('cop', 18, { vmax: 40.5, acc: 12, bias: 2 }); chaser('minibus', 32, { vmax: 39, acc: 11 });
      const l = addVehicle('limo', 'hog', { s: st.from + 300, d: 0, v0: 19, v: 17, weave: .9, rate: .8, ammo: 'bottle', who: 'KELLY\'S HEN DO', lines: ['WANKER!', 'Small penis!', 'Giz a 99, dickhead!'], persist: true }); l.riders = ['bride', 'hen'].map((t, i) => { const c = makeCharacter(t); c.root.position.set(i ? .35 : -.35, .55, -.4 - i * .5); c.ctl.loop('Cheer'); l.car.tilt.add(c.root); return c; });
      for (const [s, sg] of [[M.rainford + 120, 1], [M.rainford + 215, -1], [M.rainford + 440, 1], [M.dentons + 40, -1], [M.dentons + 150, 1], [M.dentons + 260, -1], [M.north + 71.5, 1], [M.north + 130, -1]]) crossing('kid', s, 2, { from: sg, speed: 4.6, cross: 62, gap: 1.2 });
      const bt = addPed('attendant', 6, -(5.2 + 1.6), { cheer: true, lines: ['FRONT PAGE!', 'Get in, fettler!', 'Mind the presses!'] }); crowd(['drinker', 'hen', 'bouncer'], T.LEN - 20, 1, 3, 5, { cheer: true }); chopper.on = true; } },
  { key: 'lap', name: 'LAP RECORD', car: 'xr', from: 40, to: 40, traffic: [3, 3], lap: true, brief: 'One full lap of St Helens, any motor you like, against the clock. Nobody\'s chasing you. Yet.', obj: 'One flying lap of St Helens', radio: [[5, 'BRIAN THONG', 'One lap. No bizzies. Show us what it\'ll do.']], setup() {} },
];
for (const st of STAGES) { for (const r of st.radio) r[0] *= 1.25; st.from = T.wrap(st.from); st.to = T.wrap(st.to); st.len = st.lap ? T.LEN : (st.to - st.from + T.LEN) % T.LEN; }

// scoops: this week's front pages, left lying about in awkward places
const SCOOPS = [[250, -3.2, 'St Helens men prefer pie and chips to sex'], [M.prescot + 300, -6.6, 'Dog shit levels at all time high'], [M.thatto + 210, 3, 'Scouse congestion charges'], [M.elephant + 44, 0, 'Lads Be Alert!', 3.6], [M.sherdleyrd + 300, -3, 'Nexus To Be Midget Haven'],
  [M.park + 142, 0, 'Bummers Wood Open For All !!!', 3.2], [M.park + 330, 12, '\'Have a go\' Grandad in theft drama'], [M.robins + 120, -6.4, 'Disguarded Pastry'], [M.junction + 205, 0, 'Sticky patch for St Helens industry', 3.8], [M.fleet + 420, -3.4, 'Firefighters angered over council plans'],
  [M.fouracre + 150, 6.6, 'It\'s all going off up Four Acre'], [M.blackbrook + 136, 0, 'Burgies olympic shocker', 3.8], [M.carrmill + 150, 8.5, 'Giant Ants spotted on Burgies'], [M.eastlancs + 640, -2.6, 'More pie revelations – Winning Wigan DNA found'], [M.eastlancs + 1300, -7, 'Former US President kicks off in Labour Club'],
  [M.rainford + 380, -3.3, 'Clinkham Wood – A Suburban Nature Lover\'s Paradise'], [M.dentons + 200, 6.8, 'Local venue to re-open as top dance club'], [M.north + 150, -3, 'STUDENT IN PIE SHOCK HORROR PROBE SENSATION']].map(([s, d, title, h]) => ({ s: T.wrap(s), d, title, h: h || 1.1, got: false, m: null }));
function buildScoops() { const tex = canvasTex(128, 160, (g) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#6600ff'; g.fillRect(0, 0, 128, 34); g.fillStyle = '#fda138'; g.font = 'bold 22px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('SHCN', 64, 26); g.fillStyle = '#111'; g.font = 'bold 20px Arial Black, Arial'; g.fillText('SCOOP!', 64, 64); g.fillStyle = '#888'; for (let y = 78; y < 150; y += 9) g.fillRect(10, y, 108, 4); g.fillStyle = '#c8102e'; g.fillRect(10, 96, 46, 40); }), mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), glow = new THREE.SpriteMaterial({ map: W.tex.glow, color: 0xfda138, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .7 });
  for (const sc of SCOOPS) { T.at(sc.s, B); const g = new THREE.Group(), p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), mat), s = new THREE.Sprite(glow); s.scale.set(3.4, 3.4, 1); g.add(p, s); g.position.set(B.x + B.nx * sc.d, B.y + sc.h + (B.pw > .4 && Math.abs(sc.d) > B.hw ? .14 : 0), B.z + B.nz * sc.d); scene.add(g); sc.m = g; } }
function updateScoops(dt) { for (const sc of SCOOPS) { if (sc.got) continue; const rel = T.sdiff(sc.s, P.s); sc.m.visible = Math.abs(rel) < 260; if (!sc.m.visible) continue; sc.m.rotation.y += dt * 2.6; sc.m.position.y += Math.sin(G.time * 3 + sc.s) * dt * .25;
    if (G.mode === 'run' && Math.abs(rel) < 4 && Math.abs(sc.m.position.x - P.x) < 2.3 && Math.abs(sc.m.position.z - P.z) < 2.3 && Math.abs(sc.m.position.y - P.y - 1) < 2.2) { sc.got = true; sc.m.visible = false; G.scoops++; SFX.good(); burst(sc.m.position.x, sc.m.position.y, sc.m.position.z, 0xfda138, 14, 5, .3, .6); pop(`SCOOP ${G.scoops}/${SCOOPS.length} · “${sc.title}”`, 400, '#fda138'); P.boost = Math.min(1, P.boost + .25); } } }
// the police helicopter for the last job, and the gate you're aiming for
const chopper = { on: false, g: new THREE.Group(), x: 0, z: 0 }, gate = new THREE.Group(); let parkedMade = false;
function buildExtras() {
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c }), bx = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? lam(c) : c); m.position.set(x, y, z); return m; };
  chopper.g.add(bx(1.8, 1.6, 3.4, 0x1a2a6a, 0, 0, 0), bx(.4, .4, 3.6, 0x1a2a6a, 0, .3, -3.2), bx(.1, 1.1, .7, 0xffe14f, 0, .9, -4.8), bx(1.5, .7, 1.2, 0x9fd0ff, 0, .2, 1.5));
  chopper.rotor = bx(9, .06, .5, 0x222222, 0, 1.1, 0); chopper.g.add(chopper.rotor);
  chopper.beam = new THREE.Mesh(new THREE.ConeGeometry(7, 36, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); chopper.beam.position.y = -18.6; chopper.g.add(chopper.beam);
  chopper.pool = new THREE.Mesh(new THREE.CircleGeometry(7.5, 20), new THREE.MeshBasicMaterial({ map: W.tex.glow, color: 0xcfe4ff, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false })); chopper.pool.rotation.x = -Math.PI / 2; chopper.g.visible = chopper.pool.visible = false; scene.add(chopper.g, chopper.pool);
  const pm = new THREE.MeshBasicMaterial({ color: 0xfda138 }); for (const sg of [1, -1]) { const p = bx(.5, 7, .5, pm, sg * 9, 3.5, 0); p.userData.sg = sg; gate.add(p); } gate.beam = bx(18, .9, .3, new THREE.MeshBasicMaterial({ map: canvasTex(256, 16, (g) => { for (let x = 0; x < 32; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#f2f2f2' : '#15151a'; g.fillRect(x * 8, y * 8, 8, 8); } }) }), 0, 6.9, 0); gate.add(gate.beam);
  gate.curtain = bx(18, 6.4, .05, new THREE.MeshBasicMaterial({ color: 0xfda138, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide }), 0, 3.3, 0); gate.add(gate.curtain); scene.add(gate);
}
function placeGate(s) { T.at(s, B); const w = B.hw + B.pw + B.off * .5; gate.position.set(B.x, B.y, B.z); gate.rotation.y = Math.atan2(B.tx, B.tz); for (const c of gate.children) if (c.userData.sg) c.position.x = c.userData.sg * w; gate.beam.scale.x = gate.curtain.scale.x = w / 9; }
function makeParked() { if (parkedMade) return; parkedMade = true; for (let s = 90; s < T.LEN - 30; s += rand(28, 75)) { T.at(s, B); const k = kindA(B); if (!/terrace|council|semi/.test(k) || B.hump > .05 || W.zebras.some((z) => Math.abs(T.sdiff(z, s)) < 9) || Math.abs(B.k) > .018) continue; const sg = Math.random() < .5 ? 1 : -1; addVehicle(pick(['car0', 'car1', 'car2']), 'parked', { s, d: sg * (B.hw - 1.02), dir: sg }); } }
function updateChopper(dt) {
  chopper.g.visible = chopper.pool.visible = chopper.on; if (!chopper.on) return; const t = G.time; chopper.x = lerp(chopper.x, P.x + Math.sin(t * .5) * 9, dt * 1.6); chopper.z = lerp(chopper.z, P.z + Math.cos(t * .37) * 9, dt * 1.6);
  chopper.g.position.set(chopper.x + 6, P.y + 36, chopper.z - 4); chopper.g.rotation.y = P.yaw + Math.sin(t * .3) * .4; chopper.rotor.rotation.y += dt * 30; chopper.pool.position.set(chopper.x, P.y + .12, chopper.z);
}

// ------------------------------------------------------------ running a stage
function loseCargo(n) { if (!G.cargo || n <= 0 || G.mode !== 'run') return; n = Math.min(n, G.cargo); G.cargo -= n; const f0 = Math.sin(P.yaw), f1 = Math.cos(P.yaw); for (let k = 0; k < Math.min(n, 5); k++) bit(pieGeo, pieMat, P.x - f0 * 2.2, P.y + 1.2, P.z - f1 * 2.2, P.vx * .5 + rand(-3, 3), rand(3, 6), P.vz * .5 + rand(-3, 3), 4); H.cargo.classList.remove('hit'); void H.cargo.offsetWidth; H.cargo.classList.add('hit'); }
function resetProps() { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1); for (const p of W.props) { if (p.alive) continue; p.alive = true; q.setFromEuler(e.set(0, p.ry, 0)); m.compose(v.set(p.x, p.y, p.z), q, s); p.inst.setMatrixAt(p.idx, m); p.inst.instanceMatrix.needsUpdate = true; if (p.glow !== undefined) { W.lampGlow.geometry.attributes.position.setY(p.glow, p.y + 6); W.lampGlow.geometry.attributes.position.needsUpdate = true; } } }
function startStage(i) {
  const st = STAGES[i]; G.stage = i; G.free = !!st.lap; G.attract = false; G.auto = Q.has('auto'); clearVehicles((V) => V.role === 'parked' || (V.role === 'wreck' && V.was === 'parked')); clearPeds(); for (const b of bits) scene.remove(b.m); bits.length = 0; H.splats.innerHTML = ''; H.pop.innerHTML = '';
  G.t = 0; G.penalty = 0; G.caught = 0; G.cargo = st.cargo || 0; G.blues = !!st.blues; G.chain = 0; G.chainT = 0; G.score0 = G.score; G.heat = 0; G.radioI = 0; G.slow = 0; chopper.on = false; radioQ.length = 0; radioT = 0; H.radio.classList.remove('on');
  setCar(G.free ? G.lapCar || 'xr' : st.car); T.at(st.from, B); placePlayer(st.from, laneD(B, 0)); P.prog = 0; P.boost = Math.max(P.boost, .4); P.inv = 0; G.rank = 0;
  st.setup(st); placeGate(st.to); if (P.car.blues) blues(P.car, 0, true); drawMapBase(); G.lastSec = -1;
  H.stage.textContent = G.free ? 'LAP RECORD' : `JOB ${i + 1}/6 · ${st.name}`; H.obj.textContent = st.obj; H.cargo.hidden = !st.cargo; H.pos.hidden = !st.race;
  showCard('stage');
}
function begin() { hideCards(); G.mode = 'count'; G.countT = 2.7; G.countN = 4; audioInit(); MUS.on = true; MUS.next = AC ? AC.currentTime + .1 : 0; document.body.classList.add('playing'); }
function failStage(why) { if (G.mode !== 'run') return; G.mode = 'fail'; G.why = why; SFX.bad(); showCard('fail'); }
function finishStage() {
  const st = STAGES[G.stage], t = G.t + G.penalty; let medal, note = '';
  if (st.race) { const pos = 1 + vehicles.filter((V) => V.role === 'racer' && V.finished).length; medal = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : 'none'; note = `${['1st', '2nd', '3rd', '4th', '5th'][pos - 1]} of ${1 + vehicles.filter((V) => V.role === 'racer').length}`; G.pos = pos; }
  else if (st.cargo) { medal = G.cargo >= 48 ? 'gold' : G.cargo >= 34 ? 'silver' : G.cargo >= 15 ? 'bronze' : 'none'; note = `${G.cargo} of ${st.cargo} pies delivered`; }
  else if (st.lap) { const best = STORE.get('ph-drive-lap', {}); const old = best[P.kind]; if (!old || t < old) { best[P.kind] = t; STORE.set('ph-drive-lap', best); note = 'NEW LAP RECORD'; } else note = `Best in this motor: ${fmt(old)}`; medal = t < T.LEN / (P.spec.vmax * .82) ? 'gold' : t < T.LEN / (P.spec.vmax * .72) ? 'silver' : 'bronze'; }
  else { medal = t <= st.par[0] ? 'gold' : t <= st.par[1] ? 'silver' : 'bronze'; note = `Gold ${fmt(st.par[0])} · Silver ${fmt(st.par[1])}`; }
  const bonus = { gold: 3000, silver: 1500, bronze: 600, none: 0 }[medal] + (st.cargo ? G.cargo * 50 : 0); G.score += bonus;
  G.results[G.stage] = { t, medal, note, style: G.score - G.score0 - bonus, bonus, scoops: G.scoops }; G.mode = G.stage === 5 ? 'final' : 'result'; SFX.win(); flash('#fda138', .35); MUS.heat = 0;
  const best = STORE.get('ph-drive-best', {}); if (!best[st.key] || t < best[st.key].t) best[st.key] = { t, medal }; STORE.set('ph-drive-best', best);
  showCard(G.stage === 5 ? 'final' : 'result');
}
function stageLogic(dt) {
  const st = STAGES[G.stage]; G.t += dt; if (G.chainT > 0) { G.chainT -= dt; if (G.chainT <= 0) G.chain = 0; }
  while (G.radioI < st.radio.length && P.prog >= st.radio[G.radioI][0]) { const r = st.radio[G.radioI++]; radio(r[1], r[2]); }
  for (const V of vehicles) if (V.role === 'racer') { if (!V.finished && V.prog >= st.len) { V.finished = true; V.vmax = 14; if (Math.abs(T.sdiff(V.s, P.s)) < 200) pop(`${V.name} is home`, 0, '#ff5a3b'); } const ahead = V.prog > P.prog; if (V.ahead !== undefined && V.ahead && !ahead && !V.finished) pop(`OVERTOOK ${V.name}`, 150, '#39ff14'); V.ahead = ahead; }
  if (st.race) { const pos = 1 + vehicles.filter((V) => V.role === 'racer' && V.prog > P.prog).length; if (pos !== G.rank) { G.rank = pos; H.pos.innerHTML = `${pos}<small>${['st', 'nd', 'rd', 'th', 'th'][pos - 1]}</small> / ${1 + vehicles.filter((V) => V.role === 'racer').length}`; H.pos.classList.remove('bump'); void H.pos.offsetWidth; H.pos.classList.add('bump'); } }
  if (G.cargo) { if (P.slip > 7 && P.ground) { G.spill = (G.spill || 0) + dt; if (G.spill > .45) { G.spill = 0; loseCargo(1); } } H.cargo.textContent = `🥧 ${G.cargo}`; }
  // Gatsos: the faster the better
  if (st.blues) for (const c of W.cams) { if (!c.done && c.it.alive && T.sdiff(P.s, c.s) > 0 && T.sdiff(P.s, c.s) < 14) { c.done = true; const mph = Math.round(Math.abs(P.vf) * MPH); if (mph > 70) { flash('#fff', .9); SFX.flash(); pop(`GATSO'D AT ${mph} MPH`, mph * 4, '#fff', true); } } }
  // doormen and bizzies: sit still near them and they've got you
  if (G.caughtNow) { G.caught += dt; G.caughtNow = false; } else G.caught = Math.max(0, G.caught - dt * .7);
  const cops = vehicles.some((V) => V.role === 'chaser' && V.wait <= 0 && Math.abs(T.sdiff(V.s, P.s)) < 110); H.heat.hidden = !cops; if (cops) H.heat.innerHTML = G.caught > .3 ? '<b>GET MOVING!</b>' : (st.key === 'legit' ? '🚐 DOORMEN ON YOUR TAIL' : st.key === 'home' ? '🚓 EVERYBODY ON YOUR TAIL' : '🚓 BIZZIES ON YOUR TAIL');
  if (G.caught > 2.6) failStage('caught');
  for (const e of peds) if (e.thrower && e.st === 'idle') { const rel = T.sdiff(e.s, P.s); e.throwT = (e.throwT || rand(0, 1)) - dt; if (rel > 5 && rel < 42 && e.throwT <= 0) { e.throwT = rand(1.6, 2.8); e.c.ctl.once('Throw', 1.5); const tt = clamp(rel / 30, .45, 1.1), tx = P.x + P.vx * tt + rand(-1.5, 1.5), tz = P.z + P.vz * tt + rand(-1.5, 1.5); bit(brickGeo, brickMat, e.x, e.y + 2, e.z, (tx - e.x) / tt, (P.y + .8 - e.y - 2) / tt + 9 * tt, (tz - e.z) / tt, 3, 'brick'); } }
  // pace notes: what's coming, while there's still time to do something about it
  G.noteT = (G.noteT || 0) - dt; if (G.noteT <= 0) { G.noteT = .12; const sp = Math.max(P.vf, 8), look = 26 + sp * 2.1; let txt = '', sev = 0;
    for (let ds = 8; ds < look; ds += 5) { const i = Math.round(T.wrap(P.s + ds) / T.DS) % T.N, k = T.K[i]; if (T.HUMP[i] > 1.2 && T.HUMP[i] > T.HUMP[(i + T.N - 2) % T.N]) { txt = '▲ HUMP'; sev = 1; break; }
      if (Math.abs(k) > 1 / 75) { let km = k; for (let j = 1; j < 14; j++) { const k2 = T.K[(i + j) % T.N]; if (Math.abs(k2) > Math.abs(km)) km = k2; } const r = 1 / Math.abs(km), left = km > 0; sev = r < 27 ? 3 : r < 42 ? 2 : 1; if (sev === 1 && sp < 30) { sev = 0; break; }
        txt = (left ? '◀ ' : '') + (sev === 3 ? 'SHARP ' : sev === 2 ? '' : 'EASY ') + (left ? 'LEFT' : 'RIGHT') + (left ? '' : ' ▶'); break; } }
    if (txt !== G.note) { G.note = txt; H.note.textContent = txt; H.note.className = txt ? 's' + sev : ''; } }
  const sec = A.sec; if (sec !== G.lastSec) { G.lastSec = sec; H.road.textContent = T.SECTIONS[T.SEC_KEYS[sec]].name; H.road.classList.remove('on'); void H.road.offsetWidth; H.road.classList.add('on'); }
  MUS.heat = lerp(MUS.heat, P.boosting ? 1 : clamp(P.vf / P.spec.vmax - .5, 0, .7), dt * 2);
  if (P.prog >= st.len) finishStage();
}

// ------------------------------------------------------------ cards: briefing, results, the final front page
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`, MEDAL = { gold: '🥇 GOLD', silver: '🥈 SILVER', bronze: '🥉 BRONZE', none: 'NO MEDAL' };
const bar = (label, v) => `<div class="stat"><span>${label}</span><i><b style="width:${Math.round(clamp(v, .08, 1) * 100)}%"></b></i></div>`;
function carBox(kind) { const sp = SPECS[kind]; return `<div class="motor"><div><small>NICKED</small><b>${sp.name}</b><em>${sp.blurb}</em></div><div>${bar('SPEED', (sp.vmax - 30) / 26)}${bar('SHOVE', (sp.acc - 8) / 10)}${bar('GRIP', (sp.grip - .8) / .35)}${bar('HEFT', sp.mass / 2)}</div></div>`; }
function showCard(kind) {
  const st = STAGES[G.stage], r = G.results[G.stage]; let h = '';
  if (kind === 'stage') { G.mode = 'card';
    h = `<h2>${G.free ? 'TIME TRIAL' : `JOB ${G.stage + 1} OF 6`}</h2><h1>${st.name}</h1>${G.free ? `<div class="pick">${['nova', 'xr', 'scooby', 'pievan', 'panda', 'whippy'].map((k) => `<button type="button" data-car="${k}" class="${k === P.kind ? 'on' : ''}">${SPECS[k].name.replace('THE ', '')}</button>`).join('')}</div>` : ''}${carBox(P.kind)}<p>${st.brief}</p><p class="obj">▶ ${st.obj}</p>
      ${G.stage === 0 ? `<p class="keys desktop-only"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows drive · <kbd>Space</kbd> handbrake · <kbd>Shift</kbd> boost · <kbd>R</kbd> back on the road · <kbd>C</kbd> look behind · <kbd>P</kbd> pause</p><p class="keys mobile-only">◀ ▶ steer · it accelerates itself · BRAKE, DRIFT and BOOST on the right</p>` : ''}
      <button type="button" class="btn" data-act="go">GO ’ED <span class="desktop-only">(Enter)</span></button>`; }
  else if (kind === 'result' && st.lap) h = `<h2>TIME TRIAL</h2><h1>${fmt(r.t)}</h1><div class="medal ${r.medal}">${MEDAL[r.medal]}</div><table><tr><td>Motor</td><td>${P.spec.name}</td></tr><tr><td>Lap</td><td>${r.note}</td></tr><tr><td>Style</td><td>+${r.style}</td></tr></table><button type="button" class="btn" data-act="retry">ANOTHER LAP <span class="desktop-only">(R)</span></button><button type="button" class="btn alt" data-act="again">Do the six jobs</button><a class="btn alt" href="./">Back to PIE HARD</a>`;
  else if (kind === 'result') h = `<h2>JOB ${G.stage + 1} OF 6 · DONE</h2><h1>${st.name}</h1><div class="medal ${r.medal}">${MEDAL[r.medal]}</div><table><tr><td>Time</td><td>${fmt(r.t)}${G.penalty ? ` <small>(incl. +${G.penalty}s)</small>` : ''}</td></tr><tr><td>${st.race ? 'Finished' : st.cargo ? 'Cargo' : 'Target'}</td><td>${r.note}</td></tr><tr><td>Style</td><td>+${r.style}</td></tr><tr><td>Bonus</td><td>+${r.bonus}</td></tr><tr class="tot"><td>Score</td><td>${G.score}</td></tr></table>
      <p class="next">Next: <b>${STAGES[G.stage + 1].name}</b> in ${SPECS[STAGES[G.stage + 1].car].name}</p><button type="button" class="btn" data-act="next">NEXT JOB → <span class="desktop-only">(Enter)</span></button><button type="button" class="btn alt" data-act="retry">Have another go at this one <span class="desktop-only">(R)</span></button>`;
  else if (kind === 'fail') h = `<h2>JOB ${G.stage + 1} OF 6</h2><h1 class="bad">${st.key === 'legit' ? 'COLLARED!' : 'NICKED!'}</h1><p>${st.key === 'legit' ? 'Shacklebottom\'s doormen have got you. He\'d like a word about his Nova. And his recipe. And your kneecaps.' : G.stage === 4 ? 'The bizzies would like their car back. And a statement. And Big Mick wants his £1.20.' : 'Pulled over in an ice cream van. The bizzies have asked for two 99s and your date of birth.'}</p><p class="obj">Keep moving: they can only grab you when you\'re stopped.</p><button type="button" class="btn" data-act="retry">TRY AGAIN <span class="desktop-only">(Enter)</span></button>`;
  else if (kind === 'final') { const tt = G.results.slice(0, 6).reduce((a, x) => a + (x ? x.t : 0), 0), golds = G.results.slice(0, 6).filter((x) => x && x.medal === 'gold').length, best = STORE.get('ph-drive-total', 0); if (G.score > best) STORE.set('ph-drive-total', G.score);
    const rank = golds >= 5 ? 'PROPER TELLINS LEGEND' : golds >= 3 ? 'KING OF THE EAST LANCS' : golds >= 1 ? 'HANDY BEHIND THE WHEEL' : 'SOFT MELT WITH A PROVISIONAL';
    h = `<div class="front"><small>ST HELENS CELEBRITY NEWS · LATE EDITION · 20p</small><b>ICE CREAM VAN IN 140MPH POLICE CHASE</b><i>“He never even stopped for a 99” · Six motors missing · Gatso “smiling” · Pie Baron “devastated”</i></div><h1>${rank}</h1>
      <table>${STAGES.slice(0, 6).map((s, i) => { const x = G.results[i]; return `<tr><td>${i + 1}. ${s.name}</td><td>${x ? fmt(x.t) : '–'}</td><td class="${x ? x.medal : ''}">${x ? MEDAL[x.medal] : ''}</td></tr>`; }).join('')}<tr><td>Scoops found</td><td></td><td>${G.scoops} of ${SCOOPS.length}</td></tr><tr class="tot"><td>One lap of St Helens</td><td>${fmt(tt)}</td><td>${G.score} pts${G.score > best ? ' · NEW BEST' : ''}</td></tr></table>
      <button type="button" class="btn" data-act="again">DO IT ALL AGAIN</button><button type="button" class="btn alt" data-act="lap">Lap record: one flying lap, any motor</button><a class="btn alt" href="./">Back to PIE HARD</a>`; }
  H.card.innerHTML = `<div class="card">${h}</div>`; H.card.hidden = false; H.title.hidden = true; H.pause.hidden = true; H.card.className = 'ov ' + kind; document.body.classList.toggle('playing', false);
}
function hideCards() { H.card.hidden = true; H.title.hidden = true; H.pause.hidden = true; }
function act(a) {
  audioInit(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();      // or SPACE presses the button you just clicked instead of the handbrake
  if (a === 'go') begin(); else if (a === 'next') startStage(G.stage + 1); else if (a === 'retry') { G.score = G.score0 || 0; startStage(G.stage); }
  else if (a === 'again' || a === 'start') { G.score = 0; G.results = []; G.scoops = 0; for (const sc of SCOOPS) sc.got = false; resetProps(); clearVehicles(); parkedMade = false; makeParked(); startStage(0); } else if (a === 'lap') { G.score = 0; startStage(6); }
  else if (a === 'resume') pause(false); else if (a === 'quit') location.reload();
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-act],[data-car]'); if (!b) return; if (b.dataset.car) { G.lapCar = b.dataset.car; startStage(6); return; } act(b.dataset.act); });
function pause(on) { if (on && G.mode !== 'run') return; if (on) { G.mode = 'pause'; H.pause.hidden = false; if (AC) AC.suspend(); document.body.classList.remove('playing'); } else if (G.mode === 'pause') { G.mode = 'run'; H.pause.hidden = true; if (AC) AC.resume(); document.body.classList.add('playing'); last = 0; } }
function resetCar() { if (G.mode !== 'run') return; T.at(P.s, A); placePlayer(P.s, laneD(A, 0), 5); P.inv = 1.5; G.penalty += 2; pop('BACK ON THE ROAD (+2s)', 0, '#fff'); }
function horn() { SFX.horn(); for (const e of peds) { const rel = T.sdiff(e.s, P.s); if (rel > 0 && rel < 38 && e.st === 'cross' && !e.creature) e.speed = Math.max(e.speed, 4.5); } }
function onKey(k) {
  const m = G.mode; if (k === 'Enter' || k === ' ') { if (m === 'title') act('start'); else if (m === 'card') act('go'); else if (m === 'result') act(G.free ? 'retry' : 'next'); else if (m === 'fail') act('retry'); else if (m === 'pause' && k === 'Enter') act('resume'); return; }
  const l = (k || '').toLowerCase(); if (l === 'p' || k === 'Escape') { if (m === 'run') pause(true); else if (m === 'pause') pause(false); }
  else if (l === 'm') { muted = !muted; STORE.set('ph-drive-mute', muted); if (master) master.gain.value = muted ? 0 : .9; } else if (l === 'n') { musicOn = !musicOn; STORE.set('ph-drive-music', musicOn); if (musBus) musBus.gain.value = musicOn ? .42 : 0; }
  else if (l === 'r') { if (m === 'run') resetCar(); else if (m === 'result' || m === 'fail') act('retry'); } else if (l === 'h') horn();
}
// touch
for (const [id, key] of [['t-l', 'l'], ['t-r', 'r'], ['t-brake', 'brake'], ['t-hand', 'hand'], ['t-boost', 'boost'], ['t-gas', 'gas']]) { const el = $(id); if (!el) continue; const set = (v) => (e) => { e.preventDefault(); touch[key] = v; el.classList.toggle('down', !!v); }; el.addEventListener('pointerdown', set(1)); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, set(0)); el.addEventListener('contextmenu', (e) => e.preventDefault()); }
if ($('t-pause')) $('t-pause').addEventListener('click', () => pause(true)); if ($('t-reset')) $('t-reset').addEventListener('click', resetCar);

// ------------------------------------------------------------ minimap and the dials
const MAPS = .0695, mapBase = document.createElement('canvas'); mapBase.width = H.map.width; mapBase.height = H.map.height; const mctx = H.map.getContext('2d'), mx = (x) => H.map.width / 2 + x * MAPS * 2, mz = (z) => H.map.height / 2 + z * MAPS * 2;
function drawMapBase() { const g = mapBase.getContext('2d'), st = STAGES[G.stage]; g.clearRect(0, 0, mapBase.width, mapBase.height); g.lineJoin = g.lineCap = 'round';
  const path = (a, b) => { g.beginPath(); for (let s = a; s <= b; s += 10) { const i = Math.round(T.wrap(s) / T.DS) % T.N; if (s === a) g.moveTo(mx(T.X[i]), mz(T.Z[i])); else g.lineTo(mx(T.X[i]), mz(T.Z[i])); } g.stroke(); };
  g.strokeStyle = 'rgba(10,6,24,.85)'; g.lineWidth = 12; path(0, T.LEN); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 5; path(0, T.LEN); if (!G.attract) { g.strokeStyle = '#fda138'; g.lineWidth = 6; path(st.from, st.from + st.len); const i = Math.round(st.to / T.DS) % T.N; g.fillStyle = '#fff'; g.fillRect(mx(T.X[i]) - 6, mz(T.Z[i]) - 6, 12, 12); g.fillStyle = '#111'; g.fillRect(mx(T.X[i]) - 6, mz(T.Z[i]) - 6, 6, 6); g.fillRect(mx(T.X[i]), mz(T.Z[i]), 6, 6); } }
function drawMap() { const g = mctx; g.clearRect(0, 0, H.map.width, H.map.height); g.drawImage(mapBase, 0, 0);
  for (const V of vehicles) { if (V.role === 'racer') g.fillStyle = '#ff4fd8'; else if (V.role === 'chaser' && V.wait <= 0) g.fillStyle = Math.floor(G.time * 6) % 2 ? '#4a8aff' : '#ff3b3b'; else if (V.role === 'hog') g.fillStyle = '#fff'; else continue; g.beginPath(); g.arc(mx(V.x), mz(V.z), 6, 0, 7); g.fill(); }
  g.save(); g.translate(mx(P.x), mz(P.z)); g.rotate(-P.yaw + Math.PI); g.fillStyle = '#fda138'; g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore(); }
let hudT = 0; const hv = {};
function setTxt(el, k, v) { if (hv[k] !== v) { hv[k] = v; el.textContent = v; } }
function hud(dt) {
  const mph = Math.round(Math.abs(P.vf) * MPH); setTxt(H.mph, 'mph', mph); setTxt(H.gear, 'gear', P.vf < -.5 ? 'R' : String(P.gear + 1));
  H.rev.style.transform = `scaleX(${clamp(P.rpm, 0, 1).toFixed(3)})`; H.rev.style.background = P.rpm > .9 ? '#ff3b3b' : '#fda138'; H.boost.style.transform = `scaleX(${P.boost.toFixed(3)})`; H.boost.parentNode.classList.toggle('on', P.boosting);
  const hp = clamp(P.hp / P.spec.hp, 0, 1); H.dmg.style.transform = `scaleX(${hp.toFixed(3)})`; H.dmg.style.background = hp < .3 ? '#ff3b3b' : hp < .6 ? '#ffe14f' : '#39ff14';
  setTxt(H.score, 'score', String(G.score).padStart(6, '0')); setTxt(H.chain, 'chain', G.chain > 1 ? `×${(1 + (G.chain - 1) * .5).toFixed(1)}` : ''); setTxt(H.time, 'time', fmt(G.t + G.penalty));
  H.wrong.hidden = !(G.mode === 'run' && (P.wrong > 1.2 || P.stuck > 2.5)); if (!H.wrong.hidden) setTxt(H.wrong, 'wrong', P.wrong > 1.2 ? 'WRONG WAY' : TOUCH ? 'STUCK? TAP ↺' : 'STUCK? PRESS R');
  H.fxspeed.style.opacity = clamp((Math.abs(P.vf) - 31) / 20, 0, .75) + (P.boosting ? .35 : 0);
  hudT -= dt; if (hudT <= 0) { hudT = .05; drawMap(); }
}

// ------------------------------------------------------------ a driver for the attract mode (and for testing): follows the road, dodges what it can
const autoIn = { steer: 0, gas: 0, brake: 0, boost: false };
function autopilot() {
  T.at(P.s, A); const sp = Math.max(P.vf, 0); let kmx = 0; for (let ds = 3; ds < 14 + sp * 1.5; ds += 5) { const k = T.K[Math.round(T.wrap(P.s + ds) / T.DS) % T.N]; if (Math.abs(k) > Math.abs(kmx)) kmx = k; }
  const wide = A.hw - 1.5; let td = clamp(Math.sign(kmx) * Math.min(wide, Math.abs(kmx) * 120) + laneD(A, 0) * .7, -wide, wide), slow = 99;
  for (const V of vehicles) { if (V.wait > 0) continue; const g2 = T.sdiff(V.s, P.s), closing = sp - V.v * V.dir; if (g2 > -1 && g2 < 12 + Math.max(0, closing) * 1.2 && Math.abs(V.d - td) < V.hw + P.car.hw + .8) { td = clamp(V.d + (V.d > P.d ? -1 : 1) * (V.hw + P.car.hw + 1.3), -wide, wide); if (g2 < 9 && Math.abs(V.d - P.d) < V.hw + P.car.hw + .3) slow = Math.max(3, V.v * V.dir - 1); } }
  for (const e of peds) { const g2 = T.sdiff(e.s, P.s); if (g2 > 0 && g2 < 8 + sp * 1.1 && Math.abs(e.d - td) < 2.4 && !e.dead && e.st !== 'fly') { td = clamp(e.d + (e.d > P.d ? -1 : 1) * 3, -wide, wide); if (g2 < 6 + sp * .5 && Math.abs(e.d - P.d) < 2) slow = Math.min(slow, 5); } }
  T.at(P.s + 9 + sp * .5, B); const err = angd(Math.atan2(B.x + B.nx * td - P.x, B.z + B.nz * td - P.z), P.yaw), vsafe = Math.min(slow, P.spec.vmax * 1.3, Math.sqrt(19 * P.spec.grip / (Math.abs(kmx) + .0008)));
  autoIn.steer = clamp(err * 2.8, -1, 1); autoIn.gas = sp < vsafe ? 1 : 0; autoIn.brake = sp > vsafe + 2.5 ? 1 : 0; autoIn.boost = Math.abs(kmx) < .005 && P.boost > .5 && !G.attract;
  inp.steer += clamp(autoIn.steer - inp.steer, -.15, .15); inp.gas = autoIn.gas; inp.brake = autoIn.brake; inp.hand = false; inp.boost = autoIn.boost; inp.back = false;
  if (P.stuck > 3 || P.wrong > 3) { T.at(P.s, A); placePlayer(P.s, laneD(A, 0), 6); }
}

// ------------------------------------------------------------ the noise it all makes
const GREEN = [[440, 1], [523.3, 2], [587.3, 1], [659.3, 1.5], [698.5, .5], [659.3, 1], [587.3, 2], [493.9, 1], [392, 1.5], [440, .5], [493.9, 1], [523.3, 2], [440, 1], [440, 1.5], [415.3, .5], [440, 1], [493.9, 2], [415.3, 1], [329.6, 2]]; let chimeI = 0, chimeT = 0;
function audioFrame(dt) {
  if (!AC || !eng || AC.state !== 'running') return; const t = AC.currentTime, run = G.mode === 'run' || G.mode === 'count', rpm = G.mode === 'count' ? .3 + Math.abs(Math.sin(G.time * 6)) * .35 : P.rpm, gas = G.mode === 'count' ? .5 : inp.gas;
  const base = (P.spec.mass > 1.5 ? 44 : P.kind === 'scooby' ? 48 : 56) + rpm * 150 * (P.boosting ? 1.08 : 1); eng.o1.frequency.setTargetAtTime(base, t, .03); eng.o2.frequency.setTargetAtTime(base * .5, t, .03); eng.f.frequency.setTargetAtTime(380 + rpm * 2300 + gas * 800, t, .05);
  if (P.shiftT > 0) P.shiftT -= dt; eng.g.gain.setTargetAtTime(run ? (.045 + gas * .055 + rpm * .03) * (P.shiftT > 0 ? .35 : 1) : 0, t, .04);
  eng.skid.g.gain.setTargetAtTime(run && P.ground && P.surf !== 'dirt' ? clamp((P.slip - 3) / 9, 0, 1) * .2 + (inp.brake && P.vf > 16 ? .06 : 0) : 0, t, .05); eng.dirt.g.gain.setTargetAtTime(run && P.ground && P.surf === 'dirt' ? clamp(Math.abs(P.vf) / 30, 0, 1) * .35 : 0, t, .08);
  eng.wind.g.gain.setTargetAtTime(run ? Math.pow(clamp(Math.abs(P.vf) / 56, 0, 1.2), 2) * .16 : 0, t, .1);
  let cop = 1e9, riv = 1e9, rv = null; for (const V of vehicles) { if (V.wait > 0) continue; const d = Math.hypot(V.x - P.x, V.z - P.z); if (V.role === 'chaser' && V.car.blues && d < cop) cop = d; if ((V.role === 'racer' || V.role === 'hog') && d < riv) { riv = d; rv = V; } }
  eng.siren.o.frequency.setTargetAtTime(Math.floor(t * 2.3) % 2 ? 660 : 880, t, .02); eng.siren.g.gain.setTargetAtTime(run ? Math.max(clamp(1 - cop / 170, 0, 1) * .055, G.blues ? .022 : 0) : 0, t, .08);
  eng.rival.o.frequency.setTargetAtTime(rv ? (rv.bike ? 120 + rv.v * 7 : 60 + rv.v * 3) : 80, t, .05); eng.rival.g.gain.setTargetAtTime(run && rv ? clamp(1 - riv / 75, 0, 1) * (rv.bike ? .05 : .06) : 0, t, .08);
  eng.chop.g.gain.setTargetAtTime(run && chopper.on ? (Math.floor(G.time * 26) % 2 ? .7 : .2) : 0, t, .015);
  if (run && P.kind === 'whippy' && G.mode === 'run') { chimeT -= dt; if (chimeT <= 0) { const n = GREEN[chimeI++ % GREEN.length]; chimeT = n[1] * .27; tone(n[0] * 2, n[1] * .3 + .2, 'sine', .05); tone(n[0] * 4, n[1] * .2 + .1, 'triangle', .02); } }
}

// ------------------------------------------------------------ the loop
const STEP = 1 / 60; let last = 0, acc = 0, perfT = 0, perfN = 0, perfMs = 0;
function tick(dt) {
  const m = G.mode, done = m === 'result' || m === 'final', live = m === 'run' || m === 'title' || done;
  if ((G.auto && live) || done) autopilot(); else if (m === 'run') readInput(dt); else { inp.gas = inp.brake = 0; inp.steer *= .9; inp.hand = inp.boost = false; }
  if (done) { inp.gas = 0; inp.brake = P.vf > .5 ? 1 : 0; inp.boost = false; }
  if (live) stepPlayer(dt); else { P.car.g.position.set(P.x, P.y, P.z); P.car.g.rotation.y = P.yaw; pose(P.car, dt, 0, 0, 0, 0, true); }
  if (m === 'count') { G.countT -= dt; const n = Math.ceil(G.countT / .8); if (n !== G.countN) { G.countN = n; if (n > 0) { big(String(n), '#fff', 700); SFX.beep(false); } else { big('GO ’ED!', '#39ff14', 900); SFX.beep(true); G.mode = 'run'; } } }
  manageTraffic();
  for (let i = vehicles.length - 1; i >= 0; i--) { const V = vehicles[i]; if (V.gone) { removeVehicle(V); continue; } if (V.role === 'traffic') stepTraffic(V, dt); else if (V.role === 'racer') stepRacer(V, dt); else if (V.role === 'chaser') stepChaser(V, dt); else if (V.role === 'hog') stepHog(V, dt); else if (V.role === 'wreck') stepWreck(V, dt); }
  if (live) collideVehicles();
  stepPeds(dt); updateBits(dt); updateParticles(dt); updateChopper(dt); updateScoops(dt); if (P.car.blues) blues(P.car, G.time, true);
  if (m === 'run') stageLogic(dt);
}
function frame(ts) {
  requestAnimationFrame(frame); const rdt = Math.min(.25, last ? (ts - last) / 1000 : .016); last = ts; G.time += rdt;
  const m = G.mode; if (m !== 'pause' && m !== 'load') { if (G.slow > 0) G.slow -= rdt; acc += rdt * (G.slow > 0 ? .3 : 1); let n = 0; while (acc >= STEP && n < 16) { tick(STEP); acc -= STEP; n++; } if (n === 16) acc = 0; }
  updateCamera(rdt, m === 'card' || m === 'result' || m === 'fail' || m === 'final' ? P.yaw + 2.4 + G.time * .25 : m === 'title' ? P.yaw + Math.PI + Math.sin(G.time * .17) * 1.2 : undefined);
  W.update(rdt, P.car.g.position, camera.position); updateRadio(rdt); hud(rdt); audioFrame(rdt); musicTick(); renderer.render(scene, camera);
  // if it's struggling, turn things down rather than judder
  perfT += rdt; perfN++; perfMs += rdt; if (perfT > 2.5) { const avg = perfMs / perfN * 1000; perfT = perfN = perfMs = 0; if (!TEST && avg > 30) { if (pxr > 1) { pxr = Math.max(1, pxr - .5); renderer.setPixelRatio(pxr); resize(); } else if (W.sun.castShadow) W.sun.castShadow = false; } }
}
async function init() {
  try { await Promise.all([loadCars(), loadCharacters()]); } catch (e) { H.load.textContent = 'Could not load the motors. Check your connection and refresh.'; throw e; }
  W = buildWorld(scene, { shadows: quality === 'high' ? 2048 : quality === 'med' ? 1024 : 0, shadowRange: quality === 'high' ? 85 : 60 }); initParticles(); initSkids(); buildExtras(); buildScoops(); makeParked();
  setCar('xr'); placePlayer(70, 1.6, 18); G.stage = 6; G.free = true; G.attract = true; G.auto = true; G.mode = 'title'; drawMapBase();
  const best = STORE.get('ph-drive-total', 0); if (best) $('best').textContent = `Best run: ${best} pts`;
  const b = $('start'); b.disabled = false; b.textContent = TOUCH ? 'TAP TO NICK A CAR' : 'CLICK TO NICK A CAR'; $('lapbtn').disabled = false; H.load.hidden = true; requestAnimationFrame(frame);
}
window.__dr = { G, P, T, STAGES, vehicles, peds, inp, bits, startStage, begin, finishStage, act, get W() { return W; }, renderer, placePlayer, setCar };
init();
