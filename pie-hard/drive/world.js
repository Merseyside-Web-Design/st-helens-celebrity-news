// PIE HARD level 6 – the town. Everything you can see from the road: tarmac, terraces, parks, the Burgies and the East Lancs.
import * as THREE from 'three';
import * as T from './track.js';
const { N, DS, X, Z, Y, TX, TZ, HW, PW, OFF, K, HUMP, SEC, MARK, H, SECTIONS, SEC_KEYS } = T;

let seed = 20021;
export const rng = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (a, b) => a + rng() * (b - a), pick = (a) => a[Math.floor(rng() * a.length)];
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat !== true) t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const lam = (o) => new THREE.MeshLambertMaterial(o);
const G = (x, z) => H(x, z) - .3;                                   // ground level away from the road
const kindOf = (i) => SECTIONS[SEC_KEYS[SEC[i]]].kind;
// stretches where one side of the road isn't what the rest of the street is: Taylor Park, the Burgies, Carr Mill Dam
const SIDE = [
  { s0: MARK.prescot + 90, s1: MARK.thatto - 70, sg: -1, kind: 'park' },
  { s0: MARK.carrmill - 40, s1: MARK.eastlancs - 60, sg: 1, kind: 'burgy' },
  { s0: MARK.fleet + 40, s1: MARK.fleet + 150, sg: 1, kind: 'rural' },
];
function kindAt(i, sg) { const s = i * DS; for (const o of SIDE) if (o.sg === sg && s >= o.s0 && s <= o.s1) return o.kind; return kindOf(i); }
const nearHump = (i, r = 14) => { for (let j = -r; j <= r; j += 2) if (HUMP[(i + j + N) % N] > .12) return true; return false; };
const nearRb = (x, z, m) => T.ROUNDABOUTS.some((r) => Math.hypot(x - r.x, z - r.z) < r.r + m);

// ------------------------------------------------------------ textures
function speckle(g, w, h, base, cols, n, s = 2) { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rng() * w, rng() * h, s, s); } }
function bricks(g, w, h, base, alt, y0 = 0) {
  g.fillStyle = base; g.fillRect(0, y0, w, h - y0);
  for (let y = y0, r = 0; y < h; y += 8, r++) for (let x = (r % 2) * -8; x < w; x += 16) { if (rng() < .35) { g.fillStyle = pick(alt); g.fillRect(x + 1, y + 1, 14, 6); } }
  g.fillStyle = 'rgba(20,10,10,.28)'; for (let y = y0; y < h; y += 8) g.fillRect(0, y, w, 1);
  for (let y = y0, r = 0; y < h; y += 8, r++) for (let x = (r % 2) * -8; x < w; x += 16) g.fillRect(x, y, 1, 8);
}
const TEX = {};
function makeTextures() {
  TEX.tar2 = canvasTex(256, 512, (g, w, h) => {
    speckle(g, w, h, '#47474d', ['#525258', '#3d3d44', '#58585e', '#38383f'], 9000);
    g.fillStyle = 'rgba(0,0,0,.13)'; for (const u of [.16, .34, .66, .84]) g.fillRect(w * u - 7, 0, 14, h);
    g.fillStyle = 'rgba(70,70,78,.5)'; for (let i = 0; i < 5; i++) g.fillRect(rr(20, w - 60), rr(0, h), rr(20, 50), rr(20, 60));
    g.fillStyle = '#e6e3d6'; g.fillRect(w / 2 - 3, 20, 6, h * .5);
    g.fillStyle = '#cfae2c'; for (const x of [7, 14, w - 11, w - 18]) g.fillRect(x, 0, 4, h);
  }, true);
  TEX.tar4 = canvasTex(512, 512, (g, w, h) => {
    speckle(g, w, h, '#4b4b51', ['#56565c', '#414148', '#5c5c62'], 16000);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (const u of [.09, .17, .33, .41, .59, .67, .83, .91]) g.fillRect(w * u - 6, 0, 12, h);
    g.fillStyle = '#e6e3d6'; g.fillRect(8, 0, 5, h); g.fillRect(w - 13, 0, 5, h); g.fillRect(w * .25 - 2, 30, 5, h * .4); g.fillRect(w * .75 - 2, 30, 5, h * .4);
    g.fillRect(w / 2 - 14, 0, 5, h); g.fillRect(w / 2 + 9, 0, 5, h);
    g.save(); g.beginPath(); g.rect(w / 2 - 9, 0, 18, h); g.clip(); g.strokeStyle = '#e6e3d6'; g.lineWidth = 4; for (let y = -20; y < h + 20; y += 64) { g.beginPath(); g.moveTo(w / 2 - 12, y + 30); g.lineTo(w / 2 + 12, y); g.stroke(); } g.restore();
  }, true);
  TEX.dirt = canvasTex(256, 256, (g, w, h) => { speckle(g, w, h, '#6b5236', ['#7a5f40', '#5c462c', '#84684a', '#4f3c26'], 7000, 3);
    g.fillStyle = 'rgba(40,28,14,.35)'; for (const u of [.3, .42, .58, .7]) for (let y = 0; y < h; y += 6) g.fillRect(w * u + Math.sin(y / 20) * 4 - 5, y, 10, 6); }, true);
  TEX.flags = canvasTex(128, 128, (g, w, h) => { speckle(g, w, h, '#8d8a84', ['#99968f', '#827f79', '#a09d96'], 1500);
    g.fillStyle = 'rgba(40,40,40,.4)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2); for (let y = 0, r = 0; y < h; y += 32, r++) for (let x = (r % 2) * 32; x < w; x += 64) g.fillRect(x, y, 2, 32); }, true);
  TEX.grass = canvasTex(128, 128, (g, w, h) => speckle(g, w, h, '#5d8a3a', ['#699944', '#527c33', '#74a24c', '#4b7330'], 2600, 3), true);
  TEX.brick = canvasTex(128, 128, (g, w, h) => bricks(g, w, h, '#8a4634', ['#964f3a', '#7b3d2d', '#a05a42', '#6e3528']), true);
  TEX.hedge = canvasTex(128, 128, (g, w, h) => speckle(g, w, h, '#2f5a26', ['#3a6b2e', '#274c20', '#46793a', '#1f3f1a'], 3000, 4), true);
  TEX.fence = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = pick(['#86643f', '#6e5034', '#7f5d3c']); g.fillRect(x + 1, 0, 14, h); } g.fillStyle = 'rgba(0,0,0,.3)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h); }, true);
  TEX.palisade = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#5f7a56'; for (let x = 2; x < w; x += 16) { g.fillRect(x, 10, 9, h - 10); g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 4.5, 0); g.lineTo(x + 9, 10); g.fill(); } g.fillRect(0, 34, w, 7); g.fillRect(0, 98, w, 7); }, true);
  TEX.rail = canvasTex(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#c9c2ad'; g.fillRect(0, 8, w, 7); g.fillRect(0, 34, w, 7); g.fillRect(4, 0, 10, h); g.fillRect(68, 0, 10, h); }, true);
  TEX.slate = canvasTex(128, 128, (g, w, h) => { speckle(g, w, h, '#454b55', ['#4e545f', '#3c424b', '#565c68'], 1400, 3); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 1); for (let y = 0, r = 0; y < h; y += 12, r++) for (let x = (r % 2) * 9; x < w; x += 18) g.fillRect(x, y, 1, 12); }, true);
  TEX.water = canvasTex(128, 128, (g, w, h) => { speckle(g, w, h, '#3d6f96', ['#4a7fa8', '#335f84', '#5f93ba'], 500, 6); g.fillStyle = 'rgba(255,220,180,.35)'; for (let i = 0; i < 40; i++) g.fillRect(rng() * w, rng() * h, rr(6, 18), 1.5); }, true);
  TEX.glow = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
}
// a house or shop front, drawn twice: once in daylight colours and once as just its lit windows
function facade(draw) {
  const on = Array.from({ length: 12 }, () => rng() < .3), col = [0, 1, 2, 3].map(() => rng());
  const mk = (lit) => canvasTex(256, 256, (g, w, h) => { if (lit) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); } draw(g, lit, on, col); if (!lit) { g.fillStyle = '#2b2622'; g.fillRect(0, 226, w, 30); } });
  const map = mk(false), em = mk(true);
  return lam({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: .6 });
}
function win(g, lit, on, x, y, w, h, frame = '#e9e5d9') {
  if (lit) { if (on) { g.fillStyle = '#ffc870'; g.fillRect(x, y, w, h); } return; }
  g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 7); g.fillStyle = on ? '#ffd58a' : '#26313d'; g.fillRect(x, y, w, h);
  if (!on) { g.fillStyle = 'rgba(255,190,140,.22)'; g.fillRect(x, y, w, h * .35); }
  g.fillStyle = frame; g.fillRect(x + w / 2 - 1, y, 2, h); g.fillRect(x, y + h * .45, w, 2);
}
const DOORS = ['#7a1f1f', '#1f3f6a', '#1f5a34', '#222', '#e8e2d0', '#5a2a6a', '#a8621c'];
const terrace = (base, alt) => (g, lit, on, c) => {
  if (!lit) { bricks(g, 256, 226, base, alt); g.fillStyle = '#c9c2b2'; for (const [x, y, w] of [[26, 34, 80], [140, 34, 84], [104, 128, 116], [24, 128, 52]]) g.fillRect(x, y, w, 7);
    g.fillStyle = DOORS[Math.floor(c[0] * DOORS.length)]; g.fillRect(28, 138, 44, 88); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(34, 144, 32, 22); g.fillStyle = '#d8c070'; g.fillRect(62, 184, 5, 5);
    g.fillStyle = '#333'; g.fillRect(246, 0, 5, 226); }
  win(g, lit, on[0], 30, 44, 72, 62); win(g, lit, on[1], 144, 44, 76, 62); win(g, lit, on[2], 108, 138, 108, 62);
};
const SHOPS = ['TELLINS PIES', 'SPICY CHICKEN', 'SPLIT & GRAVY', 'BURGY BOOKIES', 'MUSHY P\'S CHIPPY', 'CLOGS 4 U', 'VIDEO NASTY', 'TAN-TASTIC', 'DORIS\'S WOOL', 'FETTLERS ARMS', 'PIE-O-NEER', 'CASH 4 CHEQUES', 'THE SLUTCHY CLOG', 'KEBAB KORNER'];
const shop = (name, sign, ink, base, alt) => (g, lit, on) => {
  if (!lit) { bricks(g, 256, 226, base, alt); g.fillStyle = '#1b1d24'; g.fillRect(8, 150, 240, 76); g.fillStyle = sign; g.fillRect(4, 128, 248, 30);
    g.fillStyle = ink; g.font = 'bold 22px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 128, 144, 236);
    g.fillStyle = '#39424e'; g.fillRect(16, 164, 150, 56); g.fillStyle = 'rgba(255,200,150,.2)'; g.fillRect(16, 164, 150, 18); g.fillStyle = sign; g.fillRect(182, 164, 54, 62); g.fillStyle = '#39424e'; g.fillRect(190, 170, 38, 34); }
  else { g.fillStyle = '#ffd9a0'; g.fillRect(4, 128, 248, 30); g.fillStyle = '#000'; g.font = 'bold 22px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 128, 144, 236); if (on[6]) { g.fillStyle = '#8a7a5a'; g.fillRect(16, 164, 150, 56); } }
  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) win(g, lit, on[r * 3 + k], 26 + k * 78, 16 + r * 56, 50, 36);
};
const semi = (render, base, alt) => (g, lit, on, c) => {
  if (!lit) { bricks(g, 256, 226, base, alt); g.fillStyle = render; g.fillRect(0, 0, 256, 112); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(127, 0, 2, 226);
    for (const m of [0, 1]) { const f = (x, w) => (m ? 256 - x - w : x); g.fillStyle = DOORS[Math.floor(c[m] * DOORS.length)]; g.fillRect(f(96, 24), 150, 24, 76); g.fillStyle = '#ddd'; g.fillRect(f(90, 36), 142, 36, 6); } }
  for (const m of [0, 1]) { const f = (x, w) => (m ? 256 - x - w : x); win(g, lit, on[m * 4], f(14, 60), 138, 60, 54); win(g, lit, on[m * 4 + 1], f(14, 60), 34, 60, 48); win(g, lit, on[m * 4 + 2], f(92, 26), 40, 26, 40); }
};
const council = (dash) => (g, lit, on, c) => {
  if (!lit) { speckle(g, 256, 226, dash, ['#b9b3a3', '#a39d8e', '#c4beae', '#918b7d'], 5000, 2); g.fillStyle = '#7b3d2d'; g.fillRect(0, 196, 256, 30); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(127, 0, 2, 226);
    for (const m of [0, 1]) { const f = (x, w) => (m ? 256 - x - w : x); g.fillStyle = DOORS[Math.floor(c[m] * DOORS.length)]; g.fillRect(f(90, 26), 148, 26, 78); g.fillStyle = '#6a6a6a'; g.fillRect(f(82, 42), 140, 42, 5); } }
  for (const m of [0, 1]) { const f = (x, w) => (m ? 256 - x - w : x); win(g, lit, on[m * 4], f(16, 58), 144, 58, 44, '#fff'); win(g, lit, on[m * 4 + 1], f(16, 58), 40, 58, 44, '#fff'); win(g, lit, on[m * 4 + 2], f(88, 28), 46, 28, 36, '#fff'); }
};
const shed = (name, col, door) => (g, lit, on) => {
  if (lit) { if (on[0]) { g.fillStyle = '#ffd58a'; g.fillRect(196, 176, 34, 22); } return; }
  g.fillStyle = col; g.fillRect(0, 0, 256, 226); g.fillStyle = 'rgba(0,0,0,.16)'; for (let x = 0; x < 256; x += 6) g.fillRect(x, 0, 2, 226); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, 256, 40);
  g.fillStyle = door; g.fillRect(40, 96, 110, 130); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 96; y < 226; y += 8) g.fillRect(40, y, 110, 2);
  g.fillStyle = '#ddd'; g.fillRect(190, 170, 46, 56); g.fillStyle = '#27323e'; g.fillRect(196, 176, 34, 22);
  g.fillStyle = '#f4f0e0'; g.fillRect(20, 30, 216, 40); g.fillStyle = '#1a1a22'; g.font = 'bold 24px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 128, 51, 204);
};

