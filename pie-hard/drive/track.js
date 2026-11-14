// PIE HARD level 6 – the circuit. One lap of St Helens on real roads, laid out from real junction positions at half scale.
import * as THREE from 'three';

export const SCALE = .5, DS = 2.5;
const LAT0 = 53.4525, LON0 = -2.73;
// [lat, lon, section that starts here]. Town centre, out west to Toll Bar, south through Thatto Heath, east across Sherdley Park and Sutton,
// north through Parr and Blackbrook to Carr Mill, west along the East Lancs, then back down Rainford Road into town.
const ROUTE = [
  [53.45275, -2.74278, 'westfield'], [53.4512, -2.7475], [53.4488, -2.7535, 'prescot'], [53.4460, -2.7600],
  [53.44274, -2.76578, 'thatto', 22], [53.4398, -2.7625], [53.43674, -2.75920, 'elephant', 24], [53.43505, -2.75242],
  [53.4338, -2.7450, 'sherdleyrd'], [53.4330, -2.7370], [53.4326, -2.7325, 0, 0, 24], [53.43184, -2.72861, 'park'], [53.4310, -2.7258], [53.4326, -2.7232], [53.4320, -2.7206],
  [53.4345, -2.7170, 'robins', 22], [53.43665, -2.71273], [53.4360, -2.7060, 'junction'], [53.43382, -2.70025, 0, 24],
  [53.4385, -2.6945, 'fleet'], [53.4425, -2.6949, 0, 0, 22], [53.44656, -2.69478], [53.45099, -2.69285, 'fouracre'], [53.4560, -2.6975, 'chain'],
  [53.46197, -2.70574, 'blackbrook'], [53.4675, -2.7105, 'carrmill'], [53.4732, -2.7168, 'eastlancs', 34], [53.4722, -2.7300],
  [53.4712, -2.7450], [53.4702, -2.7580], [53.46946, -2.76772, 'rainford', 26], [53.46610, -2.76410], [53.4630, -2.7588, 0, 0, 22],
  [53.45991, -2.75327, 'dentons', 24], [53.4592, -2.7460], [53.45868, -2.73996, 'north', 22], [53.4555, -2.7385, 'town'], [53.4535, -2.7392, 0, 20],
];
// kind decides the scenery; hw = half the carriageway, pw = pavement width, off = how far past the pavement you can get before you hit something solid
export const SECTIONS = {
  westfield: { name: 'WESTFIELD STREET', kind: 'town', hw: 5.2, pw: 3, off: 0 },
  prescot: { name: 'PRESCOT ROAD · A58', kind: 'terrace', hw: 5.6, pw: 2.6, off: 0 },
  thatto: { name: 'THATTO HEATH ROAD', kind: 'terrace', hw: 5, pw: 2.4, off: 0 },
  elephant: { name: 'ELEPHANT LANE', kind: 'council', hw: 5, pw: 2.4, off: 0 },
  sherdleyrd: { name: 'SHERDLEY ROAD', kind: 'semi', hw: 5.4, pw: 2.6, off: 0 },
  park: { name: 'SHERDLEY PARK', kind: 'park', hw: 6.5, pw: 0, off: 11 },
  robins: { name: 'ROBINS LANE', kind: 'terrace', hw: 5, pw: 2.4, off: 0 },
  junction: { name: 'ST HELENS JUNCTION', kind: 'industrial', hw: 5.6, pw: 2.4, off: 0 },
  fleet: { name: 'FLEET LANE', kind: 'industrial', hw: 6, pw: 2.4, off: 0 },
  fouracre: { name: 'DERBYSHIRE HILL ROAD · FOUR ACRE', kind: 'council', hw: 5.2, pw: 2.6, off: 0 },
  chain: { name: 'CHAIN LANE · PARR', kind: 'council', hw: 5.2, pw: 2.6, off: 0 },
  blackbrook: { name: 'BLACKBROOK ROAD · A58', kind: 'terrace', hw: 5.6, pw: 2.6, off: 0 },
  carrmill: { name: 'CARR MILL ROAD · THE BURGIES', kind: 'rural', hw: 5.6, pw: 0, off: 5 },
  eastlancs: { name: 'EAST LANCS ROAD · A580', kind: 'dual', hw: 9.5, pw: 0, off: 4.5 },
  rainford: { name: 'RAINFORD ROAD · A570', kind: 'semi', hw: 6, pw: 2.8, off: 0 },
  dentons: { name: 'DENTONS GREEN LANE', kind: 'semi', hw: 5.2, pw: 2.6, off: 0 },
  north: { name: 'NORTH ROAD', kind: 'terrace', hw: 5.2, pw: 2.6, off: 0 },
  town: { name: 'DUKE STREET', kind: 'town', hw: 5.2, pw: 3, off: 0 },
};
export const SEC_KEYS = Object.keys(SECTIONS);

