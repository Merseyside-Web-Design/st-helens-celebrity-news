/* The Pie Baron – an SHCN original. He's nicked the recipe. Get up the scaffolding and get it back. */
(function () {
  'use strict';
  var FY = [520, 436, 352, 268, 184, 100], LAD = [[120, 340], [200, 380], [110, 300], [180, 370], [130, 330]], s;
  function span(i) { return i === 0 ? [0, 480] : i % 2 ? [0, 400] : [80, 480]; }
  function floorAt(x, y) { for (var i = 5; i >= 0; i--) { var sp = span(i); if (FY[i] >= y - .01 && x >= sp[0] && x <= sp[1]) return i; } return 0; }
  function level(g) { s.p = { x: 40, y: 520, vy: 0, air: false, lad: -1, face: 1 }; s.pies = []; s.next = 60; s.bonus = 5000; s.dead = 0; s.banner = 100;
    s.chips = [1, 2, 3, 4].map(function (i) { var sp = span(i); return { x: g.rnd(sp[0] + 40, sp[1] - 40), f: i }; }); }
  SHCNGame({ w: 480, h: 560, hiKey: 'shcn-pie-baron-hi', name: 'THE PIE BARON', nameSize: 22, sub: ['The Pie Baron of Wigan has nicked', 'the secret Pimblett\'s recipe.', 'Get up that scaffolding and get it back.', '← → walk · ↑ ↓ ladders · SPACE jump · P pause'],
    init: function (g) { s = { lives: 3, lv: 1 }; level(g); },
    step: function (g) {
      var P = s.p, K = g.keys, i, q, f;
      if (s.banner > 0) s.banner--;
      if (s.dead) { if (--s.dead === 0) { if (--s.lives <= 0) return g.over('Flattened by a growler.'); var keep = s.chips; level(g); s.chips = keep; } return; }
      if (s.bonus > 0 && g.t % 30 === 0) s.bonus -= 50;
      // you
      if (P.lad >= 0) { var top = FY[P.lad + 1], bot = FY[P.lad]; if (K.up) P.y -= 1.6; if (K.down) P.y += 1.6; if (P.y <= top) { P.y = top; P.lad = -1; } else if (P.y >= bot) { P.y = bot; P.lad = -1; } if (g.t % 10 === 0 && (K.up || K.down)) g.beep(300, .03, 'square', .02); }
      else { var vx = (K.right ? 2.1 : 0) - (K.left ? 2.1 : 0); if (vx) P.face = vx > 0 ? 1 : -1; P.x = Math.max(8, Math.min(472, P.x + vx)); if (vx && !P.air && g.t % 8 === 0) g.beep(140, .02, 'square', .02);
        f = floorAt(P.x, P.y);
        if (!P.air) { if (FY[f] > P.y + .5) { P.air = true; P.vy = 0; }
          else { if (g.hit.fire) { P.air = true; P.vy = -5.3; g.beep(400, .15, 'square', .04, 800); }
            else if (K.up && f < 5) LAD[f].forEach(function (lx) { if (Math.abs(lx - P.x) < 10) { P.lad = f; P.x = lx; P.y -= 1.6; } });
            else if (K.down && f > 0) LAD[f - 1].forEach(function (lx) { if (Math.abs(lx - P.x) < 10) { P.lad = f - 1; P.x = lx; P.y += 1.6; } }); } }
        if (P.air) { P.vy += .3; P.y += P.vy; f = floorAt(P.x, P.y - P.vy); if (P.vy > 0 && P.y >= FY[f]) { P.y = FY[f]; P.air = false; if (P.vy > 9) return hit(g); } } }
      for (i = s.chips.length - 1; i >= 0; i--) { q = s.chips[i]; if (Math.abs(q.x - P.x) < 14 && Math.abs(FY[q.f] - P.y) < 30) { s.chips.splice(i, 1); g.score += 200; g.beep(900, .1, 'square', .05, 1400); } }
      if (P.y <= FY[5] + 1 && P.x < 150 && P.lad < 0) { g.score += 1000 + Math.max(0, s.bonus); s.lv++; g.beep(660, .5, 'square', .06, 1320); level(g); return; }
      // growlers
      if (--s.next <= 0) { s.next = Math.max(50, 130 - s.lv * 12) + g.rnd(0, 50); s.pies.push({ x: 96, y: FY[5], f: 5, vy: 0, a: 0, lad: null, big: Math.random() < .2, jumped: false }); g.beep(90, .15, 'sawtooth', .04); }
      for (i = s.pies.length - 1; i >= 0; i--) { q = s.pies[i]; var sp = 1.5 + s.lv * .2 + (q.big ? -.4 : 0);
        if (q.lad) { q.y += 1.6; if (q.y >= FY[q.f - 1]) { q.y = FY[q.f - 1]; q.f--; q.lad = null; } }
        else if (q.vy || FY[q.f] > q.y) { q.vy += .3; q.y += q.vy; if (q.y >= FY[q.f]) { q.y = FY[q.f]; q.vy = 0; } }
        else { var dir = q.f % 2 ? 1 : -1; q.x += dir * sp; q.a += dir * .15; var pan = span(q.f);
          if (q.f > 0 && (q.x > pan[1] + 6 || q.x < pan[0] - 6)) { q.f--; q.vy = .1; }
          else if (q.f > 0 && Math.random() < .3) LAD[q.f - 1].forEach(function (lx) { if (!q.lad && Math.abs(lx - q.x) < sp / 2 + .01) { if (Math.random() < .35 || (P.lad < 0 && floorAt(P.x, P.y) < q.f && Math.random() < .5)) { q.lad = true; q.x = lx; } } });
          if (q.x < -20) { s.pies.splice(i, 1); continue; } }
        var r = q.big ? 15 : 11, dx = Math.abs(q.x - P.x), dy = (q.y - r) - (P.y - 14);
        if (dx < r + 5 && Math.abs(dy) < r + 10) return hit(g);
        if (!q.jumped && P.air && dx < 10 && P.y < q.y - r && P.y > q.y - 70) { q.jumped = true; g.score += 100; s.pop = { x: q.x, y: q.y - 50, t: 40 }; g.beep(1000, .08, 'square', .05); } }
      if (s.pop && --s.pop.t <= 0) s.pop = null;
      function hit(g) { s.dead = 90; g.beep(300, .6, 'sawtooth', .08, 50); }
    },
    draw: function (g) {
      var i, x, P = s.p;
      g.rect(0, 0, 480, 560, '#0B0018'); for (i = 0; i < 30; i++) g.rect((i * 131) % 480, (i * 71) % 300, 2, 2, '#3a3a5a');
      g.rect(408, 60, 56, 470, '#5a2a20'); for (i = 70; i < 520; i += 14) g.rect(408, i, 56, 1, '#3a1a14'); g.rect(402, 52, 68, 10, '#7a3a2a');      // the works chimney
      for (i = 0; i < 6; i++) { var sp = span(i); g.rect(sp[0], FY[i], sp[1] - sp[0], 8, '#8A5A2B'); g.rect(sp[0], FY[i], sp[1] - sp[0], 2, '#c08a4a'); for (x = sp[0] + 20; x < sp[1]; x += 60) { g.rect(x, FY[i] + 8, 3, i ? 76 : 30, '#555a66'); } }
      LAD.forEach(function (pair, f) { pair.forEach(function (lx) { g.rect(lx - 9, FY[f + 1], 2, 84, '#d8b84a'); g.rect(lx + 7, FY[f + 1], 2, 84, '#d8b84a'); for (var y = FY[f + 1] + 8; y < FY[f]; y += 12) g.rect(lx - 9, y, 18, 2, '#d8b84a'); }); });
      // the Baron and the recipe
      var by = FY[5], arm = s.next < 20 ? 6 : 0; g.rect(28, by - 44, 34, 44, '#E8303A'); for (i = 0; i < 4; i++) g.rect(28, by - 40 + i * 11, 34, 5, '#fff'); g.rect(34, by - 62, 22, 18, '#f2c29b'); g.rect(32, by - 78, 26, 16, '#111'); g.rect(26, by - 64, 38, 3, '#111');
      g.rect(38, by - 54, 4, 3, '#000'); g.rect(48, by - 54, 4, 3, '#000'); g.rect(36, by - 48, 18, 3, '#5a3a22'); g.rect(62, by - 36 - arm, 14, 8, '#f2c29b');
      g.rect(110, by - 26, 20, 26, '#fff6dc'); g.rect(113, by - 20, 14, 2, '#888'); g.rect(113, by - 14, 14, 2, '#888'); g.rect(113, by - 8, 10, 2, '#888'); g.text('RECIPE', 120, by - 38, 6, '#39FF14', 'center');
      s.chips.forEach(function (q) { var y = FY[q.f]; g.rect(q.x - 7, y - 14, 14, 14, '#fff'); g.rect(q.x - 7, y - 14, 14, 3, '#E8303A'); for (var k = 0; k < 4; k++) g.rect(q.x - 6 + k * 3.4, y - 20 - (k % 2) * 3, 2, 8, '#ffd24a'); });
      s.pies.forEach(function (q) { var r = q.big ? 15 : 11, cx = q.x, cy = q.y - r; g.ctx.fillStyle = q.big ? '#b8782a' : '#D9A441'; g.ctx.beginPath(); g.ctx.arc(cx, cy, r, 0, 7); g.ctx.fill(); g.ctx.fillStyle = '#8A5A2B'; g.ctx.beginPath(); g.ctx.arc(cx, cy, r * .55, 0, 7); g.ctx.fill();
        g.rect(cx + Math.cos(q.a) * r * .7 - 2, cy + Math.sin(q.a) * r * .7 - 2, 4, 4, '#5a3410'); g.rect(cx - Math.cos(q.a) * r * .7 - 2, cy - Math.sin(q.a) * r * .7 - 2, 4, 4, '#5a3410'); });
      if (!(s.dead && (g.t >> 2) & 1)) { x = P.x; var y = P.y, st = (g.keys.left || g.keys.right || P.lad >= 0) && !P.air ? (g.t >> 2) & 1 : 0;
        g.rect(x - 6, y - 20, 12, 12, '#fff'); g.rect(x - 5, y - 28, 10, 9, '#f2c29b'); g.rect(x - 6, y - 31, 12, 4, '#1a6ad8'); if (P.lad < 0) { g.rect(x + (P.face > 0 ? 2 : -9), y - 28, 7, 2, '#1a6ad8'); g.rect(x + (P.face > 0 ? 1 : -3), y - 25, 2, 2, '#000'); }
        g.rect(x - 6, y - 8, 5, 8 - st * 2, '#2a3a5a'); g.rect(x + 1, y - 8, 5, 6 + st * 2, '#2a3a5a'); }
      if (s.pop) g.text('100', s.pop.x, s.pop.y, 8, '#39FF14', 'center');
      g.hud('BONUS ' + Math.max(0, s.bonus)); for (i = 0; i < s.lives; i++) g.rect(8 + i * 14, 24, 9, 9, '#1a6ad8'); g.text('LEVEL ' + s.lv, 472, 24, 8, '#fff', 'right');
      if (s.banner > 0 && g.mode === 'play') g.text('GET THE RECIPE BACK!', 240, 300, 10, '#FDA138', 'center');
    } });
})();
