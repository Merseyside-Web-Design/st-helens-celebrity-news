/* HONK! – an SHCN original. The geese of Taylor Park have had enough. */
(function () {
  'use strict'; var s;
  function wave(g) {
    s.wave++; s.banner = 120; s.geese = []; s.boss = null; s.twigs = []; var k = (s.wave - 1) % 4, i, j; s.lv = 1 + Math.floor((s.wave - 1) / 4) * .25;
    if (k < 2) for (j = 0; j < 3 + k; j++) for (i = 0; i < 8; i++) s.geese.push({ hx: 72 + i * 48, hy: 70 + j * 36, x: 72 + i * 48, y: -30 - j * 30, st: 'back', a: 0, hp: 1, big: 0 });
    else if (k === 2) for (j = 0; j < 2; j++) for (i = 0; i < 6; i++) s.geese.push({ hx: 80 + i * 64, hy: 80 + j * 50, x: 80 + i * 64, y: -40, st: 'back', a: 0, hp: 2, big: 1 });
    else { s.boss = { x: 240, y: -80, hp: 26, dir: 1, flash: 0 }; for (j = 0; j < 3; j++) for (i = 0; i < 13; i++) s.twigs.push({ dx: -78 + i * 13, dy: 34 + j * 9 }); }
  }
  function boom(x, y, c) { for (var i = 0; i < 8; i++) s.fx.push({ x: x, y: y, vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5, l: 22, c: c || '#fff' }); }
  function die(g) { if (s.dead || s.safe > 0) return; s.dead = 70; s.lives--; boom(s.x, 520, '#FDA138'); g.beep(160, .5, 'sawtooth', .08, 40); }
  function goose(g, q, flap) {
    var w = q.big ? 38 : 26, x = q.x - w / 2, y = q.y, f = (flap >> 3) & 1, body = q.big ? (q.hp > 1 ? '#fff' : '#f3c9c9') : '#e9e4d6';
    g.rect(x + 4, y + 6, w - 8, 10, body); g.rect(x, y + (f ? 2 : 9), 6, 7, '#b9b3a3'); g.rect(x + w - 6, y + (f ? 2 : 9), 6, 7, '#b9b3a3');
    g.rect(q.x - 3, y + 12, 6, 10, body); g.rect(q.x - 3, y + 20, 6, 5, q.big ? '#fff' : '#2a2a2a'); g.rect(q.x - 2, y + 25, 4, 4, '#FD8A18'); g.rect(q.x - 3, y + 21, 2, 2, '#000'); g.rect(q.x + 1, y + 21, 2, 2, '#000');
  }
  SHCNGame({ w: 480, h: 560, hiKey: 'shcn-honk-hi', name: 'HONK!', nameSize: 32, sub: ['The geese of Taylor Park have had enough.', 'Bread them before they have you.', 'Every fourth wave: MOTHER GOOSE.', '← → move · SPACE bread · ↓ brolly · P pause'],
    init: function (g) { s = { x: 240, lives: 3, wave: 0, shots: [], eggs: [], fx: [], cool: 0, brolly: 0, brollyCd: 0, dead: 0, safe: 0, sway: 0 }; wave(g); },
    step: function (g) {
      var i, j, q, e, b = s.boss, K = g.keys;
      if (s.banner > 0) s.banner--; if (s.safe > 0) s.safe--; if (s.brolly > 0) s.brolly--; if (s.brollyCd > 0) s.brollyCd--; if (s.cool > 0) s.cool--;
      if (s.dead) { if (--s.dead === 0) { if (s.lives <= 0) return g.over('The geese have taken Taylor Park.'); s.safe = 100; s.eggs = []; } }
      else { if (K.left) s.x = Math.max(20, s.x - 4); if (K.right) s.x = Math.min(460, s.x + 4);
        if (K.fire && s.cool <= 0 && s.shots.length < 3) { s.shots.push({ x: s.x, y: 500 }); s.cool = 12; g.beep(880, .06, 'square', .04, 440); }
        if (g.hit.down && s.brollyCd <= 0) { s.brolly = 90; s.brollyCd = 330; g.beep(300, .2, 'triangle', .06, 600); } }
      s.sway += .02;
      var formed = s.geese.filter(function (z) { return z.st === 'form'; });
      if (formed.length && g.t % Math.max(30, Math.round(100 / s.lv)) === 0) { q = formed[Math.floor(Math.random() * formed.length)]; q.st = 'dive'; q.a = 0; q.vx = (s.x - q.x) / 110; g.beep(500, .12, 'sawtooth', .03, 300); }
      for (i = s.geese.length - 1; i >= 0; i--) { q = s.geese[i]; var hx = q.hx + Math.sin(s.sway) * 34;
        if (q.st === 'form') { q.x = hx; q.y = q.hy; if (Math.random() < .0016 * s.lv) s.eggs.push({ x: q.x, y: q.y + 24, vy: 2.6 * s.lv }); }
        else if (q.st === 'dive') { q.a += .09; q.y += 2.3 * s.lv; q.x += q.vx + Math.sin(q.a) * 2.6; if (Math.random() < .012) s.eggs.push({ x: q.x, y: q.y + 24, vy: 3.2 * s.lv }); if (q.y > 580) { q.y = -40; q.st = 'back'; } }
        else { q.x += (hx - q.x) * .06; q.y += Math.min(3, (q.hy - q.y) * .08 + .6); if (Math.abs(q.y - q.hy) < 2) q.st = 'form'; }
        if (!s.dead && Math.abs(q.x - s.x) < 22 && q.y > 480 && q.y < 540) { if (s.brolly > 0) { boom(q.x, q.y, '#fff'); s.geese.splice(i, 1); g.score += 80; } else die(g); } }
      if (b) { if (b.y < 90) b.y += 1; else { b.x += b.dir * 1.4 * s.lv; if (b.x < 100 || b.x > 380) b.dir *= -1; if (g.t % 240 === 0 && b.y < 190) b.y += 12; }
        if (b.flash > 0) b.flash--; if (g.t % Math.round(46 / s.lv) === 0) s.eggs.push({ x: b.x + g.rnd(-60, 60), y: b.y + 50, vy: 3 * s.lv });
        if (g.t % 200 === 100 && s.geese.length < 4) s.geese.push({ hx: b.x, hy: b.y, x: b.x, y: b.y + 30, st: 'dive', a: 0, vx: (s.x - b.x) / 110, hp: 1, big: 0 }); }
      for (i = s.shots.length - 1; i >= 0; i--) { e = s.shots[i]; e.y -= 9; var gone = e.y < 30;
        for (j = s.geese.length - 1; j >= 0 && !gone; j--) { q = s.geese[j]; if (Math.abs(q.x - e.x) < (q.big ? 20 : 15) && e.y > q.y - 2 && e.y < q.y + 28) { gone = true; if (--q.hp <= 0) { g.score += q.st === 'dive' ? (q.big ? 200 : 60) : (q.big ? 100 : 30); boom(q.x, q.y + 10, '#fff'); s.geese.splice(j, 1); g.beep(200, .15, 'square', .05, 80); } else g.beep(600, .05); } }
        if (b && !gone) { for (j = s.twigs.length - 1; j >= 0; j--) { var tw = s.twigs[j]; if (Math.abs(b.x + tw.dx + 6 - e.x) < 8 && Math.abs(b.y + tw.dy + 4 - e.y) < 7) { s.twigs.splice(j, 1); gone = true; g.score += 5; g.beep(300, .04); break; } }
          if (!gone && Math.abs(b.x - e.x) < 60 && e.y < b.y + 34 && e.y > b.y - 30) { gone = true; b.flash = 6; g.beep(700, .06); if (--b.hp <= 0) { g.score += 1000; for (j = 0; j < 5; j++) boom(b.x + g.rnd(-50, 50), b.y + g.rnd(-20, 20), '#FDA138'); g.beep(120, .8, 'sawtooth', .09, 30); s.boss = b = null; s.twigs = []; s.geese = []; } } }
        if (gone) s.shots.splice(i, 1); }
      for (i = s.eggs.length - 1; i >= 0; i--) { e = s.eggs[i]; e.y += e.vy; if (e.y > 540) { s.eggs.splice(i, 1); continue; }
        if (s.brolly > 0 && Math.abs(e.x - s.x) < 30 && e.y > 478 && e.y < 500) { s.eggs.splice(i, 1); g.score += 5; g.beep(900, .03); continue; }
        if (!s.dead && Math.abs(e.x - s.x) < 12 && e.y > 498 && e.y < 532) { s.eggs.splice(i, 1); die(g); } }
      for (i = s.fx.length - 1; i >= 0; i--) { e = s.fx[i]; e.x += e.vx; e.y += e.vy; if (--e.l <= 0) s.fx.splice(i, 1); }
      if (!s.geese.length && !s.boss && !s.dead) { g.score += 100; wave(g); }
    },
    draw: function (g) {
      var i, e, b = s.boss;
      g.rect(0, 0, 480, 560, '#0B1830'); for (i = 0; i < 40; i++) g.rect((i * 97) % 480, (i * 53) % 420 + 30, 2, 2, i % 3 ? '#39507a' : '#8aa0c8');
      g.rect(0, 440, 480, 30, '#12324a'); g.rect(0, 470, 480, 90, '#1f4a22'); for (i = 0; i < 480; i += 16) g.rect(i + 6, 462, 2, 14, '#2a2a2e'); g.rect(0, 466, 480, 2, '#2a2a2e');
      s.geese.forEach(function (q, n) { goose(g, q, g.t + n * 5); });
      if (b) { var c = b.flash ? '#fff' : '#d8d2c2'; g.rect(b.x - 62, b.y - 14, 124, 44, c); g.rect(b.x - 92, b.y - 4 + ((g.t >> 4) & 1) * 10, 30, 16, '#a9a393'); g.rect(b.x + 62, b.y - 4 + ((g.t >> 4) & 1) * 10, 30, 16, '#a9a393');
        g.rect(b.x - 12, b.y - 44, 24, 34, c); g.rect(b.x - 12, b.y - 46, 24, 10, '#2a2a2a'); g.rect(b.x - 8, b.y - 26, 16, 10, '#FD8A18'); g.rect(b.x - 9, b.y - 38, 5, 5, '#E8303A'); g.rect(b.x + 4, b.y - 38, 5, 5, '#E8303A');
        s.twigs.forEach(function (tw) { g.rect(b.x + tw.dx, b.y + tw.dy, 12, 8, (tw.dx + tw.dy) % 2 ? '#8A5A2B' : '#6b4420'); }); g.rect(b.x - 60, b.y - 60, 120, 5, '#400'); g.rect(b.x - 60, b.y - 60, 120 * b.hp / 26, 5, '#E8303A'); }
      s.shots.forEach(function (e) { g.rect(e.x - 3, e.y, 6, 9, '#D9A441'); g.rect(e.x - 3, e.y, 6, 2, '#8A5A2B'); });
      s.eggs.forEach(function (e) { g.rect(e.x - 3, e.y - 4, 6, 8, '#fff6dc'); g.rect(e.x - 2, e.y - 5, 4, 1, '#fff6dc'); });
      s.fx.forEach(function (e) { g.rect(e.x, e.y, 3, 3, e.c); });
      if (!s.dead && !(s.safe > 0 && (g.t >> 2) & 1)) { var x = s.x; g.rect(x - 9, 512, 18, 22, '#2e6b1e'); g.rect(x - 7, 502, 14, 11, '#f2c29b'); g.rect(x - 9, 498, 18, 5, '#5a4a2a'); g.rect(x - 11, 502, 6, 2, '#5a4a2a'); g.rect(x - 3, 496, 6, 18, '#777'); g.rect(x - 8, 534, 6, 8, '#222'); g.rect(x + 2, 534, 6, 8, '#222');
        if (s.brolly > 0) { g.rect(x - 30, 484, 60, 5, '#E8303A'); g.rect(x - 24, 480, 48, 4, '#fff'); g.rect(x - 14, 476, 28, 4, '#E8303A'); } }
      g.hud('WAVE ' + s.wave); for (i = 0; i < s.lives; i++) g.rect(8 + i * 16, 546, 10, 8, '#2e6b1e'); g.text(s.brollyCd > 0 ? 'BROLLY ' + Math.ceil(s.brollyCd / 60) : 'BROLLY READY', 472, 546, 7, s.brollyCd > 0 ? '#777' : '#39FF14', 'right');
      if (s.banner > 0 && g.mode === 'play') g.text(b ? 'MOTHER GOOSE!' : 'WAVE ' + s.wave, 240, 250, 16, '#FDA138', 'center');
    } });
})();
