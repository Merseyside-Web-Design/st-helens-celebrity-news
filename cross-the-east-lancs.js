/* Cross the East Lancs – an SHCN original. Get the pie home in one piece. */
(function () {
  'use strict';
  var cv = document.getElementById('game-canvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var CELL = 40, COLS = 12, ROWS = 14, W = COLS * CELL, H = ROWS * CELL;
  cv.width = W; cv.height = H;
  ctx.imageSmoothingEnabled = false;
  var FONT = '"Press Start 2P", "Courier New", monospace';
  var HI_KEY = 'shcn-east-lancs-hi';

  // rows: 0 HUD, 1 homes, 2-5 Sankey Canal, 6 towpath, 7-11 East Lancs Road, 12 Parr pavement, 13 status
  var HOME_COLS = [1, 3, 5, 7, 9, 11];
  var HOME_NAMES = ["NAN'S", 'CHIPPY', 'CLUB', 'BOOKIES', 'SAINTS', "MAM'S"];

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

  // lane definitions: speed in cells/second (+ right, - left)
  function makeLanes(level) {
    var k = 1 + (level - 1) * 0.18;
    return [
      { row: 2, type: 'water', speed: 1.1 * k,  items: spread(3, 3, 'log') },
      { row: 3, type: 'water', speed: -1.5 * k, items: spread(2, 4, 'trolley') },
      { row: 4, type: 'water', speed: 0.8 * k,  items: spread(4, 2, 'mattress') },
      { row: 5, type: 'water', speed: -1.2 * k, items: spread(3, 3, 'log') },
      { row: 7, type: 'road',  speed: -1.4 * k, items: spread(3, 2, 'bus', 2) },
      { row: 8, type: 'road',  speed: 2.2 * k,  items: spread(1, 3, 'car') },
      { row: 9, type: 'road',  speed: -1.0 * k, items: spread(3, 2, 'lorry', 2) },
      { row: 10, type: 'road', speed: 1.6 * k,  items: spread(2, 3, 'van') },
      { row: 11, type: 'road', speed: -2.6 * k, items: spread(1, 2, 'car') }
    ];
  }
  function spread(len, count, kind, extraGap) {
    var gap = COLS / count, out = [];
    for (var i = 0; i < count; i++) out.push({ x: i * gap + Math.random() * Math.max(0, gap - len - (extraGap || 1)), len: len, kind: kind, hue: Math.floor(Math.random() * 5) });
    return out;
  }

  var state, hi = getHi();
  function reset() {
    state = { mode: 'title', score: 0, lives: 3, level: 1, lanes: makeLanes(1), homes: HOME_COLS.map(function () { return false; }),
      dead: 0, deathMsg: '', msg: '', msgT: 0, best: 12, timer: 30 };
    resetPie();
  }
  function resetPie() { state.px = 5; state.py = 12; state.best = 12; state.timer = 30; }

  function begin() { if (state.mode === 'over' && Date.now() - state.overAt < 900) return; reset(); state.mode = 'play'; state.msg = 'GET THE PIE HOME!'; state.msgT = 120; beep(523, .15); }

  // ---------- input ----------
  var stage = document.getElementById('game-stage');
  function move(dx, dy) {
    if (state.mode === 'title' || state.mode === 'over') { begin(); return; }
    if (state.mode !== 'play' || state.dead) return;
    var nx = state.px + dx, ny = state.py + dy;
    if (ny < 2 || ny > 5) nx = Math.round(nx);
    if (nx < 0 || nx > COLS - 1 || ny > 12 || ny < 1) return;
    state.px = nx; state.py = ny;
    beep(dy ? 660 : 550, .04, 'square', .03);
    if (ny < state.best) { state.best = ny; state.score += 10; }
    if (ny === 1) landHome();
  }
  var KEYMAP = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var r = stage.getBoundingClientRect(); if (r.top > innerHeight || r.bottom < 0) return;
    if (KEYMAP[e.key] || e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Enter') e.preventDefault();
    if (e.repeat) return;
    if (KEYMAP[e.key]) move(KEYMAP[e.key][0], KEYMAP[e.key][1]);
    else if ((e.key === ' ' || e.key === 'Enter') && (state.mode === 'title' || state.mode === 'over')) begin();
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });
  function tapBtn(id, dx, dy) {
    var el = document.getElementById(id); if (!el) return;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); move(dx, dy); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  tapBtn('pad-up', 0, -1); tapBtn('pad-down', 0, 1); tapBtn('pad-left', -1, 0); tapBtn('pad-right', 1, 0);
  // swipe on canvas
  var sx = 0, sy = 0, st0 = 0;
  cv.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; st0 = Date.now(); });
  cv.addEventListener('pointerup', function (e) {
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) { move(0, -1); return; }
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0); else move(0, dy > 0 ? 1 : -1);
  });
  function togglePause() { if (state.mode === 'play') state.mode = 'paused'; else if (state.mode === 'paused') state.mode = 'play'; }
  var pb = document.getElementById('game-pause'); if (pb) pb.addEventListener('click', togglePause);
  var mb = document.getElementById('game-mute'); if (mb) mb.addEventListener('click', function () { muted = !muted; mb.textContent = muted ? 'Sound: off' : 'Sound: on'; mb.setAttribute('aria-pressed', String(muted)); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && state.mode === 'play') state.mode = 'paused'; });

  // ---------- rules ----------
  function landHome() {
    var col = Math.round(state.px), idx = HOME_COLS.indexOf(col);
    if (idx < 0 || state.homes[idx] || Math.abs(state.px - col) > 0.35) { die('Splat! Ran into the wall.'); return; }
    state.homes[idx] = true;
    state.score += 50 + Math.floor(state.timer) * 2;
    state.msg = 'PIE DELIVERED TO ' + HOME_NAMES[idx] + '!'; state.msgT = 90;
    beep(784, .1); setTimeout(function () { beep(1046, .15); }, 100);
    if (state.homes.every(Boolean)) {
      state.level++; state.score += 500;
      state.msg = 'ALL PIES DELIVERED! LEVEL ' + state.level; state.msgT = 150;
      state.homes = HOME_COLS.map(function () { return false; }); state.lanes = makeLanes(state.level);
    }
    resetPie();
  }
  var DEATHS_ROAD = ['Flattened on the East Lancs.', 'Pie run over by a bus.', 'Gravy everywhere.', 'Squashed. Should\'ve used the bridge.'];
  var DEATHS_WATER = ['Pie went in the cut.', 'Soggy bottom.', 'Fished out by a lad with a magnet.'];
  function die(msg) {
    if (state.dead) return;
    state.dead = 60; state.deathMsg = msg; state.lives--;
    beep(110, .4, 'sawtooth', .07);
  }

  var last = 0;
  function update(dt) {
    var st = state;
    if (st.msgT > 0) st.msgT--;
    if (st.mode !== 'play') return;
    st.lanes.forEach(function (l) {
      l.items.forEach(function (it) {
        it.x += l.speed * dt;
        if (l.speed > 0 && it.x > COLS + 0.5) it.x -= COLS + it.len + 1;
        if (l.speed < 0 && it.x + it.len < -0.5) it.x += COLS + it.len + 1;
      });
    });
    if (st.dead) {
      st.dead--;
      if (st.dead === 0) {
        if (st.lives <= 0) { gameOver(); return; }
        resetPie();
      }
      return;
    }
    st.timer -= dt;
    if (st.timer <= 0) { die('Pie went cold. Nobody wants a cold pie.'); return; }

    var lane = null;
    for (var i = 0; i < st.lanes.length; i++) if (st.lanes[i].row === st.py) lane = st.lanes[i];
    if (lane && lane.type === 'road') {
      for (var j = 0; j < lane.items.length; j++) {
        var it = lane.items[j];
        if (st.px + 0.75 > it.x + 0.1 && st.px + 0.25 < it.x + it.len - 0.1) { die(DEATHS_ROAD[Math.floor(Math.random() * DEATHS_ROAD.length)]); return; }
      }
    } else if (lane && lane.type === 'water') {
      var on = null;
      for (var k = 0; k < lane.items.length; k++) { var p = lane.items[k]; if (st.px + 0.5 > p.x && st.px + 0.5 < p.x + p.len) on = p; }
      if (!on) { die(DEATHS_WATER[Math.floor(Math.random() * DEATHS_WATER.length)]); return; }
      st.px += lane.speed * dt;
      if (st.px < -0.3 || st.px > COLS - 0.7) { die('Floated off to Warrington.'); return; }
    }
  }
  function gameOver() {
    state.mode = 'over'; state.overAt = Date.now();
    if (state.score > hi) { hi = state.score; setHi(hi); state.newHi = true; }
    beep(196, .25); setTimeout(function () { beep(147, .25); }, 220); setTimeout(function () { beep(98, .6); }, 440);
  }

  // ---------- drawing ----------
  function text(t, x, y, size, col, align) { ctx.font = size + 'px ' + FONT; ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(t, x, y); }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  var CAR_COLS = ['#E8303A', '#2B7BE4', '#FDA138', '#39C46B', '#FFFFFF'];

  function drawVehicle(it, row, dir) {
    var x = it.x * CELL, y = row * CELL, w = it.len * CELL, c = CAR_COLS[it.hue];
    if (it.kind === 'car') {
      rect(x + 3, y + 10, w - 6, 20, c); rect(x + 10, y + 6, w - 20, 10, c);
      rect(x + (dir > 0 ? w - 16 : 10), y + 8, 6, 7, '#9FE3FF');
      rect(x + 6, y + 28, 8, 5, '#111'); rect(x + w - 14, y + 28, 8, 5, '#111');
    } else if (it.kind === 'van') {
      rect(x + 3, y + 7, w - 6, 24, '#F4F4F4'); rect(x + (dir > 0 ? w - 22 : 3), y + 7, 19, 24, c);
      rect(x + (dir > 0 ? w - 14 : 5), y + 10, 8, 8, '#9FE3FF');
      ctx.font = '7px ' + FONT; ctx.fillStyle = '#6600FF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PIES', x + w / 2 + (dir > 0 ? -10 : 10), y + 19);
      rect(x + 8, y + 29, 9, 5, '#111'); rect(x + w - 17, y + 29, 9, 5, '#111');
    } else if (it.kind === 'lorry') {
      rect(x + 3, y + 5, w - 30, 28, '#CFE7EF'); rect(x + 6, y + 9, w - 36, 20, '#A9D6E5');
      ctx.font = '7px ' + FONT; ctx.fillStyle = '#245'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GLASS', x + (w - 30) / 2 + 3, y + 19);
      var cx = dir > 0 ? x + w - 26 : x + 3;
      if (dir < 0) { rect(x + 27, y + 5, w - 30, 28, '#CFE7EF'); rect(x + 30, y + 9, w - 36, 20, '#A9D6E5'); ctx.fillStyle = '#245'; ctx.fillText('GLASS', x + 27 + (w - 30) / 2, y + 19); rect(x + 3, y + 5, 26, 28, c); rect(x + 5, y + 8, 10, 10, '#9FE3FF'); }
      else { rect(cx, y + 5, 23, 28, c); rect(cx + 12, y + 8, 10, 10, '#9FE3FF'); }
      rect(x + 8, y + 31, 9, 5, '#111'); rect(x + w / 2 - 4, y + 31, 9, 5, '#111'); rect(x + w - 17, y + 31, 9, 5, '#111');
    } else if (it.kind === 'bus') {
      rect(x + 3, y + 4, w - 6, 30, '#6600FF'); rect(x + 3, y + 26, w - 6, 3, '#FDA138');
      for (var i = x + 10; i < x + w - 16; i += 14) rect(i, y + 9, 10, 9, '#CFC2FF');
      rect(x + (dir > 0 ? w - 14 : 6), y + 9, 8, 13, '#9FE3FF');
      ctx.font = '7px ' + FONT; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PARR', x + w / 2, y + 22);
      rect(x + 10, y + 32, 10, 5, '#111'); rect(x + w - 20, y + 32, 10, 5, '#111');
    }
  }
  function drawFloat(it, row) {
    var x = it.x * CELL, y = row * CELL, w = it.len * CELL;
    if (it.kind === 'log') {
      rect(x + 2, y + 8, w - 4, 24, '#7A4A22'); rect(x + 2, y + 12, w - 4, 3, '#5E3818'); rect(x + 2, y + 24, w - 4, 3, '#5E3818');
      rect(x + w - 10, y + 8, 8, 24, '#B07A45');
    } else if (it.kind === 'mattress') {
      rect(x + 2, y + 6, w - 4, 28, '#F2EEE2');
      for (var i = x + 8; i < x + w - 6; i += 12) rect(i, y + 6, 4, 28, '#E6B6C8');
      rect(x + 14, y + 14, 10, 8, '#C9A15A');
    } else if (it.kind === 'trolley') {
      for (var t = 0; t < it.len; t++) {
        var tx = x + t * CELL;
        rect(tx + 4, y + 8, 32, 3, '#C0C0C0'); rect(tx + 4, y + 8, 3, 22, '#C0C0C0'); rect(tx + 33, y + 8, 3, 22, '#C0C0C0'); rect(tx + 4, y + 27, 32, 3, '#C0C0C0');
        for (var g = tx + 10; g < tx + 33; g += 6) rect(g, y + 11, 2, 16, '#A0A0A0');
        rect(tx + 2, y + 4, 8, 3, '#E8303A');
      }
    }
  }
  function drawPie(x, y) {
    rect(x + 6, y + 18, 28, 12, '#A86B1E'); rect(x + 4, y + 14, 32, 8, '#D9A441'); rect(x + 8, y + 10, 24, 6, '#E9BE62');
    rect(x + 12, y + 14, 3, 3, '#7A4A12'); rect(x + 19, y + 12, 3, 3, '#7A4A12'); rect(x + 26, y + 14, 3, 3, '#7A4A12');
    rect(x + 13, y + 20, 4, 4, '#fff'); rect(x + 23, y + 20, 4, 4, '#fff'); rect(x + 14, y + 21, 2, 2, '#000'); rect(x + 24, y + 21, 2, 2, '#000');
  }

  var t = 0;
  function draw() {
    var st = state; t++;
    rect(0, 0, W, H, '#0B0018');
    // HUD
    text('SCORE ' + String(st.score).padStart(5, '0'), 8, 14, 11, '#fff');
    text('HI ' + String(Math.max(hi, st.score)).padStart(5, '0'), W / 2 + 30, 14, 11, '#FDA138', 'center');
    text('LVL ' + st.level, W - 8, 14, 11, '#fff', 'right');
    // homes row
    rect(0, CELL, W, CELL, '#3A1B5C');
    HOME_COLS.forEach(function (c, i) {
      var x = c * CELL;
      rect(x - 2, CELL + 2, CELL + 4, CELL - 2, '#0B0018');
      rect(x, CELL + 6, CELL, CELL - 6, st.homes[i] ? '#2E8B57' : '#1A0A2E');
      if (st.homes[i]) drawPie(x, CELL + 2);
      ctx.font = '5px ' + FONT; ctx.fillStyle = '#FDA138'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(HOME_NAMES[i], x + CELL / 2, CELL + 1);
    });
    // canal
    rect(0, 2 * CELL, W, 4 * CELL, '#1E4E78');
    for (var wv = 0; wv < 20; wv++) rect(((wv * 53 + t * 0.4) % (W + 20)) - 10, 2 * CELL + (wv * 37) % (4 * CELL), 12, 2, '#3E77A8');
    text('SANKEY CANAL', W - 6, 2 * CELL + 2, 6, '#8FB8DA', 'right');
    // towpath
    rect(0, 6 * CELL, W, CELL, '#4C7A2E'); for (var g = 0; g < W; g += 16) rect(g, 6 * CELL + ((g / 16) % 2 ? 6 : 26), 4, 4, '#6FA24A');
    // road
    rect(0, 7 * CELL, W, 5 * CELL, '#2A2A2E');
    for (var r = 8; r <= 11; r++) for (var dx = (t * 0) % 40; dx < W; dx += 40) rect(dx + 6, r * CELL - 2, 20, 3, r === 9 ? '#FDA138' : '#BBBBBB');
    text('A580 EAST LANCS ROAD', 6, 7 * CELL + 2, 6, '#888', 'left');
    // pavement
    rect(0, 12 * CELL, W, CELL, '#8A8A8A'); for (var p = 0; p < W; p += 40) rect(p, 12 * CELL, 2, CELL, '#777');
    text('PARR', W - 6, 12 * CELL + 4, 7, '#3A1B5C', 'right');
    // lanes
    st.lanes.forEach(function (l) { l.items.forEach(function (it) { if (l.type === 'road') drawVehicle(it, l.row, l.speed > 0 ? 1 : -1); else drawFloat(it, l.row); }); });
    // pie
    if (st.mode !== 'title') {
      if (st.dead) {
        var px = st.px * CELL, py = st.py * CELL;
        for (var s = 0; s < 10; s++) { var a = s * 0.63, rr = (60 - st.dead) * 0.6; rect(px + 20 + Math.cos(a) * rr - 3, py + 20 + Math.sin(a) * rr - 3, 6, 6, s % 2 ? '#D9A441' : '#7A3A12'); }
      } else drawPie(st.px * CELL, st.py * CELL);
    }
    // status row
    rect(0, 13 * CELL, W, CELL, '#0B0018');
    for (var li = 0; li < Math.max(0, st.lives - (st.dead ? 0 : 1)); li++) { ctx.save(); ctx.translate(8 + li * 30, 13 * CELL + 8); ctx.scale(0.6, 0.6); drawPie(0, 0); ctx.restore(); }
    var tw = Math.max(0, st.timer) / 30 * 200;
    rect(W - 212, 13 * CELL + 16, 204, 10, '#333'); rect(W - 210, 13 * CELL + 18, tw, 6, st.timer < 8 ? '#E8303A' : '#39FF14');
    text('HOT', W - 250, 13 * CELL + 17, 8, '#fff');

    if (st.mode === 'title') {
      shade(110, 330);
      text('CROSS THE', W / 2, 130, 18, '#FDA138', 'center');
      text('EAST LANCS', W / 2, 160, 24, '#8A3CFF', 'center');
      text('Get the pie home while it\'s hot.', W / 2, 210, 8, '#fff', 'center');
      text('Dodge the traffic, ride the', W / 2, 232, 8, '#fff', 'center');
      text('junk on the Sankey Canal.', W / 2, 248, 8, '#fff', 'center');
      drawPie(W / 2 - 20, 275);
      if ((t >> 5) & 1) text('PRESS AN ARROW TO START', W / 2, 335, 10, '#FDA138', 'center');
      text('Arrows / swipe to hop · P pauses', W / 2, 365, 7, '#999', 'center');
    }
    if (st.dead && st.mode === 'play') text(st.deathMsg, W / 2, 6 * CELL + 14, 8, '#fff', 'center');
    else if (st.msgT > 0 && st.mode === 'play') text(st.msg, W / 2, 6 * CELL + 14, 8, '#FDA138', 'center');
    if (st.mode === 'paused') { shade(200, 140); text('PAUSED', W / 2, 240, 20, '#FDA138', 'center'); text('Press P to carry on', W / 2, 285, 9, '#fff', 'center'); }
    if (st.mode === 'over') {
      shade(150, 260);
      text('GAME OVER', W / 2, 180, 24, '#E8303A', 'center');
      text('No pie for you.', W / 2, 230, 9, '#fff', 'center');
      text('SCORE ' + st.score, W / 2, 265, 12, '#FDA138', 'center');
      if (st.newHi) text('NEW HIGH SCORE!', W / 2, 295, 10, '#39FF14', 'center');
      text('Press an arrow to have another go', W / 2, 340, 8, '#fff', 'center');
    }
  }
  function shade(y, h) { ctx.fillStyle = 'rgba(11,0,24,.85)'; ctx.fillRect(0, y, W, h); }

  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    update(dt); draw(); requestAnimationFrame(loop);
  }
  reset();
  var go = function () { requestAnimationFrame(loop); };
  try { document.fonts.load('12px "Press Start 2P"').then(go, go); } catch (e) { go(); }
})();
