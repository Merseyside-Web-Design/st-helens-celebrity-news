// PIE HARD: The Siege of Westfield Street – an SHCN original.
// First-person food fight. Three.js, everything else built in code.
import * as THREE from 'three';
import { loadCharacters, makeCharacter } from './characters.js';
import { makeAnt, makeGoose, makeBat } from './creatures.js';

// ---------------------------------------------------------------- setup
const $ = (id) => document.getElementById(id);
const canvas = $('ph-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio, 1.5); renderer.setPixelRatio(pixelRatio);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0618);
scene.fog = new THREE.FogExp2(0x160c2e, 0.017);
const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 260);
scene.add(camera);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const STORE = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const LEVEL_N = clamp(parseInt(new URLSearchParams(location.search).get('level'), 10) || 1, 1, 5);

// ---------------------------------------------------------------- textures
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function brickTex(base, mortar) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) {
      const v = Math.floor(rand(-14, 14)); g.fillStyle = shade(base, v); g.fillRect(x + 1, y + 1, 30, 14);
    }
  });
}
function shade(hex, d) {
  const n = parseInt(hex.slice(1), 16), r = clamp((n >> 16) + d, 0, 255), gg = clamp(((n >> 8) & 255) + d, 0, 255), b = clamp((n & 255) + d, 0, 255);
  return `rgb(${r},${gg},${b})`;
}
function facadeTex(base, floors, lit) {
  return canvasTex(256, 256 * floors / 2, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${rand(0, .12)})`; g.fillRect(rand(0, w), rand(0, h), 3, 2); }
    const fh = h / floors;
    for (let f = 0; f < floors; f++) for (let k = 0; k < 3; k++) {
      const x = 28 + k * 76, y = f * fh + fh * .25;
      g.fillStyle = '#2a2633'; g.fillRect(x - 3, y - 3, 46, fh * .5 + 6);
      const on = Math.random() < lit;
      g.fillStyle = on ? pick(['#ffd479', '#ffe7a8', '#9fd2ff', '#ffb36b']) : '#14111c'; g.fillRect(x, y, 40, fh * .5);
      if (on && Math.random() < .5) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 18, y, 4, fh * .5); }
    }
  });
}
function shopTex(name, neon, kind) {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#1b1622'; g.fillRect(0, 0, w, h);
    // fascia
    g.fillStyle = '#0d0a12'; g.fillRect(0, 0, w, 70);
    g.font = 'bold 54px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = neon; g.shadowBlur = 22; g.fillStyle = neon; g.fillText(name, w / 2, 38); g.shadowBlur = 0;
    // window
    const glow = g.createLinearGradient(0, 80, 0, h);
    glow.addColorStop(0, kind === 'dark' ? '#221c2c' : '#ffcf8a'); glow.addColorStop(1, kind === 'dark' ? '#120e18' : '#c9783b');
    g.fillStyle = glow; g.fillRect(24, 86, 300, 150);
    if (kind !== 'dark') { g.fillStyle = 'rgba(60,30,10,.55)'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 46, 180 + rand(-8, 8), 30, 56); }
    g.fillStyle = '#3a3346'; g.fillRect(350, 86, 130, 170); g.fillStyle = kind === 'dark' ? '#0b0910' : '#5a3b22'; g.fillRect(362, 98, 106, 158);
    g.strokeStyle = '#555'; g.lineWidth = 6; g.strokeRect(24, 86, 300, 150);
    if (kind === 'shutter') { g.fillStyle = '#6d6a72'; g.fillRect(24, 86, 300, 150); g.fillStyle = '#58555e'; for (let y = 90; y < 236; y += 10) g.fillRect(24, y, 300, 4);
      g.fillStyle = '#e83a6b'; g.font = 'bold 34px Arial'; g.fillText('SHCN', 120, 160); g.fillStyle = '#39c0ff'; g.fillText('WIGAN 0', 230, 200); }
  });
}
function faceTex(skin, opts = {}) {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = skin; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff'; g.fillRect(14, 22, 12, 9); g.fillRect(38, 22, 12, 9);
    g.fillStyle = '#111'; g.fillRect(19, 24, 6, 6); g.fillRect(43, 24, 6, 6);
    g.fillStyle = opts.brow || '#2a1a0e'; g.fillRect(12, opts.angry ? 16 : 17, 16, 3); g.fillRect(36, opts.angry ? 16 : 17, 16, 3);
    if (opts.tache) { g.fillStyle = opts.brow || '#2a1a0e'; g.fillRect(18, 40, 28, 6); }
    g.fillStyle = opts.lips || '#7a1e1e'; g.fillRect(22, 48, 20, opts.shout ? 9 : 4);
    if (opts.blush) { g.fillStyle = 'rgba(255,90,140,.45)'; g.fillRect(8, 36, 10, 6); g.fillRect(46, 36, 10, 6); }
    if (opts.lashes) { g.fillStyle = '#111'; g.fillRect(12, 20, 16, 2); g.fillRect(36, 20, 16, 2); }
  });
}
function shirtTex(kind) {
  return canvasTex(64, 64, (g) => {
    if (kind === 'hoops') { for (let y = 0; y < 64; y += 16) { g.fillStyle = '#c8102e'; g.fillRect(0, y, 64, 8); g.fillStyle = '#f4f4f4'; g.fillRect(0, y + 8, 64, 8); } }
    else if (kind === 'bouncer') { g.fillStyle = '#111'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ddd'; g.fillRect(26, 0, 12, 22); g.fillStyle = '#e9c400'; g.font = 'bold 11px Arial'; g.fillText('SECURITY', 6, 40); }
    else if (kind === 'bride') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ff5fb4'; g.save(); g.translate(32, 32); g.rotate(-.7); g.fillRect(-40, -6, 80, 12); g.restore(); g.fillStyle = '#fff'; g.font = 'bold 9px Arial'; g.fillText('BRIDE', 20, 36); }
    else if (kind === 'hen') { g.fillStyle = pick(['#ff5fb4', '#6be0ff', '#ffe14f', '#b06bff']); g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.save(); g.translate(32, 32); g.rotate(-.7); g.fillRect(-40, -5, 80, 10); g.restore(); }
    else { g.fillStyle = kind; g.fillRect(0, 0, 64, 64); }
  });
}
function textSprite(text, color = '#111', bg = '#fff') {
  const t = canvasTex(512, 96, (g, w, h) => {
    g.font = 'bold 38px Arial'; const tw = Math.min(w - 20, g.measureText(text).width + 36);
    g.fillStyle = bg; roundRect(g, (w - tw) / 2, 8, tw, 64, 14); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 12, 70); g.lineTo(w / 2, 90); g.lineTo(w / 2 + 12, 70); g.fill();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 41, w - 40);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(3.2, .6, 1); return s;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// ---------------------------------------------------------------- world
const lam = (o) => new THREE.MeshLambertMaterial(o);
const colliders = [];   // {minX,maxX,minZ,maxZ}
function addCollider(x, z, w, d) { colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); }
let STREET_HALF = 9.4; const END_Z = -228, START_Z = 6;

const hemi = new THREE.HemisphereLight(0x7a6ab8, 0x2a1830, 1.25); scene.add(hemi);
const ambient = new THREE.AmbientLight(0x40385a, 0.9); scene.add(ambient);
const moon = new THREE.DirectionalLight(0x8a9cff, 0.35); moon.position.set(-30, 60, 20); scene.add(moon);

const neonSpots = [], lampSpots = [];
const glowTexCache = {};
function glowMat(col) {
  if (!glowTexCache[col]) {
    const t = canvasTex(128, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, col + 'aa'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    glowTexCache[col] = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55 });
  }
  return glowTexCache[col];
}
// end walls
function endWall(z, label) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 2), lam({ map: facadeTex('#4a3a4a', 3, .3) })); w.position.set(0, 7, z); scene.add(w);
  if (label) { const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 2), lam({ map: shopTex(label, '#7cff4f', 'dark'), emissive: 0xffffff, emissiveIntensity: .4 })); s.material.emissiveMap = s.material.map; s.position.set(0, 4.5, z + 1.02); scene.add(s); }
}

// lamp posts
const lampMat = lam({ color: 0x2a2a30 }), lampHead = new THREE.MeshBasicMaterial({ color: 0xffc46b });
function streetLamps(zFrom = -4, zTo = END_Z + 4, xOff = 6.6) {
for (let z = zFrom, i = 0; z > zTo; z -= 22, i++) for (const s of [-1, 1]) {
  if ((i + (s > 0 ? 1 : 0)) % 2) continue;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 6.2, 8), lampMat); post.position.set(s * xOff, 3.1, z); scene.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, .1, .1), lampMat); arm.position.set(s * (xOff - .6), 6.1, z); scene.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.6, .18, .3), lampHead); head.position.set(s * (xOff - 1.2), 6.0, z); scene.add(head);
  lampSpots.push({ pos: new THREE.Vector3(s * (xOff - 2), 5.6, z) });
  const pool = new THREE.Sprite(glowMat('#ffb060')); pool.position.set(s * (xOff - 1.2), 5.9, z); pool.scale.set(2.2, 1.2, 1); scene.add(pool);
  addCollider(s * xOff, z, .4, .4);
}
}
// light pools: a few real lights that follow the player to the nearest lamps and neon signs
const NEON_POOL = [], LAMP_POOL = [];
for (let i = 0; i < 4; i++) { const L = new THREE.PointLight(0xffffff, 7, 14, 1.6); scene.add(L); NEON_POOL.push(L); }
for (let i = 0; i < 3; i++) { const L = new THREE.PointLight(0xffb060, 8, 20, 1.4); scene.add(L); LAMP_POOL.push(L); }
function updateLightPools() {
  const cz = camera.position.z, cx = camera.position.x;
  const near = (arr) => arr.slice().sort((a, b) => Math.abs(a.pos.z - cz - (a.pos.z < cz ? 0 : 6)) - Math.abs(b.pos.z - cz - (b.pos.z < cz ? 0 : 6)));
  near(neonSpots).slice(0, NEON_POOL.length).forEach((n, i) => { const L = NEON_POOL[i]; L.position.copy(n.pos); L.color.copy(n.color); L.userData.flick = n.flick; });
  near(lampSpots).slice(0, LAMP_POOL.length).forEach((n, i) => LAMP_POOL[i].position.copy(n.pos));
}

// props
const PROPMAT = { bin: lam({ color: 0x1e3a28 }), binLid: lam({ color: 0x152a1c }), bench: lam({ color: 0x5a3a20 }), metal: lam({ color: 0x55555e }),
  taxiBody: lam({ color: 0x111114 }), taxiGlass: lam({ color: 0x9fc8e8, emissive: 0x223344 }), sign: lam({ color: 0xffd400, emissive: 0x886a00 }),
  cone: lam({ color: 0xff6a1a }), barrier: lam({ color: 0xe8e8e8 }), barrierRed: lam({ color: 0xd11a2a }), coach: lam({ color: 0xc8102e }), coachWhite: lam({ color: 0xf0f0f0 }), tyre: lam({ color: 0x111111 }) };
function bin(x, z) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.1, .7), PROPMAT.bin); b.position.y = .55; g.add(b); const l = new THREE.Mesh(new THREE.BoxGeometry(.75, .1, .75), PROPMAT.binLid); l.position.y = 1.12; g.add(l); g.position.set(x, 0, z); scene.add(g); addCollider(x, z, .8, .8); }
function bench(x, z) { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.BoxGeometry(.5, .1, 2), PROPMAT.bench); s.position.y = .5; g.add(s); const bk = new THREE.Mesh(new THREE.BoxGeometry(.1, .5, 2), PROPMAT.bench); bk.position.set(Math.sign(x) * .25, .8, 0); g.add(bk); for (const d of [-.8, .8]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.4, .5, .08), PROPMAT.metal); l.position.set(0, .25, d); g.add(l); } g.position.set(x, 0, z); scene.add(g); addCollider(x, z, .6, 2.1); }
function cone(x, z) { const c = new THREE.Mesh(new THREE.ConeGeometry(.22, .6, 10), PROPMAT.cone); c.position.set(x, .3, z); scene.add(c); }
function taxi(x, z, rotY = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, .9, 4.3), PROPMAT.taxiBody); body.position.y = .65; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, .7, 2.2), PROPMAT.taxiGlass); cab.position.set(0, 1.4, -.2); g.add(cab);
  const sg = new THREE.Mesh(new THREE.BoxGeometry(.7, .22, .3), PROPMAT.sign); sg.position.set(0, 1.86, -.2); g.add(sg);
  for (const wx of [-.95, .95]) for (const wz of [-1.4, 1.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .25, 12), PROPMAT.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, .34, wz); g.add(w); }
  g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g); addCollider(x, z, rotY ? 4.4 : 2.0, rotY ? 2.0 : 4.4); return g;
}
function coach(x, z) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 11), PROPMAT.coach); b.position.y = 1.8; g.add(b);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.62, .5, 11.02), PROPMAT.coachWhite); stripe.position.y = 2.2; g.add(stripe);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1), lam({ map: shopTex('WIGAN TOURS', '#ffffff', 'dark'), emissive: 0xffffff, emissiveIntensity: .3 }));
  sign.material.emissiveMap = sign.material.map; sign.position.set(-1.32, 2.9, 0); sign.rotation.y = -Math.PI / 2; g.add(sign);
  for (const wz of [-3.8, 3.8]) for (const wx of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .3, 12), PROPMAT.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, .5, wz); g.add(w); }
  g.position.set(x, 0, z); scene.add(g); addCollider(x, z, 2.8, 11.2); return g;
}
function buildStreet() {
  // Westfield Street as it really is: a narrow block-paved road lined with black bollards, wide red-brick pavements,
  // two/three-storey terraces in white render and red brick, roller shutters, the club, and the clock tower closing the view.
  STREET_HALF = 7.0; const FRONT = 7.6;
  const setts = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2224'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) for (let x = (y / 12) % 2 ? -12 : 0; x < w; x += 24) { g.fillStyle = pick(['#5a3c36', '#4a3634', '#62463c', '#46393a', '#3c3234', '#54443e']); g.fillRect(x + 1, y + 1, 22, 10); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${rand(.05, .2)})`; g.fillRect(rand(0, w), rand(0, h), 2, 2); }
  }, [2, 80]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 240), lam({ map: setts })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -112); scene.add(road);
  const herring = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#3a2420'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { g.fillStyle = pick(['#8a4434', '#7a3c30', '#94503c', '#6e382e']);
      if ((i + j) % 2) g.fillRect(i * 16 + 1, j * 16 + 1, 30, 14); else g.fillRect(i * 16 + 1, j * 16 + 1, 14, 30); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${rand(.03, .15)})`; g.fillRect(rand(0, w), rand(0, h), 3, 3); }
  }, [3, 70]);
  const kerbMat = lam({ color: 0x8a8690 });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(FRONT - 2.6, .08, 240), lam({ map: herring })); p.position.set(s * (2.6 + (FRONT - 2.6) / 2), .04, -112); scene.add(p);
    const k = new THREE.Mesh(new THREE.BoxGeometry(.3, .1, 240), kerbMat); k.position.set(s * 2.6, .05, -112); scene.add(k);
  }
  const puddleMat = new THREE.MeshPhongMaterial({ color: 0x1a1430, specular: 0xaa88ff, shininess: 90, transparent: true, opacity: .8 });
  for (let i = 0; i < 22; i++) { const pd = new THREE.Mesh(new THREE.CircleGeometry(rand(.5, 1.3), 18), puddleMat); pd.rotation.x = -Math.PI / 2; pd.scale.set(1, rand(.4, 1), 1); pd.position.set(rand(-2.2, 2.2), .012, rand(-220, 0)); scene.add(pd); }
  // the bollards
  const bolMat = lam({ color: 0x111114 }), bolBand = lam({ color: 0xb8902a });
  for (const s of [-1, 1]) for (let z = 3; z > END_Z + 2; z -= 2.4) {
    if (Math.abs(((z + 140) % 37)) < 2.5) continue;                                       // gaps for crossings
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.085, .1, .95, 8), bolMat); b.position.set(s * 2.85, .48, z); scene.add(b);
    const t = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), bolMat); t.position.set(s * 2.85, .95, z); scene.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.092, .092, .05, 8), bolBand); r.position.set(s * 2.85, .8, z); scene.add(r);
  }
  // young street trees in grates
  const bark = lam({ color: 0x3a2c22 }), leafs = [lam({ color: 0x6a7a2a }), lam({ color: 0x8a7a2a }), lam({ color: 0x4a6a2a })], grate = lam({ color: 0x1a1a1c });
  for (let z = -6, i = 0; z > END_Z + 8; z -= 13, i++) {
    const s = i % 2 ? 1 : -1, x = s * 4.3;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 3.6, 6), bark); tr.position.set(x, 1.8, z); scene.add(tr);
    for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(.55, .9), 0), pick(leafs)); l.position.set(x + rand(-.6, .6), rand(3.4, 5), z + rand(-.6, .6)); scene.add(l); }
    const gr = new THREE.Mesh(new THREE.BoxGeometry(1.2, .03, 1.2), grate); gr.position.set(x, .09, z); scene.add(gr);
    addCollider(x, z, .4, .4);
  }
  // terraces
  const RENDER = ['#e6e2d6', '#d9d4c4', '#efe9dc', '#cfc8b8', '#e8dccd'], BRICK = ['#7a3a2a', '#8a4632', '#6a3a2c', '#7e4430'];
  const slate = lam({ color: 0x34343e });
  const SHOP_NAMES = ['KEBABS', 'CHIPPY', 'PAWN', 'VAPES', 'TATTOO', 'STYLING', 'BOOKIES', 'OFFIE', 'NAILS', 'PHONES', 'CHINESE', 'PIZZA', 'BARBER', 'CASH 4 GOLD', 'TANNING', 'KARAOKE', 'TO LET', 'BAR 44', 'THE BLOOD TUB', 'TAXIS'];
  const NEONS = ['#ff3b6b', '#ffb13b', '#7cff4f', '#39e0ff', '#ff4fd8', '#ffe14f', '#b06bff', '#ff6a3b'];
  let nameI = 0;
  const ATL = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = c.height = 2048; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return { c, g: c.getContext('2d'), n: 0, tex: t, mat: lam({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .42 }) }; });
  const BRICK_IMG = {}, WALL = {};
  for (const c of BRICK) { const t = brickTex(c, '#3a2a28'); BRICK_IMG[c] = t.image; WALL[c] = lam({ map: t }); }
  for (const c of RENDER) WALL[c] = lam({ color: c });
  function terraceUnit(sx, z0, len, special) {
    const zc = z0 - len / 2;
    if (special === 'club') {                                        // modern red brick and blue glass club
      const hgt = 13, body = lam({ map: brickTex('#7a3a2a', '#3a2a28') });
      const glass = lam({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#1a3a5a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8aa0b8'; g.lineWidth = 4;
        for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(160,120,255,.35)'; g.fillRect(Math.floor(rand(0, 8)) * 32 + 2, Math.floor(rand(0, 4)) * 64 + 2, 28, 60); } }), emissive: 0x3a2a6a, emissiveIntensity: .6 });
      glass.emissiveMap = glass.map;
      const mats = [body, body, slate, body, body, body]; const b = new THREE.Mesh(new THREE.BoxGeometry(10, hgt, len), mats); b.position.set(sx * (FRONT + 5), hgt / 2, zc); scene.add(b);
      const gw = new THREE.Mesh(new THREE.PlaneGeometry(len * .55, 8), glass); gw.position.set(sx * (FRONT - .03), 8, zc + len * .2); gw.rotation.y = -sx * Math.PI / 2; scene.add(gw);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(len - 1, 3.4), lam({ map: shopTex('THE PALACE', '#b06bff', 'lit'), emissive: 0xffffff, emissiveIntensity: .7 })); sign.material.emissiveMap = sign.material.map;
      sign.position.set(sx * (FRONT - .03), 1.9, zc); sign.rotation.y = -sx * Math.PI / 2; scene.add(sign);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.4, .15, 5), lam({ color: 0x1a1a22 })); canopy.position.set(sx * (FRONT - .7), 3.8, zc); scene.add(canopy);
      for (const dz of [-2, 2]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1, 6), lam({ color: 0xd8b84a })); rope.position.set(sx * (FRONT - 1.6), .5, zc + dz); scene.add(rope); }
      neonSpots.push({ pos: new THREE.Vector3(sx * (FRONT - 1.4), 3.2, zc), color: new THREE.Color('#b06bff'), flick: true });
      const glow = new THREE.Sprite(glowMat('#b06bff')); glow.position.set(sx * (FRONT - .3), 3.2, zc); glow.scale.set(9, 3.5, 1); scene.add(glow);
      addCollider(sx * (FRONT + 5), zc, 10, len); return;
    }
    const brick = Math.random() < .45, base = brick ? pick(BRICK) : pick(RENDER), floors = pick([2, 2, 3]), hgt = 3.8 + (floors - 1) * 3;
    const name = special || SHOP_NAMES[nameI++ % SHOP_NAMES.length], neon = pick(NEONS);
    const kind = name === 'TO LET' ? 'dark' : Math.random() < .42 ? 'shutter' : Math.random() < .8 ? 'lit' : 'dark';
    // the whole street face (upper floors + shopfront) is painted into one slot of a shared atlas, so it all draws in one go
    const A = ATL[sx > 0 ? 1 : 0], slot = A.n++, col = slot % 8, row = Math.floor(slot / 8);
    const g = A.g; g.save(); g.translate(col * 256, row * 256); g.beginPath(); g.rect(0, 0, 256, 256); g.clip();
    const w = 256, h = 256, shopH = h * 3.8 / hgt, fh = (h - shopH) / Math.max(1, floors - 1);
    if (brick) g.drawImage(BRICK_IMG[base], 0, 0, w, h); else { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${rand(0, .07)})`; g.fillRect(rand(0, w), rand(0, h), 3, 2); } }
    for (let f = 0; f < floors - 1; f++) for (const x of [40, 156]) {
      const y = f * fh + fh * .22, wh = fh * .58, on = Math.random() < .3;
      g.fillStyle = '#f2f2f2'; g.fillRect(x - 6, y - 6, 72, wh + 12);
      g.fillStyle = on ? pick(['#ffd479', '#ffe7a8', '#9fd2ff']) : '#18151f'; g.fillRect(x, y, 60, wh);
      g.fillStyle = '#f2f2f2'; g.fillRect(x, y + wh / 2 - 2, 60, 4); g.fillRect(x + 28, y, 4, wh);
      g.fillStyle = brick ? '#d8d0c0' : '#bdb6a6'; g.fillRect(x - 10, y + wh + 6, 80, 6);
    }
    g.drawImage((kind === 'shutter' ? shutterTex(name, neon) : shopTex(name, neon, kind)).image, 0, h - shopH, w, shopH);
    g.restore();
    const face = new THREE.PlaneGeometry(len - .2, hgt), uv = face.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + uv.getX(k)) / 8, 1 - (row + 1 - uv.getY(k)) / 8);
    const fm = new THREE.Mesh(face, A.mat); fm.position.set(sx * (FRONT - .02), hgt / 2, zc); fm.rotation.y = -sx * Math.PI / 2; scene.add(fm);
    const plain = WALL[base];
    const b = new THREE.Mesh(new THREE.BoxGeometry(10, hgt, len), plain); b.position.set(sx * (FRONT + 5.01), hgt / 2, zc); scene.add(b);
    const roof = new THREE.Mesh(gableGeo(10.2, 2.4, len + .1), slate); roof.position.set(sx * (FRONT + 5), hgt, zc); scene.add(roof);
    if (Math.random() < .5) { const ch = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.6, .9), plain); ch.position.set(sx * (FRONT + 5), hgt + 2.2, zc - len / 2 + .5); scene.add(ch); }
    if (kind === 'lit') { neonSpots.push({ pos: new THREE.Vector3(sx * (FRONT - 1.5), 3.3, zc), color: new THREE.Color(neon), flick: name === 'KARAOKE' || name === 'BAR 44' });
      const glow = new THREE.Sprite(glowMat(neon)); glow.position.set(sx * (FRONT - .3), 3.3, zc); glow.scale.set(Math.min(7, len), 2.6, 1); scene.add(glow); }
    addCollider(sx * (FRONT + 5), zc, 10, len);
  }
  for (const sx of [-1, 1]) {
    let z = 4;
    while (z > END_Z - 4) {
      let len = rand(5.5, 8.5), special = null;
      if (sx < 0 && z < -60 && z > -75) { special = 'club'; len = 16; }
      if (sx > 0 && z <= 4 && z > -2) special = 'KEBABS';
      if (sx < 0 && z < -196 && z > -212) special = 'TAXIS';
      terraceUnit(sx, z, len, special);
      z -= len + (Math.random() < .12 ? 1.8 : 0);                   // the odd ginnel between buildings
    }
  }
  for (const A of ATL) A.tex.needsUpdate = true;
  // the clock tower closing the view up the street
  clockTower(-2.5, END_Z - 18);
  endWall(END_Z - 1, 'TAXI RANK'); endWall(START_Z + 3, null);
  streetLamps(-4, END_Z + 4, 3.4);
  // street furniture
  [[6.4, -12], [-6.4, -26], [6.4, -48], [-6.4, -92], [6.4, -84], [-6.4, -118], [6.4, -132], [-6.4, -150], [6.4, -170], [-6.4, -186], [6.4, -196]].forEach(([x, z]) => bin(x, z));
  [[-6.6, -42], [6.6, -112], [-6.6, -142]].forEach(([x, z]) => bench(x, z));
  for (let i = 0; i < 10; i++) cone(rand(-2, 2), rand(-210, -10));
  taxi(-1.2, -44); taxi(1.2, -96, 0); taxi(-1.2, -214, 0);
  stHelensBus(-1.2, -126);
  coach(1.2, -172);
  const litterMat = [lam({ color: 0xf2e6c8 }), lam({ color: 0xe8e2d0 }), lam({ color: 0xc8102e })];
  for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(rand(.15, .3), .05, rand(.15, .3)), pick(litterMat)); m.position.set(rand(-6.8, 6.8), .1, rand(-222, 2)); m.rotation.y = rand(0, 6); scene.add(m); }
}
function gableGeo(w, h, l) {
  const x = w / 2, z = l / 2, v = [
    -x, 0, -z, x, 0, -z, 0, h, -z,   -x, 0, z, 0, h, z, x, 0, z,                    // gable ends
    -x, 0, -z, 0, h, -z, 0, h, z,    -x, 0, -z, 0, h, z, -x, 0, z,                  // left slope
    x, 0, -z, x, 0, z, 0, h, z,      x, 0, -z, 0, h, z, 0, h, -z ];                 // right slope
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(v.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); return g;
}
function shutterTex(name, neon) {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#0d0a12'; g.fillRect(0, 0, w, 64);
    g.font = 'bold 46px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = shade(neon.length === 7 ? neon : '#ffffff', -30); g.fillText(name, w / 2, 34);
    g.fillStyle = '#5a5a62'; g.fillRect(0, 64, w, h - 64);
    for (let y = 66; y < h; y += 7) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y + 2, w, 1); }
    if (Math.random() < .6) { g.font = 'bold italic 40px Arial'; g.fillStyle = pick(['#ff4fd8', '#39e0ff', '#7cff4f', '#ffe14f']); g.save(); g.translate(rand(120, 380), rand(140, 210)); g.rotate(rand(-.2, .2)); g.fillText(pick(['SAINTS', 'WA9', 'KEV', 'DAZ 4 SHAZ', 'TOWN END', 'RIP']), 0, 0); g.restore(); }
  });
}
function clockTower(x, z) {
  // floodlit, and only lightly fogged, so it reads at the end of the street like the real one does
  const bt = brickTex('#8a4a36', '#3a2a28'), brick = lam({ map: bt, emissiveMap: bt, emissive: 0xffc890, emissiveIntensity: .55, fog: false }), stone = lam({ color: 0xd8d0bc, emissive: 0x6a6050, fog: false }), dark = lam({ color: 0x2a2a30, fog: false });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(5, 20, 5), brick); shaft.position.set(x, 10, z); scene.add(shaft);
  for (const y of [6, 12, 19.6]) { const band = new THREE.Mesh(new THREE.BoxGeometry(5.3, .5, 5.3), stone); band.position.set(x, y, z); scene.add(band); }
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4, 4.4), brick); belfry.position.set(x, 22, z); scene.add(belfry);
  const face = new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(64 + Math.sin(a) * 50 - 2, 64 - Math.cos(a) * 50 - 2, 5, 5); }
    g.lineWidth = 5; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 28, 64 + 6); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(64, 64); g.lineTo(60, 18); g.stroke(); }), transparent: true, fog: false });
  for (const [dx, dz, ry] of [[0, 2.52, 0], [0, -2.52, Math.PI], [2.52, 0, Math.PI / 2], [-2.52, 0, -Math.PI / 2]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), face); c.position.set(x + dx, 16, z + dz); c.rotation.y = ry; scene.add(c); }
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 3.2, 8), stone); lantern.position.set(x, 25.6, z); scene.add(lantern);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const op = new THREE.Mesh(new THREE.BoxGeometry(.5, 2, .1), dark); op.position.set(x + Math.cos(a) * 1.6, 25.6, z + Math.sin(a) * 1.6); op.rotation.y = -a + Math.PI / 2; scene.add(op); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam({ color: 0x5a7a6a, emissive: 0x2a3a30, fog: false })); dome.position.set(x, 27.2, z); scene.add(dome);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(.15, 1.6, 6), lam({ color: 0xc8a040 })); fin.position.set(x, 29.4, z); scene.add(fin);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMat('#fff2c0').map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.position.set(x, 16, z + 3); glow.scale.set(7, 7, 1); scene.add(glow);
}
function stHelensBus(x, z) {
  const g = new THREE.Group(), teal = lam({ color: 0x1a8a8a });
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.9, 11), teal); b.position.y = 1.75; g.add(b);
  const w = new THREE.Mesh(new THREE.BoxGeometry(2.54, .9, 9.6), PROPMAT.taxiGlass); w.position.set(0, 2.3, -.4); g.add(w);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), PROPMAT.taxiGlass); ws.position.set(0, 2.1, 5.51); g.add(ws);
  const dest = new THREE.Mesh(new THREE.PlaneGeometry(2, .4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 48, (gg, ww, hh) => { gg.fillStyle = '#111'; gg.fillRect(0, 0, ww, hh); gg.fillStyle = '#ffb000'; gg.font = 'bold 30px monospace'; gg.textAlign = 'center'; gg.fillText('10A NOT IN SERVICE', ww / 2, 34); }) }));
  dest.position.set(0, 3.0, 5.52); g.add(dest);
  for (const wz of [-3.6, 3.6]) for (const wx of [-1.25, 1.25]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .3, 12), PROPMAT.tyre); wh.rotation.z = Math.PI / 2; wh.position.set(wx, .5, wz); g.add(wh); }
  g.position.set(x, 0, z); scene.add(g); addCollider(x, z, 2.6, 11.1);
}

