// PIE HARD level 6 – the motors. KayKit City Builder cars (Kay Lousberg, CC0), resprayed, stretched and bodged for St Helens, plus a few home-made ones.
import * as THREE from 'three';
import { GLTFLoader } from '../jsm/loaders/GLTFLoader.js';
import { canvasTex, merge, part } from './world.js';

export const S = 4.5;                          // model units to metres
const BASE = {}, mats = {}; let atlas = null, wheelMat = null, goldMat = null, blobTex = null, glowTex = null;
export async function loadCars() {
  const L = new GLTFLoader();
  await Promise.all(['hatchback', 'sedan', 'stationwagon', 'taxi', 'police'].map(async (n) => {
    const g = await L.loadAsync(`models/city/car_${n}.gltf`), root = g.scene.getObjectByName('car_' + n);
    BASE[n] = { body: root.geometry, wheels: root.children.filter((c) => c.isMesh).map((c) => ({ geo: c.geometry, x: c.position.x, y: c.position.y, z: c.position.z })) };
    if (!atlas) atlas = root.material.map.image;
  }));
  wheelMat = paint({}); goldMat = paint({ r0c2: '#d8b040', r0c4: '#2a2a2e' });
  blobTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 4, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,.6)'); r.addColorStop(.6, 'rgba(0,0,0,.35)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  glowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
}
// the KayKit palette with some of its swatches repainted: { r1c4: '#c9b48c' } resprays a hatchback
function paint(cells) {
  const key = JSON.stringify(cells); if (mats[key]) return mats[key];
  const t = canvasTex(256, 256, (g) => { g.drawImage(atlas, 0, 0, 256, 256);
    for (const k in cells) { const m = /r(\d)c(\d)/.exec(k), x = +m[2] * 32, y = +m[1] * 64, c = new THREE.Color(cells[k]), gr = g.createLinearGradient(0, y, 0, y + 64);
      gr.addColorStop(0, '#' + c.clone().lerp(new THREE.Color(0xffffff), .16).getHexString()); gr.addColorStop(1, '#' + c.clone().multiplyScalar(.74).getHexString()); g.fillStyle = gr; g.fillRect(x, y, 32, 64); } });
  t.flipY = false; t.needsUpdate = true;
  return (mats[key] = new THREE.MeshPhongMaterial({ map: t, shininess: 55, specular: 0x3a3632 }));
}
const BODY_CELL = { hatchback: 'r1c4', sedan: 'r1c2', stationwagon: 'r2c2', taxi: 'r1c3', police: 'r0c0' };
const lam = (c) => new THREE.MeshLambertMaterial({ color: c }), bas = (c) => new THREE.MeshBasicMaterial({ color: c });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
function label(text, w, h, ink, bg, font = 'Arial Black, Arial') {
  const tex = canvasTex(256, Math.max(16, Math.round(256 * h / w)), (g, cw, ch) => { g.clearRect(0, 0, cw, ch); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); } g.fillStyle = ink; g.font = `bold ${Math.round(ch * .7)}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + 1, cw - 8); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, side: THREE.DoubleSide, toneMapped: true }));
}
function sides(tilt, c, text, w, h, y, ink, bg, z = 0) { for (const sg of [1, -1]) { const p = label(text, w, h, ink, bg); p.position.set(sg * (c.hw + .015), y, z); p.rotation.y = sg * Math.PI / 2; tilt.add(p); } }
const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };

const COLS = ['#b8bcc4', '#a8282a', '#27478a', '#2c5a3a', '#e6e6e0', '#24242c', '#b49a66', '#6a1f2a', '#3a7a9a', '#d8d2b8'];
// vmax and acc in m/s; grip scales cornering; turn scales how sharply it steers; mass is how hard it shoves; hp is how much hammer it takes
export const SPECS = {
  nova: { model: 'hatchback', cells: { r1c4: '#c9b48c' }, name: 'THE NOVA', blurb: '1.0 litre. One careful owner, six careless ones.', vmax: 33, acc: 10, grip: .94, turn: 1.05, mass: .85, hp: 100,
    extra: (t, c) => { sides(t, c, 'L', .34, .34, .8, '#c8102e', '#fff', -1.2); } },
  xr: { model: 'hatchback', cells: { r1c4: '#cf1f1f', r0c2: '#18181c' }, name: 'THE XR3-AND-A-HALF', blurb: 'Furry dice. Whale-tail spoiler. Smells of Lynx Africa.', vmax: 40, acc: 13, grip: 1.04, turn: 1.08, mass: .95, hp: 110,
    extra: (t, c) => { t.add(mesh(box(1.5, .07, .4), lam(0x18181c), 0, 1.36, -c.hl + .34)); for (const sg of [-1, 1]) t.add(mesh(box(.07, .22, .3), lam(0x18181c), sg * .6, 1.26, -c.hl + .34)); sides(t, c, 'XR3½i', 1.3, .2, .62, '#fff'); } },
  scooby: { model: 'sedan', cells: { r1c2: '#1a47b8' }, gold: true, name: 'THE SCOOBY', blurb: 'Gold wheels, big wing, sounds like a tractor. Loves mud.', vmax: 44, acc: 15, grip: 1.12, turn: 1, mass: 1.05, hp: 120, dirt: 1,
    extra: (t, c) => { t.add(mesh(box(1.7, .08, .42), lam(0x1a47b8), 0, 1.5, -c.hl + .3)); for (const sg of [-1, 1]) t.add(mesh(box(.08, .42, .34), lam(0x1a47b8), sg * .7, 1.3, -c.hl + .3)); t.add(mesh(box(.5, .12, .5), lam(0x10286a), 0, 1.0, c.hl - 1.15)); sides(t, c, '★ 555 ★', 1.5, .26, .68, '#ffe14f'); } },
  pievan: { model: 'stationwagon', cells: { r2c2: '#f1ede2' }, scale: [1.1, 1.46, 1.14], name: 'THE PIE VAN', blurb: 'Property of the Pie Baron of Wigan. Was. Full of pies. Corners like a wardrobe.', vmax: 36.5, acc: 11, grip: .9, turn: .9, mass: 1.9, hp: 160,
    extra: (t, c) => { sides(t, c, 'TELLINS PIES', 2.5, .46, 1.22, '#c8102e', '#ffe14f', -.3); const pie = new THREE.Group(); pie.add(mesh(new THREE.CylinderGeometry(.62, .5, .36, 14), lam(0xd9a441), 0, 0, 0), mesh(new THREE.CylinderGeometry(.66, .66, .08, 14), lam(0xb8782a), 0, .2, 0), mesh(box(.08, .06, .5), lam(0x7a4a12), 0, .26, 0)); pie.position.set(0, c.top + .18, -.2); t.add(pie); } },
  panda: { model: 'police', cells: { r0c0: '#f2f2ee' }, name: 'THE PANDA CAR', blurb: 'Merseyside\'s finest. They left the keys in. And the blues on.', vmax: 51, acc: 17, grip: 1.15, turn: 1, mass: 1.1, hp: 130, police: true },
  whippy: { model: 'stationwagon', cells: { r2c2: '#f6d9e2' }, scale: [1.12, 1.52, 1.18], name: 'MR DRIPPY', blurb: 'Plays Greensleeves. Has no business being this fast.', vmax: 42, acc: 14, grip: 1.02, turn: .95, mass: 1.6, hp: 170,
    extra: (t, c) => { sides(t, c, 'MR DRIPPY', 2.5, .5, 1.3, '#c8102e', '#fff6dc', -.3); sides(t, c, '99p', .7, .4, .72, '#1a6ad8', 0, 1.2); const cone = new THREE.Group(); cone.add(mesh(new THREE.ConeGeometry(.42, 1.1, 10), lam(0xd9a441), 0, 0, 0), mesh(new THREE.SphereGeometry(.46, 10, 8), lam(0xfff6dc), 0, -.7, 0), mesh(box(.12, .5, .12), lam(0x5a3410), .16, -1.05, 0)); cone.rotation.x = Math.PI; cone.position.set(0, c.top + .55, .5); t.add(cone); t.add(mesh(box(1.9, .1, 2.6), lam(0xf08aa8), 0, c.top + .03, -.3)); } },
  // everyone else on the road
  dealer: { model: 'sedan', cells: { r1c2: '#14141a', r3c0: '#0c0c10' }, gold: true, name: 'Beak Street Barry', extra: (t, c) => { t.add(mesh(box(1.6, .07, .36), lam(0x14141a), 0, 1.46, -c.hl + .3)); } },
  dealer2: { model: 'sedan', cells: { r1c2: '#8a8f98', r3c0: '#0c0c10' }, name: 'Nine-Bar Neil', extra: (t, c) => { sides(t, c, 'TURBO', .9, .18, .6, '#c8102e'); } },
  dealer3: { model: 'hatchback', cells: { r1c4: '#5a1f8a', r3c0: '#0c0c10', r0c2: '#18181c' }, gold: true, name: 'Wrap Rachel' },
  minibus: { model: 'stationwagon', cells: { r2c2: '#17171c', r3c0: '#101014' }, scale: [1.14, 1.38, 1.28], name: 'Shacklebottom\'s doormen', mass: 2.2, extra: (t, c) => { sides(t, c, 'NEXUS SECURITY', 2.6, .34, 1.2, '#c89bff', 0, -.2); } },
  cop: { model: 'police', cells: { r0c0: '#f2f2ee' }, police: true, name: 'The bizzies', mass: 1.2 },
  taxi: { model: 'taxi', cells: { r1c3: '#1c1c22' }, name: 'Taxi' },
  limo: { model: 'sedan', cells: { r1c2: '#f25aa8', r3c0: '#2a1024' }, scale: [1.02, 1, 1.75], name: 'THE HEN LIMO', mass: 2, extra: (t, c) => { sides(t, c, 'KELLY\'S HEN DO', 3.4, .34, .66, '#fff'); t.add(mesh(box(.9, .05, 1.3), lam(0x2a1024), 0, c.top + .01, -.4)); } },
  car0: { model: 'hatchback' }, car1: { model: 'sedan' }, car2: { model: 'stationwagon' },
};
export const PLAYER_CARS = ['nova', 'xr', 'scooby', 'pievan', 'panda', 'whippy'];

function finish(car, c) {
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(c.hw * 2 + 1.1, c.hl * 2 + 1.2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = .05; blob.renderOrder = 1; car.g.add(blob); car.blob = blob;
  car.brakeMat = bas(0x6a0808); for (const sg of [-1, 1]) { const b = new THREE.Mesh(box(.34, .12, .05), car.brakeMat); b.position.set(sg * (c.hw - .32), c.lampY, -c.hl - .02); car.tilt.add(b); }
  Object.assign(car, c); return car;
}
export function makeCar(kind, tint) {
  const sp = SPECS[kind]; if (sp.build) return sp.build(kind);
  const b = BASE[sp.model], sc = sp.scale || [1, 1, 1], g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const cells = sp.cells ? { ...sp.cells } : { [BODY_CELL[sp.model]]: tint || COLS[Math.floor(Math.random() * COLS.length)] };
  const body = new THREE.Mesh(b.body, paint(cells)); body.scale.set(S * sc[0], S * sc[1], S * sc[2]); body.position.y = .0587 * S + (sc[1] - 1) * .03 * S; body.castShadow = true; tilt.add(body);
  b.body.computeBoundingBox(); const bb = b.body.boundingBox, c = { hw: bb.max.x * S * sc[0], hl: bb.max.z * S * sc[2], top: body.position.y + bb.max.y * S * sc[1], lampY: body.position.y + .115 * S * sc[1] };
  const wheels = b.wheels.map((w) => { const pivot = new THREE.Group(), m = new THREE.Mesh(w.geo, sp.gold ? goldMat : wheelMat); m.scale.setScalar(S * (sc[1] > 1.2 ? 1.08 : 1)); m.castShadow = true; pivot.add(m); pivot.position.set(w.x * S * sc[0], .07 * S, w.z * S * sc[2]); g.add(pivot); return { pivot, mesh: m, front: w.z > 0 }; });
  const car = finish({ g, tilt, wheels, spec: sp, kind, r: .07 * S }, c);
  if (sp.extra) sp.extra(tilt, c);
  if (sp.police) { sides(tilt, c, '━━━━━━━━', 3.2, .24, .78, '#ff5a1f'); sides(tilt, c, 'POLICE', 1.1, .22, .78, '#1a2a6a', '#f2f2ee', .1);
    car.blues = [bas(0x1030a0), bas(0x1030a0)]; car.blues.forEach((m, i) => { const l = new THREE.Mesh(box(.3, .16, .26), m); l.position.set(i ? .3 : -.3, c.top + .02, -.1); tilt.add(l); });
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x4070ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); fl.scale.set(5, 5, 1); fl.position.set(0, c.top + .3, -.1); tilt.add(fl); car.flash = fl; }
  return car;
}
// a slab-sided thing on wheels: coaches, buses, the milk float
const slabMats = {};
function slab(kind, o) {
  const g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const sm = slabMats[kind] || (slabMats[kind] = [new THREE.MeshLambertMaterial({ map: canvasTex(512, 128, o.side) }), new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, o.front) }), new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, o.back || o.front) }), lam(o.roof)]);   // painted once per kind, however many turn up
  const body = mesh(box(o.w, o.h, o.l), [sm[0], sm[0], sm[3], sm[3], sm[1], sm[2]], 0, o.clear + o.h / 2, 0); tilt.add(body);
  const wb = BASE.hatchback.wheels[0], ws = S * (o.wheel || 1.5), r = .07 * ws, wheels = [];
  for (const z of o.axles) for (const sg of [1, -1]) { const pivot = new THREE.Group(), m = new THREE.Mesh(wb.geo, wheelMat); m.scale.setScalar(ws); if (sg < 0) m.rotation.y = Math.PI; m.castShadow = true; pivot.add(m); pivot.position.set(sg * (o.w / 2 - .12), r, z); g.add(pivot); wheels.push({ pivot, mesh: m, front: z > 0 }); }
  const car = finish({ g, tilt, wheels, spec: SPECS[kind], kind, r }, { hw: o.w / 2, hl: o.l / 2, top: o.clear + o.h, lampY: o.clear + .5 });
  if (o.extra) o.extra(tilt, car); return car;
}
const windows = (g, y, h, n, x0 = 20, x1 = 492) => { const w = (x1 - x0) / n; g.fillStyle = '#26313d'; for (let i = 0; i < n; i++) g.fillRect(x0 + i * w + 3, y, w - 6, h); g.fillStyle = 'rgba(255,200,150,.25)'; for (let i = 0; i < n; i++) g.fillRect(x0 + i * w + 3, y, w - 6, h * .3); };
const face = (col, scr, txt, ink) => (g) => { g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = '#26313d'; g.fillRect(10, 14, 108, 52); g.fillStyle = '#111'; g.fillRect(14, 2, 100, 12); g.fillStyle = scr; g.font = 'bold 11px Arial'; g.textAlign = 'center'; g.fillText(txt, 64, 12, 96); g.fillStyle = '#fff6c0'; g.fillRect(8, 96, 22, 12); g.fillRect(98, 96, 22, 12); g.fillStyle = ink; g.fillRect(34, 98, 60, 10); };
SPECS.coach = { name: 'WIGAN TOURS', mass: 4, build: (k) => slab(k, { w: 2.55, h: 2.9, l: 11.5, clear: .5, roof: 0xe8e8e8, axles: [3.9, -3.2, -4.3],
  side: (g) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#c8102e'; for (let i = 0; i < 6; i++) g.fillRect(0, 70 + i * 9, 512, 5); windows(g, 14, 40, 9); g.fillStyle = '#111'; g.font = 'bold 30px Arial Black, Arial'; g.textAlign = 'center'; g.fillText('WIGAN TOURS', 256, 104); g.font = 'bold 10px Arial'; g.fillText('"Pies across the world"', 256, 120); },
  front: face('#f2f2f2', '#ffb020', 'ST HELENS (AWAY)', '#c8102e') }) };
SPECS.bus = { name: 'The 32 to Clock Face', mass: 4, build: (k) => slab(k, { w: 2.5, h: 2.8, l: 9.6, clear: .45, roof: 0xd8d2b8, axles: [3, -3],
  side: (g) => { g.fillStyle = '#1f6a4a'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#e8e2c8'; g.fillRect(0, 0, 512, 62); windows(g, 12, 40, 8); g.fillStyle = '#e8e2c8'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.fillText('ST HELENS CORPORATION-ISH TRANSPORT', 256, 98, 470); },
  front: face('#1f6a4a', '#ffb020', '32 CLOCK FACE', '#e8e2c8') }) };
SPECS.float = { name: 'Milk float', mass: 1.6, build: (k) => slab(k, { w: 1.9, h: 1.0, l: 4.4, clear: .4, roof: 0xdedede, wheel: 1, axles: [1.3, -1.4],
  side: (g) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#1a4aa8'; g.fillRect(0, 86, 512, 42); g.fillStyle = '#fff'; g.font = 'bold 30px Arial'; g.textAlign = 'center'; g.fillText('DAIRY · GOLD TOP 38p', 256, 118); },
  front: face('#f4f4f4', '#fff', 'MILK', '#1a4aa8'),
  extra: (t, c) => { t.add(mesh(box(1.9, 1.3, 1.2), lam(0xf4f4f4), 0, 2.05, 1.6), mesh(box(1.7, .7, .05), lam(0x26313d), 0, 2.2, 2.21), mesh(box(1.95, .08, 4.5), lam(0x1a4aa8), 0, 2.75, 0));
    for (const x of [-.9, .9]) for (const z of [-2.1, .9]) t.add(mesh(box(.07, 1.36, .07), lam(0x888888), x, 2.05, z)); for (let i = 0; i < 6; i++) t.add(mesh(box(.5, .34, .5), lam(i % 2 ? 0x2a6ad8 : 0xc8102e), (i % 3 - 1) * .58, 1.58 + (i > 2 ? .36 : 0), -.5 - (i % 2) * .7)); c.top = 2.8; } }) };

// a scrambler with a scally on it. No helmet, no tax, no fear.
export function makeBike(col = 0x7cff4f, hood = 0x22222a) {
  const g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt); const cy = (r, h) => new THREE.CylinderGeometry(r, r, h, 12);
  const body = new THREE.Mesh(merge([
    part(box(.16, .2, 1.1), '#2a2a30', 0, .62, 0), part(box(.26, .26, .5), new THREE.Color(col), 0, .86, .16), part(box(.24, .1, .6), '#111111', 0, .9, -.32), part(box(.2, .3, .3), '#70757d', 0, .5, .05),
    part(box(.07, .8, .07), '#a8adb5', 0, .7, .64, -.42), part(box(.62, .05, .05), '#111111', 0, 1.12, .5), part(box(.3, .06, .5), new THREE.Color(col), 0, .78, -.62), part(box(.34, .05, .34), new THREE.Color(col), 0, .7, .78),
    part(box(.36, .56, .26), new THREE.Color(hood), 0, 1.32, -.2, .32), part(new THREE.SphereGeometry(.17, 8, 6), new THREE.Color(hood), 0, 1.72, -.04), part(box(.2, .12, .1), '#f2c29b', 0, 1.7, .1),
    part(box(.1, .5, .1), new THREE.Color(hood), .22, 1.3, .14, -1.05), part(box(.1, .5, .1), new THREE.Color(hood), -.22, 1.3, .14, -1.05),
    part(box(.13, .5, .15), '#e8e8e8', .2, .86, -.08, -.9), part(box(.13, .5, .15), '#e8e8e8', -.2, .86, -.08, -.9), part(box(.12, .42, .13), '#e8e8e8', .2, .58, .16, .2), part(box(.12, .42, .13), '#e8e8e8', -.2, .58, .16, .2),
  ]), new THREE.MeshLambertMaterial({ vertexColors: true })); body.castShadow = true; tilt.add(body);
  const wm = lam(0x15151a), wheels = [.72, -.68].map((z) => { const pivot = new THREE.Group(), m = new THREE.Mesh(merge([part(cy(.34, .13), '#15151a', 0, 0, 0, 0, 0, Math.PI / 2), part(cy(.2, .15), '#a8adb5', 0, 0, 0, 0, 0, Math.PI / 2), part(box(.16, .06, .6), '#15151a', 0, 0, 0)]), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; pivot.add(m); pivot.position.set(0, .34, z); tilt.add(pivot); return { pivot, mesh: m, front: z > 0 }; });
  return finish({ g, tilt, wheels, spec: { name: 'Scrambler', mass: .35 }, kind: 'bike', r: .34, bike: true }, { hw: .38, hl: 1.05, top: 1.9, lampY: .8 });
}
// spin the wheels, steer the fronts, lean the body
export function pose(car, dt, speed, steer, roll, pitch, brake) {
  const spin = speed * dt / car.r; for (const w of car.wheels) { w.mesh.rotation.x += spin; if (w.front) w.pivot.rotation.y = steer * .5; }
  car.tilt.rotation.z = roll; car.tilt.rotation.x = pitch;
  if (car.brakeMat) car.brakeMat.color.setHex(brake ? 0xff2a1a : 0x6a0808);
}
export function blues(car, t, on) { if (!car.blues) return; const a = on && Math.floor(t * 7) % 2; car.blues[0].color.setHex(on && a ? 0x60a0ff : 0x102060); car.blues[1].color.setHex(on && !a ? 0x60a0ff : 0x102060); car.flash.material.opacity = on ? .55 + .35 * Math.sin(t * 44) : 0; }
