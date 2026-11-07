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
        if (diffuseColor.r > 0.85 && diffuseColor.g < 0.15 && diffuseColor.b > 0.85) {
          float s = step(0.5, fract(vObjY * 4.2));
          diffuseColor.rgb = mix(vec3(0.62, 0.02, 0.07), vec3(0.92, 0.92, 0.9), s);
        }`)
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
    : { base: 'Barbarian', hide: /Hat|Cape/, keep: /Mug/, cells: { r1c0: KEY, r1c1: KEY, r2c3: '#2a3553', r0c6: '#3a2414', r0c7: '#2a2a2a', r0c1: pick(HAIR), r0c2: pick(HAIR) }, hoops: true },
  bouncer: () => ({ base: 'Knight', hide: /Helmet|Cape/, scale: 1.14,
    cells: { r0c3: '#2c2c30', r0c7: '#24242a', r0c6: '#1c1c20', r0c4: '#3a3a40', r1c7: '#18181c', r1c0: '#e6e6e6', r1c1: '#111111', r1c2: '#e9c400', r0c1: pick(['#111111', '#2a1a0e', '#555555']), r0c0: pick(SKIN) } }),
  hen: () => { const top = pick(TOPS); return { base: 'Rogue', hide: /Cape/, handbag: pick(['#b0127a', '#111111', '#ffd400', '#ffffff']),
    cells: { r1c0: top, r1c1: top, r0c6: '#151515', r0c5: '#151515', r0c3: '#d4a017', r2c3: '#f2b49b', r1c7: '#c8102e', r2c5: '#f2b49b', r0c1: pick(['#f0d070', '#e8c35a', '#a0441a', '#5a3a22', '#1a120c', '#c86ad8']), r0c0: '#f2c29b' } }; },
  bride: () => ({ base: 'Rogue', hide: /Cape/, scale: 1.06, veil: true, handbag: '#ffffff',
    cells: { r1c0: '#fbfbfb', r1c1: '#f0f0f0', r0c6: '#ff5fb4', r0c5: '#ff5fb4', r0c3: '#ffd700', r2c3: '#f2b49b', r1c7: '#ffffff', r2c5: '#f2b49b', r0c1: '#e8c35a', r0c0: '#f5c7a4' } }),
};

// ---- build an instance
export function makeCharacter(type) {
  const look = LOOKS[type](), B = BASES[look.base];
  const root = skeletonClone(B.gltf.scene);
  const mat = material(look.base, look.cells, !!look.hoops);
  let handR = null, head = null;
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
  });
  if (look.handbag && handR) {
    const bag = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(.34, .3, .14), new THREE.MeshLambertMaterial({ color: look.handbag }));
    const strap = new THREE.Mesh(new THREE.TorusGeometry(.12, .02, 6, 12, Math.PI), new THREE.MeshLambertMaterial({ color: look.handbag }));
    strap.position.y = .15; bag.add(body, strap); bag.position.set(0, -.12, .05); handR.add(bag);
  }
  if (look.veil && head) {
    const veilGeo = new THREE.CylinderGeometry(.55, .75, 1.4, 16, 1, true, Math.PI * .6, Math.PI * .8);
    const veil = new THREE.Mesh(veilGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x555555, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false }));
    veil.position.set(0, .3, -.12); head.add(veil);
    const tiara = new THREE.Mesh(new THREE.TorusGeometry(.26, .035, 6, 18, Math.PI), new THREE.MeshBasicMaterial({ color: 0xfff2a8 }));
    tiara.position.set(0, .62, .18); tiara.rotation.x = -.35; head.add(tiara);
  }
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