// ---------------------------------------------------------------- level 2: Parr (and the Burgies)
function groundTex(base, speck, rep) {
  return canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${speck},${rand(.05, .25)})`; g.fillRect(rand(0, w), rand(0, h), rand(1, 4), rand(1, 3)); } }, rep);
}
function houseTex(base, lit) {
  return canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${rand(0, .1)})`; g.fillRect(rand(0, w), rand(0, h), 2, 2); }   // pebbledash
    const win = (x, y, ww, hh) => { const on = Math.random() < lit; g.fillStyle = '#e8e8e8'; g.fillRect(x - 4, y - 4, ww + 8, hh + 8);
      g.fillStyle = on ? pick(['#ffd479', '#ffe7a8', '#9fd2ff', '#ff9fd0']) : '#15131c'; g.fillRect(x, y, ww, hh);
      g.fillStyle = '#e8e8e8'; g.fillRect(x + ww / 2 - 2, y, 4, hh); if (on && Math.random() < .5) { g.fillStyle = 'rgba(80,20,20,.45)'; g.fillRect(x, y, ww / 2 - 2, hh); } };
    win(30, 22, 70, 46); win(156, 22, 70, 46); win(30, 112, 70, 50);
    g.fillStyle = pick(['#7a1e1e', '#1e3a7a', '#e8e8e8', '#1e5a2a']); g.fillRect(166, 104, 44, 88); g.fillStyle = '#ffd400'; g.fillRect(200, 148, 4, 4);
    g.fillStyle = '#3a3440'; g.fillRect(0, 92, w, 6);
  });
}
const PARR = { trolley: lam({ color: 0xb8b8c0 }), burnt: lam({ color: 0x1a1414 }), rust: lam({ color: 0x5a2a14 }), ember: new THREE.MeshBasicMaterial({ color: 0xff7a1a }),
  mattress: lam({ color: 0xd8d2c0 }), stain: lam({ color: 0x9a8a5a }), fence: lam({ color: 0x4a3a28 }), tent: [lam({ color: 0x2a8a3a }), lam({ color: 0xd8301a }), lam({ color: 0x2a5ad8 })],
  rock: lam({ color: 0x2c2826 }), heap: lam({ map: groundTex('#4a423c', '170,150,130', [6, 6]) }), log: lam({ color: 0x3a2412 }), fire: new THREE.MeshBasicMaterial({ color: 0xffa020 }),
  float: lam({ color: 0xf2f2f2 }), floatTrim: lam({ color: 0x1a7a3a }), crate: lam({ color: 0x2a5ad8 }), milk: lam({ color: 0xfafafa }) };
function trolley(x, z, r = 0) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(.6, .5, .9), PARR.trolley); b.position.y = .75; g.add(b);
  for (const wx of [-.25, .25]) for (const wz of [-.4, .4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.04, .5, .04), PARR.trolley); l.position.set(wx, .25, wz); g.add(l); }
  const h = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .05), PARR.trolley); h.position.set(0, 1.05, -.5); g.add(h); g.position.set(x, 0, z); g.rotation.set(0, r, Math.random() < .4 ? 1.4 : 0); scene.add(g); }
function burntCar(x, z, r = 0) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, .8, 4.2), PARR.burnt); b.position.y = .55; g.add(b);
  const c = new THREE.Mesh(new THREE.BoxGeometry(1.7, .6, 2), PARR.rust); c.position.set(0, 1.25, -.2); g.add(c);
  for (let i = 0; i < 5; i++) { const e = new THREE.Mesh(new THREE.BoxGeometry(.12, .06, .12), PARR.ember); e.position.set(rand(-.7, .7), .97, rand(-1.6, 1.6)); g.add(e); }
  g.position.set(x, 0, z); g.rotation.y = r; scene.add(g); addCollider(x, z, r ? 4.3 : 2.0, r ? 2.0 : 4.3);
  neonSpots.push({ pos: new THREE.Vector3(x, 1.6, z), color: new THREE.Color(0xff6a1a), flick: true }); }
function mattress(x, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, .22, 2), PARR.mattress); m.position.set(x, .12, z); m.rotation.y = rand(-.5, .5); scene.add(m);
  const s = new THREE.Mesh(new THREE.CircleGeometry(.35, 8), PARR.stain); s.rotation.x = -Math.PI / 2; s.position.set(x + .2, .24, z + .3); scene.add(s); }
function campfire(x, z) {
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.1, 6), PARR.log); l.rotation.z = Math.PI / 2; l.rotation.y = i * .8; l.position.set(x, .1, z); scene.add(l); }
  const f = new THREE.Mesh(new THREE.ConeGeometry(.35, .9, 7), PARR.fire); f.position.set(x, .5, z); scene.add(f);
  const gl = new THREE.Sprite(glowMat('#ff8a2a')); gl.position.set(x, .9, z); gl.scale.set(4, 3, 1); scene.add(gl);
  neonSpots.push({ pos: new THREE.Vector3(x, 1.4, z), color: new THREE.Color(0xff8a2a), flick: true }); addCollider(x, z, .9, .9); }