// ------------------------------------------------------------ geometry helpers
const builders = {};
function quad(key, a, b, c, d, ua, ub, va, vb, sw) {            // a,b across the road at one sample (left, right); c,d at the next
  const o = builders[key] || (builders[key] = { p: [], uv: [], ix: [] }), n = o.p.length / 3;
  o.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]); o.ix.push(n, n + 1, n + 3, n, n + 3, n + 2);
  if (sw) o.uv.push(va, ua, va, ub, vb, ua, vb, ub); else o.uv.push(ua, va, ub, va, ua, vb, ub, vb);
}
const P = (i, d, y) => [X[i] + TZ[i] * d, y, Z[i] - TX[i] * d];
function meshOf(key, mat, shadow = true) { const o = builders[key]; if (!o) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2)); g.setIndex(o.ix); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = shadow; m.matrixAutoUpdate = false; return m; }
// several simple shapes in one geometry, each with its own flat colour
export function part(geo, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
  const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
export function merge(parts) { let n = 0; for (const p of parts) n += p.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o); nor.set(p.attributes.normal.array, o); col.set(p.attributes.color.array, o); o += p.attributes.position.count * 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n);
const vmat = () => lam({ vertexColors: true });
function chevron(dir) { const ps = [part(box(2.5, .9, .08), '#141418', 0, 1.45, 0), part(box(.09, 1.1, .09), '#8a8d92', -1, .5, 0), part(box(.09, 1.1, .09), '#8a8d92', 1, .5, 0)];
  for (let k = -1; k <= 1; k++) for (const u of [1, -1]) ps.push(part(box(.5, .13, .03), '#f4f4f4', k * .78 - dir * .06, 1.45 + u * .16, .05, 0, 0, -dir * u * .7)); return merge(ps); }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function instanced(scene, geo, mat, list, shadow = true) {     // list of { x, y, z, ry, sx, sy, sz, col }
  if (!list.length) return null; const m = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((it, i) => { _q.setFromEuler(_e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ')); _m.compose(_v.set(it.x, it.y, it.z), _q, _s.set(it.sx || 1, it.sy || 1, it.sz || 1)); m.setMatrixAt(i, _m); if (it.col !== undefined) m.setColorAt(i, _c.set(it.col)); it.inst = m; it.idx = i; });
  m.castShadow = shadow; m.receiveShadow = false; m.frustumCulled = false; scene.add(m); return m;
}
export function textPlane(lines, w, h, bg, ink, opt = {}) {
  const cw = 512, ch = Math.round(512 * h / w), tex = canvasTex(cw, ch, (g) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); if (opt.border) { g.strokeStyle = opt.border; g.lineWidth = 10; g.strokeRect(5, 5, cw - 10, ch - 10); }
    const fs = opt.size || Math.min(ch / (lines.length + .6), 90); g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => { const big = i === 0 && opt.head; g.font = `bold ${big ? fs * 1.15 : fs * .92}px Arial Black, Arial`; g.fillStyle = (opt.inks && opt.inks[i]) || ink; g.fillText(l, cw / 2, ch / 2 + (i - (lines.length - 1) / 2) * fs * 1.05, cw - 30); }); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), opt.lit ? new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }) : lam({ map: tex, side: THREE.DoubleSide }));
}

