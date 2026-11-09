// PIE HARD character system: KayKit Adventurers (CC0, Kay Lousberg – kaylousberg.com),
// re-dressed in code as Wiganers, bouncers and the hen party.
import * as THREE from 'three';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from './jsm/utils/SkeletonUtils.js';

const BASES = { Mage: null, Barbarian: null, Knight: null, Rogue: null };
const KEY = '#ff00ff';   // swatches painted this colour become cherry & white hoops in the shader

export async function loadCharacters(onProgress) {
  const loader = new GLTFLoader();
  const names = Object.keys(BASES); let done = 0;
  await Promise.all(names.map(async (n) => {
    const g = await loader.loadAsync(`models/${n}.glb`);
    let tex = null; g.scene.traverse((o) => { if (o.isMesh && o.material.map && !tex) tex = o.material.map; });
    BASES[n] = { gltf: g, image: tex && tex.image, clips: Object.fromEntries(g.animations.map((a) => [a.name, a])) };
    done++; onProgress && onProgress(done / names.length);
  }));
}

// ---- texture recolouring: repaint palette swatches, keep their shading
const texCache = new Map();
function recolour(baseName, cells) {
  const key = baseName + JSON.stringify(cells);
  if (texCache.has(key)) return texCache.get(key);
  const img = BASES[baseName].image, W = img.width, H = img.height, cw = W / 8, ch = H / 4;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  for (const [cell, col] of Object.entries(cells)) {
    const r = +cell[1], k = +cell[3];
    const x0 = k * cw, y0 = r * ch;
    if (col === KEY) { g.fillStyle = KEY; g.fillRect(x0, y0, cw, ch); continue; }
    const d = g.getImageData(x0, y0, cw, ch), px = d.data;
    let sum = 0; for (let i = 0; i < px.length; i += 4) sum += .3 * px[i] + .59 * px[i + 1] + .11 * px[i + 2];
    const avg = Math.max(1, sum / (px.length / 4));
    const t = new THREE.Color(col), tr = t.r * 255, tg = t.g * 255, tb = t.b * 255;
    for (let i = 0; i < px.length; i += 4) {
      const f = Math.min(1.6, Math.max(.45, (.3 * px[i] + .59 * px[i + 1] + .11 * px[i + 2]) / avg));
      px[i] = Math.min(255, tr * f); px[i + 1] = Math.min(255, tg * f); px[i + 2] = Math.min(255, tb * f);
    }
    g.putImageData(d, x0, y0);
  }
  const tex = new THREE.CanvasTexture(c); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  texCache.set(key, tex); return tex;
}

function material(baseName, cells, hoops) {
  const map = recolour(baseName, cells);
  const m = new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .3 });
  m.userData.flash = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFlash = m.userData.flash;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vObjY;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvObjY = transformed.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vObjY;\nuniform float uFlash;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float hoop = 0.0;
        if (diffuseColor.r > 0.85 && diffuseColor.g < 0.15 && diffuseColor.b > 0.85) {
          hoop = 1.0;
          float s = step(0.5, fract(vObjY * 4.2));
          diffuseColor.rgb = mix(vec3(0.55, 0.0, 0.012), vec3(0.88, 0.88, 0.86), s);
        }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (hoop > 0.5) totalEmissiveRadiance = diffuseColor.rgb * 0.3;')
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, vec3(1.0), uFlash);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'shcn-char';
  return m;
}

