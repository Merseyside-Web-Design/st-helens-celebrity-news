/* Chippy Chase – an SHCN original. Hoover up every chip in town before the doormen get hold of you. */
(function () {
  'use strict';
  var MAZE = [
    '###################', '#o.......#.......o#', '#.##.###.#.###.##.#', '#.................#', '#.##.#.#####.#.##.#', '#....#...#...#....#', '####.###.#.###.####',
    '####.#.......#.####', '####.#.##-##.#.####', '#......#HHH#......#', '####.#.#####.#.####', '####.#.......#.####', '####.#.#####.#.####', '#........#........#',
    '#.##.###.#.###.##.#', '#o.#.....S.....#.o#', '##.#.#.#####.#.#.##', '#....#...#...#....#', '#.######.#.######.#', '#.................#', '###################'];
  var C = 24, TOP = 40, GW = 19, GH = 21, DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }, s;
  var NAMES = ['BIG KEV', 'TONY', 'DAZ', 'ARTHUR'], CORNER = [[17, 1], [1, 1], [17, 19], [1, 19]];
  function cell(x, y) { return (MAZE[y] || '')[x] || '#'; }
  function open(x, y, door) { var c = cell(x, y); return c !== '#' && (door || (c !== '-' && c !== 'H')); }
  function layout(g) {
    s.chips = {}; s.left = 0; for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) { var c = MAZE[y][x]; if (c === '.' || c === 'o') { s.chips[x + ',' + y] = c; s.left++; } }
    place(g);
  }
  function place(g) {
    s.p = { x: 9, y: 15, dx: 0, dy: 0, p: 0, want: null, face: [1, 0] }; s.power = 0; s.combo = 0; s.ready = 90;
    s.b = [0, 1, 2, 3].map(function (i) { return { i: i, x: i === 0 ? 9 : 7 + i, y: i === 0 ? 7 : 9, dx: 0, dy: 0, p: 0, home: i === 0 ? 0 : 60 + i * 150, gone: 0 }; });
  }
  function pickDir(g, b) {
    var inHome = cell(b.x, b.y) === 'H' || cell(b.x, b.y) === '-', P = s.p, tx, ty, opts = [], k, d, best = null, bd = 1e9;
    if (inHome) { tx = 9; ty = 7; } else if (b.i === 0) { tx = P.x; ty = P.y; } else if (b.i === 1) { tx = P.x + P.face[0] * 4; ty = P.y + P.face[1] * 4; }
    else if (b.i === 2) { if (Math.abs(P.x - b.x) + Math.abs(P.y - b.y) > 7) { tx = P.x; ty = P.y; } else { tx = CORNER[2][0]; ty = CORNER[2][1]; } } else { tx = P.x; ty = P.y; }
    for (k in DIRS) { d = DIRS[k]; if (d[0] === -b.dx && d[1] === -b.dy && (b.dx || b.dy)) continue; if (open(b.x + d[0], b.y + d[1], inHome)) opts.push(d); }
    if (!opts.length) { b.dx = -b.dx; b.dy = -b.dy; return; }
    if (s.power > 0 && !inHome || (b.i === 3 && Math.random() < .5 && !inHome)) { d = opts[Math.floor(Math.random() * opts.length)]; b.dx = d[0]; b.dy = d[1]; return; }
    opts.forEach(function (d) { var q = Math.pow(b.x + d[0] - tx, 2) + Math.pow(b.y + d[1] - ty, 2); if (q < bd) { bd = q; best = d; } }); b.dx = best[0]; b.dy = best[1];
  }
  SHCNGame({ w: GW * C, h: GH * C + TOP + 8, hiKey: 'shcn-chippy-chase-hi', name: 'CHIPPY CHASE', nameSize: 22, sub: ['Hoover up every chip in the town centre.', 'Four doormen want a word.', 'Neck a pint for Dutch courage and chase THEM.', 'Arrows to steer · P pause'],
    init: function (g) { s = { lives: 3, level: 1 }; layout(g); },
    step: function (g) {
      var P = s.p, k, d, i, b;
      for (k in DIRS) if (g.keys[k]) P.want = DIRS[k];
      if (s.ready > 0) { s.ready--; return; }
      if (s.dead) { if (--s.dead === 0) { if (--s.lives <= 0) return g.over('Thrown out of every pub in town.'); place(g); } return; }
      if (s.power > 0) s.power--;
      // you
      if (!P.dx && !P.dy) { if (P.want && open(P.x + P.want[0], P.y + P.want[1])) { P.dx = P.want[0]; P.dy = P.want[1]; } }
      else if (P.want && P.want[0] === -P.dx && P.want[1] === -P.dy) { P.x += P.dx; P.y += P.dy; P.dx = -P.dx; P.dy = -P.dy; P.p = 1 - P.p; }
      if (P.dx || P.dy) { P.face = [P.dx, P.dy]; P.p += .115; if (P.p >= 1) { P.p = 0; P.x += P.dx; P.y += P.dy; var key = P.x + ',' + P.y, c = s.chips[key];
        if (c) { delete s.chips[key]; s.left--; if (c === 'o') { s.power = Math.max(180, 420 - s.level * 30); s.combo = 0; g.score += 50; g.beep(200, .3, 'sawtooth', .06, 800); } else { g.score += 10; g.beep((s.left & 1) ? 520 : 440, .04, 'square', .03); } }
        if (P.want && open(P.x + P.want[0], P.y + P.want[1])) { P.dx = P.want[0]; P.dy = P.want[1]; } else if (!open(P.x + P.dx, P.y + P.dy)) { P.dx = P.dy = 0; } } }
      if (!s.left) { g.score += 500; s.level++; g.beep(880, .4, 'square', .06, 1760); layout(g); return; }
      // the doormen
      var px = P.x + P.dx * P.p, py = P.y + P.dy * P.p;
      for (i = 0; i < 4; i++) { b = s.b[i];
        if (b.gone > 0) { if (--b.gone === 0) { b.x = 9; b.y = 9; b.dx = b.dy = 0; b.p = 0; } continue; }
        if (b.home > 0) { b.home--; continue; }
        if (!b.dx && !b.dy) pickDir(g, b);
        b.p += s.power > 0 ? .055 : Math.min(.11, .088 + s.level * .004); if (b.p >= 1) { b.p = 0; b.x += b.dx; b.y += b.dy; pickDir(g, b); }
        var bx = b.x + b.dx * b.p, by = b.y + b.dy * b.p;
        if (Math.abs(bx - px) + Math.abs(by - py) < .7) { if (s.power > 0) { s.combo++; g.score += 200 * s.combo; b.gone = 240; s.pop = { x: bx, y: by, t: 50, v: 200 * s.combo }; g.beep(300, .25, 'square', .06, 1200); }
          else { s.dead = 80; g.beep(400, .6, 'sawtooth', .08, 60); return; } } }
      if (s.pop && --s.pop.t <= 0) s.pop = null;
    },
    draw: function (g) {
      var x, y, c, X, Y, i, b, P = s.p, W = GW * C;
      g.rect(0, 0, W, GH * C + TOP + 8, '#0B0018'); g.rect(0, TOP, W, GH * C, '#26262c');
      for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) { c = MAZE[y][x]; X = x * C; Y = TOP + y * C;
        if (c === '#') { g.rect(X, Y, C, C, (x * 7 + y * 13) % 5 < 2 ? '#7a3a2a' : '#6a3224'); g.rect(X, Y, C, 3, '#3a3a44'); if ((x + y) % 3 === 0) g.rect(X + 8, Y + 9, 8, 8, (x * y) % 4 ? '#ffd98a' : '#1a1a22'); }
        else if (c === '-') g.rect(X, Y + 10, C, 4, '#d8b84a'); else if (c === 'H') g.rect(X, Y, C, C, '#1a0c2c');
        c = s.chips[x + ',' + y]; if (c === '.') { g.rect(X + 9, Y + 10, 7, 3, '#ffd24a'); g.rect(X + 10, Y + 9, 2, 5, '#e8b020'); }
        else if (c === 'o' && (g.t >> 3) % 4) { g.rect(X + 7, Y + 6, 10, 14, '#c8862a'); g.rect(X + 7, Y + 4, 10, 4, '#fff'); g.rect(X + 17, Y + 9, 3, 7, '#c8c8c8'); } }
      g.text('NEXUS', 9.5 * C, TOP + 9 * C + 8, 6, '#b06bff', 'center');
      for (i = 0; i < 4; i++) { b = s.b[i]; if (b.gone > 0) continue; X = (b.x + b.dx * b.p) * C; Y = TOP + (b.y + b.dy * b.p) * C; var sc = s.power > 0, fl = sc && s.power < 100 && (g.t >> 3) & 1, wob = sc ? Math.sin(g.t / 4 + i) * 2 : 0;
        g.rect(X + 4 + wob, Y + 9, 16, 13, sc ? (fl ? '#fff' : '#3a6aa8') : '#111'); g.rect(X + 7 + wob, Y + 2, 10, 9, sc ? '#9be08a' : ['#f2c29b', '#d9a070', '#f2c29b', '#c88a5a'][i]); g.rect(X + 8 + wob, Y + 5, 2, 2, '#000'); g.rect(X + 14 + wob, Y + 5, 2, 2, '#000');
        if (!sc) { g.rect(X + 10, Y + 10, 4, 3, '#fff'); g.rect(X + 10, Y + 10, 4, 1, ['#E8303A', '#39e0ff', '#ffe14f', '#b06bff'][i]); } else g.rect(X + 9 + wob, Y + 8, 6, 1, '#000'); }
      if (!(s.dead && (g.t >> 2) & 1)) { X = (P.x + P.dx * P.p) * C; Y = TOP + (P.y + P.dy * P.p) * C; var st = (P.dx || P.dy) ? (g.t >> 2) & 1 : 0;
        g.rect(X + 6, Y + 10, 12, 9, '#fff'); g.rect(X + 7, Y + 3, 10, 8, '#f2c29b'); g.rect(X + 6, Y + 1, 12, 4, '#1a6ad8'); g.rect(X + 6 + (P.face[0] > 0 ? 8 : P.face[0] < 0 ? -3 : 3), Y + 4, 7, 2, '#1a6ad8');
        g.rect(X + 7, Y + 19, 4, 3 + st, '#2a3a5a'); g.rect(X + 13, Y + 19, 4, 4 - st, '#2a3a5a'); }
      if (s.pop) g.text(String(s.pop.v), s.pop.x * C + 12, TOP + s.pop.y * C + 4, 8, '#39FF14', 'center');
      g.hud('LEVEL ' + s.level); for (i = 0; i < s.lives; i++) g.rect(8 + i * 14, 24, 9, 9, '#1a6ad8');
      if (s.power > 0) g.rect(W - 108, 26, 100 * s.power / 420, 6, '#c8862a');
      if (s.ready > 0 && g.mode === 'play') g.text('LEG IT!', W / 2, TOP + 11 * C + 8, 10, '#FDA138', 'center');
    } });
})();
