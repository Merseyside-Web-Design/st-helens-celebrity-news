/* Crank Caverns Run – an SHCN original. Fly the SHCN news-copter through the caverns with a four-way pie cannon. */
(function () {
  'use strict';
  var CW = 16, N = 42, ZONES = ['THE WAY IN', 'THE LONG DROP', 'THE FLOODED LEVEL', 'THE BEAST\'S LAIR'], s;
  function col(g) { var z = s.zone % 4, minGap = Math.max(120, 230 - s.zone * 14 - (z === 1 ? 30 : 0));
    s.ct += g.rnd(-1, 1) * (z === 1 ? 26 : 14) + s.drift; if (Math.random() < .08) s.drift = g.rnd(-6, 6);
    s.ct = Math.max(30, Math.min(400 - 30 - minGap, s.ct)); s.cg += g.rnd(-12, 12); s.cg = Math.max(minGap, Math.min(minGap + 60, s.cg));
    return { t: s.ct + (Math.random() < .18 ? g.rnd(10, 34) : 0), b: s.ct + s.cg - (Math.random() < .18 ? g.rnd(10, 30) : 0) }; }
  function colAt(x) { return s.cols[Math.max(0, Math.min(N - 1, Math.floor((x + s.off) / CW)))]; }
  function boom(x, y, c) { for (var i = 0; i < 10; i++) s.fx.push({ x: x, y: y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, l: 24, c: c || '#FDA138' }); }
  function die(g) { if (s.dead || s.safe > 0) return; s.dead = 80; boom(s.x, s.y); g.beep(200, .6, 'sawtooth', .09, 40); }
  SHCNGame({ w: 640, h: 400, hiKey: 'shcn-crank-run-hi', name: 'CRANK CAVERNS RUN', nameSize: 22, sub: ['Fly the SHCN news-copter into Crank Caverns.', 'Your pie cannon fires four ways at once.', 'Grab the tea urns or you\'ll run out of fuel.', 'Arrows fly · SPACE fire · P pause'],
    init: function (g) { s = { x: 120, y: 200, lives: 3, zone: 0, dist: 0, off: 0, cols: [], ct: 80, cg: 240, drift: 0, shots: [], foes: [], bolts: [], urns: [], fx: [], fuel: 100, cool: 0, dead: 0, safe: 90, banner: 150, boss: null };
      for (var i = 0; i < N; i++) s.cols.push(i < 14 ? { t: 60, b: 340 } : col(g)); },
    step: function (g) {
      var K = g.keys, i, j, e, q, c, sp = Math.min(4.5, 2 + s.zone * .25), b = s.boss;
      if (s.banner > 0) s.banner--; if (s.safe > 0) s.safe--; if (s.cool > 0) s.cool--;
      // the cave rolls past
      s.off += sp; s.dist += sp; while (s.off >= CW) { s.off -= CW; s.cols.shift(); s.cols.push(b ? { t: 50 + g.rnd(0, 14), b: 350 - g.rnd(0, 14) } : col(g)); var last = s.cols[N - 1], X = (N - 1) * CW - s.off;
        if (!b) { if (Math.random() < .1 + s.zone * .012) s.foes.push({ k: 'bat', x: 660, y: g.rnd(last.t + 20, last.b - 20), a: g.rnd(0, 6), hp: 1 });
          if (Math.random() < .07 + s.zone * .01) { var up = Math.random() < .5; s.foes.push({ k: 'ant', x: X, y: up ? last.t + 6 : last.b - 6, up: up, cd: g.rnd(40, 120), hp: 2 }); }
          if (Math.random() < .035) s.urns.push({ x: X, y: g.rnd(last.t + 30, last.b - 30) }); } }
      if (!b && s.dist > (s.zone + 1) * 2600) { s.zone++; s.banner = 150; g.score += 250; g.beep(440, .4, 'square', .05, 880); if (s.zone % 4 === 3) { s.boss = b = { x: 720, y: 200, hp: 30 + s.zone * 3, max: 30 + s.zone * 3, a: 0, flash: 0 }; } }
      if (s.dead) { if (--s.dead === 0) { if (--s.lives <= 0) return g.over('Lost in Crank Caverns. They never found the copter.'); c = colAt(120); s.x = 120; s.y = (c.t + c.b) / 2; s.safe = 120; s.fuel = Math.max(s.fuel, 60); s.bolts = []; } }
      else { s.x = Math.max(16, Math.min(420, s.x + ((K.right ? 3.2 : 0) - (K.left ? 3.2 : 0)))); s.y += (K.down ? 3.2 : 0) - (K.up ? 3.2 : 0);
        if (K.fire && s.cool <= 0) { s.cool = 11; [[9, 0], [-9, 0], [0, -8], [0, 8]].forEach(function (v) { s.shots.push({ x: s.x, y: s.y, vx: v[0], vy: v[1] }); }); g.beep(700, .05, 'square', .03, 350); }
        s.fuel -= .045 + s.zone * .003; if (s.fuel <= 0) { s.fuel = 0; s.lives = 1; s.safe = 0; die(g); g.msg = ''; }
        c = colAt(s.x); if (s.safe > 0) s.y = Math.max(c.t + 12, Math.min(c.b - 12, s.y)); else if (s.y - 8 < c.t || s.y + 8 > c.b) die(g); }
      for (i = s.urns.length - 1; i >= 0; i--) { e = s.urns[i]; e.x -= sp; if (e.x < -20) s.urns.splice(i, 1); else if (!s.dead && Math.abs(e.x - s.x) < 20 && Math.abs(e.y - s.y) < 18) { s.urns.splice(i, 1); s.fuel = Math.min(100, s.fuel + 35); g.score += 50; g.beep(600, .15, 'triangle', .07, 1200); } }
      for (i = s.foes.length - 1; i >= 0; i--) { q = s.foes[i];
        if (q.k === 'bat') { q.a += .12; q.x -= sp + 1.6; q.y += Math.sin(q.a) * 2.4 + (s.y > q.y ? .4 : -.4); } else { q.x -= sp; if (--q.cd <= 0 && q.x < 620 && q.x > s.x) { q.cd = Math.max(60, 130 - s.zone * 8); var d = Math.hypot(s.x - q.x, s.y - q.y) || 1; s.bolts.push({ x: q.x, y: q.y, vx: (s.x - q.x) / d * 3.4 - sp * .5, vy: (s.y - q.y) / d * 3.4 }); g.beep(180, .08, 'sawtooth', .03); } }
        if (q.x < -30) { s.foes.splice(i, 1); continue; } if (!s.dead && Math.abs(q.x - s.x) < 18 && Math.abs(q.y - s.y) < 14) die(g); }
      if (b) { b.a += .03; if (b.x > 540) b.x -= 1.5; b.y = 200 + Math.sin(b.a) * 95; if (b.flash > 0) b.flash--;
        if (g.t % Math.max(26, 50 - s.zone * 3) === 0) for (j = -1; j <= 1; j++) s.bolts.push({ x: b.x - 40, y: b.y, vx: -4, vy: j * 1.5 + (s.y - b.y) / 90 });
        if (g.t % 150 === 0) s.foes.push({ k: 'bat', x: b.x - 30, y: b.y, a: 0, hp: 1 }); if (g.t % 400 === 200) s.urns.push({ x: 660, y: g.rnd(100, 300) });
        if (!s.dead && Math.abs(b.x - s.x) < 60 && Math.abs(b.y - s.y) < 58) die(g); }
      for (i = s.shots.length - 1; i >= 0; i--) { e = s.shots[i]; e.x += e.vx; e.y += e.vy; c = colAt(e.x); var gone = e.x < 0 || e.x > 640 || e.y < c.t || e.y > c.b;
        for (j = s.foes.length - 1; j >= 0 && !gone; j--) { q = s.foes[j]; if (Math.abs(q.x - e.x) < 14 && Math.abs(q.y - e.y) < 13) { gone = true; if (--q.hp <= 0) { s.foes.splice(j, 1); boom(q.x, q.y, q.k === 'bat' ? '#b06bff' : '#E8303A'); g.score += q.k === 'bat' ? 40 : 100; s.fuel = Math.min(100, s.fuel + 1.5); g.beep(160, .12, 'square', .05, 60); } } }
        if (b && !gone && Math.abs(b.x - e.x) < 52 && Math.abs(b.y - e.y) < 52) { gone = true; if (Math.abs(b.y - e.y) < 22 && e.vx > 0) { b.flash = 5; g.beep(900, .05); if (--b.hp <= 0) { for (j = 0; j < 6; j++) boom(b.x + g.rnd(-40, 40), b.y + g.rnd(-40, 40)); g.score += 2000; g.beep(100, 1, 'sawtooth', .1, 25); s.boss = b = null; s.zone++; s.dist = s.zone * 2600; s.banner = 150; s.bolts = []; } } else g.beep(120, .03); }
        if (gone) s.shots.splice(i, 1); }
      for (i = s.bolts.length - 1; i >= 0; i--) { e = s.bolts[i]; e.x += e.vx; e.y += e.vy; if (e.x < -10 || e.y < 0 || e.y > 400) { s.bolts.splice(i, 1); continue; } if (!s.dead && Math.abs(e.x - s.x) < 13 && Math.abs(e.y - s.y) < 9) { s.bolts.splice(i, 1); die(g); } }
      for (i = s.fx.length - 1; i >= 0; i--) { e = s.fx[i]; e.x += e.vx - sp * .5; e.y += e.vy; if (--e.l <= 0) s.fx.splice(i, 1); }
    },
    draw: function (g) {
      var i, c, x, b = s.boss, z = s.zone % 4, rock = ['#4a382a', '#3a3a4a', '#243a44', '#4a2430'][z], edge = ['#7a5a3a', '#6a6a82', '#3f7a8a', '#8a3a4a'][z];
      g.rect(0, 0, 640, 400, ['#120a06', '#0a0a14', '#061014', '#14060a'][z]);
      for (i = 0; i < N; i++) { c = s.cols[i]; x = i * CW - s.off; g.rect(x, 0, CW + 1, c.t, rock); g.rect(x, c.t - 4, CW + 1, 4, edge); g.rect(x, c.b, CW + 1, 400 - c.b, rock); g.rect(x, c.b, CW + 1, 4, edge); if (z === 2) g.rect(x, Math.max(c.b - 14, 0), CW + 1, 14, 'rgba(60,140,180,.35)'); }
      s.urns.forEach(function (e) { g.rect(e.x - 8, e.y - 10, 16, 20, '#c8c8d0'); g.rect(e.x - 10, e.y - 12, 20, 4, '#888'); g.rect(e.x - 3, e.y + 4, 6, 3, '#E8303A'); g.text('T', e.x, e.y - 6, 8, '#333', 'center'); });
      s.foes.forEach(function (q) { if (q.k === 'bat') { var f = (g.t >> 2) & 1; g.rect(q.x - 5, q.y - 4, 10, 9, '#3a2a4a'); g.rect(q.x - 15, q.y - (f ? 8 : 0), 10, 6, '#5a3a7a'); g.rect(q.x + 5, q.y - (f ? 8 : 0), 10, 6, '#5a3a7a'); g.rect(q.x - 3, q.y - 2, 2, 2, '#E8303A'); g.rect(q.x + 1, q.y - 2, 2, 2, '#E8303A'); }
        else { var d = q.up ? 1 : -1; g.rect(q.x - 12, q.y - 5, 10, 10, '#7a1e1e'); g.rect(q.x - 2, q.y - 4, 8, 8, '#a02a2a'); g.rect(q.x + 6, q.y - 5, 8, 10, '#7a1e1e'); for (var k = -8; k <= 8; k += 8) g.rect(q.x + k, q.y - d * 10 - 2, 2, 8, '#3a0e0e'); g.rect(q.x - 12, q.y + d * 3, 3, 3, '#ffe14f'); } });
      if (b) { var col2 = b.flash ? '#fff' : '#5a3a22'; g.ctx.fillStyle = col2; g.ctx.beginPath(); g.ctx.arc(b.x, b.y, 54, 0, 7); g.ctx.fill(); for (i = 0; i < 14; i++) g.rect(b.x + Math.cos(i * .45 + b.a) * 54 - 3, b.y + Math.sin(i * .45 + b.a) * 54 - 3, 7, 7, '#3a2414');
        g.ctx.fillStyle = '#fff6dc'; g.ctx.beginPath(); g.ctx.arc(b.x - 22, b.y, 20, 0, 7); g.ctx.fill(); g.ctx.fillStyle = '#E8303A'; g.ctx.beginPath(); g.ctx.arc(b.x - 28, b.y + (s.y - b.y) / 30, 9, 0, 7); g.ctx.fill(); g.rect(b.x - 32, b.y - 3 + (s.y - b.y) / 30, 6, 6, '#000');
        g.rect(b.x - 10, b.y + 26, 40, 6, '#000'); for (i = 0; i < 5; i++) g.rect(b.x - 8 + i * 8, b.y + 26, 4, 5, '#fff'); g.rect(220, 384, 200, 8, '#400'); g.rect(220, 384, 200 * b.hp / b.max, 8, '#E8303A'); g.text('THE BEAST OF CRANK', 320, 372, 8, '#fff', 'center'); }
      s.shots.forEach(function (e) { g.rect(e.x - 3, e.y - 3, 7, 6, '#D9A441'); g.rect(e.x - 3, e.y + 1, 7, 2, '#8A5A2B'); });
      s.bolts.forEach(function (e) { g.rect(e.x - 3, e.y - 3, 6, 6, '#7cff4f'); });
      s.fx.forEach(function (e) { g.rect(e.x, e.y, 3, 3, e.c); });
      if (!s.dead && !(s.safe > 0 && (g.t >> 2) & 1)) { x = s.x; var y = s.y; g.rect(x - 14, y - 6, 24, 13, '#6600ff'); g.rect(x + 10, y - 3, 6, 9, '#FDA138'); g.rect(x + 2, y - 4, 7, 6, '#bfe6ff'); g.rect(x - 24, y - 2, 12, 4, '#6600ff'); g.rect(x - 26, y - 7, 3, 10, '#FDA138');
        g.rect(x - 3, y - 10, 2, 4, '#aaa'); g.rect(x - ((g.t >> 1) & 1 ? 18 : 6), y - 12, (g.t >> 1) & 1 ? 32 : 8, 2, '#ddd'); g.rect(x - 10, y + 8, 18, 2, '#aaa'); g.text('SHCN', x - 13, y - 3, 5, '#fff'); }
      g.hud('ZONE ' + (s.zone + 1)); for (i = 0; i < s.lives; i++) g.rect(8 + i * 14, 24, 9, 7, '#6600ff');
      g.text('FUEL', 500, 24, 7, '#fff'); g.rect(532, 23, 100, 8, '#222'); g.rect(532, 23, s.fuel, 8, s.fuel < 25 ? ((g.t >> 3) & 1 ? '#E8303A' : '#fff') : '#39FF14');
      if (s.banner > 0 && g.mode === 'play') g.text(b ? 'THE BEAST OF CRANK!' : ZONES[z], 320, 190, 14, '#FDA138', 'center');
    } });
})();
