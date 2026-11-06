/* Westfield St Rumble – an SHCN original. Survive Saturday night on Westfield Street. */
(function () {
  'use strict';
  var cv = document.getElementById('game-canvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var W = 480, H = 320, GROUND = 290, FEET = GROUND - 14, LEFT = 24, RIGHT = W - 24;
  cv.width = W; cv.height = H;
  ctx.imageSmoothingEnabled = false;
  var FONT = '"Press Start 2P", "Courier New", monospace';
  var HI_KEY = 'shcn-westfield-rumble-hi';

  function getHi() { try { return parseInt(localStorage.getItem(HI_KEY) || '0', 10) || 0; } catch (e) { return 0; } }
  function setHi(v) { try { localStorage.setItem(HI_KEY, String(v)); } catch (e) {} }
  var AC = null, muted = false;
  function beep(f, d, type, vol) {
    if (muted) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(vol || 0.05, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d);
    } catch (e) {}
  }
  function thud() { beep(90 + Math.random() * 40, .12, 'square', .08); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ---------- the cast ----------
  var PLAYER = { name: 'YOU', look: 'lad', hp: 100, speed: 2.4, dmg: 1 };
  var OPPONENTS = [
    { name: 'THE BOUNCER', look: 'bouncer', hp: 100, speed: 1.4, dmg: 1.0, reach: 6, cd: [55, 95], block: .25, aggro: .5, spec: 0, special: null,
      intro: "Not tonight, lad. Not in them shoes.", hit: ['Oi!', 'Right, that\'s it.', 'You\'re barred.'], win: "Name's not down, you're not coming in." },
    { name: 'THE SCOUSER', look: 'scouser', hp: 100, speed: 2.0, dmg: 1.0, reach: 0, cd: [35, 65], block: .3, aggro: .65, spec: .004, special: 'shout',
      intro: 'Calm down, calm down!', hit: ['Calm down!', 'Ey! Ey! Ey!', 'Calm down, calm down!'], win: "Told yer to calm down, didn't I?" },
    { name: 'THE DEALER', look: 'dealer', hp: 105, speed: 2.3, dmg: 1.1, reach: 0, cd: [28, 55], block: .35, aggro: .7, spec: .006, special: 'kebab',
      intro: 'You after summat, mate?', hit: ['Ow, me tracky!', 'Do you know who I am?', 'Not the face!'], win: 'Should\'ve stayed in Wigan.' },
    { name: 'THE HEN PARTY', look: 'hen', hp: 150, speed: 2.7, dmg: 1.45, reach: 10, cd: [16, 34], block: .4, aggro: .85, spec: .012, special: 'stiletto',
      intro: "IT'S HER HEN DO!! WHO INVITED HIM?!", hit: ['Mind me nails!', 'Get him, girls!', "That's me best handbag!", 'WOOOO!'], win: "Shots! SHOTS! SHOTS!" }
  ];

  // ---------- input ----------
  var keys = {}, pressed = {};
  var KEYS = { left: ['ArrowLeft', 'a', 'A'], right: ['ArrowRight', 'd', 'D'], up: ['ArrowUp', 'w', 'W'], block: ['ArrowDown', 's', 'S'],
               punch: ['j', 'J', 'z', 'Z'], kick: ['k', 'K', 'x', 'X'], pie: ['l', 'L', 'c', 'C', ' '] };
  function down(n) { var a = KEYS[n]; for (var i = 0; i < a.length; i++) if (keys[a[i]]) return true; return !!keys['btn-' + n]; }
  function hit(n) { var v = pressed[n]; pressed[n] = false; return v; }
  var stage = document.getElementById('game-stage');
  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var r = stage.getBoundingClientRect(); if (r.top > innerHeight || r.bottom < 0) return;
    var known = false;
    for (var n in KEYS) if (KEYS[n].indexOf(e.key) >= 0) { known = true; if (!e.repeat) pressed[n] = true; }
    if (known || e.key === 'Enter' || e.key === 'p' || e.key === 'P') e.preventDefault();
    keys[e.key] = true;
    if (e.key === 'Enter' || (known && !e.repeat)) anyKey();
    if (e.key === 'p' || e.key === 'P') togglePause();
  });
  document.addEventListener('keyup', function (e) { keys[e.key] = false; });
  function bindBtn(id, n) {
    var el = document.getElementById(id); if (!el) return;
    var on = function (e) { e.preventDefault(); keys['btn-' + n] = true; pressed[n] = true; anyKey(); };
    var off = function (e) { e.preventDefault(); keys['btn-' + n] = false; };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  bindBtn('btn-left', 'left'); bindBtn('btn-right', 'right'); bindBtn('btn-up', 'up'); bindBtn('btn-block', 'block');
  bindBtn('btn-punch', 'punch'); bindBtn('btn-kick', 'kick'); bindBtn('btn-pie', 'pie');
  cv.addEventListener('pointerdown', function () { anyKey(); });
  function togglePause() { if (G.mode === 'fight') G.mode = 'paused'; else if (G.mode === 'paused') G.mode = 'fight'; }
  var pb = document.getElementById('game-pause'); if (pb) pb.addEventListener('click', togglePause);
  var mb = document.getElementById('game-mute'); if (mb) mb.addEventListener('click', function () { muted = !muted; mb.textContent = muted ? 'Sound: off' : 'Sound: on'; mb.setAttribute('aria-pressed', String(muted)); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && G.mode === 'fight') G.mode = 'paused'; });

  // ---------- fighters ----------
  function fighter(cfg, x, dir, isAI) {
    return { cfg: cfg, x: x, y: 0, vy: 0, dir: dir, hp: cfg.hp, max: cfg.hp, act: 'idle', t: 0, cd: 0, stun: 0, blockT: 0,
      ai: isAI, aiT: 0, meter: 0, say: '', sayT: 0, walk: 0, specCD: 120, hitDone: false };
  }
  var MOVES = { punch: { len: 18, on: 5, off: 10, reach: 34, dmg: 6, h: -62 }, kick: { len: 26, on: 9, off: 15, reach: 46, dmg: 9, h: -30 } };

  // ---------- game state ----------
  var G = { mode: 'title', stage: 0, round: 1, wins: [0, 0], timer: 60, score: 0, hi: getHi(), banner: '', bannerT: 0, shots: [], sparks: [], overAt: 0, shake: 0 };
  function startMatch(stage) {
    G.stage = stage; G.round = 1; G.wins = [0, 0];
    G.mode = 'vs'; G.bannerT = 150; beep(330, .15); setTimeout(function () { beep(440, .2); }, 150);
  }
  function startRound() {
    G.p = fighter(PLAYER, 130, 1, false);
    G.o = fighter(OPPONENTS[G.stage], 350, -1, true);
    G.timer = 60; G.shots = []; G.sparks = []; pressed = {};
    G.mode = 'intro'; G.banner = 'ROUND ' + G.round; G.bannerT = 110;
  }
  function anyKey() {
    if (G.mode === 'title') { G.score = 0; startMatch(0); }
    else if (G.mode === 'vs' && G.bannerT < 110) { startRound(); }
    else if (G.mode === 'over' && Date.now() - G.overAt > 900) { G.score = 0; startMatch(G.stage); }
    else if (G.mode === 'won' && Date.now() - G.overAt > 900) { G.mode = 'title'; }
  }

  // ---------- update ----------
  function update() {
    if (G.bannerT > 0) G.bannerT--;
    if (G.shake > 0) G.shake--;
    if (G.mode === 'vs') { if (G.bannerT === 0) startRound(); return; }
    if (G.mode === 'intro') { if (G.bannerT === 40) { G.banner = 'FIGHT!'; beep(660, .25, 'sawtooth', .06); } if (G.bannerT === 0) G.mode = 'fight'; tickFighter(G.p, true); tickFighter(G.o, true); return; }
    if (G.mode === 'ko') { tickFighter(G.p, true); tickFighter(G.o, true); tickSparks(); if (G.bannerT === 0) afterRound(); return; }
    if (G.mode !== 'fight') return;

    G.timer -= 1 / 60;
    if (G.timer <= 0) { endRound(G.p.hp / G.p.max >= G.o.hp / G.o.max ? 0 : 1, 'TIME!'); return; }

    playerControl(G.p, G.o);
    aiControl(G.o, G.p);
    tickFighter(G.p); tickFighter(G.o);
    resolve(G.p, G.o); resolve(G.o, G.p);
    // keep apart and facing
    var gap = G.o.x - G.p.x;
    if (Math.abs(gap) < 34 && G.p.y > -20 && G.o.y > -20) { var push = (34 - Math.abs(gap)) / 2 * (gap >= 0 ? 1 : -1); G.p.x -= push; G.o.x += push; }
    [G.p, G.o].forEach(function (f) { f.x = Math.max(LEFT, Math.min(RIGHT, f.x)); });
    if (G.p.act === 'idle' || G.p.act === 'walk') G.p.dir = G.o.x >= G.p.x ? 1 : -1;
    if (G.o.act === 'idle' || G.o.act === 'walk') G.o.dir = G.p.x >= G.o.x ? 1 : -1;
    tickShots(); tickSparks();
  }

  function canAct(f) { return f.stun <= 0 && f.hp > 0 && (f.act === 'idle' || f.act === 'walk' || f.act === 'block'); }
  function startMove(f, m) { f.act = m; f.t = 0; f.hitDone = false; beep(m === 'kick' ? 180 : 240, .04, 'triangle', .03); }

  function playerControl(p, o) {
    var punch = hit('punch'), kick = hit('kick'), pie = hit('pie'), up = hit('up');
    if (!canAct(p)) return;
    if (down('block') && p.y === 0) { p.act = 'block'; return; }
    if (p.act === 'block') p.act = 'idle';
    if (pie && p.meter >= 100) { throwShot(p, 'pie'); p.meter = 0; p.act = 'special'; p.t = 0; return; }
    if (punch) { startMove(p, 'punch'); return; }
    if (kick) { startMove(p, 'kick'); return; }
    if (up && p.y === 0) { p.vy = -8.5; }
    var mv = (down('right') ? 1 : 0) - (down('left') ? 1 : 0);
    p.x += mv * p.cfg.speed * (mv === p.dir ? 1 : 0.75);
    p.act = mv ? 'walk' : 'idle'; if (mv) p.walk++;
  }

  function aiControl(o, p) {
    var c = o.cfg; o.cd--; o.specCD--;
    if (!canAct(o)) return;
    var dist = Math.abs(p.x - o.x);
    var threatened = (p.act === 'punch' || p.act === 'kick') && dist < 80 && p.t < 8;
    if (o.blockT > 0) { o.blockT--; o.act = 'block'; return; }
    if (threatened && Math.random() < c.block) { o.act = 'block'; o.blockT = 18; return; }
    if (o.act === 'block') o.act = 'idle';
    if (c.special && o.specCD <= 0 && dist > 120 && Math.random() < c.spec * 10) { throwShot(o, c.special); o.specCD = 150 + Math.random() * 120; o.act = 'special'; o.t = 0; return; }
    var want = 40 + c.reach;
    if (dist > want + 6) { o.x += o.dir * c.speed * (Math.random() < c.aggro ? 1 : 0.3); o.act = 'walk'; o.walk++; }
    else if (dist < 30 && Math.random() < .05) { o.x -= o.dir * c.speed * 6; }
    else o.act = 'idle';
    if (dist < want + 18 && o.cd <= 0 && Math.random() < c.aggro) {
      startMove(o, Math.random() < .55 ? 'punch' : 'kick');
      o.cd = c.cd[0] + Math.random() * (c.cd[1] - c.cd[0]);
    }
  }

  function tickFighter(f, frozen) {
    if (f.sayT > 0) f.sayT--;
    // gravity
    if (f.y < 0 || f.vy) { f.vy += 0.5; f.y += f.vy; if (f.y >= 0) { f.y = 0; f.vy = 0; } }
    if (frozen && f.act !== 'ko' && f.act !== 'win') return;
    if (f.stun > 0) { f.stun--; f.x -= f.dir * 1.2; if (f.stun === 0 && f.act === 'hit') f.act = 'idle'; return; }
    if (f.act === 'punch' || f.act === 'kick') { f.t++; if (f.t >= MOVES[f.act].len) f.act = 'idle'; }
    if (f.act === 'special') { f.t++; if (f.t > 20) f.act = 'idle'; }
    if (f.act === 'ko' || f.act === 'win') f.t++;
  }

  function resolve(a, b) {
    var m = MOVES[a.act]; if (!m || a.hitDone || a.t < m.on || a.t > m.off) return;
    var reach = m.reach + (a.cfg.reach || 0);
    var front = a.x + a.dir * 16, tip = a.x + a.dir * (16 + reach);
    var lo = Math.min(front, tip), hiX = Math.max(front, tip);
    var height = a.y + m.h;
    var bTop = b.y - (b.cfg.look === 'hen' ? 100 : 96), bBot = b.y;
    if (b.x + 16 < lo || b.x - 16 > hiX || height < bTop || height > bBot) return;
    a.hitDone = true;
    damage(b, a, m.dmg * a.cfg.dmg, a.act === 'kick' ? 'kick' : 'punch');
  }

  function damage(b, a, amt, kind) {
    var blocking = b.act === 'block' && b.dir === (a.x > b.x ? 1 : -1);
    if (blocking) { amt *= 0.15; spark(b.x, FEET - 60 + b.y, '#9FE3FF'); beep(800, .04, 'square', .03); b.x -= b.dir * 3; }
    else {
      b.stun = kind === 'shot' ? 22 : 16; b.act = 'hit'; thud(); G.shake = 6;
      spark(b.x, FEET - 60 + b.y, '#FFE16B');
      if (b.ai && Math.random() < .35) { b.say = pick(b.cfg.hit); b.sayT = 70; }
      if (!b.ai) G.score = Math.max(0, G.score); else G.score += Math.round(amt * 5);
    }
    b.hp = Math.max(0, b.hp - amt);
    a.meter = Math.min(100, a.meter + (blocking ? 4 : 14)); b.meter = Math.min(100, b.meter + 6);
    if (b.hp <= 0) { b.act = 'ko'; b.t = 0; b.stun = 0; endRound(b === G.o ? 0 : 1, 'K.O.!'); }
  }

  function throwShot(f, kind) {
    var speeds = { pie: 5, shout: 4, kebab: 4.5, stiletto: 6.5 };
    G.shots.push({ x: f.x + f.dir * 24, y: f.y - (kind === 'stiletto' ? 70 : 58), vx: f.dir * speeds[kind], kind: kind, owner: f, spin: 0, life: 200 });
    if (kind === 'shout') { f.say = 'CALM DOWN!'; f.sayT = 60; }
    if (kind === 'stiletto' && Math.random() < .5) { f.say = 'HAVE THAT!'; f.sayT = 50; }
    beep(kind === 'pie' ? 520 : 300, .12, 'sawtooth', .04);
  }
  function tickShots() {
    for (var i = G.shots.length - 1; i >= 0; i--) {
      var s = G.shots[i]; s.x += s.vx; s.spin += .3; s.life--;
      var tgt = s.owner === G.p ? G.o : G.p, gone = s.life <= 0 || s.x < -20 || s.x > W + 20;
      if (!gone && Math.abs(tgt.x - s.x) < 20 && s.y > tgt.y - 96 && s.y < tgt.y && tgt.hp > 0) {
        damage(tgt, s.owner, s.kind === 'stiletto' ? 11 : 12, 'shot'); gone = true;
      }
      if (gone) G.shots.splice(i, 1);
    }
  }
  function spark(x, y, c) { for (var i = 0; i < 8; i++) G.sparks.push({ x: x, y: y, vx: Math.cos(i * .8) * 3, vy: Math.sin(i * .8) * 3 - 1, t: 16, c: c }); }
  function tickSparks() { for (var i = G.sparks.length - 1; i >= 0; i--) { var s = G.sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += .2; if (--s.t <= 0) G.sparks.splice(i, 1); } }

  function endRound(winner, label) {
    if (G.mode !== 'fight') return;
    G.wins[winner]++;
    G.mode = 'ko'; G.banner = label; G.bannerT = 150; G.roundWinner = winner;
    var w = winner === 0 ? G.p : G.o, l = winner === 0 ? G.o : G.p;
    w.act = 'win'; w.t = 0; if (l.hp <= 0 || label === 'TIME!') { l.act = 'ko'; l.t = 0; }
    if (winner === 0) G.score += 200 + Math.round(G.p.hp * 2 + G.timer * 5);
    else { G.o.say = G.o.cfg.win; G.o.sayT = 150; }
    beep(winner === 0 ? 523 : 196, .3); setTimeout(function () { beep(winner === 0 ? 784 : 131, .4); }, 250);
  }
  function afterRound() {
    if (G.wins[0] === 2) {
      if (G.stage === OPPONENTS.length - 1) { G.mode = 'won'; G.overAt = Date.now(); saveHi(); }
      else startMatch(G.stage + 1);
    } else if (G.wins[1] === 2) { G.mode = 'over'; G.overAt = Date.now(); saveHi(); }
    else { G.round++; startRound(); }
  }
  function saveHi() { if (G.score > G.hi) { G.hi = G.score; setHi(G.hi); G.newHi = true; } else G.newHi = false; }

  // ---------- drawing ----------
  function text(t, x, y, size, col, align, shadow) {
    ctx.font = size + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
    if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(t, x + 2, y + 2); }
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  }
  function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  var frame = 0;

  function drawStreet() {
    // sky
    var g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, '#05010F'); g.addColorStop(1, '#2A0F4A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 30; i++) R((i * 97) % W, (i * 41) % 90, 2, 2, 'rgba(255,255,255,.35)');
    // buildings
    var B = [[0, 70, 100, '#2B2238'], [100, 50, 120, '#33283F'], [220, 85, 90, '#2A2235'], [310, 60, 100, '#352A44'], [410, 75, 70, '#2B2238']];
    B.forEach(function (b) {
      R(b[0], b[1], b[2], GROUND - 40 - b[1], b[3]);
      for (var wy = b[1] + 12; wy < GROUND - 90; wy += 22) for (var wx = b[0] + 10; wx < b[0] + b[2] - 14; wx += 22) R(wx, wy, 10, 12, ((wx * 3 + wy) % 7 < 2) ? '#FFD86B' : '#1A1426');
    });
    // shop signs (flicker)
    sign(14, 150, 'KEBABS', '#FF3B6B', 72);
    sign(118, 140, 'NITECLUB', '#39E0FF', 92, frame % 90 < 6);
    sign(232, 158, 'CHIPPY', '#FFB13B', 66);
    sign(326, 146, 'TAXIS', '#7CFF4F', 62);
    sign(414, 156, 'BAR', '#FF4FD8', 50, frame % 140 < 4);
    // doorways + queue silhouettes
    R(140, GROUND - 78, 40, 38, '#120C1C'); R(240, GROUND - 74, 30, 34, '#120C1C');
    for (var q = 0; q < 5; q++) { var qx = 330 + q * 14; R(qx, GROUND - 66 + (q % 2) * 3, 9, 26, '#140E20'); R(qx + 1, GROUND - 74 + (q % 2) * 3, 7, 8, '#140E20'); }
    // pavement + road
    R(0, GROUND - 40, W, 40, '#4A4552'); for (var k = 0; k < W; k += 32) R(k, GROUND - 40, 2, 40, '#3D3845');
    R(0, GROUND, W, H - GROUND, '#232028'); for (var m = 0; m < W; m += 48) R(m + 10, GROUND + 14, 24, 3, '#BBB');
    // puddle reflection + street name
    R(60, GROUND - 8, 70, 5, 'rgba(255,59,107,.35)'); R(300, GROUND - 6, 60, 4, 'rgba(57,224,255,.3)');
    text('WESTFIELD ST', W - 8, GROUND + 22, 7, '#777', 'right');
  }
  function sign(x, y, t, c, w, off) {
    R(x, y, w, 18, '#0D0A14'); ctx.font = '9px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!off) { ctx.shadowColor = c; ctx.shadowBlur = 8; }
    ctx.fillStyle = off ? '#333' : c; ctx.fillText(t, x + w / 2, y + 10); ctx.shadowBlur = 0;
  }

  // Each look: colours and silhouette features
  var LOOKS = {
    lad:     { skin: '#F2C29B', hair: '#5A3A1E', hairStyle: 'side', top: '#F4F4F4', top2: '#2B7BE4', legs: '#2C3E66', shoes: '#6B3E1E', bulk: 0 },
    bouncer: { skin: '#E3B08A', hair: null, hairStyle: 'bald', top: '#121212', top2: '#121212', legs: '#121212', shoes: '#000', bulk: 6, extra: 'earpiece' },
    scouser: { skin: '#F0C09A', hair: '#2A1A0E', hairStyle: 'perm', tache: true, top: '#7E2BD9', top2: '#18B5A8', legs: '#7E2BD9', shoes: '#FFF', bulk: 0, extra: 'shellsuit' },
    dealer:  { skin: '#E8B58E', hair: '#111', hairStyle: 'cap', top: '#9A9A9A', top2: '#7A7A7A', legs: '#9A9A9A', shoes: '#FFF', bulk: -2, extra: 'bum bag' },
    hen:     { skin: '#F7C6A3', hair: '#F2D16B', hairStyle: 'veil', top: '#FF5FB4', top2: '#FF5FB4', legs: '#F7C6A3', shoes: '#D11', bulk: -2, extra: 'sash' }
  };

  function drawFighter(f, ghost) {
    var L = LOOKS[f.cfg.look], b = L.bulk, a = f.act, t = f.t;
    var bob = (a === 'idle' || a === 'block') ? Math.round(Math.sin(frame / 8) * 1.5) : 0;
    ctx.save();
    ctx.translate(Math.round(f.x), FEET + Math.round(f.y));
    if (ghost) { ctx.globalAlpha = .55; ctx.translate(ghost.dx, ghost.dy); ctx.scale(.9, .9); }
    ctx.scale(f.dir, 1);
    if (a === 'ko') { ctx.translate(0, 0); ctx.rotate(-Math.min(1.45, t * .06)); }
    if (a === 'hit') ctx.rotate(-.12);
    // shadow
    if (!ghost) { ctx.save(); ctx.scale(1 / f.dir, 1); R(-20, -2 - f.y, 40, 4, 'rgba(0,0,0,.35)'); ctx.restore(); }
    // legs
    var stride = a === 'walk' ? Math.sin(f.walk / 4) * 6 : 0;
    var kick = a === 'kick' && t >= MOVES.kick.on - 3 && t <= MOVES.kick.off + 3;
    var isHen = f.cfg.look === 'hen';
    if (isHen) { R(-12, -46, 24, 10, L.top); }   // skirt
    R(-10 + stride, -40, 8, 38, L.legs); R(-10 + stride, -4, 10, 4, L.shoes);
    if (kick) { ctx.save(); ctx.translate(4, -38); ctx.rotate(-1.35); R(0, -4, 8, 40, L.legs); R(0, 32, 12, 6, L.shoes); ctx.restore(); }
    else { R(2 - stride, -40, 8, 38, L.legs); R(2 - stride, -4, 10, 4, L.shoes); }
    if (isHen) { R(-10 + stride, -6, 3, 6, L.shoes); }
    // torso
    var crouch = a === 'block' ? 4 : 0;
    R(-14 - b / 2, -82 + crouch, 28 + b, 44, L.top);
    if (L.extra === 'shellsuit') { R(-14, -70 + crouch, 28, 6, L.top2); R(-14, -58 + crouch, 28, 4, '#FFD400'); }
    if (f.cfg.look === 'lad') { R(-2, -82 + crouch, 4, 44, '#DDD'); R(-14, -52 + crouch, 28, 3, L.top2); }
    if (L.extra === 'bum bag') { R(-12, -46 + crouch, 22, 8, '#111'); R(6, -44 + crouch, 4, 4, '#C9A15A'); }
    if (L.extra === 'sash') { ctx.save(); ctx.translate(0, -60 + crouch); ctx.rotate(-.7); R(-24, -3, 48, 7, '#FFF'); ctx.restore(); R(-6, -64 + crouch, 12, 10, '#FFF'); text('L', 0, -63 + crouch, 7, '#E00', 'center'); }
    if (f.cfg.look === 'bouncer') { R(-3, -82 + crouch, 6, 16, '#FFF'); R(-1, -82 + crouch, 2, 14, '#111'); }
    // arms
    var punch = a === 'punch' && t >= MOVES.punch.on - 2 && t <= MOVES.punch.off + 2;
    var armCol = isHen ? L.skin : L.top;
    if (a === 'block') { R(4, -84, 8, 26, armCol); R(10, -88, 10, 10, L.skin); }
    else if (punch) {
      R(8, -76, 30 + (f.cfg.reach || 0), 8, armCol);
      if (isHen) { R(32 + f.cfg.reach, -84, 16, 18, '#B0127A'); R(36 + f.cfg.reach, -90, 8, 6, '#111'); }      // handbag
      else R(34 + (f.cfg.reach || 0), -79, 11, 12, L.skin);
    } else if (a === 'special') { R(6, -96, 8, 26, armCol); R(4, -102, 12, 8, L.skin); }
    else if (a === 'win') { R(6, -110, 8, 32, armCol); R(5, -116, 10, 8, L.skin); }
    else { R(10, -78, 8, 26 + (b > 0 ? 2 : 0), armCol); R(10, -54, 9, 9, L.skin); if (isHen) { R(10, -46, 12, 12, '#B0127A'); } }
    R(-18 - b / 2, -78, 8, 26, armCol);
    // head
    var hy = -104 + crouch + bob;
    R(-10, hy, 20, 22, L.skin); R(-2, hy + 22, 8, 4, L.skin);
    R(4, hy + 7, 3, 3, '#111');                               // eye
    if (a === 'hit' || a === 'ko') { R(2, hy + 6, 6, 2, '#111'); R(3, hy + 15, 6, 3, '#7A1E1E'); }
    else R(2, hy + 16, 6, 2, '#7A1E1E');
    if (L.tache) R(-1, hy + 13, 12, 3, L.hair);
    if (L.hairStyle === 'side') { R(-11, hy - 4, 22, 8, L.hair); R(-11, hy, 6, 10, L.hair); }
    if (L.hairStyle === 'perm') { for (var px = -16; px <= 10; px += 6) for (var py = -10; py <= 14; py += 6) if (!(px > 0 && py > 0)) R(px, hy + py, 7, 7, (px + py) % 12 === 0 ? '#3D2814' : L.hair); }
    if (L.hairStyle === 'cap') { R(-11, hy - 4, 22, 8, '#111'); R(6, hy, 12, 4, '#111'); R(-4, hy - 3, 6, 3, '#E33'); }
    if (L.hairStyle === 'veil') { R(-12, hy - 4, 24, 10, L.hair); R(-14, hy - 2, 6, 30, L.hair); R(-24, hy - 6, 14, 44, 'rgba(255,255,255,.7)'); R(-6, hy - 9, 12, 5, '#FFF'); R(8, hy + 5, 3, 3, '#FF5FB4'); }
    if (L.extra === 'earpiece') { R(-11, hy + 8, 3, 6, '#555'); }
    // KO stars
    if (a === 'ko' && t > 20) for (var s = 0; s < 3; s++) { var ang = frame / 10 + s * 2.1; R(Math.cos(ang) * 16 - 2, hy - 14 + Math.sin(ang) * 5, 5, 5, '#FFE16B'); }
    ctx.restore();
  }

  function drawHen(f) {
    // two mates hovering behind the bride, egging her on
    [{ dx: -22 * f.dir, dy: 4, top: '#6BE0FF', hair: '#3A2414' }, { dx: -40 * f.dir, dy: 2, top: '#FFE14F', hair: '#8A3A12' }].forEach(function (m) {
      var save = LOOKS.hen; LOOKS.hen = Object.assign({}, save, { top: m.top, top2: m.top, hair: m.hair, hairStyle: 'side', extra: null });
      drawFighter(f, m); LOOKS.hen = save;
    });
    drawFighter(f);
  }

  function drawShot(s) {
    ctx.save(); ctx.translate(s.x, FEET + s.y);
    if (s.kind === 'pie') { R(-9, -3, 18, 8, '#A86B1E'); R(-10, -6, 20, 5, '#D9A441'); R(-6, -9, 12, 4, '#E9BE62'); }
    else if (s.kind === 'kebab') { ctx.rotate(s.spin); R(-8, -6, 16, 12, '#F2E2B8'); R(-6, -4, 12, 5, '#8A4A22'); R(-5, 1, 10, 3, '#4CAF50'); }
    else if (s.kind === 'stiletto') { ctx.rotate(s.spin * 1.5); R(-10, -3, 18, 5, '#D11'); R(4, 2, 3, 10, '#D11'); R(-10, -6, 6, 4, '#D11'); }
    else if (s.kind === 'shout') { ctx.font = '9px ' + FONT; ctx.fillStyle = '#FFE16B'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CALM DOWN!', 0, 0); }
    ctx.restore();
  }

  function bars() {
    var p = G.p, o = G.o;
    R(10, 10, 182, 14, '#000'); R(288, 10, 182, 14, '#000');
    R(12, 12, 178 * p.hp / p.max, 10, p.hp / p.max < .3 ? '#E8303A' : '#FFD400');
    var ow = 178 * o.hp / o.max; R(290 + 178 - ow, 12, ow, 10, o.hp / o.max < .3 ? '#E8303A' : '#FFD400');
    text(p.cfg.name, 12, 28, 8, '#fff', 'left', true); text(o.cfg.name, 468, 28, 8, '#fff', 'right', true);
    for (var i = 0; i < G.wins[0]; i++) R(12 + i * 12, 40, 8, 8, '#39FF14');
    for (var j = 0; j < G.wins[1]; j++) R(460 - j * 12, 40, 8, 8, '#39FF14');
    text(String(Math.max(0, Math.ceil(G.timer))), W / 2, 8, 16, '#fff', 'center', true);
    // pie meter
    R(12, 52, 82, 8, '#000'); R(13, 53, 80 * p.meter / 100, 6, p.meter >= 100 ? (frame % 20 < 10 ? '#FDA138' : '#FFF') : '#A86B1E');
    text(p.meter >= 100 ? 'PIE READY!' : 'PIE', 98, 52, 7, p.meter >= 100 ? '#FDA138' : '#999');
    text('SCORE ' + G.score, W / 2, 30, 7, '#FDA138', 'center', true);
  }

  function speech(f) {
    if (f.sayT <= 0 || !f.say) return;
    ctx.font = '7px ' + FONT;
    var w = ctx.measureText(f.say).width + 12, x = Math.max(4, Math.min(W - w - 4, f.x - w / 2)), y = FEET - 140 + f.y;
    R(x, y, w, 18, '#FFF'); R(f.x - 3, y + 18, 6, 5, '#FFF');
    text(f.say, x + 6, y + 6, 7, '#111');
  }

  function draw() {
    frame++;
    ctx.save();
    if (G.shake) ctx.translate((Math.random() - .5) * 4, (Math.random() - .5) * 4);
    drawStreet();
    if (G.mode === 'title') { ctx.restore(); return drawTitle(); }
    if (G.mode === 'vs') { ctx.restore(); return drawVs(); }
    if (G.p && G.o) {
      var order = [G.p, G.o];
      order.forEach(function (f) { if (f.cfg.look === 'hen') drawHen(f); else drawFighter(f); });
      G.shots.forEach(drawShot);
      G.sparks.forEach(function (s) { R(s.x, s.y, 4, 4, s.c); });
      speech(G.o); speech(G.p);
      bars();
    }
    ctx.restore();
    if ((G.mode === 'intro' || G.mode === 'ko') && G.bannerT > 0) text(G.banner, W / 2, 120, G.banner.length > 6 ? 22 : 30, G.banner === 'FIGHT!' || G.banner === 'K.O.!' ? '#E8303A' : '#FDA138', 'center', true);
    if (G.mode === 'ko' && G.bannerT < 100) text(G.roundWinner === 0 ? 'YOU WIN THE ROUND' : 'YOU GOT BATTERED', W / 2, 160, 10, '#fff', 'center', true);
    if (G.mode === 'paused') { shade(); text('PAUSED', W / 2, 130, 20, '#FDA138', 'center'); text('Press P to carry on', W / 2, 165, 8, '#fff', 'center'); }
    if (G.mode === 'over') {
      shade(); text('GAME OVER', W / 2, 95, 22, '#E8303A', 'center', true);
      text(G.o.cfg.win, W / 2, 132, 7, '#fff', 'center');
      text('SCORE ' + G.score + (G.newHi ? '  NEW HIGH SCORE!' : ''), W / 2, 158, 9, '#FDA138', 'center');
      text('Press any button to have another go', W / 2, 190, 7, '#fff', 'center');
    }
    if (G.mode === 'won') {
      shade(); text('YOU SURVIVED', W / 2, 70, 18, '#39FF14', 'center', true);
      text('SATURDAY NIGHT ON WESTFIELD ST', W / 2, 100, 9, '#FDA138', 'center');
      text('Now join the taxi queue. It\'s two hours.', W / 2, 130, 7, '#fff', 'center');
      text('FINAL SCORE ' + G.score + (G.newHi ? '  NEW HIGH SCORE!' : ''), W / 2, 160, 9, '#fff', 'center');
      text('Press any button', W / 2, 200, 8, '#FDA138', 'center');
    }
  }
  function shade() { ctx.fillStyle = 'rgba(5,1,15,.82)'; ctx.fillRect(0, 50, W, 180); }

  function drawTitle() {
    ctx.fillStyle = 'rgba(5,1,15,.7)'; ctx.fillRect(0, 0, W, H);
    text('WESTFIELD ST', W / 2, 34, 26, '#FDA138', 'center', true);
    text('RUMBLE', W / 2, 70, 34, '#E8303A', 'center', true);
    text('Saturday night. St Helens town centre.', W / 2, 120, 7, '#fff', 'center');
    text('Four fights between you and a taxi home.', W / 2, 135, 7, '#fff', 'center');
    var demo = [fighter(PLAYER, 70, 1), fighter(OPPONENTS[0], 170, -1), fighter(OPPONENTS[1], 250, -1), fighter(OPPONENTS[2], 330, -1), fighter(OPPONENTS[3], 420, -1)];
    demo.forEach(function (f) { f.act = 'idle'; if (f.cfg.look === 'hen') drawHen(f); else drawFighter(f); });
    if ((frame >> 5) & 1) text('PRESS ANY BUTTON', W / 2, 160, 11, '#FDA138', 'center', true);
    text('HI ' + G.hi, W - 8, 8, 8, '#fff', 'right');
  }
  function drawVs() {
    ctx.fillStyle = 'rgba(5,1,15,.75)'; ctx.fillRect(0, 0, W, H);
    var o = OPPONENTS[G.stage];
    text('FIGHT ' + (G.stage + 1) + ' OF ' + OPPONENTS.length, W / 2, 20, 9, '#999', 'center');
    var p = fighter(PLAYER, 110, 1), e = fighter(o, 370, -1);
    drawFighter(p); if (o.look === 'hen') drawHen(e); else drawFighter(e);
    text('VS', W / 2, 140, 30, '#E8303A', 'center', true);
    text(o.name, W / 2, 60, 16, '#FDA138', 'center', true);
    ctx.font = '7px ' + FONT; var w = ctx.measureText(o.intro).width + 14;
    R(W / 2 - w / 2, 92, w, 18, '#FFF'); text(o.intro, W / 2, 98, 7, '#111', 'center');
    if (G.bannerT < 110 && (frame >> 4) & 1) text('Press any button', W / 2, 190, 8, '#fff', 'center');
  }

  function loop() { update(); draw(); requestAnimationFrame(loop); }
  var go = function () { requestAnimationFrame(loop); };
  try { document.fonts.load('12px "Press Start 2P"').then(go, go); } catch (e) { go(); }
})();