// rolling ground under the whole town
export function H(x, z) { return 5 * Math.sin(x / 190 + 1.3) * Math.cos(z / 230) + 3.5 * Math.sin((x + z) / 140) + 2 * Math.cos((x - z) / 90 + .5); }

// a 4th value squares a junction off: the corner point is swapped for two points that far back along each leg.
// a 5th value makes it a roundabout of that radius: the road bulges left round an island, the way you'd go round it
const ctrl = [], ctrlTag = [];
export const ROUNDABOUTS = [];
{ const raw = ROUTE.map(([lat, lon]) => new THREE.Vector3((lon - LON0) * 66290 * SCALE, 0, -(lat - LAT0) * 110574 * SCALE));
  raw.forEach((p, i) => { const L = ROUTE[i][3], R = ROUTE[i][4], tag = ROUTE[i][2] || 0;
    const a = raw[(i + raw.length - 1) % raw.length], b = raw[(i + 1) % raw.length];
    if (R) { const din = p.clone().sub(a).normalize(), dout = b.clone().sub(p).normalize(), n = new THREE.Vector3(din.z + dout.z, 0, -din.x - dout.x).normalize();
      ctrl.push(p.clone().addScaledVector(din, -R * 2.1), p.clone().addScaledVector(n, R), p.clone().addScaledVector(dout, R * 2.1)); ctrlTag.push(tag, 0, 0); ROUNDABOUTS.push({ x: p.x, z: p.z, r: R }); return; }
    if (!L) { ctrl.push(p); ctrlTag.push(tag); return; }
    ctrl.push(p.clone().add(a.clone().sub(p).setLength(L)), p.clone().add(b.clone().sub(p).setLength(L))); ctrlTag.push(tag, 0); }); }
const curve = new THREE.CatmullRomCurve3(ctrl, true, 'centripetal');
const rawLen = curve.getLength();
export const N = Math.round(rawLen / DS);
export const LEN = N * DS;
const pts = curve.getSpacedPoints(N); pts.pop();

export const X = new Float32Array(N), Z = new Float32Array(N), Y = new Float32Array(N), TX = new Float32Array(N), TZ = new Float32Array(N),
  HW = new Float32Array(N), PW = new Float32Array(N), OFF = new Float32Array(N), K = new Float32Array(N), HUMP = new Float32Array(N), SEC = new Uint8Array(N);
for (let i = 0; i < N; i++) { X[i] = pts[i].x; Z[i] = pts[i].z; }
for (let i = 0; i < N; i++) { const a = (i + N - 1) % N, b = (i + 1) % N, dx = X[b] - X[a], dz = Z[b] - Z[a], l = Math.hypot(dx, dz) || 1; TX[i] = dx / l; TZ[i] = dz / l; }
for (let i = 0; i < N; i++) { const a = (i + N - 2) % N, b = (i + 2) % N; let d = Math.atan2(TX[b], TZ[b]) - Math.atan2(TX[a], TZ[a]); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; K[i] = d / (4 * DS); }