// ---- recipes
const SKIN = ['#f2c29b', '#e8b08a', '#c98e66', '#8a5a3c'];
const HAIR = ['#1a120c', '#3a2414', '#8a3a12', '#d9b25a', '#5a3a22'];
const TOPS = ['#ff4fa8', '#3fd4ff', '#ffd23f', '#b06bff', '#ff7a3f', '#4fe0a0'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const LOOKS = {
  wiganer: () => Math.random() < .55
    ? { base: 'Mage', hide: /Hat|Cape/, cells: { r1c0: KEY, r1c7: '#1d2340', r2c2: '#f0f0f0', r0c5: '#222222', r0c4: '#3a3a3a', r0c3: '#2a2a2a', r2c3: '#2a3553', r0c1: pick(HAIR), r0c0: pick(SKIN.slice(0, 3)) }, hoops: true }
    : { base: 'Barbarian', hide: /Hat|Cape/, keep: /Mug/, cells: { r1c0: KEY, r1c1: KEY, r2c3: '#2a3553', r0c6: KEY, r1c2: '#3a2414', r0c7: '#2a2a2a', r0c1: pick(HAIR), r0c2: pick(HAIR) }, hoops: true },
  bouncer: () => ({ base: 'Knight', hide: /Helmet|Cape/, scale: 1.14, suit: true,
    cells: { r0c3: '#2c2c30', r0c7: '#24242a', r0c6: '#1c1c20', r0c4: '#3a3a40', r1c7: '#18181c', r1c0: '#1c1c20', r1c1: '#111111', r1c2: '#2a2a2e', r0c1: pick(['#111111', '#2a1a0e', '#555555']), r0c0: pick(SKIN) } }),
  hen: () => { const top = pick(TOPS); return { base: 'Rogue', hide: /Cape/, glam: { skirt: pick(['#111111', top, '#e8e8e8', '#c8102e']), neck: '#e9a77f' }, handbag: pick(['#b0127a', '#111111', '#ffd400', '#ffffff']),
    cells: { r1c0: top, r1c1: top, r0c6: '#151515', r0c5: '#151515', r0c3: '#d4a017', r2c3: '#e9a77f', r1c7: '#c8102e', r2c5: '#e9a77f', r0c1: pick(['#f0d070', '#e8c35a', '#a0441a', '#5a3a22', '#1a120c', '#c86ad8']), r0c0: '#e9a77f' } }; },
  bride: () => ({ base: 'Rogue', hide: /Cape/, scale: 1.06, veil: true, glam: { skirt: '#ffffff', neck: '#efb48c' }, handbag: '#ffffff',
    cells: { r1c0: '#fbfbfb', r1c1: '#f0f0f0', r0c6: '#ff5fb4', r0c5: '#ff5fb4', r0c3: '#ffd700', r2c3: '#f2b49b', r1c7: '#ffffff', r2c5: '#f2b49b', r0c1: '#e8c35a', r0c0: '#f5c7a4' } }),
  scally: () => { const tr = pick(['#8e8e98', '#1d2340', '#2a2a2a', '#5a1a7a']); return { base: 'Mage', hide: /Hat|Cape/, cap: pick(['#f4f4f4', '#d8c39a', '#111111']),
    cells: { r1c0: tr, r1c7: tr, r2c2: '#f0f0f0', r0c5: '#f4f4f4', r0c4: '#dddddd', r0c3: '#f4f4f4', r2c3: tr, r0c1: pick(HAIR), r0c0: pick(SKIN.slice(0, 3)) } }; },
  mum: () => { const gown = pick(['#ff8fc8', '#8fd0ff', '#c9a0ff', '#ffb38a']); return { base: 'Rogue', hide: /Cape/, curlers: pick(['#ff4fa8', '#3fd4ff', '#ffd23f']), glam: { skirt: gown, long: true, neck: '#f2c29b', noLashes: true }, pin: true,
    cells: { r1c0: gown, r1c1: gown, r0c6: gown, r0c5: '#f4f4f4', r0c3: '#d4a017', r2c3: '#f2c29b', r1c7: '#ff8fc8', r2c5: '#f2c29b', r0c1: pick(['#8a3a12', '#d9b25a', '#5a3a22']), r0c0: '#f2c29b' } }; },
  drinker: () => { const parka = pick(['#4a5a3a', '#2a3a5a', '#5a4a2a']); return { base: 'Barbarian', hide: /Hat|Cape/, keep: /Mug/, cap: pick(['#2a2a2a', '#7a1e1e']),
    cells: { r1c0: parka, r1c1: parka, r2c3: '#3a3a40', r0c6: parka, r1c2: '#3a2414', r0c7: '#2a2a2a', r0c1: pick(['#777777', '#aaaaaa', '#5a3a22']), r0c2: pick(['#777777', '#aaaaaa', '#5a3a22']) } }; },
  scouser: () => { const a = pick(['#6a2ab8', '#1a6ad8', '#d81a6a', '#1aa86a']), b = pick(['#1ab8a8', '#ffd400', '#ffffff', '#ff7a1a']); return { base: 'Mage', hide: /Hat|Cape/, perm: pick(['#1a120c', '#3a2414', '#5a3a22']), tache: true,
    cells: { r1c0: a, r1c7: b, r2c2: b, r0c5: '#f4f4f4', r0c4: b, r0c3: '#f4f4f4', r2c3: a, r0c1: '#1a120c', r0c0: pick(SKIN.slice(0, 3)) } }; },
  roadworker: () => ({ base: 'Knight', hide: /Helmet|Cape/, scale: 1.08, hardhat: '#ffd400',
    cells: { r0c3: '#ff7a00', r0c7: '#dcdcdc', r0c6: '#2a2a2e', r0c4: '#ffb000', r1c7: '#1a1a1e', r1c0: '#dcdcdc', r1c1: '#111111', r1c2: '#2a2a2e', r0c1: pick(['#3a2414', '#555555', '#8a3a12']), r0c0: pick(SKIN) } }),
  warden: () => ({ base: 'Knight', hide: /Helmet|Cape/, cap: '#111114', peak: true, band: '#ffd400',
    cells: { r0c3: '#1a1a22', r0c7: '#111116', r0c6: '#2a2a30', r0c4: '#ffd400', r1c7: '#111116', r1c0: '#ffd400', r1c1: '#111111', r1c2: '#ffd400', r0c1: pick(HAIR), r0c0: pick(SKIN) } }),
  mp: () => ({ base: 'Knight', hide: /Helmet|Cape/, scale: 1.55, tie: true,
    cells: { r0c3: '#7a7a8a', r0c7: '#6a6a78', r0c6: '#4a4a54', r0c4: '#8a8a98', r1c7: '#222228', r1c0: '#c8102e', r1c1: '#111111', r1c2: '#d4a017', r0c1: '#b8b8b8', r0c0: '#f0b896' } }),
  hermit: () => { const rag = pick(['#6a5a3a', '#5a4a30', '#4a4a3a']); return { base: 'Barbarian', hide: /Hat|Cape|Mug/, beard: pick(['#9a9a9a', '#cfcfcf', '#5a4a3a']),
    cells: { r1c0: rag, r1c1: rag, r2c3: '#4a3a2a', r0c6: rag, r1c2: '#3a2a1a', r0c7: '#2a2a2a', r0c1: '#8a8a8a', r0c2: '#8a8a8a' } }; },
  beast: () => ({ base: 'Barbarian', hide: /Hat|Cape|Mug/, scale: 2.3, beard: '#2a1a0e', fur: true,
    cells: { r1c0: '#3a2a1a', r1c1: '#3a2a1a', r2c3: '#2e2014', r0c6: '#4a3420', r1c2: '#3a2a1a', r2c7: '#4a3420', r1c7: '#2a1a0e', r0c7: '#2a1a0e', r0c1: '#2a1a0e', r0c2: '#2a1a0e', r0c0: '#7a5a40' } }),
  trucker: () => ({ base: 'Barbarian', hide: /Hat|Cape|Mug/, scale: 1.15, cap: pick(['#1a3a9a', '#c8102e', '#2a2a2a']), cells: { r1c0: '#a01a1a', r1c1: '#a01a1a', r2c3: '#2a3553', r0c6: '#3a2414', r0c7: '#2a2a2a', r0c1: pick(HAIR), r0c2: pick(HAIR) } }),
  pitman: () => ({ base: 'Knight', hide: /Helmet|Cape/, scale: 1.1, hardhat: '#ffd400', lamp: true,
    cells: { r0c3: '#2a2c3a', r0c7: '#222430', r0c6: '#1a1c24', r0c4: '#3a3c4a', r1c7: '#1a1c24', r1c0: KEY, r1c1: '#111111', r1c2: '#e9c400', r0c1: pick(HAIR), r0c0: pick(SKIN) }, hoops: true }),
  piebaron: () => ({ base: 'Barbarian', hide: /Hat|Cape/, keep: /Mug/, scale: 1.9, chef: true, cells: { r1c0: KEY, r1c1: KEY, r2c3: '#f4f4f4', r0c6: '#3a2414', r0c7: '#2a2a2a', r0c1: '#8a3a12', r0c2: '#8a3a12' }, hoops: true }),
  keeper: () => ({ base: 'Knight', hide: /Helmet|Cape/, scale: 1.1, cap: '#1f3a22', peak: true,
    cells: { r0c3: '#2a4a2c', r0c7: '#1f3a22', r0c6: '#1a2a1c', r0c4: '#3a5a3c', r1c7: '#1a2a1c', r1c0: '#e9c400', r1c1: '#111111', r1c2: '#e9c400', r0c1: pick(['#555555', '#888888', '#2a1a0e']), r0c0: pick(SKIN) } }),
};

// ---- build an instance
export function makeCharacter(type) {
  const look = LOOKS[type](), B = BASES[look.base];
  const root = skeletonClone(B.gltf.scene);
  const mat = material(look.base, look.cells, !!look.hoops);
  let handR = null, head = null, chest = null, hips = null;
  root.traverse((o) => {
    if (o.isMesh) {
      const parentName = o.parent ? o.parent.name : '';
      const isProp = /handslot|head$|chest/i.test(parentName) && !o.isSkinnedMesh;
      if ((look.hide && look.hide.test(o.name)) || (isProp && !(look.keep && look.keep.test(o.name)))) { o.visible = false; return; }
      if (o.material && o.material.map) o.material = mat;
      o.frustumCulled = false;
    }
    if (/handslot\.?r/i.test(o.name) || o.name === 'handslotr') handR = o;
    if (o.name === 'head' || /^head$/i.test(o.name)) head = o;
    if (o.name === 'chest') chest = o;
    if (o.name === 'hips') hips = o;
  });
  if (look.handbag && handR) {
    const bag = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .14), new THREE.MeshLambertMaterial({ color: look.handbag }));
    const strap = new THREE.Mesh(new THREE.TorusGeometry(.12, .02, 6, 12, Math.PI), new THREE.MeshLambertMaterial({ color: look.handbag }));
    strap.position.y = .15; bag.add(body, strap); bag.position.set(0, -.12, .05); handR.add(bag);
  }
  if (look.veil && head) {
    // a soft veil: pinned at the crown, falling down her back, fading out at the edges (no hard outline)
    const fade = document.createElement('canvas'); fade.width = 64; fade.height = 128; const fg = fade.getContext('2d');
    // alphaMap reads brightness, so paint grey levels: bright in the middle, black at the sides and hem
    for (let x = 0; x < 64; x++) { const side = Math.pow(Math.sin(x / 63 * Math.PI), 1.5); for (let y = 0; y < 128; y++) {
      const v = Math.round(255 * side * Math.min(1, (1 - y / 128) * 1.6)); fg.fillStyle = `rgb(${v},${v},${v})`; fg.fillRect(x, y, 1, 1); } }
    const veilGeo = new THREE.CylinderGeometry(.46, .62, 1.4, 18, 1, true, Math.PI * .72, Math.PI * .56);
    veilGeo.translate(0, -.7, 0);
    const veil = new THREE.Mesh(veilGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666, transparent: true, alphaMap: new THREE.CanvasTexture(fade), opacity: .7, side: THREE.DoubleSide, depthWrite: false }));
    veil.position.set(0, .8, -.1); veil.rotation.x = .1; head.add(veil);
    const tiara = new THREE.Mesh(new THREE.TorusGeometry(.26, .035, 6, 18, Math.PI), new THREE.MeshBasicMaterial({ color: 0xfff2a8 }));
    tiara.position.set(0, .62, .18); tiara.rotation.x = -.35; head.add(tiara);
  }
  if (look.suit && chest) addSuit(chest);
  if (look.glam && chest && hips && head) addGlam(chest, hips, head, look.glam);
  if (look.cap && head) addCap(head, look.cap, look.peak, look.band);
  if (look.perm && head) addPerm(head, look.perm);
  if (look.tache && head) addTache(head);
  if (look.hardhat && head) addHardHat(head, look.hardhat, look.lamp);
  if (look.beard && head) addBeard(head, look.beard, look.fur);
  if (look.tie && chest) addTie(chest);
  if (look.curlers && head) addCurlers(head, look.curlers);
  if (look.pin && handR) addPin(handR);
  if (look.chef && head) addChef(head);
  const s = (look.scale || 1) * .92;
  root.scale.setScalar(s);
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const [n, clip] of Object.entries(B.clips)) actions[n] = mixer.clipAction(clip);
  for (const n of ['Throw', 'Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Kick', 'Hit_A', 'Hit_B', 'Death_A', 'Death_B']) {
    if (!actions[n]) continue; actions[n].setLoop(THREE.LoopOnce, 1); actions[n].clampWhenFinished = true;
  }
  const ctl = new Animator(mixer, actions);
  ctl.loop('Unarmed_Idle');
  return { root, mixer, ctl, material: mat, scale: s, base: look.base };
}

