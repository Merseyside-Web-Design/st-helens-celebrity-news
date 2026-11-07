// PIE HARD creatures: giant ants (as spotted on the Burgies) and Taylor Park's Canada geese.
// Built from primitives, animated in code. Same interface as characters.js:
// { root, ctl: { loop, once, update }, material: { userData: { flash } }, scale }
import * as THREE from 'three';

const lam = (c, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, extra));
const ball = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); m.scale.set(sx, sy, sz); return m; };
const rod = (r1, r2, len, mat) => { const g = new THREE.CylinderGeometry(r1, r2, len, 7); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, mat); };

function flashFor(mats) {
  return { userData: { flash: { set value(v) { for (const m of mats) m.emissive.setRGB(v + m.userData.baseE, v + m.userData.baseE * .4, v); }, get value() { return 0; } } } };
}
function shell(color, glow = 0) { const m = lam(color); m.userData.baseE = glow; return m; }

// ------------------------------------------------------------------ ants
const ANT_LOOKS = {
  ant:     { body: 0x4a2414, belly: 0x4a2414, scale: 1 },
  spitter: { body: 0x1e2a10, belly: 0x5fae1f, glow: .25, scale: 1.05 },
  soldier: { body: 0x7a2010, belly: 0x7a2010, scale: 1.45, jaws: 1.8 },
  queen:   { body: 0x4a1830, belly: 0x6a1a3a, glow: .12, scale: 2.5, jaws: 1.4, wings: true },
};
export function makeAnt(kind = 'ant') {
  const L = ANT_LOOKS[kind], root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mBody = shell(L.body), mBelly = shell(L.belly, L.glow || 0), mats = [mBody, mBelly];
  if (L.glow) mBelly.emissive.setRGB(L.glow, L.glow * .4, 0);
  const abdomen = ball(.45, mBelly, 1, .85, 1.35); abdomen.position.set(0, .78, -.62); body.add(abdomen);
  { const pet = ball(.13, mBody); pet.position.set(0, .72, -.12); body.add(pet); }
  const thorax = ball(.27, mBody, 1, .9, 1.5); thorax.position.set(0, .76, .17); body.add(thorax);
  const head = new THREE.Group(); head.position.set(0, .86, .62); body.add(head);
  head.add(ball(.3, mBody, 1.1, .95, 1));
  const eye = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  for (const s of [-1, 1]) {
    const e = ball(.075, eye); e.position.set(s * .22, .08, .12); head.add(e);
    const jaw = new THREE.Mesh(new THREE.ConeGeometry(.05, .32 * (L.jaws || 1), 6), mBody); jaw.rotation.x = Math.PI / 2; jaw.rotation.z = -s * .5; jaw.position.set(s * .1, -.14, .3); head.add(jaw);
    const ant = rod(.018, .012, .55, mBody); ant.position.set(s * .1, .22, .12); ant.rotation.set(-1.0, 0, -s * .35); head.add(ant);
  }
  if (L.wings) for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(.55, 12), new THREE.MeshLambertMaterial({ color: 0xd8e8ff, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }));
    w.scale.set(.6, 1.6, 1); w.rotation.set(-Math.PI / 2 + .25, 0, s * .35); w.position.set(s * .32, 1.05, -.35); body.add(w);
  }
  const legs = [];
  [.36, .17, -.02].forEach((z, i) => { for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * .2, .74, z); body.add(hip);
    const up = rod(.06, .045, .4, mBody); up.rotation.z = s * 1.9; hip.add(up);           // out and up
    const knee = new THREE.Group(); knee.position.set(s * .38, .13, 0); hip.add(knee);
    const lo = rod(.045, .02, .9, mBody); lo.rotation.z = s * .25; knee.add(lo);         // down to the ground
    hip.rotation.y = s * (i - 1) * .55;
    legs.push({ hip, s, phase: (i % 2 === 0 ? 0 : Math.PI) + (s > 0 ? Math.PI : 0), base: hip.rotation.y });
  } });
  root.scale.setScalar(L.scale);
  const ctl = {
    mode: 'idle', speed: 1, t: Math.random() * 6, lunge: 0, dead: 0, deadT: 0,
    loop(n, sp = 1) { if (this.dead) return; this.mode = /Run|Walk/.test(n) ? 'walk' : 'idle'; this.speed = sp; },
    once(n) { if (this.dead) return; if (/Death/.test(n)) this.dead = 1; else if (/Hit/.test(n)) this.hit = .2; else this.lunge = .35; },
    update(dt) {
      this.t += dt * (this.mode === 'walk' ? 10 * Math.max(.6, this.speed) : 2);
      if (this.dead) {
        this.deadT += dt; const k = Math.min(1, this.deadT * 3);
        body.rotation.z = k * Math.PI; body.position.y = k * 1.7 - Math.max(0, k - .5) * .2;
        for (const l of legs) { l.hip.rotation.x = Math.sin(this.deadT * 30 + l.phase) * .4 * Math.max(0, 1 - this.deadT / 2); }
        return;
      }
      const amp = this.mode === 'walk' ? .45 : .06;
      for (const l of legs) { const ph = Math.sin(this.t + l.phase); l.hip.rotation.y = l.base + ph * amp * l.s; l.hip.rotation.x = Math.max(0, Math.cos(this.t + l.phase)) * amp * -.6; }
      body.position.y = Math.abs(Math.sin(this.t * 2)) * (this.mode === 'walk' ? .04 : .01);
      abdomen.rotation.x = Math.sin(this.t * .5) * .05;
      if (this.lunge > 0) { this.lunge -= dt; const k = Math.sin((1 - this.lunge / .35) * Math.PI); head.rotation.x = k * .5; body.position.z = k * .35; }
      else { head.rotation.x *= .8; body.position.z *= .8; }
      if (this.hit > 0) { this.hit -= dt; body.rotation.z = Math.sin(this.hit * 60) * .08; } else body.rotation.z = 0;
    },
  };
  return { root, ctl, material: flashFor(mats), scale: L.scale, creature: true };
}