function tent(x, z, r) { const t = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.5, 4), pick(PARR.tent)); t.position.set(x, .75, z); t.rotation.y = r; scene.add(t); addCollider(x, z, 1.8, 1.8); }
function heap(x, z, r, h) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), PARR.heap); m.scale.y = h; m.position.set(x, -.3, z); scene.add(m); }
function milkFloat(x, z) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, .5, 4.2), PARR.float); b.position.y = .55; g.add(b);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.4, 1.2), PARR.float); cab.position.set(0, 1.5, 1.4); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2, .12, 4.4), PARR.floatTrim); roof.position.y = 2.25; g.add(roof);
  for (const px of [-.9, .9]) for (const pz of [-2, 0]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.4, .08), PARR.floatTrim); p.position.set(px, 1.5, pz); g.add(p); }
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(.5, .35, .5), PARR.crate); c.position.set(-.5 + (i % 2), 1, -1.8 + Math.floor(i / 2) * .7); g.add(c);
    for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .3, 6), PARR.milk); m.position.set(c.position.x - .12 + (k % 2) * .24, 1.3, c.position.z - .12 + (k >> 1) * .24); g.add(m); } }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .6), lam({ map: shopTex('MILK', '#1a7a3a', 'dark'), emissive: 0xffffff, emissiveIntensity: .4 })); sign.material.emissiveMap = sign.material.map;
  sign.position.set(.96, 1.9, -.6); sign.rotation.y = Math.PI / 2; g.add(sign);
  for (const wx of [-.95, .95]) for (const wz of [-1.4, 1.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .2, 12), PROPMAT.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, .3, wz); g.add(w); }
  g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2; scene.add(g); return g;
}
// Higher Parr Street: a flat-roofed sixties shopping parade with cars parked out front on one side,
// white-rendered Victorian shops and a red-brick pub on the other, green guard rails at the kerbs
const CAR_PAINT = [0xc8102e, 0x1a3a9a, 0xe8e8e8, 0x2a2a2a, 0x8a8a94, 0x1a4a8a, 0xb8b8c0];
function parkedCar(x, z, ry) {
  const g = new THREE.Group(), col = lam({ color: pick(CAR_PAINT) });
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, .7, 4), col); b.position.y = .6; g.add(b);
  const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, .6, 2), PROPMAT.taxiGlass); c.position.set(0, 1.2, -.2); g.add(c);
  for (const wx of [-.9, .9]) for (const wz of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .22, 10), PROPMAT.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, .32, wz); g.add(w); }
  g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const c2 = Math.abs(Math.cos(ry)), s2 = Math.abs(Math.sin(ry)); addCollider(x, z, 1.9 * c2 + 4.1 * s2, 4.1 * c2 + 1.9 * s2);
}
function guardRail(x, z0, z1) {
  const m = lam({ color: 0x1e5a2e });
  for (const y of [.45, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, Math.abs(z1 - z0)), m); r.position.set(x, y, (z0 + z1) / 2); scene.add(r); }
  for (let z = z0; z >= z1; z -= 1.6) { const p = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.05, .06), m); p.position.set(x, .52, z); scene.add(p); }
}
function higherParrSt() {
  // the parade (right-hand side)
  const brickDark = lam({ map: brickTex('#5a3a30', '#2a201c') }), roofFlat = lam({ color: 0x2a2a30 });
  const parade = new THREE.Mesh(new THREE.BoxGeometry(10, 4.4, 50), brickDark); parade.position.set(15, 2.2, -24); scene.add(parade); addCollider(15, -24, 10, 50);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(10.6, .3, 50.4), roofFlat); lip.position.set(14.8, 4.5, -24); scene.add(lip);
  [['NEWS', '#ff3b3b', 'lit'], ['BOOKIES', '#39a0ff', 'lit'], ['CHIPMUNK CHIPPY', '#7cff4f', 'lit'], ['E-CIG CENTRE', '#ffffff', 'shutter'], ['PHARMACY', '#4fe07a', 'lit'], ['TO LET', '#bbbbbb', 'dark']].forEach(([n, neon, kind], i) => {
    const z = -2 - i * 8;
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.4), lam({ map: kind === 'shutter' ? shutterTex(n, neon) : shopTex(n, neon, kind), emissive: 0xffffff, emissiveIntensity: kind === 'lit' ? .6 : .25 })); shop.material.emissiveMap = shop.material.map;
    shop.position.set(9.98, 1.8, z); shop.rotation.y = -Math.PI / 2; scene.add(shop);
    if (kind === 'lit') { neonSpots.push({ pos: new THREE.Vector3(8.4, 3.2, z), color: new THREE.Color(neon), flick: false }); const gl = new THREE.Sprite(glowMat(neon)); gl.position.set(9.6, 3.2, z); gl.scale.set(7, 2.6, 1); scene.add(gl); }
    if (n === 'PHARMACY') { const cr = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (g) => { g.fillStyle = '#18c050'; g.fillRect(22, 4, 20, 56); g.fillRect(4, 22, 56, 20); }), transparent: true }));
      cr.position.set(9.4, 3.6, z - 3.2); cr.rotation.y = -Math.PI / 2; scene.add(cr); }
  });
  // cars parked nose-in along the parade
  for (let z = -1; z > -46; z -= 3.1) if (Math.random() < .7) parkedCar(7.6, z, Math.PI / 2 + rand(-.08, .08));
  // white-rendered Victorian shops and the pub (left-hand side)
  const RENDERS = ['#ece6d8', '#e2dccc', '#f2ede2'];
  [['CAFE', '#ff5a3b', 'lit', 7], ['CHEMIST', '#39a0ff', 'lit', 6], ['TAKEAWAY', '#ffb13b', 'lit', 7], ['BARBER', '#ff4fd8', 'shutter', 6], ['TATTOO', '#b06bff', 'dark', 6]].reduce((z, [n, neon, kind, len]) => {
    const zc = z - len / 2, base = pick(RENDERS), hgt = 7;
    const face = lam({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (const x of [40, 156]) { g.fillStyle = '#f8f8f8'; g.fillRect(x - 6, 24, 72, 74); g.fillStyle = Math.random() < .3 ? '#ffd479' : '#18151f'; g.fillRect(x, 30, 60, 62); g.fillStyle = '#f8f8f8'; g.fillRect(x + 28, 30, 4, 62); }
      g.drawImage((kind === 'shutter' ? shutterTex(n, neon) : shopTex(n, neon, kind)).image, 0, 128, w, 128); }), emissive: 0xffffff, emissiveIntensity: .4 });
    face.emissiveMap = face.map;
    const b = new THREE.Mesh(new THREE.BoxGeometry(10, hgt, len), lam({ color: base })); b.position.set(-15, hgt / 2, zc); scene.add(b);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(len - .2, hgt), face); f.position.set(-9.98, hgt / 2, zc); f.rotation.y = Math.PI / 2; scene.add(f);
    const roof = new THREE.Mesh(gableGeo(10.2, 2.2, len + .1), lam({ color: 0x34343e })); roof.position.set(-15, hgt, zc); scene.add(roof);
    if (kind === 'lit') { neonSpots.push({ pos: new THREE.Vector3(-8.4, 3, zc), color: new THREE.Color(neon), flick: false }); const gl = new THREE.Sprite(glowMat(neon)); gl.position.set(-9.6, 3, zc); gl.scale.set(6, 2.4, 1); scene.add(gl); }
    if (n === 'CAFE') {   // the giant fry-up sign
      const fry = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), lam({ map: canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(128, 70, 100, 48, 0, 0, 7); g.fill();
        g.fillStyle = '#ffd400'; g.beginPath(); g.arc(90, 64, 16, 0, 7); g.fill(); g.fillStyle = '#8a3a1a'; g.fillRect(120, 46, 60, 16); g.fillRect(124, 70, 54, 14); g.fillStyle = '#c8461a'; g.beginPath(); g.arc(110, 96, 12, 0, 7); g.fill(); g.arc(140, 98, 12, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = 'bold 22px Arial'; g.fillText('FULL BREKKIE', 8, 24); }), emissive: 0xffffff, emissiveIntensity: .35 })); fry.material.emissiveMap = fry.material.map;
      fry.position.set(-9.9, 5.4, zc); fry.rotation.y = Math.PI / 2; scene.add(fry); }
    addCollider(-15, zc, 10, len); return z - len;
  }, 2);
  // the pub
  const pubB = lam({ map: brickTex('#8a3a28', '#3a2a28') });
  const pub = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 18), pubB); pub.position.set(-15, 4, -41); scene.add(pub); addCollider(-15, -41, 10, 18);
  const proof = new THREE.Mesh(gableGeo(10.4, 3, 18.2), lam({ color: 0x34343e })); proof.position.set(-15, 8, -41); scene.add(proof);
  const psign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), lam({ map: shopTex('THE KINGS ARMS', '#ffd479', 'dark'), emissive: 0xffffff, emissiveIntensity: .5 })); psign.material.emissiveMap = psign.material.map; psign.position.set(-9.97, 6.4, -41); psign.rotation.y = Math.PI / 2; scene.add(psign);
  const pwin = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), lam({ map: shopTex('', '#ffd479', 'lit'), emissive: 0xffffff, emissiveIntensity: .5 })); pwin.material.emissiveMap = pwin.material.map; pwin.position.set(-9.97, 1.9, -41); pwin.rotation.y = Math.PI / 2; scene.add(pwin);
  neonSpots.push({ pos: new THREE.Vector3(-8.2, 3, -41), color: new THREE.Color(0xffc070), flick: false });
  // green guard rails at the kerbs
  guardRail(-6.2, -2, -12); guardRail(-6.2, -30, -36); guardRail(6.2, -46, -52); guardRail(-6.2, -51, -54);
}
function buildParr() {
  scene.background.set(0x0c0f24); scene.fog.color.set(0x1a2040); scene.fog.density = .018;
  hemi.color.set(0x8a9ad8); hemi.groundColor.set(0x3a3028); hemi.intensity = 1.9; ambient.intensity = 1.2; moon.intensity = .7;
  // estate road, pavements, front gardens
  const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 112), lam({ map: groundTex('#2c2a30', '120,120,130', [2, 18]) })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -50); scene.add(road);
  const grass = lam({ map: groundTex('#1f3a1c', '90,140,70', [2, 20]) });
  const flags = lam({ map: groundTex('#5a5660', '140,140,150', [2, 14]) });
  for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.BoxGeometry(4, .12, 54), grass); g.position.set(s * 8, .06, -79); scene.add(g);
    const pv = new THREE.Mesh(new THREE.BoxGeometry(4, .12, 58), flags); pv.position.set(s * 8, .06, -23); scene.add(pv);
    const k = new THREE.Mesh(new THREE.BoxGeometry(.25, .16, 112), lam({ color: 0x8a8590 })); k.position.set(s * 6.05, .08, -50); scene.add(k); }
  // the Burgies: shale everywhere
  const shale = new THREE.Mesh(new THREE.PlaneGeometry(60, 140), lam({ map: groundTex('#3a3430', '160,140,120', [8, 18]) })); shale.rotation.x = -Math.PI / 2; shale.position.set(0, -.01, -170); scene.add(shale);
  // council semis
  const BASES = ['#bdb6a8', '#c9c2b0', '#a8a49a', '#d2c8b4', '#b0a898'];
  for (const sx of [-1, 1]) for (let z = -54; z > -96; z -= 12) {
    const len = 9.5, zc = z - len / 2, hgt = 6.4;
    const front = lam({ map: houseTex(pick(BASES), .4) }), plain = lam({ color: 0x9a948a }), roof = lam({ color: 0x3a2a2a });
    const mats = [plain, plain, roof, plain, plain, plain]; mats[sx > 0 ? 1 : 0] = front;
    const b = new THREE.Mesh(new THREE.BoxGeometry(10, hgt, len), mats); b.position.set(sx * 15, hgt / 2, zc); scene.add(b);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.01, 5.4, 2.4, 4, 1), roof); r.rotation.y = Math.PI / 4; r.scale.z = len / 7.6; r.position.set(sx * 15, hgt + 1.2, zc); scene.add(r);
    addCollider(sx * 15, zc, 10, len);
    // garden fence
    const f = new THREE.Mesh(new THREE.BoxGeometry(.08, .8, len), PARR.fence); f.position.set(sx * 9.95, .4, zc); scene.add(f);
  }
  // corner shops on the estate
  [[-1, -78, 'CHIPPY', '#39e0ff', 'shutter']].forEach(([sx, z, name, neon, kind]) => {
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 3.6), lam({ map: shopTex(name, neon, kind), emissive: 0xffffff, emissiveIntensity: .6 })); shop.material.emissiveMap = shop.material.map;
    shop.position.set(sx * 9.9, 1.95, z); shop.rotation.y = -sx * Math.PI / 2; scene.add(shop);
    neonSpots.push({ pos: new THREE.Vector3(sx * 8.4, 3.4, z), color: new THREE.Color(neon), flick: false });
    const glow = new THREE.Sprite(glowMat(neon)); glow.position.set(sx * 9.5, 3.4, z); glow.scale.set(8, 3, 1); scene.add(glow);
  });
  streetLamps(-4, -100);
  higherParrSt();
  // the way onto the Burgies: broken fence and a sign
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, .1), PARR.fence); f.position.set(sx * 7, .6, -99); f.rotation.y = sx * .15; scene.add(f); }
  const keep = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), lam({ map: shopTex('THE BURGIES', '#ff3b3b', 'dark'), side: THREE.DoubleSide })); keep.position.set(-6.5, 2, -99.2); scene.add(keep);
  // spoil heaps: walls of the level, plus cover on the path
  for (const sx of [-1, 1]) for (let z = -100; z > -240; z -= 10) heap(sx * rand(17, 20), z + rand(-3, 3), rand(9, 12), rand(.5, .75));
  for (const sx of [-1, 1]) for (let z = -104; z > -232; z -= 10) addCollider(sx * 14, z, 9, 10);
  heap(0, -250, 18, .7); heap(-8, -238, 10, .9); heap(9, -237, 10, .8);
  [[-4.5, -118, 2.4], [5, -134, 2], [-3, -160, 2.6], [4.5, -176, 2.2], [-6, -196, 2]].forEach(([x, z, r]) => { heap(x, z, r, .55); addCollider(x, z, r * 1.3, r * 1.3); });
  for (let i = 0; i < 30; i++) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.15, .45)), PARR.rock); rk.position.set(rand(-9, 9), .1, rand(-228, -104)); rk.rotation.set(rand(0, 3), rand(0, 3), 0); scene.add(rk); }
  campfire(-6, -112); campfire(6.5, -150); campfire(-6.5, -182); campfire(3, -212);
  tent(-7.5, -116, .3); tent(7.6, -146, 1); tent(-8, -186, .6);
  // the nest
  const hole = new THREE.Mesh(new THREE.CircleGeometry(2.4, 18), new THREE.MeshBasicMaterial({ color: 0x050302 })); hole.position.set(0, 1.8, -232.1); hole.rotation.x = -.35; scene.add(hole);
  const nestGlow = new THREE.Sprite(glowMat('#ff3b3b')); nestGlow.position.set(0, 1.8, -231); nestGlow.scale.set(7, 4, 1); scene.add(nestGlow);
  // estate props
  [[7.6, -12], [-7.6, -24], [7.6, -46], [-7.6, -66], [7.6, -88]].forEach(([x, z]) => bin(x, z));
  burntCar(-3.5, -40, .4); burntCar(3.8, -84, -.2);
  trolley(4, -20, .6); trolley(-5, -58, 2); trolley(5.5, -122, 1); trolley(-2, -205, 3);
  mattress(-7.8, -36); mattress(7.8, -72); mattress(-5, -168);
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(rand(.15, .3), .05, rand(.15, .3)), pick([PROPMAT.metal, PARR.mattress])); m.position.set(rand(-9, 9), .08, rand(-226, 2)); m.rotation.y = rand(0, 6); scene.add(m); }
  endWall(START_Z + 3, null);
}

// ---------------------------------------------------------------- level 3: Taylor Park
const PARK = { trunk: lam({ color: 0x3a2a1c }), leaf: [lam({ color: 0x1e3a1a }), lam({ color: 0x24461e }), lam({ color: 0x2c4a22 })], rail: lam({ color: 0x15171a }),
  water: new THREE.MeshPhongMaterial({ color: 0x0e2238, specular: 0x8aa8ff, shininess: 80 }), stone: lam({ color: 0x8a8478 }), roofR: lam({ color: 0x8a1a1a }), roofG: lam({ color: 0x1e4a2a }),
  white: lam({ color: 0xe8e4d8 }), bus: lam({ color: 0xd8a01a }), hedge: lam({ color: 0x1a301a }) };
function tree(x, z, s = 1, collide = true) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(.18 * s, .28 * s, 3 * s, 7), PARK.trunk); t.position.set(x, 1.5 * s, z); scene.add(t);
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.3, 1.9) * s, 0), pick(PARK.leaf)); l.position.set(x + rand(-.8, .8) * s, (3.2 + i * .8) * s, z + rand(-.8, .8) * s); l.rotation.set(rand(0, 3), rand(0, 3), 0); scene.add(l); }
  if (collide) addCollider(x, z, .6 * s, .6 * s);
}
function railings(x, z0, z1) {
  for (let z = z0; z > z1; z -= .45) { const b = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.4, .05), PARK.rail); b.position.set(x, .7, z); scene.add(b); }
  for (const y of [.2, 1.25]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, z0 - z1), PARK.rail); r.position.set(x, y, (z0 + z1) / 2); scene.add(r); }
}
function vicLamp(x, z) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .14, 4, 8), PARK.rail); post.position.set(x, 2, z); scene.add(post);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(.25, .15, .5, 6), lampHead); head.position.set(x, 4.2, z); scene.add(head);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.32, .3, 6), PARK.rail); cap.position.set(x, 4.6, z); scene.add(cap);
  const pool = new THREE.Sprite(glowMat('#ffd080')); pool.position.set(x, 4.2, z); pool.scale.set(2, 1.6, 1); scene.add(pool);
  lampSpots.push({ pos: new THREE.Vector3(x, 4, z) }); addCollider(x, z, .35, .35);
}
function bandstand(x, z) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.3, .6, 8), PARK.stone); base.position.set(x, .3, z); scene.add(base);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const p = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 2.8, 6), PARK.white); p.position.set(x + Math.cos(a) * 2.8, 2, z + Math.sin(a) * 2.8); scene.add(p); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.6, 8), PARK.roofG); roof.position.set(x, 4.2, z); scene.add(roof);
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, .25, 8), PARK.roofR); trim.position.set(x, 3.4, z); scene.add(trim);
  neonSpots.push({ pos: new THREE.Vector3(x, 3, z), color: new THREE.Color(0xffe0a0), flick: false });
  addCollider(x, z, 5.6, 5.6);
}
function nightBus(x, z) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 11), PARK.bus); b.position.y = 1.8; g.add(b);
  const win = new THREE.Mesh(new THREE.BoxGeometry(2.64, .9, 10), PROPMAT.taxiGlass); win.position.y = 2.4; g.add(win);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1), lam({ map: shopTex('N1 BILLINGE', '#ffb13b', 'dark'), emissive: 0xffffff, emissiveIntensity: .4 })); sign.material.emissiveMap = sign.material.map;
  sign.position.set(1.32, 3.1, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
  for (const wz of [-3.8, 3.8]) for (const wx of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .3, 12), PROPMAT.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, .5, wz); g.add(w); }
  g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2; scene.add(g); return g;
}
function buildPark() {
  scene.background.set(0x081018); scene.fog.color.set(0x122028); scene.fog.density = .024;
  hemi.color.set(0x7ab0a8); hemi.groundColor.set(0x1a2a18); ambient.color.set(0x34503e);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(60, 250), lam({ map: groundTex('#1c3a1a', '110,160,80', [10, 40]) })); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0, -112); scene.add(grass);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(5, 236), lam({ map: groundTex('#4a4440', '150,140,130', [1, 40]) })); path.rotation.x = -Math.PI / 2; path.position.set(-1, .01, -112); scene.add(path);
  // perimeter: railings and a wall of trees
  railings(-10, 4, -228); railings(10, 4, -110); railings(10, -146, -228);
  for (const sx of [-1, 1]) for (let z = 2; z > -232; z -= 5) tree(sx * rand(12, 16), z + rand(-2, 2), rand(1.1, 1.5), false);
  for (const sx of [-1, 1]) for (let z = -6; z > -232; z -= 7) tree(sx * rand(18, 24), z, rand(1.3, 1.8), false);
  // trees inside the park for cover
  [[-6.5, -26], [5.5, -38], [-7, -70], [6.5, -84], [-5.5, -96], [6.8, -158], [-7.5, -178], [5.8, -200], [-6.8, -210]].forEach(([x, z]) => tree(x, z, rand(.9, 1.2)));
  // the boating lake (right-hand side; the geese live here)
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(16, 34), PARK.water); lake.rotation.x = -Math.PI / 2; lake.position.set(10.5, .03, -128); scene.add(lake);
  const lakeEdge = new THREE.Mesh(new THREE.BoxGeometry(.4, .35, 34), PARK.stone); lakeEdge.position.set(2.6, .17, -128); scene.add(lakeEdge);
  for (const z of [-111, -145]) { const e = new THREE.Mesh(new THREE.BoxGeometry(8, .35, .4), PARK.stone); e.position.set(6.6, .17, z); scene.add(e); }
  addCollider(6.2, -128, 6.6, 34);
  // the fountain in the middle of the lake, as in the real Taylor Park
  const jet = new THREE.MeshBasicMaterial({ color: 0xdfefff, transparent: true, opacity: .55, depthWrite: false });
  [[.5, 3.6, .1], [1.1, 1.8, .4], [1.6, .7, .8]].forEach(([r, h, b]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 12, 1, true), jet); c.position.set(12, h / 2 + b * .2, -128); scene.add(c); });
  const fglow = new THREE.Sprite(glowMat('#cfe6ff')); fglow.position.set(12, 2, -128); fglow.scale.set(5, 5, 1); scene.add(fglow);
  const lakeSign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), lam({ map: shopTex('BOATING LAKE', '#39e0ff', 'dark'), emissive: 0xffffff, emissiveIntensity: .3, side: THREE.DoubleSide })); lakeSign.material.emissiveMap = lakeSign.material.map;
  lakeSign.position.set(2.2, 1.6, -108); scene.add(lakeSign);
  neonSpots.push({ pos: new THREE.Vector3(4, 2, -120), color: new THREE.Color(0x5a8aff), flick: false }, { pos: new THREE.Vector3(4, 2, -138), color: new THREE.Color(0x5a8aff), flick: false });
  bandstand(-4.5, -166);
  // gates
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, 1.2), PARK.stone); p.position.set(sx * 4.2, 2, 3); scene.add(p); }
  const gate = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.2), lam({ map: shopTex('TAYLOR PARK', '#ffd479', 'dark'), emissive: 0xffffff, emissiveIntensity: .35, side: THREE.DoubleSide })); gate.material.emissiveMap = gate.material.map; gate.position.set(0, 4.4, 3); scene.add(gate);
  for (let z = -8; z > -224; z -= 16) { vicLamp(-4.2, z); vicLamp(2.4, z - 8); }
  [[-8.4, -20], [8.4, -60], [-8.4, -104], [-8.4, -150], [8.4, -190]].forEach(([x, z]) => bench(x, z));
  [[3.6, -30], [-3.8, -64], [3.6, -100], [-3.6, -140], [3.6, -184]].forEach(([x, z]) => bin(x, z));
  for (let i = 0; i < 40; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(rand(.1, .25), .04, rand(.1, .25)), pick([lam({ color: 0x8a6a2a }), lam({ color: 0xb8b8c0 }), PARK.white])); l.position.set(rand(-9, 9), .05, rand(-224, 2)); l.rotation.y = rand(0, 6); scene.add(l); }
  // far side: hedge and the bus stop
  const hedge = new THREE.Mesh(new THREE.BoxGeometry(30, 2.2, 2), PARK.hedge); hedge.position.set(0, 1.1, END_Z - 6); scene.add(hedge);
  endWall(END_Z - 12, 'BUS STOP'); endWall(START_Z + 6, null);
  const stopGlow = new THREE.Sprite(glowMat('#7cff4f')); stopGlow.position.set(0, 4.5, END_Z - 10); stopGlow.scale.set(10, 3, 1); scene.add(stopGlow);
}


// ---------------------------------------------------------------- level 4: the East Lancs (A580)
const LANCS = { conc: lam({ color: 0x6a6870 }), steel: lam({ color: 0x9a9aa4 }), verge: lam({ map: groundTex('#1c3018', '100,140,80', [4, 40]) }), sign: lam({ color: 0x1a4a2a }),
  van: lam({ color: 0xf0f0f0 }), vanTrim: lam({ color: 0xc8102e }), hatch: lam({ color: 0xffd479, emissive: 0xffb050, emissiveIntensity: .8 }) };