class Animator {
  constructor(mixer, actions) { this.mixer = mixer; this.a = actions; this.base = null; this.oneShot = null; this.locked = false;
    mixer.addEventListener('finished', (e) => { if (e.action === this.oneShot) { this.oneShot = null; if (!this.locked && this.base) this.base.reset().fadeIn(.15).play(); } }); }
  loop(name, speed = 1) {
    const act = this.a[name]; if (!act || this.locked) return;
    act.timeScale = speed;
    if (this.base === act) return;
    act.reset().fadeIn(.2).play(); if (this.base) this.base.fadeOut(.2); this.base = act;
  }
  once(name, speed = 1, lock = false) {
    const act = this.a[name]; if (!act || this.locked) return;
    if (this.oneShot) this.oneShot.fadeOut(.08);
    act.reset(); act.timeScale = speed; act.fadeIn(.08).play(); this.oneShot = act;
    if (this.base && lock) this.base.fadeOut(.15);
    if (lock) this.locked = true;
  }
  update(dt) { this.mixer.update(dt); }
}

// ---- costume bits. Bones sit at identity rotation in the rest pose, so offsets are plain model-space deltas.
// chest bone y .973, hips .406, head 1.241
const lam = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, extra));
const tri = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(0, -h / 2); sh.closePath(); return new THREE.ShapeGeometry(sh); };
function addSuit(chest) {
  const shirt = new THREE.Mesh(tri(.34, .36), lam(0xf4f4f4, { emissive: 0x333333 }));
  shirt.position.set(0, .12, .335); shirt.rotation.x = -.32; chest.add(shirt);
  const bow = new THREE.Group(), bm = lam(0x050505);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(.06, .11, 4), bm); w.rotation.z = sx * Math.PI / 2; w.position.x = sx * .05; bow.add(w); }
  bow.add(new THREE.Mesh(new THREE.BoxGeometry(.04, .045, .04), bm));
  bow.position.set(0, .26, .305); bow.rotation.x = -.32; chest.add(bow);
}
function addGlam(chest, hips, head, g) {
  // plunging neckline
  const neck = new THREE.Mesh(tri(.3, .3), lam(g.neck));
  neck.position.set(0, .1, .31); neck.rotation.x = -.5; chest.add(neck);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(.012, .07), lam(0xb06a48, { polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  line.position.set(0, .05, .33); line.rotation.x = -.5; chest.add(line);
  // short flared skirt
  const sk = new THREE.Mesh(new THREE.CylinderGeometry(.37, .5, .2, 18, 1, true), new THREE.MeshLambertMaterial({ color: g.skirt, side: THREE.DoubleSide }));
  sk.position.set(0, -.02, .01); hips.add(sk);
  if (g.long) sk.scale.set(1.05, 2.4, 1.05), sk.position.y = -.2;
  if (g.noLashes) return;
  // big lashes
  const lm = new THREE.MeshBasicMaterial({ color: 0x050505 });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(.024, .16, .012), lm);
    l.position.set(sx * (.17 + i * .05), .44 + i * .014, .43 - i * .028);
    l.rotation.z = -sx * (.25 + i * .35); l.rotation.x = -.5; head.add(l);
  }
}