// ------------------------------------------------------------------ geese
export function makeGoose(kind = 'goose') {
  const big = kind === 'mothergoose', S = big ? 2.6 : 1.15;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mBody = shell(0x7a6a58), mBlack = shell(0x111111), mWhite = shell(0xf2f2ee), mBelly = shell(0xd8d0c4), mats = [mBody, mBlack, mWhite, mBelly];
  const torso = ball(.45, mBody, .85, .75, 1.35); torso.position.set(0, .82, 0); body.add(torso);
  const belly = ball(.4, mBelly, .8, .6, 1.1); belly.position.set(0, .7, .08); body.add(belly);
  const tail = ball(.2, mBlack, 1, .5, 1); tail.position.set(0, .9, -.6); body.add(tail);
  const wings = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * .3, .98, .05); body.add(piv);
    const w = ball(.4, shell(0x5e5040), .25, .55, 1.2); w.material.userData.baseE = 0; mats.push(w.material); w.position.set(s * .06, -.12, -.05); piv.add(w); wings.push({ piv, s });
  }
  const neck = new THREE.Group(); neck.position.set(0, 1.0, .42); body.add(neck);
  const n1 = rod(.12, .09, .85, mBlack); n1.rotation.x = Math.PI + .35; neck.add(n1);    // points up and a touch forward
  const head = new THREE.Group(); head.position.set(0, .8, .3); neck.add(head); head.scale.setScalar(1.35);
  head.add(ball(.14, mBlack, .85, .85, 1.25));
  for (const s of [-1, 1]) { const ch = ball(.07, mWhite, .5, 1, 1.3); ch.position.set(s * .1, -.03, -.02); head.add(ch);
    const e = ball(.03, new THREE.MeshBasicMaterial({ color: big ? 0xff2a1a : 0x000000 })); e.position.set(s * .1, .05, .08); head.add(e); }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.06, .22, 6), mBlack); beak.rotation.x = Math.PI / 2; beak.position.set(0, -.02, .26); head.add(beak);
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * .16, .6, .05); body.add(hip);
    hip.add(rod(.035, .03, .6, mBlack));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.18, .03, .22), mBlack); foot.position.set(0, -.6, .08); hip.add(foot); legs.push({ hip, s });
  }
  root.scale.setScalar(S);
  const ctl = {
    mode: 'idle', speed: 1, t: Math.random() * 6, lunge: 0, dead: 0, deadT: 0, flap: 0,
    loop(n, sp = 1) { if (this.dead) return; this.mode = /Run|Walk/.test(n) ? 'walk' : 'idle'; this.speed = sp; },
    once(n) { if (this.dead) return; if (/Death/.test(n)) this.dead = 1; else if (/Hit/.test(n)) this.flap = .5; else { this.lunge = .4; this.flap = .6; } },
    update(dt) {
      this.t += dt * (this.mode === 'walk' ? 9 * Math.max(.6, this.speed) : 1.5);
      if (this.dead) { this.deadT += dt; const k = Math.min(1, this.deadT * 2.5); body.rotation.z = k * 1.45; body.position.y = k * .25; neck.rotation.x = k * .9; wings.forEach((w) => w.piv.rotation.z = w.s * k * .9); return; }
      const walk = this.mode === 'walk';
      for (const l of legs) l.hip.rotation.x = walk ? Math.sin(this.t + (l.s > 0 ? Math.PI : 0)) * .55 : 0;
      body.rotation.z = walk ? Math.sin(this.t) * .1 : 0;                      // waddle
      neck.rotation.x = Math.sin(this.t * .5) * .08;
      if (this.lunge > 0) { this.lunge -= dt; const k = Math.sin((1 - this.lunge / .4) * Math.PI); neck.rotation.x = k * 1.1; head.rotation.x = -k * .6; }
      else head.rotation.x *= .8;
      if (this.flap > 0) { this.flap -= dt; wings.forEach((w) => w.piv.rotation.z = w.s * (1.1 + Math.sin(this.flap * 30) * .5)); }
      else wings.forEach((w) => w.piv.rotation.z *= .85);
    },
  };
  return { root, ctl, material: flashFor(mats), scale: S, creature: true };
}