// ------------------------------------------------------------ the build
export const HEADLINES = [['ST HELENS MEN PREFER', 'PIE AND CHIPS TO SEX'], ['GIANT ANTS', 'SPOTTED ON BURGIES'], ['DOG SHIT LEVELS', 'AT ALL TIME HIGH'], ['IT\'S ALL GOING OFF', 'UP FOUR ACRE'], ['NEXUS TO BE', 'MIDGET HAVEN'],
  ['SCOUSE', 'CONGESTION CHARGES'], ['LADS BE ALERT!', 'St Helens needs lerts'], ['PARR', 'TAKE A FRESH LOOK'], ['WINNING WIGAN DNA', 'FOUND IN FOSSILISED PIE'], ['PIE FM 97.4', 'Brian Thong at breakfast'], ['VOTE FLANGEFELTER', 'Pocketnook & Parr Baths'], ['TELLINS', 'Proper pies since 1902']];
export function buildWorld(scene, opt = {}) {
  makeTextures();
  const W = { props: [], buckets: [], zebras: [], cams: [], dyn: [], tex: TEX };
  const WALLS = { town: ['brick', 2.6, 0, .4], terrace: ['brick', 2.6, 0, .4], council: ['fence', 1.1, 0, 0], semi: ['hedge', 1.3, .9, 0], industrial: ['palisade', 2.3, 0, 0], park: ['rail', 1, 0, 0], rural: ['hedge', 1.6, 1.2, 0], dual: ['hedge', 1.6, 1.2, 0], burgy: ['rail', 1, 0, 0] };
  // ---- the road, kerbs, pavements, verges and whatever runs along the back of them
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, kind = kindOf(i), v0 = i * DS, v1 = v0 + DS, yi = Y[i] + .03, yj = Y[j] + .03;
    quad(kind === 'dual' ? 'tar4' : kind === 'park' ? 'dirt' : 'tar2', P(i, HW[i], yi), P(i, -HW[i], yi), P(j, HW[j], yj), P(j, -HW[j], yj), 0, 1, v0 / 12, v1 / 12);
    for (const sg of [1, -1]) {
      const ks = kindAt(i, sg), e0i = HW[i], e0j = HW[j], e1i = e0i + PW[i], e1j = e0j + PW[j], e2i = e1i + OFF[i], e2j = e1j + OFF[j], khi = Math.min(.14, PW[i] * .3), khj = Math.min(.14, PW[j] * .3);
      const band = (key, dAi, yAi, dBi, yBi, dAj, yAj, dBj, yBj, u0, u1, vs) => { const sw = key[0] === 'w';   // A is the edge nearer the middle of the road
        if (sg > 0) quad(key, P(i, dBi, yBi), P(i, dAi, yAi), P(j, dBj, yBj), P(j, dAj, yAj), u1, u0, v0 / vs, v1 / vs, sw); else quad(key, P(i, -dAi, yAi), P(i, -dBi, yBi), P(j, -dAj, yAj), P(j, -dBj, yBj), u0, u1, v0 / vs, v1 / vs, sw); };
      if (PW[i] > .05 || PW[j] > .05) { band('w_kerb', e0i, yi, e0i, yi + khi, e0j, yj, e0j, yj + khj, 0, 1, 2); band('flags', e0i, yi + khi, e1i, yi + khi, e0j, yj + khj, e1j, yj + khj, 0, PW[i] / 2, 2); }
      const yoi = yi + khi, yoj = yj + khj;
      if (OFF[i] > .05 || OFF[j] > .05) band(ks === 'burgy' ? 'slag' : 'grass', e1i, yoi, e2i, yi, e1j, yoj, e2j, yj, 0, OFF[i] / 3, 3);
      const ysi = OFF[i] > .05 ? yi : yoi, ysj = OFF[j] > .05 ? yj : yoj, oi = P(i, sg * (e2i + 6), 0), oj = P(j, sg * (e2j + 6), 0), green = /park|rural|dual|semi|council/.test(ks);
      band(green ? 'skirtG' : 'skirtU', e2i, ysi, e2i + 6, G(oi[0], oi[2]) - .7, e2j, ysj, e2j + 6, G(oj[0], oj[2]) - .7, 0, 2, 3);
      const hump = HUMP[i] > .12 || HUMP[j] > .12, [wk, wh, wt, wi] = hump ? ['brick', 1.15, .4, 0] : WALLS[ks], bi = e2i + .05 + wi, bj = e2j + .05 + wi, vs = wk === 'rail' ? 2.5 : wk === 'palisade' ? 3 : 4;
      band('w_' + wk, bi, ysi - .4, bi, ysi + wh, bj, ysj - .4, bj, ysj + wh, 0, 1, vs);
      if (wt) band('w_' + wk, bi, ysi + wh, bi + wt, ysi + wh, bj, ysj + wh, bj + wt, ysj + wh, 0, wt / 1.5, vs);
    }
  }
  // zebra crossings, and the chequered line outside the SHCN office
  for (const s of [150, MARK.prescot + 60, MARK.thatto + 150, MARK.elephant + 260, MARK.robins + 200, MARK.fouracre + 60, MARK.chain + 120, MARK.blackbrook + 40, MARK.dentons + 150, MARK.north + 70]) {
    const i = Math.round(s / DS) % N, j = (i + 2) % N; W.zebras.push(i * DS + DS);
    quad('zebra', P(i, HW[i], Y[i] + .05), P(i, -HW[i], Y[i] + .05), P(j, HW[j], Y[j] + .05), P(j, -HW[j], Y[j] + .05), 0, 1, 0, 1); }
  { const i = 2, j = 4; quad('chequer', P(i, HW[i], Y[i] + .05), P(i, -HW[i], Y[i] + .05), P(j, HW[j], Y[j] + .05), P(j, -HW[j], Y[j] + .05), 0, 1, 0, 1); }
  const add = (k, mat, cast) => { const m = meshOf(k, mat); if (m) { m.castShadow = !!cast; scene.add(m); } return m; };
  const po = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  add('tar2', lam({ map: TEX.tar2 })); add('tar4', lam({ map: TEX.tar4 })); add('dirt', lam({ map: TEX.dirt })); add('flags', lam({ map: TEX.flags })); add('grass', lam({ map: TEX.grass }));
  add('slag', lam({ map: TEX.dirt, color: 0x9a9aa8 })); add('skirtG', lam({ map: TEX.grass, color: 0xd8e8c8 })); add('skirtU', lam({ map: TEX.flags, color: 0x9a948a }));
  add('zebra', lam({ map: canvasTex(128, 32, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#eeeadc'; for (let x = 4; x < w; x += 16) g.fillRect(x, 0, 8, h); }), transparent: true, alphaTest: .5, ...po }));
  add('chequer', lam({ map: canvasTex(128, 32, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#f2f2f2' : '#15151a'; g.fillRect(x * 8, y * 8, 8, 8); } }), ...po }));
  const ds = THREE.DoubleSide;
  add('w_kerb', lam({ color: 0xb9b5aa, side: ds })); add('w_brick', lam({ map: TEX.brick, side: ds }), true); add('w_fence', lam({ map: TEX.fence, side: ds }), true); add('w_hedge', lam({ map: TEX.hedge, side: ds }), true);
  add('w_palisade', lam({ map: TEX.palisade, side: ds, alphaTest: .5 })); add('w_rail', lam({ map: TEX.rail, side: ds, alphaTest: .5 }));

  // ---- the ground under everything, in fields and car parks
  { const gg = new THREE.PlaneGeometry(3500, 3250, 140, 130); gg.rotateX(-Math.PI / 2); const p = gg.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
    const FIELD = ['#5d8a3a', '#6f9a42', '#8a9a4a', '#b0a04a', '#4f7a34', '#77684a', '#5d8a3a', '#668f3c'];
    for (let v = 0; v < p.count; v++) { const x = p.getX(v), z = p.getZ(v); p.setY(v, G(x, z) - .25); let bd = 1e9, bi = 0;
      for (let i = 0; i < N; i += 8) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } bd = Math.sqrt(bd);
      const dx = x - X[bi], dz = z - Z[bi], sg = dx * TZ[bi] - dz * TX[bi] > 0 ? 1 : -1, k = kindAt(bi, sg), hsh = Math.abs(Math.sin(Math.floor(x / 150) * 12.9898 + Math.floor(z / 115) * 78.233) * 43758.5453) % 1;
      c.set(FIELD[Math.floor(hsh * FIELD.length)]); c2.set(/town|terrace|industrial/.test(k) ? '#5c5850' : /council|semi/.test(k) ? '#5f6d4c' : k === 'burgy' ? '#77777f' : '#5d8a3a');
      c.lerp(c2, 1 - Math.min(1, Math.max(0, (bd - 70) / 90))); c.multiplyScalar(.9 + .2 * (Math.abs(Math.sin(x * .37 + z * .61)) % 1)); col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals(); const gm = new THREE.Mesh(gg, lam({ vertexColors: true })); gm.receiveShadow = true; gm.matrixAutoUpdate = false; scene.add(gm); }

  // ---- houses, shops and sheds
  const R1 = ['#964f3a', '#7b3d2d', '#a05a42', '#6e3528'], R2 = ['#7a4a3c', '#5e3a30', '#84534a', '#523028'];
  const BT = { terrA: { m: facade(terrace('#8a4634', R1)), w: 5.2, h: 6.4, d: 8.5, roof: 2.2, chim: 1 }, terrB: { m: facade(terrace('#6e4236', R2)), w: 5.2, h: 6.4, d: 8.5, roof: 2.2, chim: 1 }, terrC: { m: facade(terrace('#8a4634', R1)), w: 5.2, h: 6.4, d: 8.5, roof: 2.2, chim: 1 },
    semiA: { m: facade(semi('#e6dcc4', '#8a4634', R1)), w: 11, h: 6.4, d: 8.5, roof: 2.7, set: 5.5, gap: 3.5 }, semiB: { m: facade(semi('#d9d9d2', '#7a4a3c', R2)), w: 11, h: 6.4, d: 8.5, roof: 2.7, set: 5.5, gap: 3.5 },
    counA: { m: facade(council('#aea898')), w: 10.4, h: 6, d: 8, roof: 2.4, set: 4.5, gap: 2.2 }, counB: { m: facade(council('#b8a888')), w: 10.4, h: 6, d: 8, roof: 2.4, set: 4.5, gap: 2.2 },
    shedA: { m: facade(shed('FLEET LANE GLASS', '#5f7f9a', '#2f4a66')), w: 28, h: 9, d: 18, roof: 1.6, set: 8, gap: 9 }, shedB: { m: facade(shed('TELLINS PIE DEPOT', '#9a9a8e', '#b8862a')), w: 28, h: 9, d: 18, roof: 1.6, set: 8, gap: 9 }, shedC: { m: facade(shed('SUTTON SHEET WORKS', '#7a8a6a', '#444')), w: 28, h: 9, d: 18, roof: 1.6, set: 8, gap: 9 } };
  const SIGNS = [['#c8102e', '#fff'], ['#ffe14f', '#111'], ['#1a6ad8', '#fff'], ['#111', '#ffe14f'], ['#1f7a3a', '#fff'], ['#6600ff', '#fff'], ['#fda138', '#400040']];
  SHOPS.forEach((n, k) => { const sc = SIGNS[k % SIGNS.length]; BT['shop' + k] = { m: facade(shop(n, sc[0], sc[1], k % 2 ? '#8a4634' : '#6e4236', k % 2 ? R1 : R2)), w: 7.5, h: 10.2, d: 10, roof: 0 }; });
  const KT = { town: SHOPS.map((n, k) => 'shop' + k), terrace: ['terrA', 'terrB', 'terrC'], semi: ['semiA', 'semiB'], council: ['counA', 'counB'], industrial: ['shedA', 'shedB', 'shedC'] };
  const sideMat = lam({ map: TEX.brick }), lists = {}, roofs = [], chims = [];
  const house = (key, x, z, ry, base, far) => { const bt = BT[key]; (lists[key] || (lists[key] = [])).push({ x, y: base - 1.2 + (bt.h + 1.2) / 2, z, ry, sx: bt.w + .04, sy: bt.h + 1.2, sz: bt.d });
    if (bt.roof) roofs.push({ x, y: base + bt.h, z, ry, sx: bt.w + .3, sy: bt.roof, sz: bt.d + .5 });
    if (bt.chim && !far) chims.push({ x: x + Math.cos(ry) * (bt.w / 2 - .5), y: base + bt.h + bt.roof * .75, z: z - Math.sin(ry) * (bt.w / 2 - .5), ry, sx: .8, sy: 1.5, sz: .7 }); };
  for (const sg of [1, -1]) { let s = 0, run = 0, cur = null;
    while (s < T.LEN - 3) { const i = Math.round(s / DS) % N, ks = kindAt(i, sg), types = KT[ks]; if (!types) { s += 6; cur = null; continue; }
      if (!cur || run <= 0 || !types.includes(cur)) { cur = pick(types); run = ks === 'terrace' ? 4 + Math.floor(rng() * 8) : 1; } run--;
      const bt = BT[cur], b = HW[i] + PW[i] + OFF[i], dist = b + (bt.set || .05) + bt.d / 2, f = 1 - K[i] * sg * dist, step = (bt.w + (bt.gap || 0)) / Math.max(.4, f), ic = Math.round((s + step / 2) / DS) % N;
      s += step; if (f < .45 || nearHump(ic) || s > T.LEN) continue;
      const cx = X[ic] + TZ[ic] * sg * dist, cz = Z[ic] - TX[ic] * sg * dist; if (nearRb(cx, cz, 13)) continue;
      const ry = Math.atan2(-TZ[ic] * sg, TX[ic] * sg), base = Y[ic] + .15; house(cur, cx, cz, ry, base);
      if (/town|terrace|council/.test(ks)) for (let r = 1; r <= 2; r++) { if (rng() < .25 || f < .7) continue; const d2 = dist + r * (bt.d + 9) + rr(0, 3), x2 = X[ic] + TZ[ic] * sg * d2, z2 = Z[ic] - TX[ic] * sg * d2; if (nearRb(x2, z2, 20)) continue; house(ks === 'town' ? pick(KT.terrace) : cur, x2, z2, ry + (r % 2 ? Math.PI : 0), G(x2, z2) + .4, true); }
    } }
  const unit = new THREE.BoxGeometry(1, 1, 1); { const ix = Array.from(unit.index.array); unit.setIndex([...ix.slice(24, 30), ...ix.slice(0, 24), ...ix.slice(30)]); unit.clearGroups(); unit.addGroup(0, 6, 1); unit.addGroup(6, 30, 0); }   // front face first, so a house is two draw calls not six
  for (const key in lists) instanced(scene, unit, [sideMat, BT[key].m], lists[key]);
  { const g = new THREE.BufferGeometry(), a = -.5, b = .5; // a pitched roof: two slopes and two gable ends
    g.setAttribute('position', new THREE.Float32BufferAttribute([a, 0, b, b, 0, b, b, 1, 0, a, 0, b, b, 1, 0, a, 1, 0, b, 0, a, a, 0, a, a, 1, 0, b, 0, a, a, 1, 0, b, 1, 0, a, 0, a, a, 0, b, a, 1, 0, b, 0, b, b, 0, a, b, 1, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 2, 1, 0, 0, 2, 1, 0, 1, 0, 0, 2, 0, 2, 1, 0, 0, 2, 1, 0, 1, 0, 0, 1, 0, .5, 1, 0, 0, 1, 0, .5, 1], 2)); g.computeVertexNormals();
    instanced(scene, g, lam({ map: TEX.slate }), roofs); instanced(scene, unit, lam({ color: 0x6e3528 }), chims, false); }

  // ---- trees
  { const trunks = [], tops = [], TC = [0x3f7a34, 0x4f8a3a, 0x356a2c, 0x5f9442, 0xb8862a, 0xc8702a, 0x7a9a3a];
    const tree = (x, z, sc = rr(.8, 1.5)) => { const y = G(x, z) - .3; trunks.push({ x, y: y + 1.3 * sc, z, sy: sc, sx: sc, sz: sc }); tops.push({ x, y: y + 3.6 * sc, z, sx: 2.3 * sc, sy: 2.9 * sc, sz: 2.3 * sc, ry: rng() * 6, col: pick(TC) }); };
    W.tree = tree;
    for (const sg of [1, -1]) for (let i = 0; i < N; i += 2) { const ks = kindAt(i, sg), b = HW[i] + PW[i] + OFF[i]; let p = 0, d0 = 2.5, d1 = 30;
      if (ks === 'park') { p = .55; d1 = 48; } else if (ks === 'rural') p = .22; else if (ks === 'dual') { p = .1; d1 = 70; } else if (ks === 'semi') { p = .13; d0 = 1.6; d1 = 3.6; } else if (ks === 'burgy') p = .04;
      if (rng() < p && !nearHump(i, 4)) { const d = b + d0 + (d1 - d0) * rng() ** 1.6, x = X[i] + TZ[i] * sg * d, z = Z[i] - TX[i] * sg * d; if (!nearRb(x, z, 4)) tree(x, z, ks === 'semi' ? rr(.6, .9) : undefined); } }
    for (const r of T.ROUNDABOUTS) for (let k = 0; k < 3; k++) tree(r.x + rr(-4, 4), r.z + rr(-4, 4), rr(.7, 1.1));
    instanced(scene, cyl(.22, .34, 2.6, 6), lam({ color: 0x5a4030 }), trunks); const cg = new THREE.IcosahedronGeometry(1, 0); instanced(scene, cg, lam({ flatShading: true }), tops); }

  // ---- street furniture: all of it can be driven through, some of it you'll regret
  const PT = {
    lamp: { r: .28, sturdy: 1, pts: 150, name: 'LAMP POST', geo: merge([part(cyl(.08, .13, 6.2, 6), '#5d6066', 0, 3.1, 0), part(box(1.9, .1, .12), '#5d6066', .9, 6.2, 0), part(box(.6, .16, .26), '#ffc070', 1.7, 6.12, 0)]) },
    bin: { r: .45, pts: 40, name: 'WHEELIE BIN', geo: merge([part(box(.6, 1, .72), '#ffffff', 0, .56, 0), part(box(.66, .09, .8), '#bbbbbb', 0, 1.1, 0), part(cyl(.1, .1, .08, 8), '#222222', -.26, .1, -.3, 0, 0, Math.PI / 2), part(cyl(.1, .1, .08, 8), '#222222', .26, .1, -.3, 0, 0, Math.PI / 2)]) },
    cone: { r: .3, pts: 20, name: 'CONE', geo: merge([part(new THREE.ConeGeometry(.22, .7, 8), '#f26a1b', 0, .39, 0), part(box(.5, .05, .5), '#f26a1b', 0, .025, 0), part(cyl(.13, .17, .16, 8), '#f4f4f4', 0, .42, 0)]) },
    box: { r: .4, pts: 15, name: 'BOX', geo: merge([part(box(.7, .6, .6), '#b08a5a', 0, .3, 0), part(box(.72, .05, .14), '#d8c8a0', 0, .6, 0)]) },
    bench: { r: .7, pts: 60, name: 'BENCH', geo: merge([part(box(1.8, .08, .5), '#7a4a2a', 0, .48, 0), part(box(1.8, .5, .08), '#7a4a2a', 0, .8, -.24), part(box(.1, .48, .5), '#333333', -.8, .24, 0), part(box(.1, .48, .5), '#333333', .8, .24, 0)]) },
    phone: { r: .55, pts: 200, name: 'PHONE BOX', geo: merge([part(box(.95, 2.5, .95), '#c8102e', 0, 1.25, 0), part(box(.99, 1.5, .7), '#2a3440', 0, 1.35, 0), part(box(.7, 1.5, .99), '#2a3440', 0, 1.35, 0), part(box(1, .18, 1), '#f4f0e0', 0, 2.28, 0)]) },
    post: { r: .32, pts: 120, name: 'POST BOX', geo: merge([part(cyl(.27, .27, 1.3, 10), '#c8102e', 0, .75, 0), part(cyl(.3, .3, .12, 10), '#111111', 0, .06, 0), part(cyl(.2, .29, .16, 10), '#c8102e', 0, 1.48, 0), part(box(.3, .05, .3), '#111111', 0, 1.1, .16)]) },
    trolley: { r: .5, pts: 50, name: 'SHOPPING TROLLEY', geo: merge([part(box(.6, .5, .95), '#a8adb5', 0, .75, 0), part(box(.5, .06, .8), '#70757d', 0, .28, 0), part(box(.6, .06, .06), '#c8102e', 0, 1.06, -.5)]) },
    sign: { r: .2, pts: 60, name: 'ROAD SIGN', geo: merge([part(cyl(.05, .05, 2.6, 6), '#8a8d92', 0, 1.3, 0), part(cyl(.42, .42, .05, 14), '#c8102e', 0, 2.5, .03, Math.PI / 2), part(cyl(.32, .32, .06, 14), '#f4f4f4', 0, 2.5, .04, Math.PI / 2)]) },
    beacon: { r: .2, pts: 100, name: 'BELISHA BEACON', geo: merge([part(cyl(.07, .07, .7, 6), '#111111', 0, .35, 0), part(cyl(.07, .07, .7, 6), '#f4f4f4', 0, 1.05, 0), part(cyl(.07, .07, .7, 6), '#111111', 0, 1.75, 0), part(cyl(.07, .07, .5, 6), '#f4f4f4', 0, 2.35, 0), part(new THREE.SphereGeometry(.26, 10, 8), '#ffb020', 0, 2.8, 0)]) },
    sofa: { r: .9, pts: 80, name: 'THREE-PIECE SUITE', geo: merge([part(box(2, .45, .85), '#6a4a3a', 0, .32, 0), part(box(2, .6, .25), '#5a3c2e', 0, .75, -.32), part(box(.25, .35, .85), '#5a3c2e', -.9, .7, 0), part(box(.25, .35, .85), '#5a3c2e', .9, .7, 0)]) },
    bale: { r: .8, pts: 30, name: 'HAY BALE', geo: merge([part(cyl(.75, .75, 1.3, 12), '#d8b84a', 0, .75, 0, 0, 0, Math.PI / 2), part(cyl(.76, .76, .1, 12), '#b8943a', -.35, .75, 0, 0, 0, Math.PI / 2), part(cyl(.76, .76, .1, 12), '#b8943a', .35, .75, 0, 0, 0, Math.PI / 2)]) },
    cam: { r: .35, pts: 500, name: 'SPEED CAMERA', geo: merge([part(cyl(.1, .12, 3.4, 6), '#8a8d92', 0, 1.7, 0), part(box(.75, .7, .55), '#f2c21a', 0, 3.6, 0), part(box(.4, .3, .06), '#111111', 0, 3.6, -.28)]) },
    chevL: { r: .7, pts: 80, name: 'CHEVRON BOARD', geo: chevron(-1) }, chevR: { r: .7, pts: 80, name: 'CHEVRON BOARD', geo: chevron(1) },
    shelter: { r: 1.1, pts: 150, name: 'BUS SHELTER', geo: merge([part(box(3.2, .1, 1.4), '#3a4a5a', 0, 2.4, 0), part(box(3.2, 1.9, .06), '#8fb0c8', 0, 1.35, -.65), part(box(.06, 1.9, 1.3), '#8fb0c8', -1.55, 1.35, 0), part(box(.08, 2.4, .08), '#3a4a5a', 1.55, 1.2, .6), part(box(.08, 2.4, .08), '#3a4a5a', -1.55, 1.2, .6), part(box(1.6, .08, .35), '#c8102e', 0, .5, -.4)]) },
  };
  W.PT = PT; const _at = {};
  const prop = (type, s, d, rot = 0, col) => { T.at(s, _at); const on = Math.abs(d) > _at.hw + .05 && _at.pw > .4;
    const it = { type, s: T.wrap(s), d, x: _at.x + _at.nx * d, z: _at.z + _at.nz * d, y: _at.y + (on ? .17 : .03), ry: Math.atan2(_at.tx, _at.tz) + rot, col, alive: true, r: PT[type].r }; W.props.push(it); return it; };
  const BINS = [0x2f6a3a, 0x4a4a52, 0x7a5a3a, 0x2a4a8a];
  for (let s = 20, k = 0; s < T.LEN; s += 34, k++) { T.at(s, _at); const kd = SECTIONS[SEC_KEYS[_at.sec]].kind; if (kd === 'park') continue;
    for (const sg of kd === 'dual' ? [1, -1] : [k % 2 ? 1 : -1]) prop('lamp', s, sg * (_at.hw + (_at.pw > .4 ? .55 : 1.7)), sg > 0 ? Math.PI : 0); }
  const MIX = { town: [['box', .1], ['bench', .05], ['phone', .025], ['post', .02], ['bin', .05], ['sign', .03], ['shelter', .025]], terrace: [['bin', .2], ['box', .03], ['post', .012], ['sign', .02], ['shelter', .01]], council: [['bin', .18], ['trolley', .07], ['sofa', .035], ['cone', .03]],
    semi: [['bin', .1], ['post', .012], ['sign', .02], ['bench', .01]], industrial: [['cone', .2], ['box', .1], ['sign', .04]], park: [['bale', .3], ['cone', .16], ['bench', .04]], rural: [['sign', .03], ['cone', .03]], dual: [['sign', .02], ['cone', .02]], burgy: [['cone', .06]] };
  for (const sg of [1, -1]) for (let s = 30; s < T.LEN; s += 8.5) { T.at(s, _at); const ks = kindAt(_at.i, sg), mix = MIX[ks]; if (!mix || HUMP[_at.i] > .1) continue; let r = rng();
    for (const [type, p] of mix) { if (r < p) { const far = type === 'bin' || type === 'shelter' || type === 'sofa' || type === 'bench' || type === 'phone';
      const d = _at.pw > .4 ? _at.hw + (far ? _at.pw - .6 : rr(.8, Math.max(.9, _at.pw - .6))) : _at.hw + rr(.8, Math.max(1, _at.off - 1));
      prop(type, s + rr(-3, 3), sg * d, type === 'bale' ? rng() * 3 : (sg > 0 ? -Math.PI / 2 : Math.PI / 2) + (far ? 0 : rr(-.4, .4)), type === 'bin' ? pick(BINS) : undefined); break; } r -= p; } }
  for (const s of W.zebras) { T.at(s, _at); for (const sg of [1, -1]) prop('beacon', s - 3.4 * sg, sg * (_at.hw + .45)); }
  for (const ds of [330, 720, 1090]) { const s = MARK.eastlancs + ds; T.at(s, _at); const it = prop('cam', s, _at.hw + 1.9, 0); W.cams.push({ s, it, done: false }); }
  // chevron boards round the outside of anything sharp, so you can see it coming
  for (let i = 0; i < N; i++) { const k = Math.abs(K[i]); if (k < 1 / 46 || k < Math.abs(K[(i + N - 1) % N]) || k <= Math.abs(K[(i + 1) % N]) || kindOf(i) === 'park') continue; const sg = K[i] > 0 ? -1 : 1;   // outside of the bend
    for (let j = -2; j <= 3; j++) { const s = (i + j * 5) * DS; T.at(s, _at); if (HUMP[_at.i] > .1) continue; const it = prop(K[i] > 0 ? 'chevL' : 'chevR', s, sg * (_at.hw + (_at.pw > .4 ? _at.pw - .35 : Math.max(1.2, _at.off - .6))), 0); it.ry = Math.atan2(-_at.tx - _at.nx * sg * .9, -_at.tz - _at.nz * sg * .9); } }
  for (const key in PT) { const list = W.props.filter((p) => p.type === key); const m = instanced(scene, PT[key].geo, vmat(), list); if (m && m.instanceColor) m.instanceColor.needsUpdate = true; }
  for (const p of W.props) { const b = Math.floor(p.s / 25); (W.buckets[b] || (W.buckets[b] = [])).push(p); }
  // the sodium glow off every lamp, one draw call for the lot
  { const lamps = W.props.filter((p) => p.type === 'lamp'), pos = new Float32Array(lamps.length * 3); lamps.forEach((p, i) => { pos[i * 3] = p.x + Math.cos(p.ry) * 1.7; pos[i * 3 + 1] = p.y + 6; pos[i * 3 + 2] = p.z - Math.sin(p.ry) * 1.7; p.glow = i; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); W.lampGlow = new THREE.Points(g, new THREE.PointsMaterial({ map: TEX.glow, size: 2.6, color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 })); W.lampGlow.frustumCulled = false; scene.add(W.lampGlow); }
  landmarks(scene, W);
  sky(scene, W, opt);
  return W;
}

// ------------------------------------------------------------ landmarks: the bits a local would look for
function landmarks(scene, W) {
  const a = {}, mesh = (geo, col, cast = true) => { const m = new THREE.Mesh(geo, typeof col === 'number' ? lam({ color: col }) : col); m.castShadow = cast; return m; };
  const edge = (s) => { T.at(s, a); return a.hw + a.pw + a.off; };
  // put something beside the road, facing it; y is height above the road, or null to sit on the ground
  const put = (o, s, d, y = null, face = true) => { T.at(s, a); const x = a.x + a.nx * d, z = a.z + a.nz * d, sg = d >= 0 ? 1 : -1; o.position.set(x, y === null ? G(x, z) - .1 : a.y + y, z); if (face) o.rotation.y = Math.atan2(-a.nx * sg, -a.nz * sg); scene.add(o); return o; };
  // put something across the road: local x runs left across the carriageway, local z points the way you're driving
  const across = (o, s, y = 0) => { T.at(s, a); o.position.set(a.x, a.y + y, a.z); o.rotation.y = Math.atan2(a.tx, a.tz); scene.add(o); return o; };
  const gantry = (s, lines, bg, ink, opt) => { T.at(s, a); const g = new THREE.Group(), w = a.hw + a.pw + .4;
    for (const sg of [1, -1]) { const p = mesh(box(.4, 7.4, .4), 0x4a4d55); p.position.set(sg * w, 3.7, 0); g.add(p); }
    const f = textPlane(lines, w * 2, 2.2, bg, ink, opt), b = textPlane(lines, w * 2, 2.2, bg, ink, opt); f.position.set(0, 6.6, -.08); f.rotation.y = Math.PI; b.position.set(0, 6.6, .08); g.add(f, b); return across(g, s); };
  gantry(12, ['WESTFIELD STREET · ST HELENS', 'ONE LAP · SIX MOTORS · NO INSURANCE'], '#400040', '#fda138', { lit: true, inks: ['#fff', '#fda138'] });
  const roofSign = (s, sg, lines, bg, ink, w = 11) => put(textPlane(lines, w, 2.6, bg, ink, { lit: true, border: ink }), s, sg * (edge(s) + .5), 11.6);
  roofSign(70, 1, ['NEXUS'], '#1a0a2e', '#c89bff', 8); roofSign(118, -1, ['LUCKY STRIKE', 'AMUSEMENTS'], '#c8102e', '#ffe14f'); roofSign(T.LEN - 46, -1, ['ST HELENS CELEBRITY NEWS', 'NEWSDESK · OPEN ALL HOURS'], '#400040', '#fda138', 14);
  // billboards with this week's front pages
  HEADLINES.forEach((hl, k) => { const s = 430 + k * 588, sg = k % 2 ? 1 : -1; T.at(s, a); if (HUMP[a.i] > .05 || SECTIONS[SEC_KEYS[a.sec]].kind === 'park') return; const d = sg * (a.hw + a.pw + a.off + 3.2), g = new THREE.Group();
    const pole = mesh(cyl(.3, .4, 13, 8), 0x4a4d55); pole.position.y = 6.5; const bd = textPlane(['SHCN EXCLUSIVE', ...hl], 9.5, 4.4, k % 3 ? '#f4efe2' : '#ffe14f', '#111', { border: '#400040', head: false, inks: ['#c8102e', '#111', '#111'] }); bd.position.y = 11.2; bd.castShadow = true; g.add(pole, bd);
    put(g, s, d, 0, false); g.rotation.y = Math.atan2(-a.tx - a.nx * sg * .45, -a.tz - a.nz * sg * .45); });
  // Sherdley Park: the St Helens Show is on
  { const s0 = MARK.park; gantry(s0 + 28, ['THE ST HELENS SHOW', 'SHERDLEY PARK · STRICTLY NO SCRAMBLERS'], '#ffe14f', '#c8102e', { inks: ['#c8102e', '#111'] });
    const wheel = new THREE.Group(), rim = new THREE.Group(), R = 15; rim.add(mesh(new THREE.TorusGeometry(R, .28, 6, 30), 0xc8102e)); rim.add(mesh(new THREE.TorusGeometry(R * .55, .16, 5, 24), 0xffe14f));
    const pods = []; for (let k = 0; k < 10; k++) { const an = k / 10 * Math.PI * 2, sp = mesh(box(.16, R, .16), 0xf4f4f4); sp.position.set(Math.cos(an) * R / 2, Math.sin(an) * R / 2, 0); sp.rotation.z = an + Math.PI / 2; rim.add(sp);
      const pod = mesh(box(1.6, 1.4, 1.3), [0xc8102e, 0xffe14f, 0x1a6ad8, 0x1f7a3a, 0xfda138][k % 5]); pod.position.set(Math.cos(an) * R, Math.sin(an) * R - .9, 0); rim.add(pod); pods.push(pod); }
    rim.position.y = R + 3; wheel.add(rim); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = mesh(box(.45, R + 4.6, .45), 0xf4f4f4); leg.position.set(sx * 4.4, (R + 3) / 2, sz * 1.6); leg.rotation.z = -sx * .27; wheel.add(leg); }
    put(wheel, s0 + 215, -64); W.dyn.push((dt) => { rim.rotation.z += dt * .22; for (const p of pods) p.rotation.z = -rim.rotation.z; });
    const tent = (s, d, c1, r = 7.5) => { const g = new THREE.Group(), wall = mesh(cyl(r, r, 3, 10), 0xf4efe2), top = mesh(new THREE.ConeGeometry(r + .6, 4.6, 10), c1), flag = mesh(box(.08, 2.4, .08), 0x333333), pen = mesh(box(1.3, .6, .05), 0xffe14f);
      wall.position.y = 1.5; top.position.y = 5.3; flag.position.y = 8.6; pen.position.set(.65, 9.4, 0); g.add(wall, top, flag, pen); put(g, s, d); };
    tent(s0 + 95, 34, 0xc8102e); tent(s0 + 290, 36, 0x1a6ad8, 6); tent(s0 + 150, -36, 0xffe14f, 6.5); tent(s0 + 335, -40, 0xc8102e, 5.5);
    const hs = new THREE.Group(), tower = mesh(cyl(2, 3.4, 15, 12), lam({ map: canvasTex(64, 64, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#c8102e' : '#f4efe2'; g.beginPath(); g.moveTo(0, k * 16 - 64); g.lineTo(64, k * 16); g.lineTo(64, k * 16 + 16); g.lineTo(0, k * 16 - 48); g.fill(); } }) })), cap = mesh(new THREE.ConeGeometry(3, 3.4, 12), 0x1a6ad8);
    tower.position.y = 7.5; cap.position.y = 16.7; hs.add(tower, cap); put(hs, s0 + 60, -42); }
  // Sutton: the gasometer, and the glassworks chimneys down Fleet Lane
  { const g = new THREE.Group(), tank = mesh(cyl(17, 17, 17, 22), 0x6f8088); tank.position.y = 8.5; g.add(tank); for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2, c = mesh(box(.4, 24, .4), 0x48545a); c.position.set(Math.cos(an) * 17.6, 12, Math.sin(an) * 17.6); g.add(c); }
    for (const y of [12, 18, 24]) { const ring = mesh(new THREE.TorusGeometry(17.6, .2, 5, 24), 0x48545a); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); } put(g, MARK.junction + 70, 52);
    const smoke = []; for (let k = 0; k < 3; k++) { const ch = mesh(cyl(1.5, 2.5, 48, 10), lam({ map: TEX.brick, color: 0xd8c0b8 })); put(ch, MARK.fleet + 250 + k * 26, -62); ch.position.y += 24;
      for (let q = 0; q < 5; q++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xd8c8c0, transparent: true, depthWrite: false, opacity: .5 })); sp.userData = { x: ch.position.x, y: ch.position.y + 24, z: ch.position.z, t: q / 5 }; scene.add(sp); smoke.push(sp); } }
    W.dyn.push((dt) => { for (const sp of smoke) { const u = sp.userData; u.t = (u.t + dt * .09) % 1; sp.position.set(u.x - u.t * 26, u.y + u.t * 22, u.z + u.t * 9); const k = 5 + u.t * 22; sp.scale.set(k, k, 1); sp.material.opacity = .55 * (1 - u.t); } }); }
  // the Burgies
  { const s0 = MARK.carrmill - 20, s1 = MARK.eastlancs - 90; for (let k = 0; k < 7; k++) { const s = s0 + (s1 - s0) * k / 6, r = rr(20, 36), m = mesh(new THREE.ConeGeometry(r, rr(9, 17), 9), lam({ color: [0x7d7d86, 0x74747c, 0x86868e][k % 3], flatShading: true })); put(m, s, edge(s) + r * .75 + rr(3, 26), null, false); m.position.y += 3; m.rotation.y = rng() * 6; }
    put(textPlane(['THE BURGIES', 'DANGER · GIANT ANTS'], 5, 1.6, '#5a3a1a', '#fff', { border: '#fff' }), MARK.carrmill + 25, edge(MARK.carrmill + 25) + 1.2, 1.9); }
  // Carr Mill Dam and the viaduct
  { const s = MARK.eastlancs + 270, wm = lam({ map: TEX.water }); TEX.water.repeat.set(7, 7); const dam = new THREE.Mesh(new THREE.CircleGeometry(100, 30), wm); dam.rotation.x = -Math.PI / 2; put(dam, s, -(edge(s) + 128), null, false); dam.position.y = G(dam.position.x, dam.position.z) + .9;
    W.dyn.push((dt) => { TEX.water.offset.x += dt * .012; TEX.water.offset.y += dt * .007; });
    put(textPlane(['CARR MILL DAM', 'No swimming · No powerboats on a Sunday'], 6, 1.6, '#5a3a1a', '#fff', { border: '#fff' }), s - 120, -(edge(s - 120) + 1.4), 1.9);
    const via = new THREE.Group(), bm = lam({ map: TEX.brick, color: 0xc8b0a8 }); for (let k = -6; k <= 6; k++) { const pier = mesh(box(3, 15, 2.4), bm); pier.position.set(0, 7.5, k * 11); via.add(pier); } const deck = mesh(box(4.6, 2.6, 140), bm); deck.position.y = 16; via.add(deck); T.at(s + 60, a); via.position.set(a.x - a.nx * 58, G(a.x - a.nx * 58, a.z - a.nz * 58) - 1, a.z - a.nz * 58); via.rotation.y = Math.atan2(a.tx, a.tz) + .5; scene.add(via); }
  // the East Lancs: footbridges, the big green signs, pylons
  const GREEN = '#0b6b3c';
  [[MARK.eastlancs + 520, ['A580   LIVERPOOL 11', 'St Helens (A570) 1 · Rainford 3 · Crank Caverns 4'], ['#ffe14f', '#fff']], [MARK.eastlancs + 1190, ['WINDLE ISLAND ½ m', '← St Helens · Town Centre    Rainford · Crank ↑'], ['#fff', '#fff']]].forEach(([s, lines, inks]) => { T.at(s, a); const g = new THREE.Group(), w = a.hw + a.off + 2.5, cm = 0x8a8d92;
    const deck = mesh(box(w * 2 + 4, .5, 2.8), cm); deck.position.y = 6.6; g.add(deck); for (const z of [-1.3, 1.3]) { const r = mesh(box(w * 2 + 4, 1.1, .1), 0x2f6a8a); r.position.set(0, 7.4, z); g.add(r); }
    for (const sg of [1, -1]) { const p = mesh(box(1, 6.6, 2.2), cm); p.position.set(sg * (w + .6), 3.3, 0); g.add(p); const ramp = mesh(box(2, .4, 16), cm); ramp.position.set(sg * (w + 2), 3.2, 8.6); ramp.rotation.x = .4; g.add(ramp); }
    const sign = textPlane(lines, 13, 3.2, GREEN, '#fff', { border: '#fff', inks }); sign.position.set(a.hw * .45, 8.4, -1.5); sign.rotation.y = Math.PI; g.add(sign); across(g, s); });
  for (let k = 0; k < 6; k++) { const s = MARK.eastlancs + 180 + k * 205, sg = k % 2 ? 1 : -1, g = new THREE.Group(), wire = new THREE.MeshBasicMaterial({ color: 0x5a6068, wireframe: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.5, 4.2, 34, 4, 5, true), wire); body.position.y = 17; g.add(body); for (const [y, w] of [[24, 15], [29, 11], [33.5, 7]]) { const arm = mesh(box(w, .35, .35), 0x5a6068, false); arm.position.y = y; g.add(arm); } put(g, s, sg * (edge(s) + 34)); }
  put(textPlane(['BIG MICK\'S BUTTIES', 'Split & gravy £1.20'], 4.6, 1.5, '#fff', '#c8102e', { border: '#c8102e' }), MARK.eastlancs + 860, edge(MARK.eastlancs + 860) + 1.5, 2.6);
  put(textPlane(['WIGAN 7', 'turn back now'], 3.6, 1.6, GREEN, '#fff', { border: '#fff', inks: ['#fff', '#ffe14f'] }), MARK.eastlancs + 60, edge(MARK.eastlancs + 60) + 1.5, 2.2);
  put(textPlane(['CRANK CAVERNS 2m ↑', 'St Helens Town Centre ←'], 6, 1.7, '#5a3a1a', '#fff', { border: '#fff' }), MARK.rainford - 70, edge(MARK.rainford - 70) + 1.5, 2.2);
  // Taylor Park
  { const s = MARK.prescot + 235, lake = new THREE.Mesh(new THREE.CircleGeometry(30, 22), lam({ map: TEX.water })); lake.rotation.x = -Math.PI / 2; put(lake, s, -(edge(s) + 42), null, false); lake.position.y = G(lake.position.x, lake.position.z) + .6;
    put(textPlane(['TAYLOR PARK', 'Please do not annoy the geese'], 5, 1.5, '#1f5a34', '#fff', { border: '#d8c070' }), MARK.prescot + 112, -(edge(MARK.prescot + 112) + 1.2), 1.9); }
  // what goes under the humpback bridges
  const railTex = canvasTex(64, 64, (g) => { g.fillStyle = '#4a4640'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#2e2a26'; for (let x = 0; x < 64; x += 8) g.fillRect(x, 6, 4, 52); g.fillStyle = '#9a9aa2'; for (const y of [14, 26, 38, 50]) g.fillRect(0, y, 64, 2); }, [36, 1]);
  for (const h of T.HUMPS) { if (h.kind === 'dirt') continue; const strip = new THREE.Mesh(new THREE.PlaneGeometry(260, 9), lam({ map: h.kind === 'canal' ? TEX.water : railTex })); strip.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(strip); across(g, h.s); g.position.y = G(g.position.x, g.position.z) + .25;
    T.at(h.s - 34, a); put(textPlane([h.name], 6.5, 1.1, h.kind === 'canal' ? '#1f3f6a' : '#1a1a22', '#fff', { border: '#fff' }), h.s - 34, a.hw + a.pw + .3, 2.6); }
  // roundabouts
  for (const r of T.ROUNDABOUTS) { const ri = r.r - 9.6, y = H(r.x, r.z), isl = mesh(cyl(ri, ri + .3, .7, 26), lam({ map: TEX.grass })); isl.position.set(r.x, y + .1, r.z); isl.receiveShadow = true; scene.add(isl);
    const kerb = mesh(new THREE.TorusGeometry(ri + .15, .22, 5, 26), 0xb9b5aa, false); kerb.rotation.x = Math.PI / 2; kerb.position.set(r.x, y + .4, r.z); scene.add(kerb);
    for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + .6, bd = textPlane(['❮ ❮ ❮ ❮'], 4.4, 1, '#111', '#fff'); bd.position.set(r.x + Math.sin(an) * (ri - .6), y + 1.2, r.z + Math.cos(an) * (ri - .6)); bd.rotation.y = an; scene.add(bd); } }
  // a long way off: the cooling towers and Billinge Hill
  const haze = (c) => new THREE.MeshBasicMaterial({ color: c, fog: false });
  { const prof = []; for (let k = 0; k <= 10; k++) { const t = k / 10; prof.push(new THREE.Vector2(34 - 15 * Math.sin(t * 2.4) + (t > .75 ? (t - .75) * 30 : 0), t * 110)); }
    for (let k = 0; k < 4; k++) { const tw = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), haze(0xc7ab9e)); tw.position.set(1020 + (k % 2) * 95, -8, 1950 + Math.floor(k / 2) * 110); scene.add(tw); }
    const hill = new THREE.Mesh(new THREE.SphereGeometry(640, 20, 10), haze(0x9aa58f)); hill.scale.y = .3; hill.position.set(-150, -50, -2200); scene.add(hill); const bcn = new THREE.Mesh(box(9, 16, 9), haze(0x7a8478)); bcn.position.set(-150, 150, -2200); scene.add(bcn); }
}

// ------------------------------------------------------------ five in the morning: sky, sun and haze
function sky(scene, W, opt) {
  const sunDir = W.sunDir = new THREE.Vector3(.78, .27, -.34).normalize(), HAZE = 0xe9c9ae;
  scene.fog = new THREE.Fog(HAZE, 150, 1400);
  const grp = W.sky = new THREE.Group(); scene.add(grp);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2400, 28, 14), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: sunDir }, hor: { value: new THREE.Color(HAZE) }, mid: { value: new THREE.Color(0x8fb6e6) }, zen: { value: new THREE.Color(0x2f5aa8) } },
    vertexShader: 'varying vec3 d; void main(){ d = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 d; uniform vec3 sun, hor, mid, zen;
      void main(){ vec3 n = normalize(d); float h = n.y; vec3 c = mix(hor, mid, smoothstep(0.0, 0.24, h)); c = mix(c, zen, smoothstep(0.2, 0.95, h));
        float s = max(dot(n, sun), 0.0); c += vec3(1.0, 0.5, 0.2) * pow(s, 5.0) * 0.5 + vec3(1.0, 0.85, 0.6) * pow(s, 60.0) * 0.6 + vec3(1.0, 0.95, 0.8) * smoothstep(0.9993, 0.9997, s) * 4.0;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  dome.renderOrder = -10; dome.frustumCulled = false; grp.add(dome);
  for (let k = 0; k < 16; k++) { const an = rng() * Math.PI * 2, r = rr(1100, 1900), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: k % 3 ? 0xffd0b8 : 0xf0b0a8, transparent: true, depthWrite: false, fog: false, opacity: rr(.35, .7) }));
    sp.position.set(Math.cos(an) * r, rr(170, 520), Math.sin(an) * r); const w = rr(300, 620); sp.scale.set(w, w * rr(.12, .22), 1); sp.renderOrder = -9; grp.add(sp); }
  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x80705c, 1.25));
  const sun = W.sun = new THREE.DirectionalLight(0xffcf9a, 2.5); scene.add(sun, sun.target);
  if (opt.shadows) { sun.castShadow = true; const c = sun.shadow.camera, R = opt.shadowRange || 75; c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = 1; c.far = 600; sun.shadow.mapSize.set(opt.shadows, opt.shadows); sun.shadow.bias = -.0005; sun.shadow.normalBias = .06; }
  W.update = (dt, focus, camPos) => { grp.position.copy(camPos); const t = 12; sun.target.position.set(Math.round(focus.x / t) * t, focus.y, Math.round(focus.z / t) * t); sun.position.copy(sun.target.position).addScaledVector(sunDir, 260); for (const f of W.dyn) f(dt); };
}