function signTex(lines) {
  return canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#0e5a2c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#ffd400'; g.fillRect(28, 28, 120, 56); g.fillStyle = '#111'; g.font = 'bold 40px Arial'; g.fillText('A580', 36, 72);
    g.fillStyle = '#fff'; g.font = 'bold 44px Arial'; lines.forEach((t, i) => g.fillText(t, 40, 140 + i * 56)); });
}
function buildLancs() {
  scene.background.set(0x0a0a1a); scene.fog.color.set(0x16182c); scene.fog.density = .016;
  hemi.color.set(0x8a8ab8); hemi.intensity = 1.6; ambient.intensity = 1.1;
  const roadTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#2c2a30'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(140,140,150,${rand(.05, .2)})`; g.fillRect(rand(0, w), rand(0, h), 2, 2); }
    g.fillStyle = '#e8e8e8'; for (const x of [.27, .73]) for (let y = 0; y < h; y += 128) g.fillRect(x * w - 4, y, 8, 70);
    g.fillStyle = '#e8c400'; g.fillRect(.035 * w, 0, 6, h); g.fillRect(.965 * w - 6, 0, 6, h);
    g.fillStyle = '#e8e8e8'; g.fillRect(.455 * w, 0, 6, h); g.fillRect(.545 * w - 6, 0, 6, h); }, [1, 30]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(19, 240), lam({ map: roadTex })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -112); scene.add(road);
  // central reservation: grass strip and crash barriers (low enough to hop over)
  const res = new THREE.Mesh(new THREE.BoxGeometry(1.6, .14, 240), lam({ color: 0x8a8680 })); res.position.set(0, .05, -112); scene.add(res);
  for (const x of [-.12, .12]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.08, .3, 240), LANCS.steel); b.position.set(x, .55, -112); scene.add(b);
    for (let z = 4; z > -228; z -= 4) { const p = new THREE.Mesh(new THREE.BoxGeometry(.08, .5, .08), LANCS.steel); p.position.set(x, .25, z); scene.add(p); } }
  // verges, outer barriers, embankments, trees
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(.1, .35, 240), LANCS.steel); b.position.set(sx * 9.75, .5, -112); scene.add(b);
    const v = new THREE.Mesh(new THREE.BoxGeometry(14, .1, 240), LANCS.verge); v.position.set(sx * 17, 1.4, -112); v.rotation.z = -sx * .2; scene.add(v);
    for (let z = 0; z > -232; z -= 6) if (!(sx < 0 && z < -12 && z > -48)) tree(sx * rand(16, 24), z + rand(-2, 2), rand(1.1, 1.6), false);
  }
  // tall lamp columns on the verges, as at Carr Mill
  for (let z = -6, k = 0; z > -226; z -= 24, k++) for (const sx of [-1, 1]) {
    if ((k + (sx > 0 ? 1 : 0)) % 2) continue;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.1, .16, 10, 8), LANCS.steel); post.position.set(sx * 10.4, 5, z); scene.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2, .1, .1), LANCS.steel); arm.position.set(sx * 9.4, 9.9, z); scene.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.8, .18, .35), lampHead); head.position.set(sx * 8.5, 9.8, z); scene.add(head);
    const pool = new THREE.Sprite(glowMat('#ffb060')); pool.position.set(sx * 8.5, 9.7, z); pool.scale.set(2.6, 1.4, 1); scene.add(pool);
    lampSpots.push({ pos: new THREE.Vector3(sx * 7.5, 9, z) });
  }
  // the big mock-Tudor pub at Carr Mill, set back behind the verge
  const tudor = lam({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ece6d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1614';
    for (let x = 0; x <= w; x += 32) g.fillRect(x, 0, 7, h); g.fillRect(0, 0, w, 8); g.fillRect(0, 124, w, 10); g.fillRect(0, h - 8, w, 8);
    for (let x = 0; x < w; x += 64) { g.save(); g.translate(x + 32, 64); g.rotate(.6); g.fillRect(-3, -50, 6, 100); g.restore(); }
    for (const x of [24, 152]) { g.fillStyle = Math.random() < .7 ? '#ffd479' : '#18151f'; g.fillRect(x, 150, 72, 60); g.fillStyle = '#1a1614'; g.fillRect(x + 34, 150, 4, 60); g.fillRect(x, 178, 72, 4); } }) });
  tudor.emissiveMap = tudor.map; tudor.emissive.set(0x554433); tudor.emissiveIntensity = .5;
  const pub = new THREE.Mesh(new THREE.BoxGeometry(10, 7, 26), [tudor, lam({ color: 0xece6d6 }), lam({ color: 0x2a2a30 }), lam({ color: 0xece6d6 }), tudor, tudor]);
  pub.position.set(-22, 5.2, -30); scene.add(pub);
  const proof = new THREE.Mesh(gableGeo(11, 5, 27), lam({ color: 0x3a3a44 })); proof.position.set(-22, 8.7, -30); scene.add(proof);
  for (const z of [-20, -27, -34, -41]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.5, 1.1), lam({ map: brickTex('#8a3a28', '#3a2a28') })); ch.position.set(-20.5, 12.2, z); scene.add(ch); }
  const psign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.2), lam({ map: shopTex('THE MILL HOUSE', '#ffd479', 'dark'), emissive: 0xffffff, emissiveIntensity: .5 })); psign.material.emissiveMap = psign.material.map;
  psign.position.set(-16.9, 6.6, -30); psign.rotation.y = Math.PI / 2; scene.add(psign);
  neonSpots.push({ pos: new THREE.Vector3(-14, 3, -30), color: new THREE.Color(0xffc070), flick: false });
  // roadside clutter: green cabinets, 30 limit signs, a direction sign
  for (const [z, w] of [[-58, 1], [-59.4, 1.4], [-61, .9]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.4, w), lam({ color: 0x1e4a2e })); c.position.set(11, .7, z); scene.add(c); }
  const thirty = new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = '#d01a1a'; g.stroke(); g.fillStyle = '#111'; g.font = 'bold 56px Arial'; g.textAlign = 'center'; g.fillText('30', 64, 84); }), transparent: true });
  for (const [x, z] of [[-10.3, -8], [10.3, -112]]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.6, 6), LANCS.steel); pole.position.set(x, 1.3, z); scene.add(pole);
    const sg = new THREE.Mesh(new THREE.CircleGeometry(.45, 20), thirty); sg.position.set(x, 2.6, z + .03); scene.add(sg); }
  const dsign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3), lam({ map: signTex(['M6', 'Manchester']), emissive: 0xffffff, emissiveIntensity: .25 })); dsign.material.emissiveMap = dsign.material.map; dsign.position.set(11.2, 3.2, -150); dsign.rotation.y = -.25; scene.add(dsign);
  for (const dx of [-1.2, 1.2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.1, 3, .1), LANCS.steel); leg.position.set(11.2 + dx, 1.5, -150); scene.add(leg); }
  // gantry sign
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.4, 7, .4), LANCS.steel); leg.position.set(sx * 10.2, 3.5, -38); scene.add(leg); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(21, .5, .5), LANCS.steel); beam.position.set(0, 7, -38); scene.add(beam);
  for (const [x, lines] of [[-5, ['ST HELENS', 'Liverpool (M57)']], [5, ['Billinge', 'Manchester (M60)']]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), lam({ map: signTex(lines), emissive: 0xffffff, emissiveIntensity: .25, side: THREE.DoubleSide })); s.material.emissiveMap = s.material.map; s.position.set(x, 5.6, -37.7); scene.add(s); }
  // footbridge
  for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6.4, 3), LANCS.conc); t.position.set(sx * 11.6, 3.2, -104); scene.add(t); }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(22, .5, 2.4), LANCS.conc); deck.position.set(0, 6.4, -104); scene.add(deck);
  for (const z of [-102.9, -105.1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(22, 1, .08), LANCS.steel); r.position.set(0, 7.1, z); scene.add(r); }
  // road bridge with pillars (cover!)
  const rb = new THREE.Mesh(new THREE.BoxGeometry(40, 1.4, 9), LANCS.conc); rb.position.set(0, 7.6, -182); scene.add(rb);
  for (const x of [-10.4, 0, 10.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(x ? 1.2 : 1, 7, 6), LANCS.conc); p.position.set(x, 3.5, -182); scene.add(p); if (!x) addCollider(0, -182, 1.2, 6.2); }
  neonSpots.push({ pos: new THREE.Vector3(0, 5, -182), color: new THREE.Color(0xffc070), flick: false });
  // Big Mick's butty van in the lay-by
  const vg = new THREE.Group();
  const vb = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 5), LANCS.van); vb.position.y = 1.5; vg.add(vb);
  const vt = new THREE.Mesh(new THREE.BoxGeometry(2.24, .3, 5.04), LANCS.vanTrim); vt.position.y = 1.0; vg.add(vt);
  const hatch = new THREE.Mesh(new THREE.PlaneGeometry(3, 1), LANCS.hatch); hatch.position.set(-1.12, 1.9, 0); hatch.rotation.y = -Math.PI / 2; vg.add(hatch);
  const vs = new THREE.Mesh(new THREE.PlaneGeometry(4.6, .8), lam({ map: shopTex("BIG MICK'S BUTTIES", '#ffb13b', 'dark'), emissive: 0xffffff, emissiveIntensity: .6 })); vs.material.emissiveMap = vs.material.map; vs.position.set(-1.13, 2.95, 0); vs.rotation.y = -Math.PI / 2; vg.add(vs);
  for (const wz of [-1.6, 1.6]) for (const wx of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .25, 12), PROPMAT.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, .38, wz); vg.add(w); }
  vg.position.set(9.4, 0, -68); scene.add(vg); addCollider(9.4, -68, 2.4, 5.2);
  neonSpots.push({ pos: new THREE.Vector3(7.5, 2.6, -68), color: new THREE.Color(0xffb13b), flick: false });
  // broken-down N1 bus behind you, cones, debris
  for (let i = 0; i < 18; i++) cone(rand(-8.5, 8.5), rand(-215, -10));
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(rand(.1, .3), .05, rand(.1, .3)), pick([PROPMAT.metal, PROPMAT.tyre])); m.position.set(rand(-9, 9), .05, rand(-224, 2)); m.rotation.y = rand(0, 6); scene.add(m); }
  endWall(END_Z - 1, 'BILLINGE'); endWall(START_Z + 3, null);
}
// traffic: cars that hurt anyone stood in a live lane
const cars = [];
const CAR_COLS = [0xc8102e, 0x1a3a9a, 0xe8e8e8, 0x2a2a2a, 0xe8c400, 0x2a7a3a, 0x8a8a94, 0xff7a1a];
function makeTraffic() {
  const lanes = [[-6.6, 1], [-2.7, 1], [2.7, -1], [6.6, -1]];      // +1 drives toward the start (at you), -1 comes up behind you
  for (let i = 0; i < 8; i++) {
    const [x, dir] = lanes[i % 4], g = new THREE.Group(), col = lam({ color: pick(CAR_COLS) });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, .7, 4), col); b.position.y = .6; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, .6, 2), PROPMAT.taxiGlass); c.position.set(0, 1.2, -.2); g.add(c);
    for (const wx of [-.9, .9]) for (const wz of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .22, 10), PROPMAT.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, .32, wz); g.add(w); }
    for (const wx of [-.6, .6]) { const hl = new THREE.Sprite(glowMat('#fff6d0')); hl.position.set(wx, .65, 2.05); hl.scale.set(1.4, .9, 1); g.add(hl);
      const tl = new THREE.Sprite(glowMat('#ff2a2a')); tl.position.set(wx, .65, -2.05); tl.scale.set(.8, .5, 1); g.add(tl); }
    g.rotation.y = dir > 0 ? 0 : Math.PI; scene.add(g);
    cars.push({ g, x, dir, speed: rand(15, 22), z: 0, wait: i * 2.7 + rand(0, 2), honked: false });
    g.visible = false;
  }
}
function lorry(x, z) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 7), lam({ color: 0xe8e8e8 })); box.position.set(0, 2.1, -1.2); g.add(box);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2), lam({ color: 0x1a3a9a })); cab.position.set(0, 1.8, 3.4); g.add(cab);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1), PROPMAT.taxiGlass); ws.position.set(0, 2.3, 4.41); g.add(ws);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.2), lam({ map: shopTex('SHCN DELIVERIES', '#c8102e', 'dark'), emissive: 0xffffff, emissiveIntensity: .3 })); sign.material.emissiveMap = sign.material.map; sign.position.set(1.26, 2.4, -1.2); sign.rotation.y = Math.PI / 2; g.add(sign);
  for (const wz of [-3.6, -2.4, 3.4]) for (const wx of [-1.2, 1.2]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .3, 12), PROPMAT.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, .5, wz); g.add(w); }
  g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2; scene.add(g); return g;
}
function updateTraffic(dt) {
  if (!cars.length) return;
  const rush = state.enc >= 3 ? 1.3 : 1; if (player.carT > 0) player.carT -= dt;
  for (const c of cars) {
    if (c.wait > 0) { c.wait -= dt; if (c.wait <= 0) { c.z = c.dir > 0 ? END_Z - 6 : START_Z + 6; c.g.visible = true; c.honked = false; c.speed = rand(15, 22) * rush; } continue; }
    c.z += c.dir * c.speed * dt; c.g.position.set(c.x, 0, c.z);
    if ((c.dir > 0 && c.z > START_Z + 8) || (c.dir < 0 && c.z < END_Z - 8)) { c.g.visible = false; c.wait = rand(1.5, 5) / rush; continue; }
    const px = player.pos.x, pz = player.pos.z;
    if (!c.honked && Math.abs(px - c.x) < 1.6 && (pz - c.z) * c.dir > 0 && (pz - c.z) * c.dir < 22) { c.honked = true; SFX.horn(); }
    if (player.alive && !(player.carT > 0) && Math.abs(px - c.x) < 1.25 && Math.abs(pz - c.z) < 2.4 && player.pos.y < .9) {
      hurtPlayer(26, pick(['Hit by a Vauxhall Nova!', 'Run over on the East Lancs!', 'Flattened by a Transit!', 'Bonnet to the shins!']));
      player.carT = 1.2; player.vel.x += (px >= c.x ? 1 : -1) * 9; player.vel.y = 4; player.onGround = false; shake = .6;
    }
    for (const e of enemies) if (!e.dead && e.delay <= 0 && Math.abs(e.g.position.x - c.x) < 1.3 && Math.abs(e.g.position.z - c.z) < 2.4) { damageEnemy(e, 9999, new THREE.Vector3(0, 0, c.dir)); toast(`${NAMES[e.type]} got run over!`); }
  }
}

// ---------------------------------------------------------------- level 5: Crank Caverns
const CAVE = { rock: lam({ map: groundTex('#8a4a2a', '60,30,20', [2, 2]) }), rock2: lam({ map: groundTex('#6a3a22', '40,20,10', [2, 2]) }), floor: lam({ map: groundTex('#6e604e', '150,130,100', [8, 40]) }),
  wood: lam({ color: 0x5a3a20 }), rail: lam({ color: 0x6a6a74 }), cart: lam({ color: 0x3a3a40 }), pie: lam({ color: 0xd9a441 }), crate: lam({ color: 0x8a6a3a }),
  oven: lam({ color: 0x2a2a2e }), ovenGlow: new THREE.MeshBasicMaterial({ color: 0xff7a1a }), shroom: new THREE.MeshBasicMaterial({ color: 0x3affe0 }), lantern: new THREE.MeshBasicMaterial({ color: 0xffc46b }) };
function rock(x, y, z, r, mat = CAVE.rock) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat); m.position.set(x, y, z); m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); m.scale.set(1, rand(.7, 1.3), 1); scene.add(m); return m; }
function pieCrate(x, z, n = 2) {
  for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, .8, 1.1), CAVE.crate); c.position.set(x, .4 + i * .8, z); c.rotation.y = rand(-.2, .2); scene.add(c); }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(1, .5), lam({ map: shopTex('WIGAN PIE CO', '#ffffff', 'dark') })); lab.position.set(x, .45, z + .56); scene.add(lab);
  addCollider(x, z, 1.2, 1.2);
}
function lantern(x, z) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(.15, 3, .15), CAVE.wood); post.position.set(x, 1.5, z); scene.add(post);
  const l = new THREE.Mesh(new THREE.BoxGeometry(.3, .4, .3), CAVE.lantern); l.position.set(x, 3.1, z); scene.add(l);
  const gl = new THREE.Sprite(glowMat('#ffb050')); gl.position.set(x, 3.1, z); gl.scale.set(2.6, 2, 1); scene.add(gl);
  lampSpots.push({ pos: new THREE.Vector3(x, 3, z) }); addCollider(x, z, .3, .3);
}
function buildCaves() {
  scene.background.set(0x030201); scene.fog.color.set(0x140a06); scene.fog.density = .03;
  hemi.color.set(0xb07a50); hemi.groundColor.set(0x2a1408); hemi.intensity = 1.4; ambient.color.set(0x4a2a1a); ambient.intensity = 1.0; moon.intensity = 0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 250), CAVE.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -112); scene.add(floor);
  // Crank Caverns as they really are: an old sandstone quarry in Crank woods. A layered grey-orange rock face,
  // then low flat-roofed galleries held up by square-cut pillars, graffiti everywhere, sand and rubble underfoot.
  const CEIL = 4.6, FACE_Z = -22;
  const strata = (tagged) => { const t = canvasTex(256, 256, (g, w, h) => {
      for (let y = 0; y < h; y += 4) { const band = Math.sin(y * .09) * 10 + Math.sin(y * .31) * 6; g.fillStyle = `rgb(${136 + band},${128 + band},${114 + band * .6})`; g.fillRect(0, y, w, 4); }
      for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(150,90,50,${rand(.1, .3)})`; g.fillRect(0, rand(0, h), w, rand(4, 16)); }
      g.strokeStyle = 'rgba(40,30,25,.6)'; g.lineWidth = 2; for (let i = 0; i < 7; i++) { g.beginPath(); let x = rand(0, w), y = 0; g.moveTo(x, y); while (y < h) { x += rand(-10, 10); y += rand(10, 30); g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${rand(.03, .12)})`; g.fillRect(rand(0, w), rand(0, h), 2, 2); }
      if (tagged) { g.textAlign = 'center'; for (let k = 0; k < 3; k++) { g.save(); g.translate(rand(40, 216), rand(60, 220)); g.rotate(rand(-.25, .25));
        g.font = `bold ${Math.floor(rand(26, 44))}px Arial Black, Arial`; g.lineWidth = 6; g.strokeStyle = 'rgba(10,10,10,.8)';
        const tag = pick(['SAINTS', 'WA11', 'CRANK CREW', 'DAZ', 'KEV 4 SHAZ', 'TOWN END', 'RIP', 'BILLINGE BOYS', 'WIGAN OUT', '1987', 'LEGEND', 'MOSH']);
        g.strokeText(tag, 0, 0); g.fillStyle = pick(['#ff4fd8', '#39e0ff', '#7cff4f', '#ffe14f', '#ff6a3b', '#ffffff']); g.fillText(tag, 0, 0); g.restore(); } } }, [1, 1]); return lam({ map: t }); };
  const WALLS = [strata(false), strata(true), strata(true), strata(false)], ROOF = strata(false);
  scene.background.set(0x1c2232); hemi.color.set(0xc8c0b0); hemi.intensity = 1.6;
  // woodland in front of the quarry face
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(40, 34), lam({ map: groundTex('#3a2e1c', '120,90,40', [8, 8]) })); leaf.rotation.x = -Math.PI / 2; leaf.position.set(0, .01, -6); scene.add(leaf);
  for (const sx of [-1, 1]) for (let z = 6; z > FACE_Z; z -= 4) tree(sx * rand(10.5, 14), z, rand(1.2, 1.6), false);
  [[-6, -4], [5.5, -10], [-3, -16]].forEach(([x, z]) => tree(x, z, 1));
  const fern = lam({ color: 0x3a6a2a });
  for (let i = 0; i < 40; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(rand(.3, .6), rand(.4, .8), 5), fern); f.position.set(rand(-9, 9), .2, rand(FACE_Z + 1, 5)); f.rotation.z = rand(-.4, .4); scene.add(f); }
  // the quarry face with its low square openings
  const faceBox = (x0, x1, y0, y1, z, d = 3) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, d), pick(WALLS)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); scene.add(m); };
  faceBox(-14, -5, 0, 10, FACE_Z - 1.5); faceBox(5, 14, 0, 10, FACE_Z - 1.5); faceBox(-5, 5, CEIL, 10, FACE_Z - 1.5);
  faceBox(-14, 14, 10, 13, FACE_Z - 4, 6);
  addCollider(-9.5, FACE_Z - 1.5, 9, 3); addCollider(9.5, FACE_Z - 1.5, 9, 3);
  const sgn = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), lam({ map: shopTex('CRANK CAVERNS', '#ffd479', 'dark'), emissive: 0xffffff, emissiveIntensity: .3, side: THREE.DoubleSide })); sgn.material.emissiveMap = sgn.material.map; sgn.position.set(-7.5, 3, FACE_Z + .05); scene.add(sgn);
  // inside: walls, flat rock roof, square-cut pillars
  for (const sx of [-1, 1]) for (let z = FACE_Z - 3; z > END_Z - 6; z -= 8) { const w = new THREE.Mesh(new THREE.BoxGeometry(2, CEIL, 8), pick(WALLS)); w.position.set(sx * 10.4, CEIL / 2, z - 4); scene.add(w); }
  for (let z = FACE_Z - 3; z > END_Z - 6; z -= 20) { const r = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 20), ROOF); r.position.set(0, CEIL + .5, z - 10); scene.add(r); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(24, CEIL, 2), pick(WALLS)); back.position.set(0, CEIL / 2, END_Z - 5.5); scene.add(back);
  for (let z = FACE_Z - 10, k = 0; z > END_Z + 8; z -= 13, k++) for (const x of (k % 2 ? [-6, 5.8] : [-6.2, 6])) {
    if (z < -163 && z > -203) continue;                                                   // keep the pie factory floor clear
    const pl = new THREE.Mesh(new THREE.BoxGeometry(1.7, CEIL, 1.7), pick(WALLS)); pl.position.set(x, CEIL / 2, z); scene.add(pl); addCollider(x, z, 1.8, 1.8);
  }
  // rubble, sand piles and the odd bit of litter
  for (let i = 0; i < 60; i++) rock(rand(-9, 9), .05, rand(END_Z + 4, FACE_Z - 2), rand(.15, .5), pick(WALLS));
  for (let i = 0; i < 10; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(rand(.8, 1.6), 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), CAVE.floor); sp.scale.y = .35; sp.position.set(pick([-1, 1]) * rand(7.5, 9.2), 0, rand(END_Z + 6, FACE_Z - 4)); scene.add(sp); }
  for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(rand(.1, .25), .04, rand(.1, .25)), pick([lam({ color: 0xc8ccd8 }), lam({ color: 0xc8102e }), lam({ color: 0xe8e2d0 })])); m.position.set(rand(-9, 9), .05, rand(END_Z + 4, FACE_Z)); m.rotation.y = rand(0, 6); scene.add(m); }
  // shafts of daylight through the entrance
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, z] of [[-2, FACE_Z - 3], [2.5, FACE_Z - 5], [0, FACE_Z - 8]]) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 7), shaftMat); sh.position.set(x, 2.2, z); sh.rotation.set(-.7, rand(-.4, .4), 0); scene.add(sh); }
  // pit railway and carts of pies
  for (const x of [-3.4, -2.4]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, 236), CAVE.rail); r.position.set(x, .05, -112); scene.add(r); }
  for (let z = 6; z > -228; z -= 1.2) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, .06, .25), CAVE.wood); s.position.set(-2.9, .03, z); scene.add(s); }
  for (const z of [-36, -92, -150]) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 2.2), CAVE.cart); c.position.set(-2.9, .75, z); scene.add(c);
    for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.2, .16, .1, 10), CAVE.pie); p.position.set(-2.9 + rand(-.45, .45), 1.3, z + rand(-.8, .8)); scene.add(p); }
    addCollider(-2.9, z, 1.5, 2.3); }
  [[7, -14], [-7.5, -58], [7.5, -100], [-7, -122], [7.6, -142]].forEach(([x, z]) => pieCrate(x, z, Math.random() < .5 ? 2 : 1));
  // the pie factory: ovens and a conveyor
  for (const [x, z] of [[-7.6, -170], [7.6, -176], [-7.6, -192], [7.6, -198]]) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 3), CAVE.oven); o.position.set(x, 1.5, z); scene.add(o);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), CAVE.ovenGlow); d.position.set(x - Math.sign(x) * 1.31, 1.4, z); d.rotation.y = -Math.sign(x) * Math.PI / 2; scene.add(d);
    neonSpots.push({ pos: new THREE.Vector3(x - Math.sign(x) * 2, 1.6, z), color: new THREE.Color(0xff7a1a), flick: true }); addCollider(x, z, 2.7, 3.1);
  }
  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.2, .8, 26), CAVE.cart); belt.position.set(4, .4, -186); scene.add(belt); addCollider(4, -186, 1.3, 26);
  for (let z = -174; z > -199; z -= 1.3) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.22, .18, .1, 10), CAVE.pie); p.position.set(4, .86, z); scene.add(p); }
  const banner2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.4), lam({ map: shopTex('WIGAN PIE CO – SECRET HQ', '#ffd479', 'dark'), emissive: 0xffffff, emissiveIntensity: .4 })); banner2.material.emissiveMap = banner2.material.map; banner2.position.set(0, 3.7, -166); scene.add(banner2);
  // glowing cave mushrooms
  for (let i = 0; i < 26; i++) { const sx = Math.random() < .5 ? -1 : 1, m = new THREE.Mesh(new THREE.SphereGeometry(rand(.1, .25), 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), CAVE.shroom); m.position.set(sx * rand(8.6, 9.6), 0, rand(-228, 4)); scene.add(m); }
  for (let z = -40; z > -228; z -= 50) neonSpots.push({ pos: new THREE.Vector3(-9, 1, z), color: new THREE.Color(0x3affe0), flick: false });
  for (let z = -30; z > -226; z -= 18) { lantern(-9, z); lantern(9, z - 9); }
}
function daylight() {
  const g = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false })); hole.position.set(0, 1.8, END_Z - 4.4); g.add(hole);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMat('#fff2c0').map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); glow.position.set(0, 2, -230); glow.scale.set(14, 8, 1); g.add(glow);
  const L = new THREE.PointLight(0xfff2c0, 30, 40, 1.2); L.position.set(0, 4, -226); g.add(L);
  scene.add(g); return g;
}

