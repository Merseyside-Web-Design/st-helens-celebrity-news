/* Pie Snake – an SHCN original. Eat your way round Taylor Park. */
(function () {
  'use strict';
  var cv = document.getElementById('game-canvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var CELL = 20, GW = 24, GH = 24, TOP = 40, W = GW * CELL, H = GH * CELL + TOP;
  cv.width = W; cv.height = H;
  ctx.imageSmoothingEnabled = false;
  var FONT = '"Press Start 2P", "Courier New", monospace';
  var HI_KEY = 'shcn-pie-snake-hi';

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

  // Taylor Park: railings round the edge, the Big Dam in the middle, a bandstand and a few trees
  var BLOCK = {};
  function key(x, y) { return x + ',' + y; }
  (function buildPark() {
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
      var dx = (x - 11.5) / 4.6, dy = (y - 12.5) / 3.2;
      if (dx * dx + dy * dy < 1) BLOCK[key(x, y)] = 'dam';
    }
    [[4, 4], [19, 4], [4, 20], [19, 19], [11, 3], [12, 3]].forEach(function (t) { BLOCK[key(t[0], t[1])] = 'tree'; });
    [[3, 12], [3, 13], [20, 12], [20, 13]].forEach(function (b) { BLOCK[key(b[0], b[1])] = 'bench'; });
  })();

  var state, hi = getHi();
  function reset() {
    state = { mode: 'title', score: 0, snake: [[6, 20], [5, 20], [4, 20], [3, 20]], dir: [1, 0], queue: [], grow: 0,
      food: null, gold: null, goldT: 0, eaten: 0, tick: 0, interval: 140, msg: '', msgT: 0, deathMsg: '' };
    placeFood();
  }
  function free(x, y) {
    if (x < 1 || y < 1 || x > GW - 2 || y > GH - 2) return false;
    if (BLOCK[key(x, y)]) return false;
    for (var i = 0; i < state.snake.length; i++) if (state.snake[i][0] === x && state.snake[i][1] === y) return false;
    if (state.food && state.food[0] === x && state.food[1] === y) return false;
    return true;
  }
  function randomFree() {
    for (var n = 0; n < 500; n++) { var x = 1 + Math.floor(Math.random() * (GW - 2)), y = 1 + Math.floor(Math.random() * (GH - 2)); if (free(x, y)) return [x, y]; }
    return null;
  }
  function placeFood() { state.food = randomFree(); }

  function begin() { if (state.mode === 'over' && Date.now() - state.overAt < 900) return; reset(); state.mode = 'play'; state.msg = 'GET YER PIES!'; state.msgT = 90; beep(523, .15); }

  // ---------- input ----------
  var stage = document.getElementById('game-stage');
  function turn(dx, dy) {
    if (state.mode === 'title' || state.mode === 'over') { begin(); }
    if (state.mode !== 'play') return;
    var lastDir = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
    if (lastDir[0] === -dx && lastDir[1] === -dy) return;      // no reversing into yourself
    if (lastDir[0] === dx && lastDir[1] === dy) return;
    if (state.queue.length < 3) state.queue.push([dx, dy]);
  }
  var KEYMAP = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var r = stage.getBoundingClientRect(); if (r.top > innerHeight || r.bottom < 0) return;
    if (KEYMAP[e.key] || e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Enter') e.preventDefault();
    if (KEYMAP[e.key]) turn(KEYMAP[e.key][0], KEYMAP[e.key][1]);
    else if ((e.key === ' ' || e.key === 'Enter') && (state.mode === 'title' || state.mode === 'over')) begin();
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });
  function tapBtn(id, dx, dy) {
    var el = document.getElementById(id); if (!el) return;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); turn(dx, dy); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  tapBtn('pad-up', 0, -1); tapBtn('pad-down', 0, 1); tapBtn('pad-left', -1, 0); tapBtn('pad-right', 1, 0);
  var sx = 0, sy = 0;
  cv.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
  cv.addEventListener('pointerup', function (e) {
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) { if (state.mode !== 'play') begin(); return; }
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
  });
  function togglePause() { if (state.mode === 'play') state.mode = 'paused'; else if (state.mode === 'paused') state.mode = 'play'; }
  var pb = document.getElementById('game-pause'); if (pb) pb.addEventListener('click', togglePause);
  var mb = document.getElementById('game-mute'); if (mb) mb.addEventListener('click', function () { muted = !muted; mb.textContent = muted ? 'Sound: off' : 'Sound: on'; mb.setAttribute('aria-pressed', String(muted)); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && state.mode === 'play') state.mode = 'paused'; });

  // ---------- rules ----------
  var DEATH = { wall: ['Ran into the park railings.', 'Tried to leave Taylor Park. Nobody leaves.'],
                dam: ['Fell in the Big Dam.', 'Pie snake can\'t swim.'],
                tree: ['Headbutted a tree.'], bench: ['Fell over a bench full of lads.'],
                self: ['Ate yer own tail. Greedy.', 'Too much pie. Burst.'] };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function step() {
    var st = state;
    if (st.queue.length) st.dir = st.queue.shift();
    var h = st.snake[0], nx = h[0] + st.dir[0], ny = h[1] + st.dir[1];
    var why = null;
    if (nx < 1 || ny < 1 || nx > GW - 2 || ny > GH - 2) why = 'wall';
    else if (BLOCK[key(nx, ny)]) why = BLOCK[key(nx, ny)];
    else for (var i = 0; i < st.snake.length - (st.grow ? 0 : 1); i++) if (st.snake[i][0] === nx && st.snake[i][1] === ny) { why = 'self'; break; }
    if (why) { st.deathMsg = pick(DEATH[why]); gameOver(); return; }
    st.snake.unshift([nx, ny]);
    if (st.grow > 0) st.grow--; else st.snake.pop();

    if (st.food && nx === st.food[0] && ny === st.food[1]) {
      st.score += 10; st.eaten++; st.grow += 2; beep(660, .06); setTimeout(function () { beep(880, .06); }, 60);
      st.interval = Math.max(60, 140 - st.eaten * 3);
      placeFood();
      if (st.eaten % 5 === 0 && !st.gold) { st.gold = randomFree(); st.goldT = 60; st.msg = "PIMBLETT'S PIE! GRAB IT!"; st.msgT = 60; }
    }
    if (st.gold) {
      if (nx === st.gold[0] && ny === st.gold[1]) {
        var bonus = 20 + st.goldT; st.score += bonus; st.grow += 3; st.gold = null;
        st.msg = 'GOLDEN PIE +' + bonus; st.msgT = 70; beep(784, .1); setTimeout(function () { beep(1046, .15); }, 100);
      } else if (--st.goldT <= 0) st.gold = null;
    }
  }
  function gameOver() {
    state.mode = 'over'; state.overAt = Date.now();
    if (state.score > hi) { hi = state.score; setHi(hi); state.newHi = true; }
    beep(196, .25); setTimeout(function () { beep(147, .25); }, 220); setTimeout(function () { beep(98, .6); }, 440);
  }

  // ---------- drawing ----------
  function text(t, x, y, size, col, align) { ctx.font = size + 'px ' + FONT; ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(t, x, y); }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function cx(x) { return x * CELL; } function cy(y) { return TOP + y * CELL; }

  function drawPie(x, y, gold) {
    var X = cx(x), Y = cy(y);
    rect(X + 2, Y + 10, 16, 7, gold ? '#B8860B' : '#A86B1E');
    rect(X + 1, Y + 6, 18, 6, gold ? '#FFD700' : '#D9A441');
    rect(X + 4, Y + 3, 12, 4, gold ? '#FFF2A8' : '#E9BE62');
    rect(X + 6, Y + 6, 2, 2, '#7A4A12'); rect(X + 12, Y + 6, 2, 2, '#7A4A12');
    if (gold && (t >> 3) & 1) { rect(X - 1, Y + 1, 2, 2, '#fff'); rect(X + 19, Y + 15, 2, 2, '#fff'); }
  }
  var t = 0;
  function draw() {
    var st = state; t++;
    rect(0, 0, W, H, '#0B0018');
    text('SCORE ' + String(st.score).padStart(5, '0'), 8, 14, 11, '#fff');
    text('HI ' + String(Math.max(hi, st.score)).padStart(5, '0'), W - 8, 14, 11, '#FDA138', 'right');
    // grass
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) rect(cx(x), cy(y), CELL, CELL, (x + y) % 2 ? '#4E8A30' : '#57963A');
    // railings
    rect(0, cy(0), W, CELL, '#2A2A2E'); rect(0, cy(GH - 1), W, CELL, '#2A2A2E'); rect(0, cy(0), CELL, GH * CELL, '#2A2A2E'); rect(W - CELL, cy(0), CELL, GH * CELL, '#2A2A2E');
    for (var r = 0; r < W; r += 8) { rect(r + 3, cy(0) + 4, 2, 14, '#888'); rect(r + 3, cy(GH - 1) + 2, 2, 14, '#888'); }
    for (var q = cy(0); q < cy(GH); q += 8) { rect(4, q + 3, 12, 2, '#888'); rect(W - 16, q + 3, 12, 2, '#888'); }
    text('TAYLOR PARK', W / 2, cy(GH - 1) + 6, 8, '#FDA138', 'center');
    // blocks
    for (var k in BLOCK) {
      var p = k.split(','), bx = +p[0], by = +p[1], kind = BLOCK[k];
      if (kind === 'dam') { rect(cx(bx), cy(by), CELL, CELL, '#2B6CA3'); if ((bx * 7 + by * 3 + (t >> 4)) % 9 === 0) rect(cx(bx) + 4, cy(by) + 9, 10, 2, '#7FB3E0'); }
      else if (kind === 'tree') { rect(cx(bx) + 8, cy(by) + 12, 4, 8, '#5E3818'); rect(cx(bx) + 2, cy(by) + 1, 16, 13, '#2E6B1E'); rect(cx(bx) + 5, cy(by) + 3, 6, 4, '#3F8A2A'); }
      else if (kind === 'bench') { rect(cx(bx) + 1, cy(by) + 6, 18, 4, '#8A5A2B'); rect(cx(bx) + 1, cy(by) + 12, 18, 3, '#8A5A2B'); rect(cx(bx) + 3, cy(by) + 15, 2, 4, '#333'); rect(cx(bx) + 15, cy(by) + 15, 2, 4, '#333'); }
    }
    text('BIG DAM', cx(11.5) + 10, cy(12.5) + 4, 8, '#CFE6FA', 'center');
    // food
    if (st.food) drawPie(st.food[0], st.food[1], false);
    if (st.gold) drawPie(st.gold[0], st.gold[1], true);
    // snake: a string of pies with a hungry face up front
    for (var i = st.snake.length - 1; i >= 0; i--) {
      var s = st.snake[i], X = cx(s[0]), Y = cy(s[1]);
      if (i === 0) {
        rect(X + 1, Y + 1, 18, 18, '#E9BE62'); rect(X + 1, Y + 14, 18, 5, '#A86B1E');
        var d = st.dir, ex = d[0] * 3, ey = d[1] * 3;
        rect(X + 5 + ex, Y + 5 + ey, 4, 4, '#fff'); rect(X + 11 + ex, Y + 5 + ey, 4, 4, '#fff');
        rect(X + 6 + ex, Y + 6 + ey, 2, 2, '#000'); rect(X + 12 + ex, Y + 6 + ey, 2, 2, '#000');
        rect(X + 7 + ex, Y + 12 + ey, 6, 2, '#6B1E1E');
      } else {
        rect(X + 2, Y + 2, 16, 16, i % 2 ? '#D9A441' : '#C89434');
        rect(X + 2, Y + 13, 16, 5, '#A86B1E'); rect(X + 8, Y + 6, 3, 3, '#7A4A12');
      }
    }
    if (st.msgT > 0 && st.mode === 'play') { st.msgT--; text(st.msg, W / 2, cy(1) + 4, 9, '#fff', 'center'); }

    if (st.mode === 'title') {
      shade(130, 300);
      text('PIE SNAKE', W / 2, 150, 28, '#FDA138', 'center');
      text('Eat your way round Taylor Park.', W / 2, 200, 8, '#fff', 'center');
      text('Every pie makes you longer.', W / 2, 220, 8, '#fff', 'center');
      text("Don't fall in the Big Dam.", W / 2, 240, 8, '#fff', 'center');
      ctx.save(); ctx.translate(W / 2 - 130, 272); drawPieAt(0, 0, false); ctx.restore(); text('= 10', W / 2 - 104, 282, 8, '#39FF14');
      ctx.save(); ctx.translate(W / 2 + 10, 272); drawPieAt(0, 0, true); ctx.restore(); text('= BONUS', W / 2 + 36, 282, 8, '#39FF14');
      if ((t >> 5) & 1) text('PRESS AN ARROW TO START', W / 2, 340, 10, '#FDA138', 'center');
      text('Arrows / swipe to steer · P pauses', W / 2, 370, 7, '#999', 'center');
    }
    if (st.mode === 'paused') { shade(220, 120); text('PAUSED', W / 2, 245, 20, '#FDA138', 'center'); text('Press P to carry on', W / 2, 290, 9, '#fff', 'center'); }
    if (st.mode === 'over') {
      shade(150, 260);
      text('GAME OVER', W / 2, 180, 24, '#E8303A', 'center');
      text(st.deathMsg, W / 2, 228, 8, '#fff', 'center');
      text('SCORE ' + st.score + ' · ' + st.eaten + ' PIES', W / 2, 262, 11, '#FDA138', 'center');
      if (st.newHi) text('NEW HIGH SCORE!', W / 2, 292, 10, '#39FF14', 'center');
      text('Press an arrow to have another go', W / 2, 340, 8, '#fff', 'center');
    }
  }
  function drawPieAt(x, y, gold) { var sx = cx, sy = cy; cx = function (v) { return v; }; cy = function (v) { return v; }; drawPie(x, y, gold); cx = sx; cy = sy; }
  function shade(y, h) { ctx.fillStyle = 'rgba(11,0,24,.85)'; ctx.fillRect(0, y, W, h); }

  var acc = 0, last = 0;
  function loop(ts) {
    var dt = last ? Math.min(100, ts - last) : 0; last = ts;
    if (state.mode === 'play') { acc += dt; while (acc >= state.interval && state.mode === 'play') { acc -= state.interval; step(); } }
    else acc = 0;
    draw(); requestAnimationFrame(loop);
  }
  reset();
  var go = function () { requestAnimationFrame(loop); };
  try { document.fonts.load('12px "Press Start 2P"').then(go, go); } catch (e) { go(); }
})();
