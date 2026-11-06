/* Parr Invaders – an SHCN original. Defend Parr from the Wigan hordes. */
(function () {
  'use strict';
  var cv = document.getElementById('pi-canvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var W = 480, H = 560;
  cv.width = W; cv.height = H;
  ctx.imageSmoothingEnabled = false;

  var FONT = '"Press Start 2P", "Courier New", monospace';
  var C = { bg: '#0B0018', purple: '#8A3CFF', orange: '#FDA138', white: '#FFFFFF', red: '#E8303A', green: '#39FF14', grey: '#9A9A9A', pie: '#D9A441', crust: '#A86B1E', shield: '#FDA138' };

  // ---------- pixel sprites ----------
  // Wiganer in cherry & white hoops (2 frames)
  var WIG = [[
    '...XXXX...',
    '..XSSSSX..',
    '..SKSSKS..',
    '..SSSSSS..',
    '...SMMS...',
    '.RRRRRRRR.',
    'R.WWWWWW.R',
    'S.RRRRRR.S',
    '..WWWWWW..',
    '..BB..BB..',
    '.BB....BB.'
  ], [
    '...XXXX...',
    '..XSSSSX..',
    '..SKSSKS..',
    '..SSSSSS..',
    '...SMMS...',
    'SRRRRRRRRS',
    '..WWWWWW..',
    '..RRRRRR..',
    '..WWWWWW..',
    '..BB..BB..',
    '..BB..BB..'
  ]];
  // Flat-cap Wiganer (top rows, worth more)
  var CAP = [[
    '..GGGGGG..',
    '.GGGGGGGG.',
    '..SSSSSS..',
    '..SKSSKS..',
    '...SMMS...',
    '.RRRRRRRR.',
    'S.WWWWWW.S',
    '..RRRRRR..',
    '..BB..BB..',
    '.BB....BB.'
  ], [
    '..GGGGGG..',
    '.GGGGGGGG.',
    '..SSSSSS..',
    '..SKSSKS..',
    '...SMMS...',
    'SRRRRRRRRS',
    '..WWWWWW..',
    '..RRRRRR..',
    '..BB..BB..',
    '..BB..BB..'
  ]];
  // Pie van (player)
  var VAN = [
    '......YYYY......',
    '.....YYYYYY.....',
    '.OOOOOOOOOOOOOO.',
    'OOPPPPPPPPPPPPOO',
    'OOPOPPOPPOPPOPOO',
    'OOOOOOOOOOOOOOOO',
    'OOOOOOOOOOOOOOOO',
    '.KKK........KKK.',
    '.KKK........KKK.'
  ];
  // Council van (bonus)
  var COUNCIL = [
    '....WWWWWWWW......',
    '...WCCWWWWWWW.....',
    '..WWCCWWWWWWWWWWW.',
    'WWWWWWWWWWWWWWWWWW',
    'WGGGGGGGGGGGGGGGGW',
    'WWWWWWWWWWWWWWWWWW',
    '.KKK.........KKK..'
  ];
  var PAL = { X: '#3B2A1A', S: '#F2C29B', K: '#1A1A1A', M: '#B84A4A', R: '#C8102E', W: '#FFFFFF', B: '#22223A', G: '#6B6B6B',
              Y: '#FDA138', O: '#8A3CFF', P: '#FFE3BF', C: '#7FC8FF' };

  function sprite(rows, scale) {
    var c = document.createElement('canvas');
    c.width = rows[0].length * scale; c.height = rows.length * scale;
    var x = c.getContext('2d');
    for (var r = 0; r < rows.length; r++) for (var k = 0; k < rows[r].length; k++) {
      var ch = rows[r][k]; if (ch === '.') continue;
      x.fillStyle = PAL[ch] || '#fff'; x.fillRect(k * scale, r * scale, scale, scale);
    }
    return c;
  }
  var SPR = { wig: [sprite(WIG[0], 3), sprite(WIG[1], 3)], cap: [sprite(CAP[0], 3), sprite(CAP[1], 3)], van: sprite(VAN, 3), council: sprite(COUNCIL, 3) };

  // ---------- storage (best effort) ----------
  function getHi() { try { return parseInt(localStorage.getItem('shcn-parr-invaders-hi') || '0', 10) || 0; } catch (e) { return 0; } }
  function setHi(v) { try { localStorage.setItem('shcn-parr-invaders-hi', String(v)); } catch (e) {} }

  // ---------- sound ----------
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
  var marchNote = 0, MARCH = [110, 98, 87, 82];

  // ---------- game state ----------
  var state, keys = {}, hi = getHi();
  var QUIPS_WAVE = ['Parr is saved! ...for now.', 'Wigan sent reinforcements.', 'They\'ve brought their own pies.', 'Someone\'s nicked the Labour Club sign.', 'Still coming. Lock up your bikes.'];
  var QUIPS_OVER = ['Wigan have took Parr.', 'They\'ve renamed it Little Pemberton.', 'The chippy now sells pies on barms.', 'Game over, lad.'];

  function makeShields() {
    var names = ['LABOUR CLUB', 'CHIPPY', 'BOOKIES'], out = [];
    var cols = 22, rows = 14, cell = 3, gap = (W - 3 * cols * cell) / 4;
    for (var s = 0; s < 3; s++) {
      var grid = [];
      for (var r = 0; r < rows; r++) {
        grid[r] = [];
        for (var c = 0; c < cols; c++) {
          var solid = true;
          if (r < 3 && (c < 3 - r || c > cols - 4 + r)) solid = false;      // sloped roof
          if (r > 8 && c > 7 && c < 14) solid = false;                    // doorway
          grid[r][c] = solid ? 1 : 0;
        }
      }
      out.push({ x: gap + s * (cols * cell + gap), y: 440, cols: cols, rows: rows, cell: cell, grid: grid, name: names[s] });
    }
    return out;
  }

  function makeWave(n) {
    var a = [], cols = 9, rows = 5;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      a.push({ x: 40 + c * 42, y: 70 + r * 38 + Math.min(n - 1, 4) * 10, type: r === 0 ? 'cap' : 'wig', pts: r === 0 ? 30 : (r < 3 ? 20 : 10), alive: true });
    }
    return a;
  }

  function reset() {
    state = { mode: 'title', score: 0, lives: 3, wave: 1, px: W / 2 - 24, shots: [], bombs: [], booms: [], inv: makeWave(1), dir: 1,
      stepT: 0, frame: 0, shields: makeShields(), ufo: null, ufoT: 600 + Math.random() * 600, msg: '', msgT: 0, hitT: 0, cool: 0 };
  }
  function startWave() {
    state.inv = makeWave(state.wave); state.dir = 1; state.shots = []; state.bombs = []; state.stepT = 0;
    if (state.wave % 2 === 1) state.shields = makeShields();
  }

  // ---------- input ----------
  var stage = document.getElementById('pi-stage');
  function isGameKey(k) { return k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ' || k === 'Spacebar' || k === 'a' || k === 'd' || k === 'Enter' || k === 'p' || k === 'P'; }
  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var inView = stage.getBoundingClientRect().top < innerHeight && stage.getBoundingClientRect().bottom > 0;
    if (!inView) return;
    if (isGameKey(e.key)) e.preventDefault();
    keys[e.key] = true;
    if ((e.key === ' ' || e.key === 'Enter') && (state.mode === 'title' || state.mode === 'over')) begin();
    if ((e.key === 'p' || e.key === 'P') && (state.mode === 'play' || state.mode === 'paused')) state.mode = state.mode === 'play' ? 'paused' : 'play';
  });
  document.addEventListener('keyup', function (e) { keys[e.key] = false; });

  function bindHold(id, key) {
    var el = document.getElementById(id); if (!el) return;
    var on = function (e) { e.preventDefault(); keys[key] = true; if (key === ' ' && (state.mode === 'title' || state.mode === 'over')) begin(); };
    var off = function (e) { e.preventDefault(); keys[key] = false; };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  bindHold('pi-left', 'ArrowLeft'); bindHold('pi-right', 'ArrowRight'); bindHold('pi-fire', ' ');
  cv.addEventListener('pointerdown', function () { if (state.mode === 'title' || state.mode === 'over') begin(); });
  var muteBtn = document.getElementById('pi-mute');
  if (muteBtn) muteBtn.addEventListener('click', function () { muted = !muted; muteBtn.textContent = muted ? 'Sound: off' : 'Sound: on'; muteBtn.setAttribute('aria-pressed', String(muted)); });
  var pauseBtn = document.getElementById('pi-pause');
  if (pauseBtn) pauseBtn.addEventListener('click', function () { if (state.mode === 'play') state.mode = 'paused'; else if (state.mode === 'paused') state.mode = 'play'; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && state.mode === 'play') state.mode = 'paused'; });

  function begin() {
    var keepHi = hi; reset(); hi = keepHi; state.mode = 'play'; state.msg = 'WAVE 1 – HERE THEY COME'; state.msgT = 120; beep(440, .15);
  }

  // ---------- helpers ----------
  function hitShield(x, y, w, h) {
    for (var i = 0; i < state.shields.length; i++) {
      var s = state.shields[i];
      if (x + w < s.x || x > s.x + s.cols * s.cell || y + h < s.y || y > s.y + s.rows * s.cell) continue;
      var c0 = Math.max(0, Math.floor((x - s.x) / s.cell)), c1 = Math.min(s.cols - 1, Math.floor((x + w - s.x) / s.cell));
      var r0 = Math.max(0, Math.floor((y - s.y) / s.cell)), r1 = Math.min(s.rows - 1, Math.floor((y + h - s.y) / s.cell));
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (s.grid[r][c]) {
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
          var rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < s.rows && cc >= 0 && cc < s.cols && Math.random() < 0.7) s.grid[rr][cc] = 0;
        }
        return true;
      }
    }
    return false;
  }
  function boom(x, y, col) { state.booms.push({ x: x, y: y, t: 18, col: col || C.orange }); }

  // ---------- update ----------
  function update() {
    var st = state;
    if (st.msgT > 0) st.msgT--;
    if (st.mode !== 'play') return;
    if (st.hitT > 0) { st.hitT--; return; }

    // player
    var sp = 4;
    if (keys.ArrowLeft || keys.a) st.px -= sp;
    if (keys.ArrowRight || keys.d) st.px += sp;
    st.px = Math.max(8, Math.min(W - 56, st.px));
    if (st.cool > 0) st.cool--;
    if ((keys[' '] || keys.Spacebar) && st.cool === 0 && st.shots.length < 2) {
      st.shots.push({ x: st.px + 21, y: 492 }); st.cool = 18; beep(880, .06, 'square', .03);
    }

    // pies (player shots)
    for (var i = st.shots.length - 1; i >= 0; i--) {
      var s = st.shots[i]; s.y -= 8;
      var gone = s.y < 30 || hitShield(s.x, s.y, 6, 6);
      if (!gone && st.ufo && s.x > st.ufo.x && s.x < st.ufo.x + 54 && s.y < st.ufo.y + 21 && s.y > st.ufo.y) {
        var bonus = [50, 100, 150, 300][Math.floor(Math.random() * 4)];
        st.score += bonus; boom(st.ufo.x + 27, st.ufo.y + 10, C.green);
        st.msg = 'COUNCIL VAN! +' + bonus; st.msgT = 90; st.ufo = null; gone = true; beep(220, .3, 'sawtooth', .05);
      }
      if (!gone) for (var j = 0; j < st.inv.length; j++) {
        var a = st.inv[j]; if (!a.alive) continue;
        if (s.x + 6 > a.x && s.x < a.x + 30 && s.y < a.y + 33 && s.y + 6 > a.y) {
          a.alive = false; st.score += a.pts * Math.min(st.wave, 5); boom(a.x + 15, a.y + 15); gone = true; beep(160, .12, 'triangle', .07); break;
        }
      }
      if (gone) st.shots.splice(i, 1);
    }

    // invaders march
    var alive = st.inv.filter(function (a) { return a.alive; });
    if (!alive.length) {
      st.wave++; st.score += 100;
      st.msg = QUIPS_WAVE[(st.wave - 2) % QUIPS_WAVE.length]; st.msgT = 150;
      startWave(); return;
    }
    var interval = Math.max(3, Math.floor(alive.length * 0.75) - st.wave * 2 + 6);
    st.stepT++;
    if (st.stepT >= interval) {
      st.stepT = 0; st.frame ^= 1;
      beep(MARCH[marchNote++ % 4], .08, 'square', .04);
      var minX = 1e9, maxX = -1e9;
      alive.forEach(function (a) { minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x + 30); });
      var step = 8;
      if ((st.dir > 0 && maxX + step > W - 8) || (st.dir < 0 && minX - step < 8)) {
        st.dir *= -1; alive.forEach(function (a) { a.y += 16; });
      } else alive.forEach(function (a) { a.x += step * st.dir; });
    }
    // invaders reach Parr
    for (var k = 0; k < alive.length; k++) {
      var b = alive[k];
      if (b.y + 33 > 440) hitShield(b.x, b.y, 30, 33);
      if (b.y + 33 >= 500) { st.lives = 0; gameOver(); return; }
    }

    // bombs (barm cakes)
    var bombChance = 0.012 + st.wave * 0.004;
    if (Math.random() < bombChance && st.bombs.length < 3 + st.wave) {
      var cols = {};
      alive.forEach(function (a) { var key = Math.round(a.x / 42); if (!cols[key] || cols[key].y < a.y) cols[key] = a; });
      var shooters = Object.keys(cols).map(function (k) { return cols[k]; });
      var sh = shooters[Math.floor(Math.random() * shooters.length)];
      if (sh) st.bombs.push({ x: sh.x + 13, y: sh.y + 33, v: 3 + Math.min(st.wave, 5) * 0.4 });
    }
    for (var m = st.bombs.length - 1; m >= 0; m--) {
      var bo = st.bombs[m]; bo.y += bo.v;
      var dead = bo.y > H - 30 || hitShield(bo.x, bo.y, 6, 8);
      if (!dead && bo.y + 8 > 500 && bo.y < 528 && bo.x + 6 > st.px && bo.x < st.px + 48) {
        dead = true; st.lives--; boom(st.px + 24, 510, C.red); st.hitT = 60; beep(70, .5, 'sawtooth', .08);
        st.bombs = []; if (st.lives <= 0) { gameOver(); return; }
        break;
      }
      if (dead) st.bombs.splice(m, 1);
    }

    // council van
    st.ufoT--;
    if (!st.ufo && st.ufoT <= 0) { var fromLeft = Math.random() < .5; st.ufo = { x: fromLeft ? -54 : W, y: 40, v: fromLeft ? 1.6 : -1.6 }; st.ufoT = 900 + Math.random() * 900; }
    if (st.ufo) { st.ufo.x += st.ufo.v; if (st.ufo.x < -60 || st.ufo.x > W + 6) st.ufo = null; }

    for (var q = st.booms.length - 1; q >= 0; q--) if (--st.booms[q].t <= 0) st.booms.splice(q, 1);
  }

  function gameOver() {
    state.mode = 'over';
    state.msg = QUIPS_OVER[Math.floor(Math.random() * QUIPS_OVER.length)];
    if (state.score > hi) { hi = state.score; setHi(hi); state.newHi = true; }
    beep(196, .25); setTimeout(function () { beep(147, .25); }, 220); setTimeout(function () { beep(98, .6); }, 440);
  }

  // ---------- draw ----------
  function text(t, x, y, size, col, align) {
    ctx.font = size + 'px ' + FONT; ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(t, x, y);
  }
  var stars = []; for (var i = 0; i < 60; i++) stars.push([Math.random() * W, Math.random() * H, Math.random()]);

  function draw() {
    var st = state;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    stars.forEach(function (s) { ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + s[2] * 0.4) + ')'; ctx.fillRect(s[0], s[1], 2, 2); });

    // HUD
    text('SCORE ' + String(st.score).padStart(5, '0'), 10, 10, 12, C.white);
    text('HI ' + String(Math.max(hi, st.score)).padStart(5, '0'), W / 2, 10, 12, C.orange, 'center');
    text('WAVE ' + st.wave, W - 10, 10, 12, C.white, 'right');

    // ground + lives
    ctx.fillStyle = C.purple; ctx.fillRect(0, 532, W, 3);
    for (var l = 0; l < Math.max(0, st.lives - 1); l++) ctx.drawImage(SPR.van, 10 + l * 56, 540, 32, 18);
    text('PARR', W - 10, 543, 10, C.purple, 'right');

    // shields
    st.shields.forEach(function (s) {
      ctx.fillStyle = C.shield;
      for (var r = 0; r < s.rows; r++) for (var c = 0; c < s.cols; c++) if (s.grid[r][c]) ctx.fillRect(s.x + c * s.cell, s.y + r * s.cell, s.cell, s.cell);
      text(s.name, s.x + s.cols * s.cell / 2, s.y + s.rows * s.cell + 4, 6, C.grey, 'center');
    });

    if (st.mode === 'title') { drawTitle(); return; }

    // invaders
    st.inv.forEach(function (a) { if (a.alive) ctx.drawImage(SPR[a.type][st.frame], a.x, a.y); });
    if (st.ufo) { ctx.drawImage(SPR.council, st.ufo.x, st.ufo.y); }

    // player
    if (!(st.hitT > 0 && Math.floor(st.hitT / 6) % 2)) ctx.drawImage(SPR.van, st.px, 500);

    // pies
    st.shots.forEach(function (s) { ctx.fillStyle = C.crust; ctx.fillRect(s.x, s.y + 3, 6, 4); ctx.fillStyle = C.pie; ctx.fillRect(s.x + 1, s.y, 4, 4); });
    // barm cakes
    st.bombs.forEach(function (b) { ctx.fillStyle = '#E8D7B0'; ctx.fillRect(b.x, b.y, 6, 4); ctx.fillStyle = '#B5884A'; ctx.fillRect(b.x, b.y + 4, 6, 3); });
    // explosions
    st.booms.forEach(function (b) {
      ctx.fillStyle = b.col; var r = 18 - b.t;
      for (var k = 0; k < 8; k++) { var ang = k * Math.PI / 4; ctx.fillRect(b.x + Math.cos(ang) * r * 1.4 - 2, b.y + Math.sin(ang) * r * 1.4 - 2, 4, 4); }
    });

    if (st.msgT > 0 && st.mode === 'play') text(st.msg, W / 2, 400, 10, C.orange, 'center');
    if (st.mode === 'paused') { shade(); text('PAUSED', W / 2, 240, 20, C.orange, 'center'); text('Press P to carry on', W / 2, 280, 9, C.white, 'center'); }
    if (st.mode === 'over') {
      shade();
      text('GAME OVER', W / 2, 190, 24, C.red, 'center');
      text(st.msg, W / 2, 240, 9, C.white, 'center');
      text('SCORE ' + st.score, W / 2, 280, 12, C.orange, 'center');
      if (st.newHi) text('NEW HIGH SCORE!', W / 2, 310, 10, C.green, 'center');
      text('Press FIRE to have another go', W / 2, 350, 9, C.white, 'center');
    }
  }
  function shade() { ctx.fillStyle = 'rgba(11,0,24,.78)'; ctx.fillRect(0, 160, W, 230); }

  var t0 = 0;
  function drawTitle() {
    t0++;
    text('PARR', W / 2, 70, 34, C.orange, 'center');
    text('INVADERS', W / 2, 115, 26, C.purple, 'center');
    text('The Wiganers are coming.', W / 2, 165, 9, C.white, 'center');
    text('Defend Parr with the pie van!', W / 2, 182, 9, C.white, 'center');
    ctx.drawImage(SPR.cap[(t0 >> 5) & 1], 150, 220); text('= 30', 196, 230, 10, C.white);
    ctx.drawImage(SPR.wig[(t0 >> 5) & 1], 150, 265); text('= 20 / 10', 196, 275, 10, C.white);
    ctx.drawImage(SPR.council, 141, 315); text('= ???', 206, 320, 10, C.green);
    if ((t0 >> 5) & 1) text('PRESS FIRE TO START', W / 2, 375, 12, C.orange, 'center');
    text('Arrows move · Space fires · P pauses', W / 2, 405, 8, C.grey, 'center');
  }

  function loop() { update(); draw(); requestAnimationFrame(loop); }
  reset();
  var go = function () { requestAnimationFrame(loop); };
  try { document.fonts.load('12px "Press Start 2P"').then(go, go); } catch (e) { go(); }
})();
