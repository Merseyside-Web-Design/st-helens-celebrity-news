/* SHCN arcade kit – shared plumbing for the Lucky Strike cabinet games (canvas, keys, touch pad, sound, hi-scores, title and game-over screens) */
window.SHCNGame = function (o) {
  'use strict';
  var cv = document.getElementById('game-canvas'); if (!cv) return;
  var ctx = cv.getContext('2d'), W = o.w, H = o.h; cv.width = W; cv.height = H; ctx.imageSmoothingEnabled = false;
  var FONT = '"Press Start 2P", "Courier New", monospace', AC = null, muted = false, overT = 0, newHi = false;
  var g = { ctx: ctx, W: W, H: H, t: 0, score: 0, hi: 0, mode: 'title', keys: {}, hit: {}, msg: '' };
  try { g.hi = parseInt(localStorage.getItem(o.hiKey) || '0', 10) || 0; } catch (e) {}
  g.rect = function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  g.text = function (s, x, y, size, c, align) { ctx.font = size + 'px ' + FONT; ctx.fillStyle = c || '#fff'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top'; ctx.fillText(s, Math.round(x), Math.round(y)); };
  g.rnd = function (a, b) { return a + Math.random() * (b - a); };
  g.beep = function (f, d, type, vol, to) {
    if (muted) return;
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var os = AC.createOscillator(), gn = AC.createGain(); os.type = type || 'square'; os.frequency.setValueAtTime(f, AC.currentTime);
      if (to) os.frequency.exponentialRampToValueAtTime(to, AC.currentTime + d); gn.gain.setValueAtTime(vol || 0.05, AC.currentTime); gn.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
      os.connect(gn); gn.connect(AC.destination); os.start(); os.stop(AC.currentTime + d); } catch (e) {}
  };
  g.over = function (msg) { if (g.mode !== 'play') return; g.mode = 'over'; g.msg = msg || ''; overT = 0; newHi = g.score > g.hi; if (newHi) { g.hi = g.score; try { localStorage.setItem(o.hiKey, String(g.hi)); } catch (e) {} } g.beep(220, .5, 'sawtooth', .07, 55); };
  g.hud = function (extra) { g.text('SCORE ' + String(g.score).padStart(5, '0'), 8, 8, 10, '#fff'); g.text('HI ' + String(Math.max(g.hi, g.score)).padStart(5, '0'), W - 8, 8, 10, '#FDA138', 'right'); if (extra) g.text(extra, W / 2, 8, 10, '#39FF14', 'center'); };
  function start() { g.score = 0; g.t = 0; g.hit = {}; o.init(g); g.mode = 'play'; g.beep(660, .1); }
  function press(k) { if (g.mode === 'title' || (g.mode === 'over' && overT > 45)) { start(); return; } if (g.mode === 'paused') return; if (!g.keys[k]) g.hit[k] = true; g.keys[k] = true; }
  var MAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', ' ': 'fire', z: 'fire', x: 'fire', Enter: 'fire' };
  function pause() { if (g.mode === 'play') g.mode = 'paused'; else if (g.mode === 'paused') g.mode = 'play'; }
  addEventListener('keydown', function (e) { var k = MAP[e.key] || MAP[(e.key || '').toLowerCase()]; if (e.key === 'p' || e.key === 'P') { pause(); return; } if (!k) return; e.preventDefault(); if (!e.repeat) press(k); });
  addEventListener('keyup', function (e) { var k = MAP[e.key] || MAP[(e.key || '').toLowerCase()]; if (k) g.keys[k] = false; });
  ['up', 'down', 'left', 'right', 'fire'].forEach(function (k) { var el = document.getElementById('pad-' + k); if (!el) return;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); press(k); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, function () { g.keys[k] = false; }); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); }); });
  cv.addEventListener('pointerdown', function () { if (g.mode !== 'play') press('fire'); });
  var pb = document.getElementById('game-pause'), mb = document.getElementById('game-mute');
  if (pb) pb.addEventListener('click', function () { pause(); pb.blur(); });
  if (mb) mb.addEventListener('click', function () { muted = !muted; mb.textContent = 'Sound: ' + (muted ? 'off' : 'on'); mb.setAttribute('aria-pressed', String(muted)); mb.blur(); });
  function shade(y, h) { ctx.fillStyle = 'rgba(11,0,24,.86)'; ctx.fillRect(0, y, W, h); }
  function draw() {
    o.draw(g); var m = H / 2;
    if (g.mode === 'title') { shade(m - 130, 260); g.text(o.name, W / 2, m - 100, o.nameSize || 24, '#FDA138', 'center'); o.sub.forEach(function (s, i) { g.text(s, W / 2, m - 46 + i * 20, 8, i === o.sub.length - 1 ? '#999' : '#fff', 'center'); });
      if ((Date.now() >> 9) & 1) g.text('PRESS A KEY OR TAP TO START', W / 2, m + 90, 9, '#FDA138', 'center'); }
    if (g.mode === 'paused') { shade(m - 60, 120); g.text('PAUSED', W / 2, m - 30, 20, '#FDA138', 'center'); g.text('Press P to carry on', W / 2, m + 16, 9, '#fff', 'center'); }
    if (g.mode === 'over') { overT++; shade(m - 110, 220); g.text('GAME OVER', W / 2, m - 84, 22, '#E8303A', 'center'); g.text(g.msg, W / 2, m - 36, 8, '#fff', 'center'); g.text('SCORE ' + g.score, W / 2, m, 12, '#FDA138', 'center');
      if (newHi) g.text('NEW HIGH SCORE!', W / 2, m + 30, 10, '#39FF14', 'center'); if (overT > 45) g.text('Press a key to have another go', W / 2, m + 70, 8, '#fff', 'center'); }
  }
  var acc = 0, last = 0;
  function loop(ts) { var dt = last ? Math.min(100, ts - last) : 0; last = ts; acc += dt; var n = 0;
    while (acc >= 16.6 && n++ < 5) { acc -= 16.6; if (g.mode === 'play') { o.step(g); g.t++; g.hit = {}; } } draw(); requestAnimationFrame(loop); }
  o.init(g); window.__game = g;
  var go = function () { requestAnimationFrame(loop); }; try { document.fonts.load('12px "Press Start 2P"').then(go, go); } catch (e) { go(); }
};