// where each tagged junction falls along the lap
export const MARK = {};
{ let from = 0;
  ctrlTag.forEach((tag, ci) => { const r = [0, 0, tag]; if (!tag) return; let best = from, bd = 1e9;
    for (let j = 0; j < N; j++) { const i = (from + j) % N, d = (X[i] - ctrl[ci].x) ** 2 + (Z[i] - ctrl[ci].z) ** 2; if (d < bd) { bd = d; best = i; } if (j > N * .5 && bd < 4) break; }
    MARK[r[2]] = best * DS; from = best; });
}
// sections, with widths eased over the joins
{ const order = SEC_KEYS.map((k) => [MARK[k], k]).sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < N; i++) { const s = i * DS; let k = order[order.length - 1][1]; for (const o of order) if (o[0] <= s) k = o[1]; SEC[i] = SEC_KEYS.indexOf(k); }
  const raw = (arr, f) => { for (let i = 0; i < N; i++) arr[i] = f(SECTIONS[SEC_KEYS[SEC[i]]]); const t = new Float32Array(N);
    for (let p = 0; p < 3; p++) { for (let i = 0; i < N; i++) { let a = 0; for (let j = -6; j <= 6; j++) a += arr[(i + j + N) % N]; t[i] = a / 13; } arr.set(t); } };
  raw(HW, (S) => S.hw); raw(PW, (S) => S.pw); raw(OFF, (S) => S.off);
}
// humpback bridges (the railway at Thatto Heath and the Junction, the canal at Blackbrook) and the dirt jumps in the park
export const HUMPS = [
  { s: MARK.elephant + 30, a: 3, w: 10, kind: 'rail', name: 'THATTO HEATH STATION BRIDGE' }, { s: MARK.junction + 190, a: 3, w: 10, kind: 'rail', name: 'JUNCTION BRIDGE' },
  { s: MARK.blackbrook + 120, a: 3.1, w: 10, kind: 'canal', name: 'SANKEY CANAL BRIDGE' },
  { s: MARK.park + 110, a: 1.7, w: 6, kind: 'dirt' }, { s: MARK.park + 235, a: 2, w: 6.5, kind: 'dirt' }, { s: MARK.park + 370, a: 1.7, w: 6, kind: 'dirt' },
];
for (const h of HUMPS) { const c = Math.round(h.s / DS), r = Math.ceil(h.w * 3.2 / DS); for (let j = -r; j <= r; j++) { const i = (c + j + N) % N, ds = j * DS; HUMP[i] += h.a * Math.exp(-ds * ds / (2 * h.w * h.w)); } }
for (let i = 0; i < N; i++) Y[i] = H(X[i], Z[i]) + HUMP[i];

export const wrap = (s) => ((s % LEN) + LEN) % LEN;
export const sdiff = (a, b) => { let d = (a - b) % LEN; if (d > LEN / 2) d -= LEN; if (d < -LEN / 2) d += LEN; return d; };   // signed distance along the lap from b to a
const lerp = (a, b, t) => a + (b - a) * t;
// everything about the road at distance s round the lap
export function at(s, o = {}) {
  s = wrap(s); const f = s / DS, i = Math.floor(f) % N, j = (i + 1) % N, t = f - Math.floor(f);
  o.x = lerp(X[i], X[j], t); o.z = lerp(Z[i], Z[j], t); o.y = lerp(Y[i], Y[j], t); o.hump = lerp(HUMP[i], HUMP[j], t);
  let tx = lerp(TX[i], TX[j], t), tz = lerp(TZ[i], TZ[j], t); const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; o.tx = tx; o.tz = tz; o.nx = tz; o.nz = -tx;
  o.hw = lerp(HW[i], HW[j], t); o.pw = lerp(PW[i], PW[j], t); o.off = lerp(OFF[i], OFF[j], t); o.k = lerp(K[i], K[j], t); o.sec = SEC[i]; o.i = i;
  return o;
}
const _a = {};
// a point d metres left (+) or right (-) of the centre line
export function pos(s, d, v = new THREE.Vector3()) { at(s, _a); return v.set(_a.x + _a.nx * d, _a.y, _a.z + _a.nz * d); }
// where is (x, z) on the lap? hint = last known sample, or -1 to look everywhere
export function locate(x, z, hint = -1, o = {}) {
  let best = 0, bd = 1e12;
  if (hint < 0) { for (let i = 0; i < N; i += 2) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } hint = best; bd = 1e12; }
  for (let j = -14; j <= 14; j++) { const i = (hint + j + N) % N, d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
  const dx = x - X[best], dz = z - Z[best], along = dx * TX[best] + dz * TZ[best];
  o.i = best; o.s = wrap(best * DS + along); o.d = dx * TZ[best] - dz * TX[best]; return o;
}
export const ctrlPoints = ctrl;