({ 1: buildStreet, 2: buildParr, 3: buildPark, 4: buildLancs, 5: buildCaves })[LEVEL_N]();

// rain
// rain: proper streaks (two points per drop) so you can actually see it falling
const RAIN = 1600, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN * 6);
for (let i = 0; i < RAIN; i++) { const x = rand(-12, 12), y = rand(0, 16), z = rand(-30, 10); rainPos.set([x, y, z, x - .06, y - .75, z], i * 6); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb8c8f0, transparent: true, opacity: 0, depthWrite: false })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);

// merge all the static props into a few big meshes (one draw call per material)
function mergeStatic() {
  scene.updateMatrixWorld(true);
  const buckets = new Map();
  scene.traverse((o) => { if (o.isMesh && !Array.isArray(o.material) && !o.isSprite && o.geometry.attributes.uv) { if (!buckets.has(o.material)) buckets.set(o.material, []); buckets.get(o.material).push(o); } });
  for (const [mat, list] of buckets) {
    if (list.length < 3) continue;
    const parts = list.map((m) => { const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); g.applyMatrix4(m.matrixWorld); return g; });
    const n = parts.reduce((a, g) => a + g.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    list.forEach((m) => m.parent.remove(m));
    scene.add(new THREE.Mesh(geo, mat));
  }
}
mergeStatic();
// showers on Westfield Street, Parr and the East Lancs only, raining roughly 30% of the time; rain and its sound always together
const RAINY = [1, 2, 4].includes(LEVEL_N);
const weather = { on: false, t: rand(8, 16), wet: 0 };
if (LEVEL_N === 4) makeTraffic();

// progression barriers (crowd barriers that drop when an area is cleared)
const BARRIERS = [-56, -101, -146, -187];
const barrierObjs = BARRIERS.map((z) => {
  const g = new THREE.Group();
  for (let x = -9; x <= 9; x += 2.2) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(2, 1.1, .08), (Math.round(x / 2.2) % 2) ? PROPMAT.barrier : PROPMAT.barrierRed); f.position.set(x, .6, 0); g.add(f);
  }
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(19, .5), lam({ map: canvasTex(512, 32, (gg, w, h) => { gg.fillStyle = '#ffd400'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#111'; gg.font = 'bold 20px Arial'; for (let i = 0; i < 6; i++) gg.fillText('SHCN – DO NOT CROSS', i * 170 - 40, 23); }), side: THREE.DoubleSide }));
  tape.position.y = 1.5; g.add(tape); g.position.z = z; scene.add(g); return g;
});

// ---------------------------------------------------------------- characters

// ---------------------------------------------------------------- audio
let AC = null, master = null, sfxOn = true, clubGain = null, rainGain = null;
function audio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = STORE.get('ph-vol', .7); master.connect(AC.destination);
    // rain bed
    const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = .6; rainGain = AC.createGain(); rainGain.gain.value = 0;
    src.connect(f); f.connect(rainGain); rainGain.connect(master); src.start();
    // club thump
    clubGain = AC.createGain(); clubGain.gain.value = 0; clubGain.connect(master);
    const beat = () => {
      if (!AC) return; const t = AC.currentTime;
      for (let i = 0; i < 8; i++) {
        const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(110, t + i * .47); o.frequency.exponentialRampToValueAtTime(40, t + i * .47 + .12);
        g.gain.setValueAtTime(.9, t + i * .47); g.gain.exponentialRampToValueAtTime(.001, t + i * .47 + .2); o.connect(g); g.connect(clubGain); o.start(t + i * .47); o.stop(t + i * .47 + .22);
        if (i % 2) { const b = AC.createOscillator(), bg = AC.createGain(); b.type = 'sawtooth'; b.frequency.value = [55, 55, 65, 49][(i >> 1) % 4]; bg.gain.setValueAtTime(.12, t + i * .47 + .23); bg.gain.exponentialRampToValueAtTime(.001, t + i * .47 + .45); b.connect(bg); bg.connect(clubGain); b.start(t + i * .47 + .23); b.stop(t + i * .47 + .46); }
      }
      setTimeout(beat, 3760);
    };
    beat();
  } catch (e) { AC = null; }
}
function noise(dur, freq, type, vol, sweepTo) {
  if (!AC || !sfxOn) return;
  const len = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = AC.createBufferSource(); s.buffer = buf; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, AC.currentTime + dur);
  const g = AC.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start();
}
function tone(f, dur, type = 'square', vol = .1, to) {
  if (!AC || !sfxOn) return;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; if (to) o.frequency.exponentialRampToValueAtTime(to, AC.currentTime + dur);
  g.gain.setValueAtTime(vol, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur); o.connect(g); g.connect(master); o.start(); o.stop(AC.currentTime + dur);
}
const SFX = {
  throw: () => noise(.18, 900, 'bandpass', .35, 2400), pea: () => { noise(.12, 1600, 'lowpass', .7); tone(140, .12, 'square', .15, 60); },
  splat: () => { noise(.22, 700, 'lowpass', .9, 200); tone(90, .12, 'sine', .25, 50); }, hurt: () => { tone(180, .25, 'sawtooth', .18, 70); noise(.1, 500, 'lowpass', .4); },
  pickup: () => { tone(660, .08, 'square', .1); setTimeout(() => tone(990, .12, 'square', .1), 70); }, boom: () => { noise(.7, 400, 'lowpass', 1.2, 60); tone(70, .6, 'sine', .4, 30); },
  ko: () => { tone(400, .1, 'square', .08); setTimeout(() => tone(300, .1, 'square', .08), 90); setTimeout(() => tone(200, .25, 'square', .08), 180); },
  click: () => tone(1200, .03, 'square', .05), honk: (big) => { tone(big ? 210 : 330, .22, 'sawtooth', .16, big ? 150 : 250); setTimeout(() => tone(big ? 190 : 300, .18, 'sawtooth', .14, big ? 130 : 220), 160); },
  hiss: () => noise(.3, 3500, 'highpass', .35), horn: () => { tone(392, .35, 'square', .09); tone(494, .35, 'square', .07); }, screech: () => { tone(1800, .15, 'sine', .06, 2600); }, wave: () => { tone(330, .15, 'square', .1); setTimeout(() => tone(440, .25, 'square', .1), 150); },
};

// ---------------------------------------------------------------- player + weapons
const player = { pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true, hp: 100, alive: true,
  weapon: 0, ammo: [14, 18], grenades: 2, cool: 0, bob: 0, hurtT: 0 };
const WEAPONS = [
  { name: 'PIE LAUNCHER', ammoName: 'PIES', max: 30, rate: .45, click: .12 },
  { name: 'MUSHY PEA SHOTGUN', ammoName: 'TUBS', max: 36, rate: .7, click: .3 },
];
const keys = {}; let locked = false, sens = STORE.get('ph-sens', 1);
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (state.mode !== 'play') return;
  if (e.code === 'Digit1') setWeapon(0); if (e.code === 'Digit2') setWeapon(1);
  if (e.code === 'KeyG' || e.code === 'KeyQ') throwGrenade();
  if (e.code === 'Space') e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
let mouseDown = false;
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouseDown = true; if (state.mode === 'play' && locked) fire(true); } if (e.button === 2) throwGrenade(); });
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => { if (state.mode === 'play') setWeapon(player.weapon ? 0 : 1); }, { passive: true });
document.addEventListener('mousemove', (e) => {
  if (!locked || state.mode !== 'play') return;
  player.yaw -= e.movementX * .0022 * sens; player.pitch = clamp(player.pitch - e.movementY * .0022 * sens, -1.4, 1.4);
});
// ---- phones and tablets: left thumb walks (floating stick), right thumb looks, buttons for the rest. Landscape only.
const TOUCH = matchMedia('(hover:none) and (pointer:coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(pointer:fine)').matches);
const stick = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
function goFullscreen() {
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!rq || document.fullscreenElement || document.webkitFullscreenElement) return;
  try { const pr = rq.call(el, { navigationUI: 'hide' }); if (pr && pr.then) pr.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
}
if (TOUCH) {
  document.body.classList.add('touch');
  pixelRatio = Math.min(window.devicePixelRatio, 1.25); renderer.setPixelRatio(pixelRatio); resize();
  const T = $('ph-touch'), stickEl = $('ph-stick'), knob = $('ph-knob'), LOOK = .0055;
  let lookId = null, lx = 0, ly = 0;
  const look = (x, y) => { if (state.mode !== 'play') return; player.yaw -= (x - lx) * LOOK * sens; player.pitch = clamp(player.pitch - (y - ly) * LOOK * sens, -1.4, 1.4); lx = x; ly = y; };
  T.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('tbtn')) return;
    e.preventDefault();
    if (e.clientX < innerWidth * .42 && stick.id === null) {
      stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY;
      stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.style.display = 'block'; knob.style.transform = '';
    } else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; }
  });
  T.addEventListener('pointermove', (e) => {
    if (e.pointerId === stick.id) {
      let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy), m = 55;
      if (d > m) { dx *= m / d; dy *= m / d; } stick.x = dx / m; stick.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (e.pointerId === lookId) look(e.clientX, e.clientY);
  });
  const end = (e) => { if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; stickEl.style.display = 'none'; } if (e.pointerId === lookId) lookId = null; };
  T.addEventListener('pointerup', end); T.addEventListener('pointercancel', end);
  const btn = (id, down, up, drag) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (err) {} lx = e.clientX; ly = e.clientY; down(); });
    if (drag) el.addEventListener('pointermove', (e) => { if (el.classList.contains('on')) look(e.clientX, e.clientY); });   // slide your thumb on FIRE to aim while shooting
    const off = () => { if (!el.classList.contains('on')) return; el.classList.remove('on'); up && up(); };
    el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
  };
  btn('tb-fire', () => { mouseDown = true; if (state.mode === 'play') fire(true); }, () => { mouseDown = false; }, true);
  btn('tb-jump', () => { keys.Space = true; }, () => { keys.Space = false; });
  btn('tb-gren', () => { if (state.mode === 'play') throwGrenade(); });
  btn('tb-swap', () => { if (state.mode === 'play') setWeapon(player.weapon ? 0 : 1); });
  btn('tb-pause', () => pause());
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && state.mode === 'play') pause();
});

// viewmodels
const vm = new THREE.Group(); camera.add(vm);
const hand = (col) => new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .3), lam({ color: col }));
function makePieGun() {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .7, 14), lam({ color: 0x6600ff })); tube.rotation.x = Math.PI / 2; g.add(tube);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.115, .115, .08, 14), lam({ color: 0xfda138 })); band.rotation.x = Math.PI / 2; band.position.z = -.25; g.add(band);
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(.1, .08, .06, 14), lam({ color: 0xd9a441 })); pie.rotation.x = Math.PI / 2; pie.position.z = -.37; g.add(pie);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(.08, .2, .1), lam({ color: 0x2a2a30 })); grip.position.set(0, -.13, .12); g.add(grip);
  const h = hand(0xf2c29b); h.position.set(0, -.18, .2); g.add(h);
  return g;
}
function makePeaGun() {
  const g = new THREE.Group();
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(.13, .11, .22, 16), lam({ color: 0xf4f4f4 })); tub.position.set(0, .06, .05); g.add(tub);
  const lbl = new THREE.Mesh(new THREE.CylinderGeometry(.132, .112, .1, 16), lam({ color: 0x2e8b3a })); lbl.position.set(0, .06, .05); g.add(lbl);
  for (const x of [-.045, .045]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .6, 10), lam({ color: 0x55555e })); b.rotation.x = Math.PI / 2; b.position.set(x, -.04, -.25); g.add(b); }
  const stock = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .3), lam({ color: 0x5a3a20 })); stock.position.set(0, -.08, .25); g.add(stock);
  const h = hand(0xf2c29b); h.position.set(0, -.16, .12); g.add(h);
  return g;
}
const guns = [makePieGun(), makePeaGun()];
guns.forEach((gun, i) => { gun.scale.setScalar(.4); gun.position.set(.22, -.2, -.4); gun.rotation.y = .06; gun.visible = i === 0; vm.add(gun); });
let kick = 0, swapT = 0;
function setWeapon(i) { if (i === player.weapon) return; player.weapon = i; guns.forEach((g, k) => g.visible = k === i); swapT = .25; SFX.click(); hud(); }

// projectiles + effects
const shots = [];      // player projectiles
const eshots = [];     // enemy projectiles
const fx = [];         // particles
const decals = [];
const PIE_GEO = new THREE.CylinderGeometry(.16, .13, .08, 12), PIE_MAT = lam({ color: 0xd9a441 });
const BARM_GEO = new THREE.SphereGeometry(.16, 10, 8), BARM_MAT = lam({ color: 0xe8d2a0 });
const STIL_GEO = new THREE.BoxGeometry(.06, .18, .32), STIL_MAT = lam({ color: 0xd11a2a });
const PROJ = {
  barm: { geo: BARM_GEO, mat: BARM_MAT, speed: 12, g: 9.8, burst: 'barm', hit: ['Barm to the face!', 'Bapped!'] },
  stiletto: { geo: STIL_GEO, mat: STIL_MAT, speed: 18, g: 3, burst: 'gravy', hit: ['Stilettoed!', 'Heel to the head!'] },
  can: { geo: new THREE.CylinderGeometry(.07, .07, .22, 10), mat: lam({ color: 0xc8ccd8, emissive: 0x222222 }), speed: 15, g: 7, burst: 'can', hit: ['Canned!', 'Tinny to the head!', 'Full can, that!'] },
  slipper: { geo: new THREE.BoxGeometry(.14, .08, .32), mat: lam({ color: 0xff8fc8 }), speed: 13, g: 6, burst: 'barm', hit: ['Slippered!', 'Your mam\'s slipper!', 'Right in the earhole!'] },
  hubcap: { geo: new THREE.CylinderGeometry(.22, .22, .05, 14), mat: lam({ color: 0xd8dce8, emissive: 0x333333 }), speed: 16, g: 5, burst: 'can', hit: ['Hubcapped!', 'Is this your hubcap, la?', 'Hubcap to the head!'] },
  ticket: { geo: new THREE.BoxGeometry(.22, .02, .32), mat: lam({ color: 0xffd400, emissive: 0x554400 }), speed: 14, g: 2, burst: 'barm', hit: ['Ticketed!', 'Sixty quid fine!', 'Penalty notice!'] },
  cone: { geo: new THREE.ConeGeometry(.2, .5, 8), mat: lam({ color: 0xff6a1a }), speed: 13, g: 8, burst: 'barm', hit: ['Coned!', 'Traffic cone to the face!'] },
  manifesto: { geo: new THREE.BoxGeometry(.3, .08, .4), mat: lam({ color: 0xc8102e, emissive: 0x330000 }), speed: 15, g: 5, burst: 'barm', hit: ['Hit with a manifesto!', 'Red tape!', 'Council tax rise!'] },
  bigpie: { geo: new THREE.CylinderGeometry(.34, .28, .16, 14), mat: lam({ color: 0xd9a441, emissive: 0x332200 }), speed: 14, g: 7, burst: 'pie', hit: ['PIE\'D!', 'Full meat and potato to the face!', 'Gravy everywhere!'] },
  rock: { geo: new THREE.DodecahedronGeometry(.18), mat: lam({ color: 0x8a5a3a }), speed: 14, g: 8, burst: 'barm', hit: ['Rocked!', 'Ow, me head!'] },
  acid: { geo: new THREE.SphereGeometry(.18, 8, 6), mat: new THREE.MeshBasicMaterial({ color: 0x9aff2a }), speed: 11, g: 6, burst: 'acid', hit: ['Ant spit!', 'Acid in the eye!', 'Urgh, ant goo!'] },
};
const PART_GEO = new THREE.BoxGeometry(.07, .07, .07);
const partMats = { pie: lam({ color: 0xc89434 }), gravy: lam({ color: 0x6b3a12 }), pea: lam({ color: 0x4caf2a }), barm: lam({ color: 0xf2e2b8 }), star: new THREE.MeshBasicMaterial({ color: 0xffe16b }), can: lam({ color: 0xc8ccd8 }), acid: new THREE.MeshBasicMaterial({ color: 0x9aff2a }), feather: lam({ color: 0xd8d0c4 }) };
function burst(pos, kind, n = 12, spd = 4) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(PART_GEO, partMats[kind]); m.position.copy(pos); scene.add(m);
    fx.push({ m, v: new THREE.Vector3(rand(-1, 1), rand(.2, 1.4), rand(-1, 1)).multiplyScalar(spd), t: rand(.5, 1) });
  }
}
const decalMats = { pie: new THREE.MeshLambertMaterial({ color: 0x8a5a1e, transparent: true, opacity: .9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
                    pea: new THREE.MeshLambertMaterial({ color: 0x3f8a22, transparent: true, opacity: .9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }) };
function decal(pos, normal, kind, size = .5) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(size * rand(.7, 1.2), 9), decalMats[kind]);
  m.position.copy(pos).addScaledVector(normal, .02); m.lookAt(pos.clone().add(normal)); scene.add(m); decals.push(m);
  if (decals.length > 90) scene.remove(decals.shift());
}

function camForward() { return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')); }
function eyePos() { return new THREE.Vector3(player.pos.x, player.pos.y + 1.65, player.pos.z); }

function fire(click) {
  // every click fires straight away (short minimum gap); holding the button auto-fires at the slower rate
  if (swapT > 0 || (click ? player.clickCool > 0 : player.cool > 0)) return;
  const w = player.weapon;
  if (player.ammo[w] <= 0) { SFX.click(); toast(pick(['Out of pies! Raid a chippy.', 'No peas left, lad.', 'Empty. Find some supplies.'])); player.cool = .4; return; }
  player.ammo[w]--; player.cool = WEAPONS[w].rate; player.clickCool = WEAPONS[w].click; kick = 1; stats.shots++;
  const dir = camForward(), eye = eyePos();
  if (w === 0) {
    SFX.throw();
    // aim the lob so the pie lands exactly where the crosshair points
    const h = rayHit(eye, dir, 70), target = h.point ? h.point.clone() : eye.clone().addScaledVector(dir, 40);
    if (h.enemy) target.y = Math.max(target.y, h.enemy.g.position.y + 1.1 * h.enemy.scale);
    const from = eye.clone().addScaledVector(dir, .6).add(new THREE.Vector3(0, -.12, 0));
    const tFly = Math.max(.08, from.distanceTo(target) / 34);
    const v = target.clone().sub(from).divideScalar(tFly); v.y += .5 * 9.8 * tFly;
    const m = new THREE.Mesh(PIE_GEO, PIE_MAT); m.position.copy(from); scene.add(m);
    shots.push({ m, v, kind: 'pie', t: 3 });
  } else {
    SFX.pea(); let hitAny = false;
    for (let i = 0; i < 10; i++) {
      const d = dir.clone().add(new THREE.Vector3(rand(-.07, .07), rand(-.05, .05), rand(-.07, .07))).normalize();
      const h = rayHit(eye, d, 26);
      if (h.enemy) { damageEnemy(h.enemy, 9, d); hitAny = true; burst(h.point, 'pea', 3, 2); }
      else if (h.point) { decal(h.point, h.normal, 'pea', .14); burst(h.point, 'pea', 2, 1.5); }
    }
    if (hitAny) { stats.hits++; hitMarker(); }
  }
  hud();
}
function rayHit(o, d, range) {
  const p = new THREE.Vector3();
  for (let s = .3; s < range; s += .2) {
    p.copy(o).addScaledVector(d, s);
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = p.x - e.g.position.x, dz = p.z - e.g.position.z, h = 2.1 * e.scale;
      if (dx * dx + dz * dz < (.38 * e.scale) ** 2 && p.y > 0 && p.y < h) return { enemy: e, point: p.clone() };
    }
    if (p.y <= .01) return { point: new THREE.Vector3(p.x, .01, p.z), normal: new THREE.Vector3(0, 1, 0) };
    if (Math.abs(p.x) >= 9.95) return { point: new THREE.Vector3(Math.sign(p.x) * 9.95, p.y, p.z), normal: new THREE.Vector3(-Math.sign(p.x), 0, 0) };
    for (const c of colliders) if (p.y < 1.2 && p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ) return { point: p.clone(), normal: d.clone().negate() };
  }
  return {};
}
function throwGrenade() {
  if (state.mode !== 'play' || player.grenades <= 0) { if (state.mode === 'play') toast('No barm cakes left!'); return; }
  player.grenades--; SFX.throw();
  const dir = camForward(), m = new THREE.Mesh(BARM_GEO, BARM_MAT); m.scale.setScalar(1.4);
  m.position.copy(eyePos()).addScaledVector(dir, .6); scene.add(m);
  shots.push({ m, v: dir.multiplyScalar(17).add(new THREE.Vector3(0, 4.5, 0)), kind: 'barm', t: 1.6 });
  hud();
}
function explode(pos, radius, dmg, kind) {
  for (const e of enemies) {
    if (e.dead) continue;
    const d = e.g.position.distanceTo(new THREE.Vector3(pos.x, e.g.position.y, pos.z));
    if (d < radius) { damageEnemy(e, dmg * (1 - d / radius * .6), new THREE.Vector3(e.g.position.x - pos.x, 0, e.g.position.z - pos.z).normalize()); }
  }
  burst(pos, kind, kind === 'barm' ? 40 : 16, kind === 'barm' ? 8 : 4); burst(pos, 'gravy', kind === 'barm' ? 20 : 8, kind === 'barm' ? 7 : 3);
  decal(new THREE.Vector3(pos.x, .01, pos.z), new THREE.Vector3(0, 1, 0), 'pie', kind === 'barm' ? 1.6 : .7);
  if (kind === 'barm') { SFX.boom(); shake = .5; } else SFX.splat();
}

