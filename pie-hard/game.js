// PIE HARD: The Siege of Westfield Street – an SHCN original.
// First-person food fight. Three.js, everything else built in code.
import * as THREE from './three.module.min.js';

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
const STREET_HALF = 9.4, END_Z = -228, START_Z = 6;

scene.add(new THREE.HemisphereLight(0x7a6ab8, 0x2a1830, 1.25));
scene.add(new THREE.AmbientLight(0x40385a, 0.9));
const moon = new THREE.DirectionalLight(0x8a9cff, 0.35); moon.position.set(-30, 60, 20); scene.add(moon);

// ground: road, pavements, kerbs
const roadTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#2a2830'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rand(80, 140)},${rand(80, 140)},${rand(90, 150)},${rand(.05, .2)})`; g.fillRect(rand(0, w), rand(0, h), 2, 2); }
  g.fillStyle = '#d8d8d8'; g.fillRect(124, 20, 8, 90); g.fillRect(124, 148, 8, 90);
}, [1, 30]);
const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 240), lam({ map: roadTex }));
road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -112); scene.add(road);
const paveTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#5d5866'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a4552'; g.lineWidth = 3;
  for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${rand(.03, .12)})`; g.fillRect(rand(0, w), rand(0, h), 3, 3); }
}, [2, 60]);
for (const s of [-1, 1]) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(4, .16, 240), lam({ map: paveTex })); p.position.set(s * 8, .08, -112); scene.add(p);
  const k = new THREE.Mesh(new THREE.BoxGeometry(.25, .18, 240), lam({ color: 0x8a8590 })); k.position.set(s * 6.05, .09, -112); scene.add(k);
}
// puddles
const puddleMat = new THREE.MeshPhongMaterial({ color: 0x1a1430, specular: 0xaa88ff, shininess: 90, transparent: true, opacity: .8 });
for (let i = 0; i < 26; i++) {
  const pd = new THREE.Mesh(new THREE.CircleGeometry(rand(.6, 1.8), 18), puddleMat);
  pd.rotation.x = -Math.PI / 2; pd.scale.set(1, rand(.4, 1), 1); pd.position.set(rand(-5.5, 5.5), .012, rand(-220, 0)); scene.add(pd);
}

// buildings + shopfronts
const SHOPS = {
  right: [[2, 'KEBABS', '#ff3b6b', 'lit'], [-30, 'THE BLOOD TUB', '#ffb13b', 'lit'], [-58, 'OFFIE', '#7cff4f', 'lit'], [-92, 'TANNING', '#ff4fd8', 'dark'],
          [-120, 'CHIPPY', '#ffb13b', 'lit'], [-150, 'BOOKIES', '#39e0ff', 'shutter'], [-178, 'PIZZA', '#ff6a3b', 'lit'], [-204, 'BAR', '#ff4fd8', 'lit']],
  left:  [[-8, 'VAPES', '#7cff4f', 'lit'], [-36, 'PAWN', '#ffe14f', 'shutter'], [-76, 'NITECLUB', '#39e0ff', 'lit'], [-106, 'BAKERY', '#39a0ff', 'dark'],
          [-136, 'CASH 4 GOLD', '#ffe14f', 'lit'], [-164, 'TO LET', '#bbbbbb', 'dark'], [-196, 'KARAOKE', '#b06bff', 'lit'], [-220, 'TAXIS', '#7cff4f', 'lit']]
};
const neonSpots = [], lampSpots = [];
const glowTexCache = {};
function glowMat(col) {
  if (!glowTexCache[col]) {
    const t = canvasTex(128, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, col + 'aa'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    glowTexCache[col] = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55 });
  }
  return glowTexCache[col];
}
const BRICKS = [['#7a3a2a', '#3a2a28'], ['#8a4a32', '#40302c'], ['#5e4a5a', '#2c2430'], ['#6a5040', '#33281f'], ['#4c4a5c', '#26242e']];
for (const side of ['left', 'right']) {
  const sx = side === 'left' ? -1 : 1, list = SHOPS[side];
  for (let i = 0; i < list.length; i++) {
    const [z0, name, neon, kind] = list[i];
    const zNext = i + 1 < list.length ? list[i + 1][0] : END_Z - 6;
    const len = Math.abs(zNext - z0) - (Math.random() < .5 ? 2.2 : 0);       // occasional alley gap
    const zc = z0 - len / 2 + 4, floors = pick([2, 3, 3, 4]), hgt = 3.6 + floors * 3;
    const [bc, mc] = pick(BRICKS);
    const bmat = lam({ map: facadeTex(bc, floors, .45) });
    const plain = lam({ map: brickTex(bc, mc) });
    const geo = new THREE.BoxGeometry(10, hgt, len);
    // material order: +x, -x, +y, -y, +z, -z ; street face is -x for right side, +x for left side
    const mats = [plain, plain, lam({ color: 0x1a1520 }), plain, plain, plain];
    mats[sx > 0 ? 1 : 0] = bmat;
    const b = new THREE.Mesh(geo, mats); b.position.set(sx * 15, hgt / 2, zc); scene.add(b);
    // shopfront
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(len - .6, 9), 3.6), lam({ map: shopTex(name, neon, kind), emissive: 0xffffff, emissiveIntensity: .6, emissiveMap: null }));
    shop.material.emissiveMap = shop.material.map;
    shop.position.set(sx * 9.98, 1.95, zc); shop.rotation.y = -sx * Math.PI / 2; scene.add(shop);
    if (kind !== 'dark') { neonSpots.push({ pos: new THREE.Vector3(sx * 8.4, 3.4, zc), color: new THREE.Color(neon), flick: name === 'NITECLUB' || name === 'KARAOKE' });
      const glow = new THREE.Sprite(glowMat(neon)); glow.position.set(sx * 9.6, 3.4, zc); glow.scale.set(8, 3, 1); scene.add(glow); }
    addCollider(sx * 15, zc, 10, len);
  }
}
// end walls
function endWall(z, label) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(30, 14, 2), lam({ map: facadeTex('#4a3a4a', 3, .3) })); w.position.set(0, 7, z); scene.add(w);
  if (label) { const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 2), lam({ map: shopTex(label, '#7cff4f', 'dark'), emissive: 0xffffff, emissiveIntensity: .4 })); s.material.emissiveMap = s.material.map; s.position.set(0, 4.5, z + 1.02); scene.add(s); }
}
endWall(END_Z - 1, 'TAXI RANK'); endWall(START_Z + 3, null);

// lamp posts
const lampMat = lam({ color: 0x2a2a30 }), lampHead = new THREE.MeshBasicMaterial({ color: 0xffc46b });
for (let z = -4, i = 0; z > END_Z + 4; z -= 22, i++) for (const s of [-1, 1]) {
  if ((i + (s > 0 ? 1 : 0)) % 2) continue;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .12, 6.2, 8), lampMat); post.position.set(s * 6.6, 3.1, z); scene.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, .1, .1), lampMat); arm.position.set(s * 6.0, 6.1, z); scene.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.6, .18, .3), lampHead); head.position.set(s * 5.4, 6.0, z); scene.add(head);
  lampSpots.push({ pos: new THREE.Vector3(s * 4.6, 5.6, z) });
  const pool = new THREE.Sprite(glowMat('#ffb060')); pool.position.set(s * 5.4, 5.9, z); pool.scale.set(2.2, 1.2, 1); scene.add(pool);
  addCollider(s * 6.6, z, .4, .4);
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
[[7.6, -12], [-7.6, -26], [7.6, -48], [-7.6, -66], [7.6, -84], [-7.6, -118], [7.6, -132], [-7.6, -150], [7.6, -170], [-7.6, -186], [7.6, -196]].forEach(([x, z]) => bin(x, z));
[[-8.6, -42], [8.6, -112], [-8.6, -142]].forEach(([x, z]) => bench(x, z));
for (let i = 0; i < 14; i++) cone(rand(-5, 5), rand(-210, -10));
taxi(-3.2, -44); taxi(3, -96, 0); taxi(-2.5, -128, Math.PI / 2); taxi(3.6, -214, Math.PI / 2);
const coachMesh = coach(2.6, -172);
// litter: kebab boxes & chip papers
const litterMat = [lam({ color: 0xf2e6c8 }), lam({ color: 0xe8e2d0 }), lam({ color: 0xc8102e })];
for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(rand(.15, .3), .05, rand(.15, .3)), pick(litterMat)); m.position.set(rand(-9, 9), .1, rand(-222, 2)); m.rotation.y = rand(0, 6); scene.add(m); }

// rain
const RAIN = 1400, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN * 3);
for (let i = 0; i < RAIN; i++) { rainPos[i * 3] = rand(-12, 12); rainPos[i * 3 + 1] = rand(0, 16); rainPos[i * 3 + 2] = rand(-30, 10); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x8fa0d8, size: .06, transparent: true, opacity: .6 })); scene.add(rain);

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
function person(o) {
  const g = new THREE.Group(), s = o.scale || 1;
  const skin = lam({ color: o.skin || 0xf2c29b });
  const mk = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  const legMat = lam({ color: o.legs || 0x2c3e66 }), shoe = lam({ color: o.shoes || 0x111111 });
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.add(mk(.22, .8, .24, legMat, 0, -.4, 0), mk(.24, .12, .34, shoe, 0, -.82, .05)); legR.add(legL.children[0].clone(), legL.children[1].clone());
  legL.position.set(-.14, .9, 0); legR.position.set(.14, .9, 0);
  const shirt = lam({ map: shirtTex(o.shirt || '#4466aa') });
  const torso = mk(o.wide ? .7 : .56, .72, .32, shirt, 0, 1.28, 0);
  const armMat = o.bareArms ? skin : lam({ color: o.sleeve || 0x333333 });
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.add(mk(.16, .62, .18, armMat, 0, -.3, 0), mk(.15, .14, .16, skin, 0, -.66, 0)); armR.add(armL.children[0].clone(), armL.children[1].clone());
  const ax = (o.wide ? .7 : .56) / 2 + .09; armL.position.set(-ax, 1.6, 0); armR.position.set(ax, 1.6, 0);
  const faceMat = lam({ map: faceTex(o.skinCss || '#f2c29b', o.face || {}) });
  const head = new THREE.Mesh(new THREE.BoxGeometry(.42, .44, .4), [skin, skin, skin, skin, faceMat, skin]); head.position.set(0, 1.9, 0);
  g.add(legL, legR, torso, armL, armR, head);
  if (o.hair === 'short') g.add(mk(.44, .1, .42, lam({ color: o.hairCol || 0x3a2414 }), 0, 2.14, 0));
  if (o.hair === 'perm') { const hm = lam({ color: 0x2a1a0e }); for (let i = 0; i < 9; i++) g.add(mk(.18, .18, .18, hm, rand(-.25, .25), 2.12 + rand(-.05, .08), rand(-.22, .18))); }
  if (o.hair === 'long') { const hm = lam({ color: o.hairCol || 0xf2d16b }); g.add(mk(.46, .14, .44, hm, 0, 2.14, 0), mk(.46, .6, .1, hm, 0, 1.86, -.22)); }
  if (o.hair === 'cap') { const cm = lam({ color: 0x111111 }); g.add(mk(.46, .14, .44, cm, 0, 2.16, 0), mk(.4, .04, .22, cm, 0, 2.1, .3)); }
  if (o.veil) { const v = new THREE.Mesh(new THREE.PlaneGeometry(.7, 1.1), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .6, side: THREE.DoubleSide })); v.position.set(0, 1.75, -.28); g.add(v); g.add(mk(.5, .08, .1, lam({ color: 0xffffff, emissive: 0x666666 }), 0, 2.24, .05)); }
  if (o.skirt) g.add(mk(.6, .3, .38, shirt, 0, .86, 0));
  if (o.handbag) { const hb = mk(.28, .26, .12, lam({ color: o.handbag }), 0, -.8, .05); armR.add(hb); }
  g.scale.setScalar(s);
  g.userData = { legL, legR, armL, armR, head, torso };
  return g;
}

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
    const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; rainGain = AC.createGain(); rainGain.gain.value = .05;
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
  click: () => tone(1200, .03, 'square', .05), wave: () => { tone(330, .15, 'square', .1); setTimeout(() => tone(440, .25, 'square', .1), 150); },
};

// ---------------------------------------------------------------- player + weapons
const player = { pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true, hp: 100, alive: true,
  weapon: 0, ammo: [14, 18], grenades: 2, cool: 0, bob: 0, hurtT: 0 };
const WEAPONS = [
  { name: 'PIE LAUNCHER', ammoName: 'PIES', max: 30, rate: .55 },
  { name: 'MUSHY PEA SHOTGUN', ammoName: 'TUBS', max: 36, rate: .8 },
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
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) mouseDown = true; if (e.button === 2) throwGrenade(); });
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('wheel', (e) => { if (state.mode === 'play') setWeapon(player.weapon ? 0 : 1); }, { passive: true });
document.addEventListener('mousemove', (e) => {
  if (!locked || state.mode !== 'play') return;
  player.yaw -= e.movementX * .0022 * sens; player.pitch = clamp(player.pitch - e.movementY * .0022 * sens, -1.4, 1.4);
});
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
const PART_GEO = new THREE.BoxGeometry(.07, .07, .07);
const partMats = { pie: lam({ color: 0xc89434 }), gravy: lam({ color: 0x6b3a12 }), pea: lam({ color: 0x4caf2a }), barm: lam({ color: 0xf2e2b8 }), star: new THREE.MeshBasicMaterial({ color: 0xffe16b }) };
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

function fire() {
  if (player.cool > 0 || swapT > 0) return;
  const w = player.weapon;
  if (player.ammo[w] <= 0) { SFX.click(); toast(pick(['Out of pies! Raid a chippy.', 'No peas left, lad.', 'Empty. Find some supplies.'])); player.cool = .4; return; }
  player.ammo[w]--; player.cool = WEAPONS[w].rate; kick = 1; stats.shots++;
  const dir = camForward(), eye = eyePos();
  if (w === 0) {
    SFX.throw();
    const m = new THREE.Mesh(PIE_GEO, PIE_MAT); m.position.copy(eye).addScaledVector(dir, .6).add(new THREE.Vector3(0, -.15, 0)); scene.add(m);
    shots.push({ m, v: dir.clone().multiplyScalar(30).add(new THREE.Vector3(0, 2.2, 0)), kind: 'pie', t: 3 });
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
    quips: ['Come ere you Saint!', 'WIGAN FOREVER!', 'Get back to Thatto Heath!', 'You\'re not famous!', 'Pie eaters? Says you!', 'Have a barm!'],
    hit: ['Ow me barm!', 'Not the shirt!', 'That\'s me Sunday best!'],
    build: () => person({ shirt: 'hoops', legs: 0x22223a, sleeve: 0xf4f4f4, hair: Math.random() < .5 ? 'short' : 'cap', face: { angry: true, shout: Math.random() < .5 } }) },
  bouncer: { hp: 140, speed: 2.4, scale: 1.18, range: [0, 1.6], dmg: 16, cd: [1.1, 1.6], score: 300, melee: true,
    quips: ['Not tonight, lad.', 'Name\'s not down.', 'Not in them trainers.', 'Have you been drinking?', 'ID. Now.'],
    hit: ['Right. That\'s it.', 'You\'re barred.', 'Oi!'],
    build: () => person({ shirt: 'bouncer', legs: 0x111111, sleeve: 0x111111, wide: true, skin: 0xe3b08a, skinCss: '#e3b08a', face: { angry: true } }) },
  hen: { hp: 140, speed: 4.4, scale: .95, range: [3, 10], dmg: 10, cd: [.7, 1.3], score: 600, proj: 'stiletto',
    quips: ['GET HIM GIRLS!', 'WOOOO!', 'Mind me nails!', 'SHOTS!', 'Who invited HIM?!'],
    hit: ['Me extensions!', 'That\'s me best handbag!', 'Ow, me heels!'],
    build: () => person({ shirt: 'hen', legs: 0xf7c6a3, bareArms: true, skirt: true, hair: 'long', hairCol: pick([0x3a2414, 0x8a3a12, 0xf2d16b, 0x111111]), skin: 0xf7c6a3, skinCss: '#f7c6a3', handbag: pick([0xb0127a, 0x111111, 0xffd400]), face: { lashes: true, blush: true, lips: '#d1124a', shout: true }, shoes: 0xd11a2a }) },
  bride: { hp: 420, speed: 4.0, scale: 1.05, range: [2, 9], dmg: 12, cd: [.55, 1.0], score: 2000, proj: 'stiletto', boss: true,
    quips: ['IT\'S MY HEN DO!!', 'NOBODY RUINS MY HEN DO!', 'I\'M THE BRIDE!!', 'SHOTS! SHOTS! SHOTS!', 'Get him, girls!'],
    hit: ['ME VEIL!', 'Do you know how much this cost?!', 'RIGHT!'],
    build: () => person({ shirt: 'bride', legs: 0xf7c6a3, bareArms: true, skirt: true, hair: 'long', hairCol: 0xf2d16b, veil: true, skin: 0xf7c6a3, skinCss: '#f7c6a3', handbag: 0xffffff, face: { lashes: true, blush: true, lips: '#d1124a', shout: true, angry: true }, shoes: 0xffffff }) },
};
function spawn(type, x, z, delay = 0) {
  const T = TYPES[type], g = T.build(); g.position.set(x, 0, z); scene.add(g);
  const e = { type, T, g, hp: T.hp, max: T.hp, scale: T.scale, cd: rand(.6, 1.6) + delay, dead: false, deadT: 0, walk: rand(0, 6), strafe: Math.random() < .5 ? 1 : -1,
    strafeT: rand(1, 3), sayT: 0, bubble: null, attackT: 0, hitT: 0, delay };
  g.visible = delay <= 0;
  enemies.push(e); return e;
}
function say(e, text) {
  if (e.bubble) { e.g.remove(e.bubble); e.bubble.material.map.dispose(); }
  e.bubble = textSprite(text, '#111', e.T.boss ? '#ffe3f2' : '#ffffff'); e.bubble.position.set(0, 2.75, 0); e.bubble.scale.multiplyScalar(1 / e.scale);
  e.g.add(e.bubble); e.sayT = 2.2;
}
function damageEnemy(e, dmg, dir) {
  if (e.dead) return;
  e.hp -= dmg; e.hitT = .15; stats.dmg += dmg;
  if (dir) e.g.position.addScaledVector(dir.clone().setY(0).normalize(), .12);
  if (Math.random() < .2) say(e, pick(e.T.hit));
  if (e.hp <= 0) {
    e.dead = true; e.deadT = 0; stats.kos++; score += e.T.score; SFX.ko(); hitMarker(true);
    killfeed(`${({ wiganer: 'Wiganer', bouncer: 'Bouncer', hen: 'Bridesmaid', bride: 'THE BRIDE' })[e.type]} splatted  +${e.T.score}`);
    if (e.bubble) { e.g.remove(e.bubble); e.bubble = null; }
    const stars = new THREE.Group(); for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.08), partMats.star); s.position.set(Math.cos(i * 1.57) * .35, 2.3, Math.sin(i * 1.57) * .35); stars.add(s); }
    e.stars = stars; e.g.add(stars);
    if (Math.random() < .45) dropPickup(e.g.position.x, e.g.position.z);
  }
}
function enemyThrow(e) {
  const from = e.g.position.clone().add(new THREE.Vector3(0, 1.6 * e.scale, 0));
  const target = eyePos().add(new THREE.Vector3(rand(-.6, .6), -.4, rand(-.6, .6)));
  const kind = e.T.proj, speed = kind === 'stiletto' ? 18 : 12;
  const dist = from.distanceTo(target), t = dist / speed, g = kind === 'stiletto' ? 3 : 9.8;
  const v = new THREE.Vector3((target.x - from.x) / t, (target.y - from.y + .5 * g * t * t) / t, (target.z - from.z) / t);
  const m = new THREE.Mesh(kind === 'stiletto' ? STIL_GEO : BARM_GEO, kind === 'stiletto' ? STIL_MAT : BARM_MAT); m.position.copy(from); scene.add(m);
  eshots.push({ m, v, g, kind, dmg: e.T.dmg, t: 4 });
  e.attackT = .3;
}
function hurtPlayer(dmg, msg) {
  if (!player.alive || state.mode !== 'play') return;
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
  const P = PICK[kind], g = new THREE.Group();
  const box = new THREE.Mesh(kind === 'tea' ? new THREE.CylinderGeometry(.16, .13, .28, 14) : kind === 'barm' ? new THREE.SphereGeometry(.2, 12, 10) : new THREE.BoxGeometry(.45, .25, .35), lam({ color: P.col, emissive: P.col, emissiveIntensity: .35 }));
  g.add(box); if (kind === 'tea') { const h = new THREE.Mesh(new THREE.TorusGeometry(.08, .025, 6, 12), lam({ color: 0xffffff })); h.position.x = .17; g.add(h); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.35, .45, 20), new THREE.MeshBasicMaterial({ color: 0xfda138, transparent: true, opacity: .7, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = -.48; g.add(ring);
  g.position.set(x, .6, z); scene.add(g); pickups.push({ g, kind, t: rand(0, 6) });
}
function dropPickup(x, z) { addPickup(pick(['pies', 'pies', 'peas', 'peas', 'tea', 'barm']), x, z); }
[['pies', 4, -16], ['peas', -4, -22], ['tea', 7.5, -60], ['pies', -7.5, -64], ['peas', 6, -105], ['barm', -6, -108], ['tea', -7, -150], ['pies', 7, -152], ['peas', -5, -156], ['barm', 5, -189], ['tea', -7.6, -191], ['pies', 7.6, -192]].forEach(([k, x, z]) => addPickup(k, x, z));

// ---------------------------------------------------------------- encounters
const ENCOUNTERS = [
  { trigger: -14, title: 'WAVE 1 – THE WIGAN ADVANCE PARTY', spawn: () => { spawn('wiganer', -4, -44); spawn('wiganer', 4, -48); spawn('wiganer', 0, -52); spawn('wiganer', 6, -40, 3); spawn('wiganer', -6, -50, 5); } },
  { trigger: -62, title: 'WAVE 2 – THE NITECLUB DOOR', spawn: () => { const b = spawn('bouncer', -7.2, -76); b.cd = 1; spawn('wiganer', 4, -88); spawn('wiganer', -2, -94); spawn('wiganer', 6, -92, 4); spawn('bouncer', 3, -96, 6); } },
  { trigger: -107, title: 'WAVE 3 – CHIPPY CHAOS', spawn: () => { [[-5, -128], [5, -132], [0, -138], [-7, -140], [7, -125], [2, -142]].forEach(([x, z], i) => spawn('wiganer', x, z, i > 3 ? 4 : 0)); spawn('bouncer', -3, -136, 2); spawn('bouncer', 4, -140, 7); } },
  { trigger: -152, title: 'WAVE 4 – THE WIGAN COACH HAS ARRIVED', spawn: () => { for (let i = 0; i < 10; i++) spawn('wiganer', rand(-1, 1) + (i % 2 ? -.5 : .5), -168 - (i % 5) * 1.5, Math.floor(i / 3) * 3.2); coachSpawn = true; } },
  { trigger: -190, title: 'FINAL BOSS – THE HEN PARTY', boss: true, spawn: () => { const b = spawn('bride', 7.4, -205); say(b, 'IT\'S MY HEN DO!!'); spawn('hen', 6, -203); spawn('hen', 8, -208); spawn('hen', 4, -206, 6); spawn('hen', 7, -210, 12); } },
];
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
  if (state.mode === 'title' || state.mode === 'won') { resetRun(); banner('GET TO THE TAXI RANK', 'Westfield Street, St Helens · Saturday, 11:47pm'); }
  if (state.mode === 'dead') { respawn(); banner('BACK ON YER FEET', 'Last checkpoint · −250 points'); }
  state.mode = 'play'; overlay(null);
  canvas.requestPointerLock && canvas.requestPointerLock();
}
function pause() { if (state.mode !== 'play') return; state.mode = 'paused'; mouseDown = false; overlay('pause'); }
function die() {
  player.alive = false; state.mode = 'dead'; mouseDown = false; document.exitPointerLock && document.exitPointerLock();
  $('ph-dead-msg').textContent = pick(['You got battered on Westfield Street.', 'Splatted. Your mam will be ashamed.', 'Knocked out cold outside the chippy.', 'Down and out before last orders.']);
  overlay('dead');
}
let taxiArrive = null;
function win() {
  state.mode = 'won'; state.won = true; mouseDown = false; document.exitPointerLock && document.exitPointerLock();
  stats.time = (performance.now() - stats.start) / 1000;
  const acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
  const timeBonus = Math.max(0, Math.round(1500 - stats.time * 4)), hpBonus = Math.round(player.hp * 10);
  score += timeBonus + hpBonus;
  const best = STORE.get('ph-best', 0); const newBest = score > best; if (newBest) STORE.set('ph-best', score);
  const rank = score > 9000 ? 'LEGEND OF WESTFIELD STREET' : score > 6500 ? 'THATTO HEATH HARDCASE' : score > 4000 ? 'PARR PIE SLINGER' : 'LIGHTWEIGHT FROM RAINFORD';
  $('ph-win-stats').innerHTML = `<div><span>Time</span><b>${Math.floor(stats.time / 60)}:${String(Math.floor(stats.time % 60)).padStart(2, '0')}</b></div>
    <div><span>Splatted</span><b>${stats.kos}</b></div><div><span>Accuracy</span><b>${acc}%</b></div><div><span>Time bonus</span><b>+${timeBonus}</b></div>
    <div><span>Health bonus</span><b>+${hpBonus}</b></div><div><span>Final score</span><b>${score}${newBest ? ' ★ NEW BEST' : ''}</b></div>`;
  $('ph-rank').textContent = rank;
  overlay('won');
}
function overlay(which) {
  for (const id of ['title', 'pause', 'dead', 'won']) $('ph-' + id).hidden = id !== which;
  H.hudWrap.style.display = which ? 'none' : 'block';
}
$('ph-start').addEventListener('click', start);
$('ph-resume').addEventListener('click', start);
$('ph-retry').addEventListener('click', start);
$('ph-again').addEventListener('click', () => { state.mode = 'won'; start(); });
$('ph-restart').addEventListener('click', () => { state.mode = 'title'; start(); });
$('ph-sens').value = sens; $('ph-sens').addEventListener('input', (e) => { sens = +e.target.value; STORE.set('ph-sens', sens); });
$('ph-vol').value = STORE.get('ph-vol', .7); $('ph-vol').addEventListener('input', (e) => { STORE.set('ph-vol', +e.target.value); if (master) master.gain.value = +e.target.value; });
canvas.addEventListener('click', () => { if (state.mode === 'play' && !locked) canvas.requestPointerLock(); });
$('ph-best').textContent = STORE.get('ph-best', 0) ? 'Your best: ' + STORE.get('ph-best', 0) : '';

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
  const sprint = keys.ShiftLeft || keys.ShiftRight, speed = sprint ? 8.2 : 5.4;
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
  player.cool -= dt; swapT -= dt;
}
function updateEnemies(dt, t) {
  const pp = player.pos;
  let bossAlive = 0, bossHp = 0, bossMax = 0;
  for (const e of enemies) {
    const g = e.g, u = g.userData;
    if (e.delay > 0) { e.delay -= dt; if (e.delay <= 0) { g.visible = true; if (coachSpawn && e.type === 'wiganer') g.position.set(rand(.8, 1.2), 0, -166 + rand(-2, 2)); burst(g.position.clone().setY(1), 'barm', 6, 2); } continue; }
    if (e.dead) {
      e.deadT += dt; g.rotation.x = Math.min(Math.PI / 2, e.deadT * 5) * -1; g.position.y = Math.min(.25, e.deadT);
      if (e.stars) e.stars.rotation.y += dt * 4;
      if (e.deadT > 5) { g.visible = false; }
      continue;
    }
    if (e.T.boss || e.type === 'hen') { bossAlive++; bossHp += Math.max(0, e.hp); bossMax += e.max; }
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
    const sw = Math.sin(e.walk) * .7 * (mv.lengthSq() > .01 ? 1 : 0);
    u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw * .8;
    e.attackT -= dt; u.armR.rotation.x = e.attackT > 0 ? -2.4 : sw * .8;
    if (e.hitT > 0) { e.hitT -= dt; g.rotation.z = Math.sin(t * 60) * .08; } else g.rotation.z = 0;
    // attack
    e.cd -= dt;
    if (e.cd <= 0 && dist < (e.T.melee ? far + .6 : 26)) {
      e.cd = rand(e.T.cd[0], e.T.cd[1]);
      if (e.T.melee) { if (dist < far + .6) { e.attackT = .35; hurtPlayer(e.T.dmg, pick(['Bouncer gave you a slap!', 'Thrown out!', 'Headlocked!'])); } }
      else if (e.type === 'hen' || e.type === 'bride') { if (dist < 2.2) { e.attackT = .35; hurtPlayer(e.T.dmg, 'Handbagged!'); } else enemyThrow(e); }
      else enemyThrow(e);
    }
    if (e.sayT > 0) { e.sayT -= dt; if (e.sayT <= 0 && e.bubble) { g.remove(e.bubble); e.bubble = null; } }
    else if (Math.random() < dt * (e.T.boss ? .35 : .12) && dist < 22) say(e, pick(e.T.quips));
  }
  if (bossMax > 0 && state.enc === 4) { H.boss.style.display = bossAlive ? 'block' : 'none'; H.bossBar.style.width = (bossHp / bossMax * 100) + '%'; }
}
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.t -= dt; s.v.y -= 9.8 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 8; s.m.rotation.y += dt * 5;
    let hit = s.t <= 0 && s.kind === 'barm';
    const p = s.m.position;
    if (!hit && s.kind === 'pie') for (const e of enemies) { if (e.dead || e.delay > 0) continue; const dx = p.x - e.g.position.x, dz = p.z - e.g.position.z; if (dx * dx + dz * dz < (.5 * e.scale) ** 2 && p.y < 2.2 * e.scale) { damageEnemy(e, 34, s.v.clone()); stats.hits++; hitMarker(); hit = true; break; } }
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
    if (!gone && dx * dx + dz * dz < .42 && p.y > player.pos.y + .2 && p.y < eye.y + .3) { hurtPlayer(s.dmg, s.kind === 'stiletto' ? pick(['Stilettoed!', 'Heel to the head!']) : pick(['Barm to the face!', 'Bapped!'])); gone = true; }
    if (gone) { burst(p, s.kind === 'stiletto' ? 'gravy' : 'barm', 6, 2); scene.remove(s.m); eshots.splice(i, 1); }
  }
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t -= dt; f.v.y -= 12 * dt; f.m.position.addScaledVector(f.v, dt); if (f.m.position.y < .03) { f.m.position.y = .03; f.v.multiplyScalar(.4); } if (f.t <= 0) { scene.remove(f.m); fx.splice(i, 1); } }
}
function updateEncounters() {
  const z = player.pos.z;
  const next = state.enc + 1;
  if (next < ENCOUNTERS.length && z < ENCOUNTERS[next].trigger && state.cleared === state.enc) {
    state.enc = next; ENCOUNTERS[next].spawn(); banner(ENCOUNTERS[next].title, next === 4 ? 'Mind the stilettos.' : null);
    if (ENCOUNTERS[next].boss) { H.boss.style.display = 'block'; H.bossName.textContent = 'THE HEN PARTY'; }
  }
  if (state.enc > state.cleared) {
    const live = enemies.filter((e) => !e.dead).length;
    if (live === 0) {
      state.cleared = state.enc;
      if (state.cleared < BARRIERS.length) { barrierObjs[state.cleared].userData.drop = true; banner('AREA CLEAR', 'The barriers are coming down. Keep moving.'); score += 250; }
      else { H.boss.style.display = 'none'; banner('THE HEN PARTY IS OVER', 'Your taxi\'s here. Get in it.'); taxiArrive = { t: 0 }; score += 1000; }
      hud();
    }
  }
  barrierObjs.forEach((b) => { if (b.userData.drop && b.visible) { b.position.y -= .03; if (b.position.y < -1.4) b.visible = false; } });
  if (taxiArrive) {
    taxiArrive.t += lastDt;
    if (!taxiArrive.mesh) { taxiArrive.mesh = taxi(-12, -216, Math.PI / 2); colliders.pop(); }
    taxiArrive.mesh.position.x = Math.min(-2, -14 + taxiArrive.t * 6);
    if (taxiArrive.t > 2 && player.pos.distanceTo(new THREE.Vector3(-2, 0, -216)) < 3.2) win();
    if (taxiArrive.t > 2) setObj('Get in the taxi →');
  }
}

// ---------------------------------------------------------------- loop
let lastDt = 0;
const clock = new THREE.Clock(); let t = 0, fpsAcc = 0, fpsN = 0, frameNo = 0, lastReal = performance.now(), slowAcc = 0, fastAcc = 0;
function frame() {
  const dt = Math.min(.05, clock.getDelta()); t += dt; lastDt = dt;
  if (state.mode === 'play') {
    updatePlayer(dt); updateEnemies(dt, t); updateShots(dt); updateEncounters();
    if (state.mode === 'play') stats.time = (performance.now() - stats.start) / 1000;
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
  // rain follows the player
  const rp = rainGeo.attributes.position.array;
  for (let i = 0; i < RAIN; i++) {
    rp[i * 3 + 1] -= dt * 14; if (rp[i * 3 + 1] < 0) { rp[i * 3 + 1] = 16; rp[i * 3] = camera.position.x + rand(-12, 12); rp[i * 3 + 2] = camera.position.z + rand(-26, 10); }
  }
  rainGeo.attributes.position.needsUpdate = true;
  // lights follow the player; neon flicker
  if ((frameNo++ & 7) === 0) updateLightPools();
  for (const L of NEON_POOL) L.intensity = L.userData.flick && Math.random() < .04 ? 1.5 : 7;
  for (const p of pickups) { p.t += dt; p.g.rotation.y += dt * 1.6; p.g.position.y = .6 + Math.sin(p.t * 2) * .08;
    if (state.mode === 'play' && p.g.visible && p.g.position.distanceTo(new THREE.Vector3(player.pos.x, .6, player.pos.z)) < 1.2) { PICK[p.kind].apply(); p.g.visible = false; SFX.pickup(); toast(PICK[p.kind].label); hud(); } }
  // club music volume by distance to NITECLUB
  if (clubGain) clubGain.gain.value = state.mode === 'play' || state.mode === 'title' ? clamp(1 - Math.abs(player.pos.z + 76) / 40, 0, 1) * .5 : 0;
  // HUD timers
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) H.toast.style.opacity = 0; }
  if (hitT > 0) { hitT -= dt; if (hitT <= 0) H.hit.style.opacity = 0; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) H.banner.style.opacity = 0; }
  if (player.hurtT > 0) player.hurtT -= dt;
  const vig = Math.round(Math.max(player.hurtT * 1.6, player.hp < 30 ? .35 + Math.sin(t * 6) * .1 : 0) * 20) / 20;
  if (vig !== lastVig) { H.vig.style.opacity = vig; lastVig = vig; }
  if (state.mode === 'play' && !taxiArrive) {
    const live = enemies.filter((e) => !e.dead && e.delay <= 0).length;
    setObj(state.enc > state.cleared ? `Splat them all · ${live} left` : 'Head down Westfield Street to the taxi rank ↓');
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
window.__ph = { state, player, enemies, start, ENCOUNTERS, fire, throwGrenade, setWeapon, stats, damageEnemy, get score() { return score; }, get taxi() { return taxiArrive; }, renderer, scene, fx, decals };