function addCap(head, col, peak, band) {
  const m = new THREE.MeshLambertMaterial({ color: col });
  if (band) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.61, .61, .12, 18, 1, true), new THREE.MeshLambertMaterial({ color: band, side: THREE.DoubleSide })); b.position.set(0, .56, -.02); head.add(b); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
  dome.scale.set(1, .7, 1.02); dome.position.set(0, .5, -.02); head.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .04, 16, 1, false, -Math.PI / 2, Math.PI), m);
  brim.scale.set(1.3, 1, peak ? .9 : 1.25); brim.position.set(0, .52, .46); head.add(brim);
}
function addCurlers(head, col) {
  const m = new THREE.MeshLambertMaterial({ color: col });
  for (let i = 0; i < 7; i++) { const a = -1.2 + i * .4; const c = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .34, 8), m);
    c.rotation.z = Math.PI / 2; c.position.set(Math.sin(a) * .42, .8 + Math.cos(a) * .12, Math.cos(a) * .12 - .08); c.rotation.y = a; head.add(c); }
}
function addPin(hand) {
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .7, 10), new THREE.MeshLambertMaterial({ color: 0xc89a5a }));
  pin.rotation.z = Math.PI / 2; pin.position.set(0, .05, .1); hand.add(pin);
}

function addPerm(head, col) {
  const m = new THREE.MeshLambertMaterial({ color: col });
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const r = i % 2 ? .42 : .3;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.2, 0), m); b.position.set(Math.cos(a) * r, .78 + (i % 3) * .06, Math.sin(a) * r - .08); head.add(b); }
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), m); top.position.set(0, .9, -.05); head.add(top);
}
function addTache(head) { const t = new THREE.Mesh(new THREE.BoxGeometry(.34, .07, .08), new THREE.MeshLambertMaterial({ color: 0x1a120c })); t.position.set(0, .1, .52); head.add(t); }
function addHardHat(head, col, lamp) {
  const m = new THREE.MeshLambertMaterial({ color: col });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, .75, 1.05); dome.position.set(0, .52, -.02); head.add(dome);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, .05, 18), m); rim.position.set(0, .53, .02); head.add(rim);
  if (lamp) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .1, 10), new THREE.MeshBasicMaterial({ color: 0xfff4c0 })); l.scale.setScalar(.6); l.rotation.x = Math.PI / 2; l.position.set(0, .74, .52); head.add(l); }
}
function addBeard(head, col, fur) {
  const m = new THREE.MeshLambertMaterial({ color: col });
  const b = new THREE.Mesh(new THREE.ConeGeometry(fur ? .5 : .36, fur ? .8 : .75, 7), m); b.rotation.x = Math.PI; b.position.set(0, -.2, .36); head.add(b);
  if (fur) for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const h = new THREE.Mesh(new THREE.ConeGeometry(.16, .5, 5), m); h.position.set(Math.cos(a) * .45, .75, Math.sin(a) * .4 - .05); h.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); head.add(h); }
}
function addTie(chest) {
  const shirt = new THREE.Mesh(tri(.3, .34), lam(0xf4f4f4, { emissive: 0x333333 })); shirt.position.set(0, .12, .335); shirt.rotation.x = -.32; chest.add(shirt);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(.07, .3, .02), lam(0xc8102e, { polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); tie.position.set(0, .1, .35); tie.rotation.x = -.32; chest.add(tie);
  const ros = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .03, 12), lam(0xc8102e)); ros.rotation.x = Math.PI / 2 - .32; ros.position.set(.2, .18, .33); chest.add(ros);
  const rc = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .04, 10), lam(0xffd400)); rc.rotation.x = Math.PI / 2 - .32; rc.position.set(.2, .18, .345); chest.add(rc);
}

function addChef(head) {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x444444 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .5, 16), m); band.position.set(0, .75, -.02); head.add(band);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const puff = new THREE.Mesh(new THREE.SphereGeometry(.32, 10, 8), m); puff.position.set(Math.cos(a) * .25, 1.12, Math.sin(a) * .25); head.add(puff); }
  const top = new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 8), m); top.position.set(0, 1.25, 0); head.add(top);
}