// ---------------------------------------------------------------- enemies
const enemies = [];
const TYPES = {
  wiganer: { hp: 40, speed: 3.3, scale: 1, range: [6, 14], dmg: 8, cd: [1.4, 2.6], score: 100, proj: 'barm',
    quips: ['Get here, you knobhead!', 'Saints are shite!', 'You pie-eyed twat!', 'Come ere you Saint!', 'WIGAN FOREVER!', 'Get back to Thatto Heath!', 'You\'re not famous!', 'Pie eaters? Says you!', 'Have a barm!'],
    hit: ['Ow me barm!', 'Not the shirt!', 'That\'s me Sunday best!'], },
  bouncer: { hp: 140, speed: 2.4, scale: 1.18, range: [0, 1.6], dmg: 16, cd: [1.1, 1.6], score: 300, melee: true,
    quips: ['Beak, mate?', 'Give us your gear.', 'Beak, mate? Beak?', 'Give us your gear, lad.', 'Not tonight, lad.', 'Name\'s not down.', 'Not in them trainers.', 'Have you been drinking?', 'ID. Now.'],
    hit: ['Right. That\'s it.', 'You\'re barred.', 'Oi!'], },
  hen: { hp: 140, speed: 4.4, scale: .95, range: [3, 10], dmg: 10, cd: [.7, 1.3], score: 600, proj: 'stiletto',
    quips: ['FUCKING DICKHEAD!', 'SMALL PENIS!', 'WANKER!', 'Oi, small penis!', 'GET HIM GIRLS!', 'WOOOO!', 'Mind me nails!', 'SHOTS!', 'Who invited HIM?!'],
    hit: ['Me extensions!', 'That\'s me best handbag!', 'Ow, me heels!'], },
  bride: { hp: 420, speed: 4.0, scale: 1.05, range: [2, 9], dmg: 12, cd: [.55, 1.0], score: 2000, proj: 'stiletto', boss: true,
    quips: ['FUCKING DICKHEAD!!', 'WANKER!!', 'SMALL PENIS!!', 'IT\'S MY HEN DO!!', 'NOBODY RUINS MY HEN DO!', 'I\'M THE BRIDE!!', 'SHOTS! SHOTS! SHOTS!', 'Get him, girls!'],
    hit: ['ME VEIL!', 'Do you know how much this cost?!', 'RIGHT!'], },
  // level 2: Parr
  scally: { hp: 45, speed: 3.6, range: [6, 13], dmg: 8, cd: [1.3, 2.4], score: 120, proj: 'can',
    quips: ['Shut it, you bellend!', 'What you lookin\' at, dickhead?', 'Get to fuck!', 'Ey you! What you lookin at?', 'Is that your bike, mate?', 'Giz a pie!', 'You\'re not from round ere!', 'PARR MASSIVE!', 'Me mam\'ll batter you!'],
    hit: ['Me trackie!', 'Not the cap!', 'Ow! I\'m tellin\'!'] },
  mum: { hp: 95, speed: 3.3, range: [2, 9], dmg: 10, cd: [.9, 1.6], score: 250, proj: 'slipper', mixed: true, meleeLines: ['Rolling-pinned!', 'Your tea\'s in the dog!', 'Clipped round the ear!'],
    quips: ['You little shit!', 'Get in, you cheeky bastard!', 'I\'ll knock your bloody block off!', 'GET IN THIS HOUSE!', 'Do you know what time it is?!', 'I\'ll ring your mother!', 'I\'ve just had me hair done!', 'KEEP IT DOWN!'],
    hit: ['Me curlers!', 'Me best dressing gown!', 'RIGHT. That\'s it.'] },
  ant: { hp: 45, speed: 5.2, range: [0, 1.7], dmg: 8, cd: [.7, 1.2], score: 120, melee: true, sfx: 'hiss', creature: () => makeAnt('ant'), meleeLines: ['Bitten!', 'Nipped by an ant!'],
    quips: ['SKREEEE!', '*click click click*', 'HSSSSS!'], hit: ['SKRK!', '*angry clicking*'] },
  spitter: { hp: 60, speed: 3, range: [7, 14], dmg: 10, cd: [1.2, 2], score: 200, proj: 'acid', mouthY: .9, creature: () => makeAnt('spitter'),
    quips: ['*gurgle*', 'HSSSS-PTOO!'], hit: ['*splutter*'] },
  soldier: { hp: 170, speed: 3.7, range: [0, 2.2], dmg: 16, cd: [1, 1.5], score: 400, melee: true, sfx: 'hiss', creature: () => makeAnt('soldier'), meleeLines: ['Snapped by the big un!', 'Pincered!'],
    quips: ['*CLACK CLACK*', 'SKRAAAA!'], hit: ['*furious clacking*'] },
  queen: { hp: 950, speed: 1.6, range: [5, 13], dmg: 14, cd: [.9, 1.5], score: 3000, proj: 'acid', boss: true, spawner: 'ant', mouthY: 2, bubbleY: 1.75, creature: () => makeAnt('queen'),
    quips: ['SKREEEEEEEEE!!!', '*furious royal clicking*', '*the Burgies shake*'], hit: ['SKRAAAK!', '*royal hissing*'] },
  // level 3: Taylor Park
  goose: { hp: 50, speed: 5.6, range: [0, 1.6], dmg: 9, cd: [.6, 1.1], score: 150, melee: true, sfx: 'honk', creature: () => makeGoose('goose'), meleeLines: ['Goosed!', 'Pecked!', 'Wing-slapped!'],
    quips: ['HONK!', 'HOOOONK!', 'HSSSSS!', '*aggressive honking*'], hit: ['HONK?!', '*indignant honk*'] },
  mothergoose: { hp: 1000, speed: 3.6, range: [0, 3.2], dmg: 18, cd: [1, 1.6], score: 3000, melee: true, boss: true, spawner: 'goose', sfx: 'honk', bubbleY: 2.2, creature: () => makeGoose('mothergoose'), meleeLines: ['MOTHER GOOSE SAYS NO!', 'Flattened!', 'Honked into next week!'],
    quips: ['HOOOOOOOONK!!!', 'THIS IS MY PARK!', '*HONKS IN GOOSE*', 'HONK. HONK. HONK.'], hit: ['*outraged honking*', 'HONK!!'] },
  // level 4: the East Lancs
  scouser: { hp: 50, speed: 3.8, range: [6, 13], dmg: 9, cd: [1.2, 2.2], score: 150, proj: 'hubcap',
    quips: ['Eh, dickhead, eh!', 'Calm down, you knobhead!', 'Twat!', 'Giz yer fuckin\' wheels!', 'Eh, eh, EH!', 'Is this your car, la?', 'Calm down!', 'Giz yer wheels!', 'We\'re not payin\' no charge!', 'Sound, la!'], hit: ['Me shell suit!', 'Ah, me perm!', 'Behave!'] },
  roadworker: { hp: 120, speed: 2.8, range: [0, 1.8], dmg: 14, cd: [1.1, 1.6], score: 300, melee: true, meleeLines: ['Shovelled!', 'Lane closed!', 'Road works – you\'re the road!'],
    quips: ['Bugger off, we\'re on a brew!', 'Oi, knobhead! Lane\'s shut!', 'Lane closed, mate!', 'We\'re on our break!', 'Eighteen-month delay, this!', 'Use the diversion!'], hit: ['Me tea!', 'Health and safety!'] },
  warden: { hp: 70, speed: 3.4, range: [5, 12], dmg: 9, cd: [1, 1.8], score: 200, proj: 'ticket',
    quips: ['Sod off, I\'m working!', 'That\'s a ticket, you prick!', 'You can\'t park there!', 'That\'s a ticket!', 'Double yellows, lad!', 'I\'m just doing me job!'], hit: ['I\'ll appeal that!', 'Me notebook!'] },
  trucker: { hp: 150, speed: 2.6, range: [0, 1.9], dmg: 16, cd: [1.1, 1.7], score: 300, melee: true, meleeLines: ['Jack-knifed!', 'Trucker\'s headlock!'],
    quips: ['Move, you pillock!', 'Bloody hell, not another one!', 'Get off the road, you tit!', 'Oi! Me butty!', 'I\'m on me tachograph!', 'Ten-four, good buddy!', 'Get off the hard shoulder!'], hit: ['Me bacon barm!', 'Steady on!'] },
  mp: { hp: 1000, speed: 2.4, range: [4, 12], dmg: 13, cd: [.7, 1.2], score: 3000, proj: 'manifesto', boss: true, spawner: 'scouser', bubbleY: 2.6,
    quips: ['Bugger off, peasant!', 'Out of my way, you oik!', 'I\'ll have your bollocks for this!', 'CONGESTION CHARGE! FIVE POUND!', 'Vote Flangefelter!', 'No Scousers past Rainhill!', 'I\'m an MP, you know!', 'This is ALL in my manifesto!'], hit: ['My expenses!', 'I\'ll have you in the Commons!', 'Point of order!'] },
  // level 5: Crank Caverns
  bat: { hp: 28, speed: 5.4, range: [0, 1.6], dmg: 7, cd: [.6, 1.1], score: 120, melee: true, sfx: 'screech', creature: () => makeBat(), meleeLines: ['Batted!', 'Bitten by a bat!'], bubbleY: 2.4,
    quips: ['*screech*', '*flap flap flap*', 'EEEEE!'], hit: ['*squeak*'] },
  hermit: { hp: 60, speed: 3, range: [5, 11], dmg: 10, cd: [1, 1.8], score: 200, proj: 'rock',
    quips: ['Bugger off out me cave!', 'Bloody kids!', 'Get out of my cave!', 'I\'ve lived here since 1974!', 'You\'ll not get me pies!', 'Is it still the eighties?'], hit: ['Me beard!', 'Ow, me knees!'] },
  pitman: { hp: 130, speed: 2.9, range: [0, 1.8], dmg: 14, cd: [1, 1.6], score: 300, melee: true, meleeLines: ['Pickaxed!', 'Sent down the pit!'],
    quips: ['Get stuffed, Saint!', 'Dig this, dickhead!', 'Dig faster, lads!', 'For the Pie Baron!', 'WIGAN!', 'Nobody leaves the pie mine!'], hit: ['Me lamp!', 'Me hat!'] },
  beast: { hp: 650, speed: 3.6, range: [0, 2.6], dmg: 20, cd: [1.2, 1.8], score: 2000, melee: true, bubbleY: 2.6, meleeLines: ['Mauled by the Beast!', 'Flung across the cave!'],
    quips: ['RAAAARGH!', 'GRRRRR!', '*the beast sniffs the air*'], hit: ['RAAARGH!!', 'GRAAAH!'] },
  piebaron: { hp: 1300, speed: 2.6, range: [4, 12], dmg: 15, cd: [.6, 1.1], score: 5000, proj: 'bigpie', boss: true, spawner: 'wiganer', bubbleY: 2.9,
    quips: ['EAT PIE, YOU BASTARD!', 'You\'ll never stop me, you knobhead!', 'Wigan fucking forever!', 'I AM THE PIE BARON!', 'Wigan will rule St Helens!', 'You\'ll never stop the pies!', 'EAT PIE, SAINT!', 'Winning Wigan DNA!'], hit: ['My crust!', 'Not the hat!', 'You\'ll pay for that!'] },
  keeper: { hp: 130, speed: 2.7, range: [0, 1.7], dmg: 14, cd: [1.1, 1.6], score: 300, melee: true, meleeLines: ['Clipped by a keeper!', 'Escorted off the premises!', 'Whistled at, then walloped!'],
    quips: ['Off the bloody grass, you sod!', 'Clear off, you little shit!', 'Keep off the grass!', 'Park\'s shut, lad!', 'No ball games!', 'Can you not read the sign?', 'I\'ve got a whistle and I\'ll use it!'], hit: ['That\'s council property!', 'Right, you\'re banned!', 'Oi!'] },
  drinker: { hp: 60, speed: 2.8, range: [6, 12], dmg: 9, cd: [1.4, 2.4], score: 150, proj: 'can',
    quips: ['Fuck off, it\'s my bench!', 'Gerroff me cider, ya twat!', 'Spare us 20p, mate?', 'This is MY bench!', 'Wanna can?', 'I\'ve been sat here since 1987!'], hit: ['Me cider!', 'Ow, me can!'] },
};
function spawn(type, x, z, delay = 0) {
  x = clamp(x, -STREET_HALF + .8, STREET_HALF - .8);
  const T = TYPES[type], c = T.creature ? T.creature() : makeCharacter(type), g = c.root; g.position.set(x, 0, z); scene.add(g);
  const hp0 = Math.round(T.hp * EASY.hp);
  const e = { type, T, g, c, hp: hp0, max: hp0, scale: c.scale, throwT: 0, cd: rand(.6, 1.6) + delay, dead: false, deadT: 0, walk: rand(0, 6), strafe: Math.random() < .5 ? 1 : -1,
    strafeT: rand(1, 3), sayT: 0, bubble: null, attackT: 0, hitT: 0, spawnT: 4, delay };
  g.visible = delay <= 0;
  enemies.push(e); return e;
}
function say(e, text) {
  if (e.bubble) { e.g.remove(e.bubble); e.bubble.material.map.dispose(); }
  e.bubble = textSprite(text, '#111', e.T.boss ? '#ffe3f2' : '#ffffff'); e.bubble.position.set(0, e.T.bubbleY || 2.75, 0); e.bubble.scale.multiplyScalar(1 / e.scale);
  e.g.add(e.bubble); e.sayT = 2.2;
}
function damageEnemy(e, dmg, dir) {
  if (e.dead) return;
  e.hp -= dmg; e.hitT = .15; stats.dmg += dmg;
  if (e.hp > 0 && e.throwT <= 0 && Math.random() < .6) e.c.ctl.once(Math.random() < .5 ? 'Hit_A' : 'Hit_B', 1.6);
  if (dir) e.g.position.addScaledVector(dir.clone().setY(0).normalize(), .12);
  if (Math.random() < .2) say(e, pick(e.T.hit));
  if (e.hp <= 0) {
    e.dead = true; e.deadT = 0; e.throwT = 0; e.c.ctl.once(Math.random() < .5 ? 'Death_A' : 'Death_B', 1.1, true); stats.kos++; score += e.T.score; SFX.ko(); hitMarker(true);
    killfeed(`${NAMES[e.type] || e.type} splatted  +${e.T.score}`); if (e.T.creature) burst(e.g.position.clone().setY(1), e.type.includes('goose') ? 'feather' : 'acid', 14, 3);
    if (e.bubble) { e.g.remove(e.bubble); e.bubble = null; }
    const stars = new THREE.Group(); for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.08), partMats.star); s.position.set(Math.cos(i * 1.57) * .35, 2.3, Math.sin(i * 1.57) * .35); stars.add(s); }
    e.stars = stars; e.g.add(stars);
    if (Math.random() < .45) dropPickup(e.g.position.x, e.g.position.z);
  }
}
const NAMES = { wiganer: 'Wiganer', bouncer: 'Bouncer', hen: 'Bridesmaid', bride: 'THE BRIDE', scally: 'Scally', mum: 'Angry mum', ant: 'Giant ant', spitter: 'Spitter ant', soldier: 'Soldier ant',
  queen: 'THE QUEEN', goose: 'Goose', mothergoose: 'MOTHER GOOSE', keeper: 'Park keeper', drinker: 'Bench drinker',
  scouser: 'Scouser', roadworker: 'Road worker', warden: 'Traffic warden', trucker: 'Trucker', mp: 'FRED FLANGEFELTER MP', bat: 'Bat', hermit: 'Cave hermit', pitman: 'Wigan pitman', beast: 'THE BEAST', piebaron: 'THE PIE BARON' };
function enemyThrow(e) { e.throwT = e.T.creature ? .2 : .38; e.c.ctl.once('Throw', 1.5); }
function launchThrow(e) {
  const from = e.g.position.clone().add(new THREE.Vector3(0, (e.T.mouthY || 1.6) * e.scale, 0));
  const target = eyePos().add(new THREE.Vector3(rand(-EASY.spread, EASY.spread), -.4, rand(-EASY.spread, EASY.spread)));
  const kind = e.T.proj, PJ = PROJ[kind], speed = PJ.speed;
  const dist = from.distanceTo(target), t = dist / speed, g = PJ.g;
  const v = new THREE.Vector3((target.x - from.x) / t, (target.y - from.y + .5 * g * t * t) / t, (target.z - from.z) / t);
  const m = new THREE.Mesh(PJ.geo, PJ.mat); m.position.copy(from); if (e.T.boss) m.scale.setScalar(1.6); scene.add(m);
  eshots.push({ m, v, g, kind, dmg: e.T.dmg, t: 4 });
}
// difficulty: enemies hit softer, fire less often, aim worse and go down quicker; your aim still has to be good
const EASY = { dmg: .6, hp: .8, cd: 1.35, spread: 1.1 };
function hurtPlayer(dmg, msg) {
  if (!player.alive || state.mode !== 'play') return;
  dmg = Math.round(dmg * EASY.dmg); player.calmT = 0;
  player.hp -= dmg; player.hurtT = .4; SFX.hurt(); shake = Math.max(shake, .18); stats.taken += dmg;
  if (msg && Math.random() < .5) toast(msg);
  if (player.hp <= 0) { player.hp = 0; die(); }
  hud();
}