// ------------------------------------------------------------------ bats (Crank Caverns)
export function makeBat() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const mFur = shell(0x2a1a1a), mWing = new THREE.MeshLambertMaterial({ color: 0x3a2020, side: THREE.DoubleSide }); mWing.userData.baseE = 0;
  const mats = [mFur, mWing];
  body.add(ball(.22, mFur, 1, 1.1, 1.2));
  const head = ball(.15, mFur); head.position.set(0, .12, .22); body.add(head);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.06, .18, 4), mFur); ear.position.set(s * .08, .3, .2); body.add(ear);
    const e = ball(.035, new THREE.MeshBasicMaterial({ color: 0xff3a1a })); e.position.set(s * .07, .15, .35); body.add(e); }
  const wings = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * .15, .05, 0); body.add(piv);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s * .5, .25); sh.lineTo(s * 1.1, .1); sh.lineTo(s * .95, -.15); sh.lineTo(s * .7, -.05); sh.lineTo(s * .5, -.25); sh.lineTo(s * .3, -.08); sh.lineTo(0, -.2);
    const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), mWing); w.rotation.x = -Math.PI / 2; piv.add(w); wings.push({ piv, s });
  }
  const S = 1.3; root.scale.setScalar(S);
  const ctl = {
    t: Math.random() * 6, lunge: 0, dead: 0, deadT: 0, hit: 0,
    loop() {}, once(n) { if (this.dead) return; if (/Death/.test(n)) this.dead = 1; else if (/Hit/.test(n)) this.hit = .3; else this.lunge = .5; },
    update(dt) {
      this.t += dt;
      if (this.dead) { this.deadT += dt; body.position.y = Math.max(.15, body.position.y - dt * 4); body.rotation.z = Math.min(Math.PI, this.deadT * 6); wings.forEach((w) => w.piv.rotation.z = 0); return; }
      const fl = Math.sin(this.t * 22); wings.forEach((w) => w.piv.rotation.z = w.s * fl * .9);
      let y = 1.55 + Math.sin(this.t * 2.3) * .2;
      if (this.lunge > 0) { this.lunge -= dt; const k = Math.sin((1 - this.lunge / .5) * Math.PI); y -= k * .35; body.position.z = k * .5; } else body.position.z *= .9;
      body.position.y = y; body.rotation.z = this.hit > 0 ? Math.sin((this.hit -= dt) * 50) * .4 : Math.sin(this.t * 1.7) * .15;
    },
  };
  return { root, ctl, material: flashFor(mats), scale: S, creature: true };
}