// ---------------------------------------------------------------- pickups
const pickups = [];
const PICK = {
  tea:  { label: 'Cuppa (+30 health)', col: 0xffffff, apply: () => { player.hp = Math.min(100, player.hp + 30); } },
  pies: { label: 'Box of pies (+8 pies)', col: 0xd9a441, apply: () => { player.ammo[0] = Math.min(30, player.ammo[0] + 8); } },
  peas: { label: 'Mushy peas (+10 tubs)', col: 0x4caf2a, apply: () => { player.ammo[1] = Math.min(36, player.ammo[1] + 10); } },
  barm: { label: 'Barm cake (+1 grenade)', col: 0xf2e2b8, apply: () => { player.grenades = Math.min(5, player.grenades + 1); } },
};
function addPickup(kind, x, z) {
  x = clamp(x, -STREET_HALF + .8, STREET_HALF - .8);
  const P = PICK[kind], g = new THREE.Group();
  const box = new THREE.Mesh(kind === 'tea' ? new THREE.CylinderGeometry(.16, .13, .28, 14) : kind === 'barm' ? new THREE.SphereGeometry(.2, 12, 10) : new THREE.BoxGeometry(.45, .25, .35), lam({ color: P.col, emissive: P.col, emissiveIntensity: .35 }));
  g.add(box); if (kind === 'tea') { const h = new THREE.Mesh(new THREE.TorusGeometry(.08, .025, 6, 12), lam({ color: 0xffffff })); h.position.x = .17; g.add(h); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.35, .45, 20), new THREE.MeshBasicMaterial({ color: 0xfda138, transparent: true, opacity: .7, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = -.48; g.add(ring);
  g.position.set(x, .6, z); scene.add(g); pickups.push({ g, kind, t: rand(0, 6) });
}
function dropPickup(x, z) { addPickup(pick(['pies', 'pies', 'peas', 'peas', 'tea', 'barm']), x, z); }
[['pies', 4, -16], ['peas', -4, -22], ['tea', 7.5, -60], ['pies', -7.5, -64], ['peas', 6, -105], ['barm', -6, -108], ['tea', -7, -150], ['pies', 7, -152], ['peas', -5, -156], ['barm', 5, -189], ['tea', -7.6, -191], ['pies', 7.6, -192]].forEach(([k, x, z]) => addPickup(k, x, z));

// ---------------------------------------------------------------- encounters
const LEVELS = {
  1: { name: 'WESTFIELD STREET', sub: 'The Siege of Westfield Street',
    brief: ['Alrite fettler. Bad news. Wigan have invaded. They came over on a coach, they\'ve took Westfield Street and the bouncers have gone over to their side.',
      'Your mission: get from the kebab shop to the taxi rank alive. Your weapons: whatever we could get from the chippy. Whatever you do, <b>don\'t upset the hen party.</b>'],
    start: ['GET TO THE TAXI RANK', 'Westfield Street, St Helens · Saturday, 11:47pm'], obj: 'Head down Westfield Street to the taxi rank ↓',
    bossName: 'THE HEN PARTY', bossSub: 'Mind the stilettos.', end: ['THE HEN PARTY IS OVER', 'Your taxi\'s here. Get in it.'],
    dead: ['You got battered on Westfield Street.', 'Splatted. Your mam will be ashamed.', 'Knocked out cold outside the chippy.', 'Down and out before last orders.'],
    cheer: ['GET IN!', 'Easy!', 'Wigan! Wigan!', 'WOOOO!'],
    wonSub: 'Saturday night on Westfield Street', wonText: 'The hen party is over, Wigan have gone home on their coach, and the taxi driver only wants forty quid to take you to Parr.',
    ranks: ['LEGEND OF WESTFIELD STREET', 'THATTO HEATH HARDCASE', 'PARR PIE SLINGER', 'LIGHTWEIGHT FROM RAINFORD'],
    exit: { prompt: 'Get in the taxi →', at: new THREE.Vector3(-2, 0, -216), make: () => taxi(-12, -216, Math.PI / 2), pop: true, move: (m, t) => { m.position.x = Math.min(-2, -14 + t * 6); } },
    encounters: [
  { trigger: -14, title: 'WAVE 1 – THE WIGAN ADVANCE PARTY', spawn: () => { spawn('wiganer', -4, -44); spawn('wiganer', 4, -48); spawn('wiganer', 0, -52); spawn('wiganer', 6, -40, 3); spawn('wiganer', -6, -50, 5); } },
  { trigger: -62, title: 'WAVE 2 – THE NITECLUB DOOR', spawn: () => { const b = spawn('bouncer', -7.2, -76); b.cd = 1; spawn('wiganer', 4, -88); spawn('wiganer', -2, -94); spawn('wiganer', 6, -92, 4); spawn('bouncer', 3, -96, 6); } },
  { trigger: -107, title: 'WAVE 3 – CHIPPY CHAOS', spawn: () => { [[-5, -128], [5, -132], [0, -138], [-7, -140], [7, -125], [2, -142]].forEach(([x, z], i) => spawn('wiganer', x, z, i > 3 ? 4 : 0)); spawn('bouncer', -3, -136, 2); spawn('bouncer', 4, -140, 7); } },
  { trigger: -152, title: 'WAVE 4 – THE WIGAN COACH HAS ARRIVED', spawn: () => { for (let i = 0; i < 10; i++) spawn('wiganer', rand(-1, 1) + (i % 2 ? -.5 : .5), -168 - (i % 5) * 1.5, Math.floor(i / 3) * 3.2); coachSpawn = true; } },
  { trigger: -190, title: 'FINAL BOSS – THE HEN PARTY', boss: true, spawn: () => { const b = spawn('bride', 7.4, -205); say(b, 'IT\'S MY HEN DO!!'); for (const [x, z, d] of [[6, -203, 0], [8, -208, 0], [4, -206, 6], [7, -210, 12]]) spawn('hen', x, z, d).minion = true; } },
] },
  2: { name: 'PARR', sub: 'Parr – Take a Fresh Look',
    brief: ['The taxi dropped you in Parr. Forty quid, and he wouldn\'t go any further than the Ramford.',
      'Get across the estate and over the Burgies to catch the milk float out. Word is, Dave Pondlife saw something big up there last Saturday. <b>Something with six legs.</b>'],
    start: ['GET OVER THE BURGIES', 'Parr, St Helens · Sunday, 1:12am'], obj: 'Head through Parr and over the Burgies ↓',
    bossName: 'THE QUEEN OF THE BURGIES', bossSub: 'She\'s not happy.', end: ['THE QUEEN IS SPLATTED', 'The milk float\'s here. Get on it.'],
    dead: ['Done in on the Parr estate.', 'Carried off by giant ants. Nobody will believe you.', 'Splatted on the Burgies.', 'Your mam\'s going to kill you. Again.'],
    cheer: ['GET IN!', 'PARR MASSIVE!', 'SKREEE!', 'Go \'ome!'],
    wonSub: 'Sunday morning in Parr', wonText: 'The Queen of the Burgies is splatted, the estate has gone back to bed and the milkman will drop you at Taylor Park if you help with the gold tops.',
    ranks: ['KING OF THE BURGIES', 'PARR ESTATE LEGEND', 'ANT-AGONIST', 'BITTEN IN BLACKBROOK'],
    exit: { prompt: 'Get on the milk float →', at: new THREE.Vector3(2, 0, -216), make: () => milkFloat(16, -216), move: (m, t) => { m.position.x = Math.max(2.4, 16 - t * 5); } },
    encounters: [
      { trigger: -14, title: 'WAVE 1 – WELCOME TO PARR', spawn: () => { spawn('scally', -4, -42); spawn('scally', 4, -46); spawn('scally', 0, -52); spawn('scally', 6, -40, 3); spawn('scally', -6, -50, 5); } },
      { trigger: -62, title: 'WAVE 2 – THE DRESSING GOWN BRIGADE', spawn: () => { const m = spawn('mum', -7, -76); m.cd = 1; say(m, 'GET IN THIS HOUSE!'); spawn('mum', 6, -84); spawn('scally', -2, -92); spawn('scally', 4, -94, 3); spawn('mum', 0, -96, 6); } },
      { trigger: -107, title: 'WAVE 3 – SOMETHING ON THE BURGIES', sub: 'Giant ants. Dave was right.', spawn: () => { [[-5, -128], [5, -132], [0, -138], [-7, -140], [7, -125]].forEach(([x, z], i) => spawn('ant', x, z, i > 2 ? 2.5 : 0)); spawn('spitter', 2, -142, 1); spawn('spitter', -3, -144, 5); } },
      { trigger: -152, title: 'WAVE 4 – THE NEST', spawn: () => { for (let i = 0; i < 7; i++) spawn('ant', rand(-6, 6), -170 - rand(0, 8), Math.floor(i / 3) * 2.6); spawn('soldier', -3, -176, 1); spawn('soldier', 4, -180, 6); spawn('spitter', 6, -178, 3); } },
      { trigger: -190, title: 'FINAL BOSS – THE QUEEN OF THE BURGIES', boss: true, spawn: () => { const q = spawn('queen', 0, -214); say(q, 'SKREEEEEEEEE!!!'); for (let i = 0; i < 3; i++) { const a = spawn('ant', rand(-6, 6), -206 - i * 2, i * 2); a.minion = true; } } },
    ] },
  3: { name: 'TAYLOR PARK', sub: 'The Battle of Taylor Park',
    brief: ['The milkman dropped you at the gates of Taylor Park. All you\'ve got to do is cut through to the night bus on the far side.',
      'The keepers are still on shift, the bench drinkers want your pies, and the Canada geese have taken over the boating lake. <b>Do not make eye contact with the big one.</b>'],
    start: ['CROSS TAYLOR PARK', 'Taylor Park, St Helens · Sunday, 4:40am'], obj: 'Cut through the park to the night bus ↓',
    bossName: 'MOTHER GOOSE', bossSub: 'HONK.', end: ['MOTHER GOOSE IS COOKED', 'The night bus is here. Get on it.'],
    dead: ['Goosed in Taylor Park.', 'Pecked to bits by the boating lake.', 'Banned from the park. For life.', 'Mother Goose wins again.'],
    cheer: ['HONK!', 'Keep off the grass!', 'HONK HONK!', 'Cheers, mate!'],
    wonSub: 'Dawn over Taylor Park', wonText: 'The geese are beaten, the keepers have gone for a brew, and the night bus is going to Billinge. Where Crank Caverns is. Uh oh.',
    ranks: ['LORD OF TAYLOR PARK', 'GOOSE BOTHERER', 'BANDSTAND BRAWLER', 'PECKED IN PRESCOT'],
    exit: { prompt: 'Get on the night bus →', at: new THREE.Vector3(-3, 0, -217.5), make: () => nightBus(-18, -221), move: (m, t) => { m.position.x = Math.min(-3, -18 + t * 7); } },
    encounters: [
      { trigger: -14, title: 'WAVE 1 – KEEP OFF THE GRASS', spawn: () => { const k = spawn('keeper', -3, -40); say(k, 'Oi! Park\'s shut!'); spawn('goose', 4, -46); spawn('goose', -5, -50); spawn('goose', 6, -52, 3); spawn('keeper', 3, -54, 5); } },
      { trigger: -62, title: 'WAVE 2 – THE BENCH DRINKERS', spawn: () => { [[-7, -78], [6, -84], [-2, -92], [7, -94]].forEach(([x, z], i) => spawn('drinker', x, z, i > 1 ? 3 : 0)); spawn('keeper', 0, -96, 5); } },
      { trigger: -107, title: 'WAVE 3 – THE BOATING LAKE', sub: 'Something is coming out of the water.', spawn: () => { [[6, -120], [8, -126], [5, -132], [7.5, -138], [4.5, -124], [6.5, -142]].forEach(([x, z], i) => spawn('goose', x, z, i > 2 ? 3 : 0)); spawn('drinker', -6, -138, 2); } },
      { trigger: -152, title: 'WAVE 4 – THE BANDSTAND', spawn: () => { spawn('keeper', 2, -168); spawn('keeper', -8, -176, 2); spawn('drinker', 5, -174); spawn('drinker', -2, -180, 4); for (let i = 0; i < 4; i++) spawn('goose', rand(-6, 6), -178 - rand(0, 6), 2 + i * 1.5); } },
      { trigger: -190, title: 'FINAL BOSS – MOTHER GOOSE', boss: true, spawn: () => { const g = spawn('mothergoose', 2, -214); say(g, 'HOOOOOOOONK!!!'); for (let i = 0; i < 3; i++) { const m = spawn('goose', rand(-6, 6), -207 - i * 2, i * 2); m.minion = true; } } },
    ] },
  4: { name: 'THE EAST LANCS', sub: 'Chaos on the East Lancs',
    brief: ['The night bus to Billinge has conked out on the East Lancs. The driver\'s gone for a butty and he\'s not coming back.',
      'Walk it. Fred Flangefelter MP has brought in his Scouse congestion charge and the A580 is in uproar. <b>Mind the traffic – it doesn\'t stop for anyone.</b>'],
    start: ['WALK TO BILLINGE', 'The A580 East Lancs Road · Sunday, 5:20am'], obj: 'Follow the East Lancs to Billinge ↓ (mind the cars)',
    bossName: 'FRED FLANGEFELTER MP', bossSub: 'MP for Pocketnook and Parr Baths.', end: ['FLANGEFELTER HAS BEEN DEFEATED', 'Recount not needed. Here comes your lift.'],
    dead: ['Run over on the East Lancs.', 'Fined, ticketed and flattened.', 'Hubcapped into a coma.', 'Defeated by local government.'],
    cheer: ['Eh, eh, EH!', 'Sound, la!', 'Ticketed!', 'Vote Flangefelter!'],
    wonSub: 'Sunrise on the East Lancs', wonText: 'Flangefelter\'s congestion charge has been scrapped, the Scousers have gone home and a trucker has offered you a lift to Billinge. Crank Caverns awaits.',
    ranks: ['KING OF THE A580', 'HARD SHOULDER HERO', 'LAY-BY LEGEND', 'ROADKILL FROM RAINFORD'],
    exit: { prompt: 'Get in the lorry →', at: new THREE.Vector3(3.5, 0, -214), make: () => lorry(18, -216), move: (m, t) => { m.position.x = Math.max(4, 18 - t * 7); } },
    encounters: [
      { trigger: -14, title: 'WAVE 1 – THE SCOUSE INVASION', sub: 'They\'ve come to protest the charge.', spawn: () => { spawn('scouser', -5, -42); spawn('scouser', 3, -46); spawn('scouser', 6, -50); spawn('scouser', -2, -52, 3); spawn('warden', 0, -48, 5); } },
      { trigger: -62, title: 'WAVE 2 – BIG MICK\'S BUTTY VAN', spawn: () => { const t = spawn('trucker', 6, -74); say(t, 'Oi! Me butty!'); spawn('trucker', -6, -80, 2); spawn('scouser', 2, -90); spawn('warden', -3, -94, 3); spawn('scouser', 6, -96, 5); } },
      { trigger: -107, title: 'WAVE 3 – ROAD WORKS AHEAD', sub: 'Expect delays.', spawn: () => { spawn('roadworker', -4, -128); spawn('roadworker', 4, -132); spawn('warden', 0, -138); spawn('scouser', -7, -140, 2); spawn('roadworker', 7, -142, 5); } },
      { trigger: -152, title: 'WAVE 4 – RUSH HOUR', sub: 'The traffic\'s getting faster.', spawn: () => { for (let i = 0; i < 6; i++) spawn('scouser', rand(-8, 8), -168 - rand(0, 10), Math.floor(i / 2) * 2.5); spawn('trucker', 2, -176, 1); spawn('warden', -5, -178, 4); } },
      { trigger: -190, title: 'FINAL BOSS – FRED FLANGEFELTER MP', boss: true, spawn: () => { const m = spawn('mp', 0, -214); say(m, 'CONGESTION CHARGE! FIVE POUND!'); for (let i = 0; i < 3; i++) { const w = spawn(i ? 'scouser' : 'warden', rand(-6, 6), -206 - i * 2, i * 2); w.minion = true; } } },
    ] },
  5: { name: 'CRANK CAVERNS', sub: 'The Secret of Crank Caverns',
    brief: ['Billinge. Under the hill lie the old sandstone tunnels of Crank Caverns, and something has been coming and going all night. Lorries. Full of pies.',
      'This is where it all started. Somebody is behind the Wigan invasion, and they\'re hiding down there. <b>Find them. End it.</b>'],
    start: ['INTO CRANK CAVERNS', 'Crank, near Billinge · Sunday, 6:10am'], obj: 'Go deeper into the caverns ↓',
    bossName: 'THE PIE BARON OF WIGAN', bossSub: 'The mastermind behind it all.', end: ['THE PIE BARON IS SPLATTED', 'St Helens is saved. Walk into the daylight.'],
    dead: ['Lost forever in Crank Caverns.', 'Baked into a pie.', 'Mauled by the Beast.', 'The Pie Baron laughs last.'],
    cheer: ['WIGAN!', 'FOR THE PIE BARON!', 'RAAARGH!', '*screech*'],
    wonSub: 'You saved St Helens', wonText: 'The Pie Baron is splatted, his secret pie mine is shut, Wigan have retreated back up the East Lancs and St Helens is safe. SHCN will be dining out on this story for the next twenty years. Brian Thong salutes you.',
    ranks: ['SAVIOUR OF ST HELENS', 'HERO OF CRANK CAVERNS', 'PIE MINE BUSTER', 'BATTERED IN BILLINGE'],
    exit: { prompt: 'Walk into the daylight ↓', at: new THREE.Vector3(0, 0, -226), make: () => daylight(), move: () => {} },
    encounters: [
      { trigger: -14, title: 'WAVE 1 – SOMETHING IN THE DARK', spawn: () => { for (let i = 0; i < 6; i++) spawn('bat', rand(-7, 7), -40 - rand(0, 12), i > 3 ? 2.5 : 0); spawn('hermit', 5, -50, 1); } },
      { trigger: -62, title: 'WAVE 2 – THE PIE MINE', sub: 'Wiganers. Down here?!', spawn: () => { spawn('pitman', -4, -78); spawn('pitman', 4, -82); spawn('wiganer', -6, -92); spawn('wiganer', 6, -94, 2); spawn('hermit', 0, -96, 4); } },
      { trigger: -107, title: 'WAVE 3 – WHERE THE ANTS CAME FROM', sub: 'So that\'s how they got to the Burgies.', spawn: () => { [[-5, -128], [5, -132], [0, -138], [-7, -140]].forEach(([x, z], i) => spawn('ant', x, z, i > 1 ? 2 : 0)); spawn('spitter', 4, -142, 1); for (let i = 0; i < 3; i++) spawn('bat', rand(-6, 6), -136, 3 + i); } },
      { trigger: -152, title: 'WAVE 4 – THE BEAST OF CRANK CAVERNS', sub: 'It\'s real. It\'s really real.', spawn: () => { const b = spawn('beast', 0, -178); say(b, 'RAAAARGH!'); spawn('pitman', -5, -172, 3); spawn('pitman', 5, -174, 6); } },
      { trigger: -190, title: 'FINAL BOSS – THE PIE BARON OF WIGAN', boss: true, spawn: () => { const b = spawn('piebaron', 0, -214); say(b, 'I AM THE PIE BARON!'); for (let i = 0; i < 4; i++) { const w = spawn(i % 2 ? 'pitman' : 'wiganer', rand(-6, 6), -206 - i * 2, i * 1.8); w.minion = true; } } },
    ] },
};
const LV = LEVELS[LEVEL_N];
const ENCOUNTERS = LV.encounters;
let coachSpawn = false;

// ---------------------------------------------------------------- HUD
const H = { hp: $('ph-hp'), hpTxt: $('ph-hptxt'), weap: $('ph-weap'), ammo: $('ph-ammo'), gren: $('ph-gren'), obj: $('ph-obj'), feed: $('ph-feed'), toast: $('ph-toast'),
  hit: $('ph-hit'), vig: $('ph-vig'), boss: $('ph-boss'), bossBar: $('ph-bossbar'), bossName: $('ph-bossname'), banner: $('ph-banner'), score: $('ph-score'), hudWrap: $('ph-hud') };
let score = 0;
const stats = { shots: 0, hits: 0, kos: 0, dmg: 0, taken: 0, start: 0, time: 0 };
function hud() {
  H.hp.style.width = player.hp + '%'; H.hp.style.background = player.hp < 30 ? '#e8303a' : '#39ff14'; H.hpTxt.textContent = Math.ceil(player.hp);
  H.weap.textContent = WEAPONS[player.weapon].name; H.ammo.textContent = `${player.ammo[player.weapon]} ${WEAPONS[player.weapon].ammoName}`;
  H.gren.textContent = `BARM CAKES × ${player.grenades}`; H.score.textContent = 'SCORE ' + score;
}
let toastT = 0; function toast(t) { H.toast.textContent = t; H.toast.style.opacity = 1; toastT = 2.2; }
function killfeed(t) { const d = document.createElement('div'); d.textContent = t; H.feed.prepend(d); setTimeout(() => d.remove(), 3500); while (H.feed.children.length > 5) H.feed.lastChild.remove(); }
let hitT = 0; function hitMarker(big) { H.hit.style.opacity = 1; H.hit.style.transform = `translate(-50%,-50%) scale(${big ? 1.6 : 1})`; hitT = .15; }
let bannerT = 0; function banner(t, sub) { H.banner.innerHTML = `<b>${t}</b>${sub ? `<span>${sub}</span>` : ''}`; H.banner.style.opacity = 1; bannerT = 3; SFX.wave(); }
let shake = 0, lastVig = -1, lastObj = '';
function setObj(t) { if (t !== lastObj) { H.obj.textContent = t; lastObj = t; } }

// ---------------------------------------------------------------- game state
const state = { mode: 'title', enc: -1, cleared: -1, checkpoint: 0, won: false };
const CHECKPOINTS = [0, -58, -103, -148, -188];
function resetRun() {
  for (const e of enemies) scene.remove(e.g); enemies.length = 0;
  for (const s of shots) scene.remove(s.m); shots.length = 0; for (const s of eshots) scene.remove(s.m); eshots.length = 0;
  barrierObjs.forEach((b) => { b.visible = true; b.position.y = 0; });
  state.enc = -1; state.cleared = -1; state.checkpoint = 0; coachSpawn = false; state.won = false; taxiArrive = null;
  player.pos.set(0, 0, 0); player.vel.set(0, 0, 0); player.yaw = 0; player.pitch = 0; player.hp = 100; player.alive = true;
  player.ammo = [14, 18]; player.grenades = 2; player.weapon = 1; setWeapon(0);
  score = 0; Object.assign(stats, { shots: 0, hits: 0, kos: 0, dmg: 0, taken: 0, start: performance.now(), time: 0 });
  H.boss.style.display = 'none'; hud();
}
function respawn() {
  // back to the last checkpoint, current encounter reset
  for (const e of enemies) if (!e.dead) scene.remove(e.g);
  for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].dead) enemies.splice(i, 1);
  for (const s of eshots) scene.remove(s.m); eshots.length = 0;
  state.enc = state.cleared; coachSpawn = false;
  const cp = CHECKPOINTS[state.cleared + 1] || 0;
  player.pos.set(0, 0, cp); player.vel.set(0, 0, 0); player.yaw = 0; player.pitch = 0; player.hp = 100; player.alive = true;
  player.ammo[0] = Math.max(player.ammo[0], 10); player.ammo[1] = Math.max(player.ammo[1], 12); player.grenades = Math.max(player.grenades, 1);
  score = Math.max(0, score - 250); H.boss.style.display = 'none'; hud();
}

function start() {
  audio(); if (AC && AC.state === 'suspended') AC.resume();
  if (state.mode === 'title' || state.mode === 'won') { resetRun(); banner(LV.start[0], LV.start[1]); }
  if (state.mode === 'dead') { respawn(); banner('BACK ON YER FEET', 'Last checkpoint · −250 points'); }
  state.mode = 'play'; overlay(null);
  if (TOUCH) { locked = true; goFullscreen(); }
  else canvas.requestPointerLock && canvas.requestPointerLock();
}
function pause() { if (state.mode !== 'play') return; state.mode = 'paused'; mouseDown = false; overlay('pause'); }
function die() {
  for (const e of enemies) if (!e.dead && e.delay <= 0) { e.throwT = 0; e.c.ctl.loop('Cheer'); say(e, pick(LV.cheer)); }
  player.alive = false; state.mode = 'dead'; mouseDown = false; document.exitPointerLock && document.exitPointerLock();
  $('ph-dead-msg').textContent = pick(LV.dead);
  overlay('dead');
}
let taxiArrive = null;
function win() {
  state.mode = 'won'; state.won = true; mouseDown = false; document.exitPointerLock && document.exitPointerLock();
  stats.time = (performance.now() - stats.start) / 1000;
  const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
  const timeBonus = Math.max(0, Math.round(1500 - stats.time * 4)), hpBonus = Math.round(player.hp * 10);
  score += timeBonus + hpBonus;
  const best = STORE.get(BEST_KEY, 0); const newBest = score > best; if (newBest) STORE.set(BEST_KEY, score);
  if (STORE.get('ph-unlocked', 1) < LEVEL_N + 1) STORE.set('ph-unlocked', Math.min(5, LEVEL_N + 1));
  const R = LV.ranks, rank = score > 9000 ? R[0] : score > 6500 ? R[1] : score > 4000 ? R[2] : R[3];
  $('ph-win-stats').innerHTML = `<div><span>Time</span><b>${Math.floor(stats.time / 60)}:${String(Math.floor(stats.time % 60)).padStart(2, '0')}</b></div>
    <div><span>Splatted</span><b>${stats.kos}</b></div><div><span>Accuracy</span><b>${acc}%</b></div><div><span>Time bonus</span><b>+${timeBonus}</b></div>
    <div><span>Health bonus</span><b>+${hpBonus}</b></div><div><span>Final score</span><b>${score}${newBest ? ' ★ NEW BEST' : ''}</b></div>`;
  $('ph-rank').textContent = rank;
  overlay('won');
}
function overlay(which) {
  for (const id of ['title', 'pause', 'dead', 'won']) $('ph-' + id).hidden = id !== which;
  H.hudWrap.style.display = which ? 'none' : 'block';
  document.body.classList.toggle('playing', !which);
}
if (TOUCH) $('ph-start').textContent = 'Tap to play';
const startBtn = $('ph-start'), startLabel = startBtn.textContent;
startBtn.disabled = true; startBtn.textContent = 'Loading the lads… 0%';
loadCharacters((f) => { startBtn.textContent = `Loading the lads… ${Math.round(f * 100)}%`; })
  .then(() => { startBtn.disabled = false; startBtn.textContent = startLabel; })
  .catch((err) => { console.error(err); startBtn.textContent = 'Could not load the characters – refresh to try again'; });
startBtn.addEventListener('click', start);
$('ph-resume').addEventListener('click', start);
$('ph-retry').addEventListener('click', start);
$('ph-again').addEventListener('click', () => { state.mode = 'won'; start(); });
$('ph-restart').addEventListener('click', () => { state.mode = 'title'; start(); });
$('ph-sens').value = sens; $('ph-sens').addEventListener('input', (e) => { sens = +e.target.value; STORE.set('ph-sens', sens); });
$('ph-vol').value = STORE.get('ph-vol', .7); $('ph-vol').addEventListener('input', (e) => { STORE.set('ph-vol', +e.target.value); if (master) master.gain.value = +e.target.value; });
canvas.addEventListener('click', () => { if (!TOUCH && state.mode === 'play' && !locked) canvas.requestPointerLock(); });
const BEST_KEY = LEVEL_N === 1 ? 'ph-best' : 'ph-best-' + LEVEL_N;
$('ph-best').textContent = STORE.get(BEST_KEY, 0) ? 'Your best on this level: ' + STORE.get(BEST_KEY, 0) : '';
// level-specific words on the overlays
document.querySelector('#ph-title h1 small').textContent = LV.sub;
document.querySelector('#ph-title .brief div:last-child').innerHTML = LV.brief.map((p) => `<p>${p}</p>`).join('');
document.querySelector('#ph-won h1 small').textContent = LV.wonSub;
$('ph-won-text').textContent = LV.wonText;
$('ph-restart').textContent = 'Start this level again';
if (LEVEL_N > 1) document.title = `PIE HARD – Level ${LEVEL_N}: ${LV.name} | St Helens Celebrity News`;
const unlocked = Math.max(STORE.get('ph-unlocked', 1), LEVEL_N);
$('ph-levels').innerHTML = [1, 2, 3, 4, 5].map((n) => n <= unlocked
  ? `<a class="lvl${n === LEVEL_N ? ' on' : ''}" href="${n === 1 ? './' : '?level=' + n}"><b>${n}</b>${LEVELS[n].name}</a>`
  : `<span class="lvl locked"><b>${n}</b>LOCKED</span>`).join('');
if (LEVEL_N < 5) { $('ph-next').hidden = false; $('ph-next').textContent = `Next level: ${LEVELS[LEVEL_N + 1].name} →`; $('ph-next').addEventListener('click', () => { location.href = '?level=' + (LEVEL_N + 1); }); }
else $('ph-soon').textContent = 'That\'s the lot – you\'ve completed PIE HARD. St Helens salutes you.';

// ---------------------------------------------------------------- update
function collide(pos, r) {
  pos.x = clamp(pos.x, -STREET_HALF + r, STREET_HALF - r);
  const barrierZ = state.cleared + 1 < BARRIERS.length ? BARRIERS[state.cleared + 1] : END_Z;
  pos.z = clamp(pos.z, Math.max(END_Z + r + .5, barrierZ + r), START_Z - r);
  for (const c of colliders) {
    const cx = clamp(pos.x, c.minX, c.maxX), cz = clamp(pos.z, c.minZ, c.maxZ), dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) { const d = Math.sqrt(d2); pos.x = cx + dx / d * r; pos.z = cz + dz / d * r; }
      else { const ox = Math.min(pos.x - c.minX, c.maxX - pos.x), oz = Math.min(pos.z - c.minZ, c.maxZ - pos.z); if (ox < oz) pos.x = pos.x - c.minX < c.maxX - pos.x ? c.minX - r : c.maxX + r; else pos.z = pos.z - c.minZ < c.maxZ - pos.z ? c.minZ - r : c.maxZ + r; }
    }
  }
}
function updatePlayer(dt) {
  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)), r = new THREE.Vector3(-f.z, 0, f.x);
  const want = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) want.add(f); if (keys.KeyS || keys.ArrowDown) want.sub(f);
  if (keys.KeyD || keys.ArrowRight) want.add(r); if (keys.KeyA || keys.ArrowLeft) want.sub(r);
  const stickMag = Math.hypot(stick.x, stick.y);
  if (stickMag > .15) { want.addScaledVector(f, -stick.y); want.addScaledVector(r, stick.x); }
  const sprint = keys.ShiftLeft || keys.ShiftRight || stickMag > .95, speed = sprint ? 8.2 : 5.4;
  if (want.lengthSq()) want.normalize().multiplyScalar(speed);
  const acc = player.onGround ? 12 : 3;
  player.vel.x += (want.x - player.vel.x) * Math.min(1, acc * dt); player.vel.z += (want.z - player.vel.z) * Math.min(1, acc * dt);
  if (keys.Space && player.onGround) { player.vel.y = 5.6; player.onGround = false; }
  player.vel.y -= 16 * dt;
  player.pos.addScaledVector(player.vel, dt);
  if (player.pos.y <= 0) { player.pos.y = 0; player.vel.y = 0; player.onGround = true; }
  collide(player.pos, .4);
  const moving = Math.hypot(player.vel.x, player.vel.z);
  player.bob += dt * moving * 1.6;
  if (mouseDown) fire();
  // catch your breath: slowly heal back up to 50 after 4 seconds without being hit
  player.calmT = (player.calmT || 0) + dt; if (player.alive && player.calmT > 4 && player.hp < 50) { player.hp = Math.min(50, player.hp + 4 * dt); hud(); }
  player.cool -= dt; player.clickCool = (player.clickCool || 0) - dt; swapT -= dt;
}
function updateEnemies(dt, t) {
  const pp = player.pos;
  let bossAlive = 0, bossHp = 0, bossMax = 0;
  for (const e of enemies) {
    const g = e.g, C = e.c;
    C.material.userData.flash.value = e.hitT > 0 ? e.hitT / .15 * .55 : 0;
    if (e.delay > 0) { e.delay -= dt; if (e.delay <= 0) { g.visible = true; if (coachSpawn && e.type === 'wiganer') g.position.set(rand(.8, 1.2), 0, -166 + rand(-2, 2)); burst(g.position.clone().setY(1), e.T.creature ? (e.type.includes('goose') ? 'feather' : 'acid') : 'barm', 6, 2); } continue; }
    if (e.dead) {
      if (e.hitT > 0) e.hitT -= dt;
      e.deadT += dt; if (e.deadT < 4) C.ctl.update(dt);
      if (e.stars) e.stars.rotation.y += dt * 4;
      if (e.deadT > 5) { g.visible = false; }
      continue;
    }
    if (e.T.boss || e.minion) { bossAlive++; bossHp += Math.max(0, e.hp); bossMax += e.max; }
    const to = new THREE.Vector3(pp.x - g.position.x, 0, pp.z - g.position.z), dist = to.length(); to.normalize();
    g.rotation.y = Math.atan2(to.x, to.z);
    const [near, far] = e.T.range;
    const mv = new THREE.Vector3();
    if (dist > far) mv.add(to);
    else if (dist < near) mv.sub(to);
    e.strafeT -= dt; if (e.strafeT <= 0) { e.strafe *= -1; e.strafeT = rand(1, 3); }
    if (!e.T.melee && dist < far + 2) mv.add(new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(e.strafe * .7));
    // separation
    for (const o of enemies) if (o !== e && !o.dead && o.delay <= 0) { const dx = g.position.x - o.g.position.x, dz = g.position.z - o.g.position.z, d2 = dx * dx + dz * dz; if (d2 < 1.2 && d2 > 1e-4) mv.add(new THREE.Vector3(dx, 0, dz).multiplyScalar(.6 / d2)); }
    const spd = e.T.speed * (e.hitT > 0 ? .3 : 1);
    if (mv.lengthSq() > .01) { mv.normalize(); g.position.addScaledVector(mv, spd * dt); e.walk += dt * spd * 3; }
    const before = g.position.clone(); const tmp = new THREE.Vector3(g.position.x, 0, g.position.z);
    tmp.x = clamp(tmp.x, -STREET_HALF + .4, STREET_HALF - .4); tmp.z = clamp(tmp.z, END_Z + 1, START_Z - 1);
    for (const c of colliders) { const cx = clamp(tmp.x, c.minX, c.maxX), cz = clamp(tmp.z, c.minZ, c.maxZ), dx = tmp.x - cx, dz = tmp.z - cz, d2 = dx * dx + dz * dz; if (d2 < .16 && d2 > 1e-6) { const d = Math.sqrt(d2); tmp.x = cx + dx / d * .4; tmp.z = cz + dz / d * .4; } }
    g.position.x = tmp.x; g.position.z = tmp.z;
    // animate
    if (e.T.spawner) { e.spawnT -= dt; if (e.spawnT <= 0) { e.spawnT = rand(4.5, 7); if (enemies.filter((o) => !o.dead).length < 9) { const m = spawn(e.T.spawner, clamp(g.position.x + rand(-3, 3), -8, 8), g.position.z + rand(-1, 2)); m.minion = true; m.cd = rand(1, 2); burst(m.g.position.clone().setY(1), e.type === 'queen' ? 'acid' : 'feather', 10, 3); } } }
    if (mv.lengthSq() > .01) { if (spd > 3.6) C.ctl.loop('Running_A', spd / 5.2); else C.ctl.loop('Walking_A', spd / 2.6); }
    else C.ctl.loop('Unarmed_Idle');
    if (e.hitT > 0) e.hitT -= dt;
    if (e.throwT > 0) { e.throwT -= dt; if (e.throwT <= 0) launchThrow(e); }
    if (dist < 40) C.ctl.update(dt);
    // attack
    e.cd -= dt;
    if (e.cd <= 0 && dist < (e.T.melee ? far + .6 : 26)) {
      e.cd = rand(e.T.cd[0], e.T.cd[1]) * EASY.cd;
      if (e.T.melee) { if (dist < far + .6) { C.ctl.once(Math.random() < .7 ? 'Unarmed_Melee_Attack_Punch_A' : 'Unarmed_Melee_Attack_Kick', 1.4); if (e.T.sfx) SFX[e.T.sfx](e.T.boss); hurtPlayer(e.T.dmg, pick(e.T.meleeLines || ['Bouncer gave you a slap!', 'Thrown out!', 'Headlocked!'])); } }
      else if (e.T.mixed || e.type === 'hen' || e.type === 'bride') { if (dist < 2.2) { C.ctl.once('Unarmed_Melee_Attack_Punch_A', 1.5); hurtPlayer(e.T.dmg, pick(e.T.meleeLines || ['Handbagged!'])); } else enemyThrow(e); }
      else enemyThrow(e);
    }
    if (e.sayT > 0) { e.sayT -= dt; if (e.sayT <= 0 && e.bubble) { g.remove(e.bubble); e.bubble = null; } }
    else if (Math.random() < dt * (e.T.boss ? .35 : .12) && dist < 22) say(e, pick(e.T.quips));
  }
  if (bossMax > 0 && state.enc === ENCOUNTERS.length - 1) { H.boss.style.display = bossAlive ? 'block' : 'none'; H.bossBar.style.width = (bossHp / bossMax * 100) + '%'; }
}
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.t -= dt; s.m.rotation.x += dt * 8; s.m.rotation.y += dt * 5;
    let hit = s.t <= 0 && s.kind === 'barm';
    const p = s.m.position;
    // move in small steps so fast pies can't skip through someone
    const steps = Math.max(1, Math.ceil(s.v.length() * dt / .25)), sd = dt / steps;
    for (let k = 0; k < steps && !hit; k++) {
      s.v.y -= 9.8 * sd; p.addScaledVector(s.v, sd);
      if (s.kind === 'pie') for (const e of enemies) { if (e.dead || e.delay > 0) continue; const dx = p.x - e.g.position.x, dz = p.z - e.g.position.z; if (dx * dx + dz * dz < (.55 * e.scale) ** 2 && p.y < 2.3 * e.scale) { damageEnemy(e, 34, s.v.clone()); stats.hits++; hitMarker(); hit = true; break; } }
      if (p.y <= .05) break;
    }
    if (!hit && (p.y <= .05 || Math.abs(p.x) > 9.9 || s.t <= 0)) hit = true;
    if (!hit && p.y < 1.2) for (const c of colliders) if (p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ) { hit = true; break; }
    if (s.kind === 'barm' && hit && s.t > 0 && p.y <= .05) { s.v.y = Math.abs(s.v.y) * .35; s.v.x *= .6; s.v.z *= .6; p.y = .06; hit = false; }
    if (hit) {
      if (s.kind === 'barm') explode(p, 5.5, 95, 'barm'); else explode(p, 1.8, 14, 'pie');
      if (Math.abs(p.x) > 9.8) decal(new THREE.Vector3(Math.sign(p.x) * 9.95, p.y, p.z), new THREE.Vector3(-Math.sign(p.x), 0, 0), 'pie', .45);
      scene.remove(s.m); shots.splice(i, 1);
    }
  }
  const eye = eyePos();
  for (let i = eshots.length - 1; i >= 0; i--) {
    const s = eshots[i]; s.t -= dt; s.v.y -= s.g * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 10;
    const p = s.m.position, dx = p.x - eye.x, dz = p.z - eye.z;
    let gone = s.t <= 0 || p.y <= .05;
    if (!gone && dx * dx + dz * dz < .42 && p.y > player.pos.y + .2 && p.y < eye.y + .3) { hurtPlayer(s.dmg, pick(PROJ[s.kind].hit)); gone = true; }
    if (gone) { burst(p, PROJ[s.kind].burst, 6, 2); scene.remove(s.m); eshots.splice(i, 1); }
  }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t -= dt; f.v.y -= 12 * dt; f.m.position.addScaledVector(f.v, dt); if (f.m.position.y < .03) { f.m.position.y = .03; f.v.multiplyScalar(.4); } if (f.t <= 0) { scene.remove(f.m); fx.splice(i, 1); } }
}
function updateEncounters() {
  const z = player.pos.z;
  const next = state.enc + 1;
  if (next < ENCOUNTERS.length && z < ENCOUNTERS[next].trigger && state.cleared === state.enc) {
    const E = ENCOUNTERS[next]; state.enc = next; E.spawn(); banner(E.title, E.boss ? LV.bossSub : E.sub || null);
    if (E.boss) { H.boss.style.display = 'block'; H.bossName.textContent = LV.bossName; }
  }
  if (state.enc > state.cleared) {
    const live = enemies.filter((e) => !e.dead).length;
    if (live === 0) {
      state.cleared = state.enc;
      if (state.cleared < BARRIERS.length) { barrierObjs[state.cleared].userData.drop = true; banner('AREA CLEAR', 'The barriers are coming down. Keep moving.'); score += 250; }
      else { H.boss.style.display = 'none'; banner(LV.end[0], LV.end[1]); setObj('Wait for it…'); taxiArrive = { t: 0 }; score += 1000; }
      hud();
    }
  }
  barrierObjs.forEach((b) => { if (b.userData.drop && b.visible) { b.position.y -= .03; if (b.position.y < -1.4) b.visible = false; } });
  if (taxiArrive) {
    taxiArrive.t += lastDt;
    if (!taxiArrive.mesh) { taxiArrive.mesh = LV.exit.make(); if (LV.exit.pop) colliders.pop(); }
    LV.exit.move(taxiArrive.mesh, taxiArrive.t);
    if (taxiArrive.t > 2 && player.pos.distanceTo(LV.exit.at) < 3.4) win();
    if (taxiArrive.t > 2) setObj(LV.exit.prompt);
  }
}

// ---------------------------------------------------------------- loop
let lastDt = 0;
const clock = new THREE.Clock(); let t = 0, fpsAcc = 0, fpsN = 0, frameNo = 0, lastReal = performance.now(), slowAcc = 0, fastAcc = 0;
function frame() {
  const dt = Math.min(.05, clock.getDelta()); t += dt; lastDt = dt;
  if (state.mode === 'play') {
    updatePlayer(dt); updateEnemies(dt, t); updateShots(dt); updateEncounters(); updateTraffic(dt);
    if (state.mode === 'play') stats.time = (performance.now() - stats.start) / 1000;
  } else if (state.mode === 'dead' || state.mode === 'won') {
    for (const e of enemies) if (e.delay <= 0 && (!e.dead || e.deadT < 4)) { if (e.dead) e.deadT += dt; e.c.ctl.update(dt); }
  } else if (state.mode === 'title') {
    // slow flythrough on the title screen
    player.pos.set(Math.sin(t * .1) * 3, 0, -40 - Math.sin(t * .05) * 30); player.yaw = Math.sin(t * .13) * .5; player.pitch = .05;
  }
  // camera
  const bob = Math.sin(player.bob * 2) * .045 * (player.onGround ? 1 : 0);
  camera.position.set(player.pos.x, player.pos.y + 1.65 + bob, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * .1; camera.position.y += rand(-1, 1) * shake * .1; shake = Math.max(0, shake - dt * 1.5); }
  // viewmodel
  kick = Math.max(0, kick - dt * 6);
  vm.position.set(Math.cos(player.bob) * .012, Math.abs(Math.sin(player.bob)) * .012 - (swapT > 0 ? swapT : 0), kick * .08);
  vm.rotation.x = kick * .25;
  // weather: showers come and go; sound and rain fade together
  weather.t -= dt; if (weather.t <= 0) { weather.on = RAINY && !weather.on; weather.t = weather.on ? rand(15, 25) : rand(35, 55); }
  weather.wet = clamp(weather.wet + (weather.on ? 1 : -1) * dt * .5, 0, 1);
  rain.visible = weather.wet > .01; rain.material.opacity = .55 * weather.wet;
  if (rainGain) rainGain.gain.value = rain.visible ? .07 * weather.wet : 0;
  // rain follows the player
  const rp = rainGeo.attributes.position.array;
  if (rain.visible) {
    for (let i = 0; i < RAIN; i++) { const k = i * 6;
      rp[k + 1] -= dt * 16; rp[k + 4] -= dt * 16;
      if (rp[k + 4] < 0) { const x = camera.position.x + rand(-12, 12), y = rand(12, 17), z = camera.position.z + rand(-26, 10); rp[k] = x; rp[k + 1] = y; rp[k + 2] = z; rp[k + 3] = x - .06; rp[k + 4] = y - .75; rp[k + 5] = z; }
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
  // lights follow the player; neon flicker
  if ((frameNo++ & 7) === 0) updateLightPools();
  for (const L of NEON_POOL) L.intensity = L.userData.flick && Math.random() < .04 ? 1.5 : 7;
  for (const p of pickups) { p.t += dt; p.g.rotation.y += dt * 1.6; p.g.position.y = .6 + Math.sin(p.t * 2) * .08;
    if (state.mode === 'play' && p.g.visible && p.g.position.distanceTo(new THREE.Vector3(player.pos.x, .6, player.pos.z)) < 1.2) { PICK[p.kind].apply(); p.g.visible = false; SFX.pickup(); toast(PICK[p.kind].label); hud(); } }
  // club music volume by distance to NITECLUB
  if (clubGain) clubGain.gain.value = LEVEL_N === 1 && (state.mode === 'play' || state.mode === 'title') ? clamp(1 - Math.abs(player.pos.z + 76) / 40, 0, 1) * .5 : 0;
  // HUD timers
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) H.toast.style.opacity = 0; }
  if (hitT > 0) { hitT -= dt; if (hitT <= 0) H.hit.style.opacity = 0; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) H.banner.style.opacity = 0; }
  if (player.hurtT > 0) player.hurtT -= dt;
  const vig = Math.round(Math.max(player.hurtT * 1.6, player.hp < 30 ? .35 + Math.sin(t * 6) * .1 : 0) * 20) / 20;
  if (vig !== lastVig) { H.vig.style.opacity = vig; lastVig = vig; }
  if (state.mode === 'play' && !taxiArrive) {
    const live = enemies.filter((e) => !e.dead && e.delay <= 0).length;
    setObj(state.enc > state.cleared ? `Splat them all · ${live} left` : LV.obj);
  }
  renderer.render(scene, camera);
  const now = performance.now(), real = now - lastReal; lastReal = now;
  fpsAcc += real; fpsN++; if (fpsAcc > 2000) { window.__phFps = Math.round(fpsN * 1000 / fpsAcc); fpsAcc = 0; fpsN = 0; }
  // adaptive resolution: keep it smooth on slower laptops
  if (real > 26) { slowAcc += real; fastAcc = 0; } else if (real < 13) { fastAcc += real; slowAcc = 0; }
  if (slowAcc > 1500 && pixelRatio > .6) { pixelRatio = Math.max(.6, pixelRatio - .15); renderer.setPixelRatio(pixelRatio); resize(); slowAcc = 0; }
  if (fastAcc > 4000 && pixelRatio < Math.min(window.devicePixelRatio, 1.5)) { pixelRatio = Math.min(Math.min(window.devicePixelRatio, 1.5), pixelRatio + .1); renderer.setPixelRatio(pixelRatio); resize(); fastAcc = 0; }
  requestAnimationFrame(frame);
}
hud(); overlay('title'); frame();
window.__ph = { state, player, enemies, start, ENCOUNTERS, fire, throwGrenade, setWeapon, stats, damageEnemy, get score() { return score; }, weather, get taxi() { return taxiArrive; }, exitAt: LV.exit.at, cars, renderer, scene, fx, decals };
