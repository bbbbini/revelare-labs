// Canvas2D research laboratory. Live roster and selection are supplied by host.js.
(() => {
  const A = window.MV_ASSETS;
  const live = { agents: Object.create(null), connected: false };
  const active = id => live.connected && live.agents[id]?.status === 'working';
  const statusNames = { working: '작업 중', idle: '대기', error: '오류' };
  const liveTag = id => { const a = live.agents[id]; return a ? a.name + ' · ' + (live.connected ? statusNames[a.status] : '연결 끊김') : ''; };
  const W = 1240, H = 900, S = 46, C30 = Math.cos(Math.PI / 6), OX = 522, OY = 180, WALL = 2.6, RX = 16.8, RY = 11.9;
  const P = (x, y, z = 0) => [OX + (x - y) * C30 * S, OY + (x + y) * 0.5 * S - z * S];
  function Pinv(sx, sy, z) { const a = (sx - OX) / (C30 * S), b = (sy - OY + z * S) / (0.5 * S); return [(a + b) / 2, (b - a) / 2]; }
  const SEAT_FLOW = new URLSearchParams(location.search).get('seat-flow') !== 'off';
  const POLISH = new URLSearchParams(location.search).get('polish') !== 'off';
  const CENTER_UPPER = POLISH && new URLSearchParams(location.search).get('center') !== 'off';
  const BLEND_UPPER = POLISH && new URLSearchParams(location.search).get('texture') !== 'off';
  const TURN_UPPER = new URLSearchParams(location.search).get('turn') !== 'off';
  const SPEEDUP = Math.min(8, Math.max(0.1, +new URLSearchParams(location.search).get('speed') || 1)); // draft captures only (floor-21: < 1 for slow-motion frame checks)
  const INK = '#2b2622', SPEED = 1.0, R = 0.22;
  const CH = 118 * S / 76; // same body size per metre as visual-upgrade-14
  const KW = CH / A.walk.height, KS = KW * A.walk.headWidth / A.seated.headWidth;
  const BODY_R = 1.32, KSH = KS, KSB = KS / BODY_R, HEAD_HOLE = 26;

  function poly(g, pts, fill, stroke = INK, lw = 1.1) {
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
  }
  function box(g, x, y, z, w, d, h, c, o = {}) {
    const x1 = x + w, y1 = y + d, z1 = z + h, st = o.stroke === undefined ? INK : o.stroke, a = o.alpha;
    if (a !== undefined) { g.save(); g.globalAlpha = a; }
    poly(g, [P(x, y1, z), P(x1, y1, z), P(x1, y1, z1), P(x, y1, z1)], c.left, st);
    poly(g, [P(x1, y, z), P(x1, y1, z), P(x1, y1, z1), P(x1, y, z1)], c.right, st);
    poly(g, [P(x, y, z1), P(x1, y, z1), P(x1, y1, z1), P(x, y1, z1)], c.top, st);
    if (a !== undefined) g.restore();
  }
  function ell(g, x, y, z, rx, ry, fill, stroke) { const p = P(x, y, z); g.beginPath(); g.ellipse(p[0], p[1], rx, ry, 0, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); } }
  const WOOD = { top: '#d9ab6c', left: '#bb8c52', right: '#a77a45' }, CHAR = { top: '#4a4642', left: '#3a3633', right: '#2f2c2a' };
  const SAGE = { top: '#93a383', left: '#7d8e6e', right: '#6c7c5f' }, CREAM = { top: '#efe6d3', left: '#ddd2bb', right: '#cbbfa6' };
  const GLASS = { top: '#3a3633', left: 'rgba(190,220,222,.30)', right: 'rgba(170,205,208,.34)' };
  const quad = (g, x0, y0, x1, y1, z, fill, st = null) => poly(g, [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], fill, st);

  function affine3(s, d) {
    const [[x0, y0], [x1, y1], [x2, y2]] = s, det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    const solve = (u0, u1, u2) => { const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / det, b = ((x1 - x0) * (u2 - u0) - (x2 - x0) * (u1 - u0)) / det; return [a, b, u0 - a * x0 - b * y0]; };
    const [a, c, e] = solve(d[0][0], d[1][0], d[2][0]), [b, dd, f] = solve(d[0][1], d[1][1], d[2][1]); return [a, b, c, dd, e, f];
  }
  const SK = S / (784 / 12); // pixel sizes tuned at the 18k scale are multiplied by this
  const PW = { right: { b0: [655, 228], b1: [1459, 663], t0: [655, 28], t1: [1460, 460], len: 12 }, left: { b0: [655, 228], b1: [51, 544], t0: [655, 28], t1: [50, 358], len: 8.5 } };
  const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  function wallSeg(g, side, s0, s1, d0) { // painted [s0, s1] m along a back wall -> new [d0, d0 + s1 - s0]
    const w = PW[side], d1 = d0 + s1 - s0, B0 = lerp2(w.b0, w.b1, s0 / w.len), B1 = lerp2(w.b0, w.b1, s1 / w.len), T0 = lerp2(w.t0, w.t1, s0 / w.len), T1 = lerp2(w.t0, w.t1, s1 / w.len);
    const Q = side === 'right' ? [P(d0, 0, 0), P(d1, 0, 0), P(d1, 0, WALL), P(d0, 0, WALL)] : [P(0, d0, 0), P(0, d1, 0), P(0, d1, WALL), P(0, d0, WALL)];
    const grow = (tri) => { const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3; return tri.map(([x, y]) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + dx / l * 0.9, y + dy / l * 0.9]; }); };
    for (const [src, dst] of [[[B0, B1, T0], [Q[0], Q[1], Q[3]]], [[B1, T1, T0], [Q[1], Q[2], Q[3]]]]) {
      g.save(); g.transform(...affine3(src, dst)); g.beginPath(); grow(src).forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.clip(); g.drawImage(IMG.floor, 0, 0); g.restore(); }
  }
  const WIN_R = [[2.1, 3.4], [4.9, 6.2], [8.0, 9.5]], WIN_L = [[4.0, 5.2], [5.9, 7.1], [8.8, 10.0]];
  function drawWalls(g) {
    if (!IMG.floor) { poly(g, [P(0, 0), P(RX, 0), P(RX, 0, WALL), P(0, 0, WALL)], '#f2e7d2', INK, 1.3); poly(g, [P(0, 0), P(0, RY), P(0, RY, WALL), P(0, 0, WALL)], '#ecdfc7', INK, 1.3); return; }
    wallSeg(g, 'left', 0, 8.4, 0); wallSeg(g, 'left', 5.5, 7.2, 8.4); wallSeg(g, 'left', 7.2, 8.4, 10.1); wallSeg(g, 'left', 7.2, 7.8, 11.3);
    wallSeg(g, 'right', 0, 11.9, 0); wallSeg(g, 'right', 9.7, 11.9, 11.9); wallSeg(g, 'right', 9.7, 11.9, 14.1); wallSeg(g, 'right', 9.7, 10.4, 16.1);
    g.strokeStyle = '#3a3633'; g.lineWidth = 3 * SK; g.lineCap = 'round'; g.beginPath(); g.moveTo(...P(0, RY, 0)); g.lineTo(...P(0, RY, WALL)); g.moveTo(...P(RX, 0, 0)); g.lineTo(...P(RX, 0, WALL)); g.stroke();
  }
  const FLOOR_IMG = affine3([[0, 0], [12, 0], [0, 8.5]], [[655, 228], [1459, 663], [51, 544]]); // 18k metres -> floor-v1 px
  const fimg = ([x, y]) => [FLOOR_IMG[0] * x + FLOOR_IMG[2] * y + FLOOR_IMG[4], FLOOR_IMG[1] * x + FLOOR_IMG[3] * y + FLOOR_IMG[5]];
  const FLOOR_PATCH = [5, 4, 8, 6]; // planks only, away from the painted window light and the painted door frame
  const roomPath = (g, x0 = 0, y0 = 0, x1 = RX, y1 = RY) => { g.beginPath(); [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)].forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); };
  const PLANK = ['#d39a58', '#d8a05e', '#cf9553', '#dba364', '#d59c5a', '#d09656'];
  function drawPlanks(g) {
    g.save(); roomPath(g); g.clip(); quad(g, 0, 0, RX, RY, 0, PLANK[0], null);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 0, j = 0; y < RY; y += 0.2, j++) { let x = -rnd() * 1.6;
      while (x < RX) { const L = 1.2 + rnd() * 1.4; quad(g, Math.max(0, x), y, Math.min(RX, x + L), Math.min(RY, y + 0.2), 0.001, PLANK[(j * 3 + Math.floor(rnd() * 6)) % PLANK.length], null);
        if (x > 0) { g.strokeStyle = 'rgba(122,76,38,.32)'; g.lineWidth = 0.8 * SK; g.beginPath(); g.moveTo(...P(x, y, 0.002)); g.lineTo(...P(x, Math.min(RY, y + 0.2), 0.002)); g.stroke(); }
        x += L; } }
    g.strokeStyle = 'rgba(122,76,38,.30)'; g.lineWidth = 0.8 * SK; g.beginPath();
    for (let y = 0.2; y < RY; y += 0.2) { g.moveTo(...P(0, y, 0.002)); g.lineTo(...P(RX, y, 0.002)); } g.stroke();
    const sh = g.createLinearGradient(...P(0, 0), ...P(RX, RY)); sh.addColorStop(0, 'rgba(255,236,200,.10)'); sh.addColorStop(1, 'rgba(90,50,20,.10)'); g.fillStyle = sh; roomPath(g); g.fill();
    g.restore();
  }
  function drawWindowLight(g) {
    g.save(); roomPath(g); g.clip();
    for (const [a, b] of WIN_R) poly(g, [P(a, 0.05), P(b, 0.05), P(b + 1.7, 3.0), P(a + 1.7, 3.0)], 'rgba(255,214,150,.20)', null);
    for (const [a, b] of WIN_L) poly(g, [P(0.05, a), P(0.05, b), P(2.5, b + 1.1), P(2.5, a + 1.1)], 'rgba(255,214,150,.15)', null);
    g.restore();
  }
  function drawServerFloor(g) {
    quad(g, 12.26, 0, RX, 4.54, 0.002, '#cdcac2', null);
    g.save(); g.strokeStyle = 'rgba(96,90,82,.38)'; g.lineWidth = 0.8 * SK; g.beginPath();
    for (let x = 12.26 + 0.6; x < RX; x += 0.6) { g.moveTo(...P(x, 0, 0.003)); g.lineTo(...P(x, 4.54, 0.003)); }
    for (let y = 0.6; y < 4.54; y += 0.6) { g.moveTo(...P(12.26, y, 0.003)); g.lineTo(...P(RX, y, 0.003)); }
    g.stroke(); g.restore();
  }
  const RUGS = { research: [3.45, 1.65, 9.55, 4.95], lounge: [0.2, 7.45, 3.85, 11.15], entry: [10.45, 10.95, 12.15, 11.85] }; // floor-20: rugs sit under furnished groups only
  const RUG_EXTRA = [['research', [4.2, 7.3, 8.1, 10.85]]]; // floor-20: one rug under Noah's desk and the shared review table
  function drawRugs(g) {
    if (!IMG.rugs) return;
    for (const [k, [x0, y0, x1, y1]] of [...Object.entries(RUGS), ...RUG_EXTRA]) { const [a, b, c, d] = A.rugs.rects[k];
      const m = affine3([[a, b], [c, b], [a, d]], [P(x0, y0), P(x1, y0), P(x0, y1)]); g.save(); g.transform(...m);
      g.beginPath(); g.rect(a, b, c - a, d - b); g.clip(); g.drawImage(IMG.rugs, 0, 0); g.restore(); }
  }
  const ROUND = new Set(['chair', 'chairF', 'stool', 'plant', 'rtable', 'pouf', 'lamp']);
  const MOVING_SHADOW = new Set(['c1', 'cmF']);
  function drawContactShadows(g, moving = false) {
    if (moving) { g.save(); for (const id of MOVING_SHADOW) { const f = F.find(x => x.id === id); if (!f) continue; const b = f.fp, h = f.ext ? f.ext[5] : 1.2, dy = 0.06 + 0.08 * h;
        const c = P((b[0] + b[2]) / 2, (b[1] + b[3]) / 2 + dy * 0.6), rx = (b[2] - b[0]) * 0.55 * C30 * S * 1.15 + 2.5 * SK, ry = rx * 0.55, gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0, 'rgba(58,36,18,.34)'); gr.addColorStop(0.72, 'rgba(58,36,18,.30)'); gr.addColorStop(1, 'rgba(58,36,18,0)');
        g.save(); g.translate(c[0], c[1]); g.scale(rx, ry); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore(); } g.restore(); return; }
    g.save(); g.filter = `blur(${(2.5 * cam.z * SK).toFixed(1)}px)`; g.fillStyle = 'rgba(58,36,18,.34)'; g.beginPath();
    for (const f of F) {
      if (MOVING_SHADOW.has(f.id) !== moving) continue;
      if (f.onDesk || f.person || f.front || f.noShadow || f.sprite === 'board' || f.id === 'board') continue; // floor-18h: the code-drawn wall board casts no floor shadow either
      const b = f.fp, h = f.ext ? f.ext[5] : 1.2, dy = 0.06 + 0.08 * h, e = 0.04;
      if (ROUND.has(f.sprite)) { const c = P((b[0] + b[2]) / 2, (b[1] + b[3]) / 2 + dy * 0.6), rx = (b[2] - b[0]) * 0.55 * C30 * S * 1.15, ry = rx * 0.55; g.moveTo(c[0] + rx, c[1]); g.ellipse(c[0], c[1], rx, ry, 0, 0, Math.PI * 2); continue; }
      const q = [P(b[0] - e, b[1] - e), P(b[2] + e, b[1] - e), P(b[2] + e, b[3] + e + dy), P(b[0] - e, b[3] + e + dy)]; g.moveTo(...q[0]); for (const v of q.slice(1)) g.lineTo(...v); g.closePath();
    }
    g.fill('nonzero'); g.restore();
  }
  const DOOR = { on: true, x0: 10.5, x1: 12.1, wl: 0.16, wr: 0.16, y0: RY - 0.12, y1: RY, h: 2.1, t: 0.15 };
  function drawDoorFrame(g) { const D = DOOR, dd = D.y1 - D.y0;
    box(g, D.x0, D.y0, 0, D.wl, dd, D.h, CHAR); box(g, D.x1 - D.wr, D.y0, 0, D.wr, dd, D.h, CHAR); box(g, D.x0, D.y0, D.h - D.t, D.x1 - D.x0, dd, D.t, CHAR); }
  const BUSH = ['#7f9a5a', '#93ad63', '#6f8a4c'], TRUNK = { top: '#8a6a4a', left: '#7a5c3f', right: '#6a4f36' };
  function bush(g, x, y, r = 1) {
    for (const [dx, dy, dz, k] of [[-0.3, 0.05, 0, 2], [0.28, -0.05, 0, 0], [0, 0.12, 0.05, 1], [0.05, -0.18, 0.12, 0]]) {
      const q = P(x + dx * r, y + dy * r, (0.28 + dz) * r); g.beginPath(); g.ellipse(q[0], q[1], 0.34 * r * S, 0.25 * r * S, 0, 0, Math.PI * 2);
      g.fillStyle = BUSH[k]; g.fill(); g.strokeStyle = 'rgba(48,60,36,.55)'; g.lineWidth = 0.9 * SK; g.stroke(); }
  }
  function tree(g, x, y, h = 4) {
    box(g, x - 0.1, y - 0.1, 0, 0.2, 0.2, h * 0.3, TRUNK);
    for (const [dx, dy, dz, rr, k] of [[-0.55, 0.25, 0.48, 0.5, 2], [0.5, -0.2, 0.5, 0.48, 0], [0.05, 0.4, 0.55, 0.5, 1], [-0.25, -0.35, 0.66, 0.46, 0], [0.3, 0.15, 0.72, 0.44, 1], [-0.05, -0.05, 0.84, 0.36, 2]]) {
      const q = P(x + dx, y + dy, h * (dz - 0.06)); g.beginPath(); g.ellipse(q[0], q[1], rr * h * 0.36 * S, rr * h * 0.3 * S, 0, 0, Math.PI * 2);
      g.fillStyle = BUSH[k]; g.fill(); g.strokeStyle = 'rgba(48,60,36,.45)'; g.lineWidth = 1 * SK; g.stroke(); }
  }
  function drawExterior(g) {
    const sky = g.createLinearGradient(0, -120, 0, OY + 80); sky.addColorStop(0, '#d9e2dd'); sky.addColorStop(1, '#efe5d2');
    g.fillStyle = sky; g.fillRect(-W, -H, W * 3, H * 3);
    quad(g, -3.8, -3.8, RX + 8, RY + 8, 0, '#b2b98c', null); // lawn: a 1.2 m strip shows above the back walls, sky beyond
    quad(g, -1.0, -1.0, RX + 1.4, RY + 1.4, 0.001, '#dccfb6', null);                  // paved apron
    quad(g, DOOR.x0, RY, DOOR.x1, RY + 8, 0.002, '#cdbd9e', null);                    // path from the door
    g.save(); g.strokeStyle = 'rgba(120,100,70,.28)'; g.lineWidth = 0.8 * SK; g.beginPath();
    for (let y = RY + 0.5; y < RY + 8; y += 0.5) { g.moveTo(...P(DOOR.x0, y, 0.003)); g.lineTo(...P(DOOR.x1, y, 0.003)); }
    for (let t = 0.6; t < RX + 1.4; t += 0.6) { g.moveTo(...P(t, RY, 0.003)); g.lineTo(...P(t, RY + 1.4, 0.003)); }
    for (let t = 0.6; t < RY + 1.4; t += 0.6) { g.moveTo(...P(RX, t, 0.003)); g.lineTo(...P(RX + 1.4, t, 0.003)); }
    g.stroke(); g.restore();
    g.strokeStyle = 'rgba(110,96,74,.55)'; g.lineWidth = 1.2 * SK; g.beginPath(); g.moveTo(...P(-1.0, RY + 1.4)); g.lineTo(...P(DOOR.x0, RY + 1.4)); g.moveTo(...P(DOOR.x1, RY + 1.4)); g.lineTo(...P(RX + 1.4, RY + 1.4)); g.lineTo(...P(RX + 1.4, -1.0)); g.stroke();
  }
  const OUT_PLANTS = [[DOOR.x0 - 0.55, RY + 0.75, 1.25], [DOOR.x1 + 0.55, RY + 0.75, 1.25]];
  const FACADE_H = 0.45, FACADE_T = 0.12;
  function drawFacade(g) { const y0 = RY - FACADE_T, x0 = RX - FACADE_T;
    box(g, x0, 0, 0, FACADE_T, y0, FACADE_H, WALLC); // right edge (x = RX), up to the front corner
    box(g, 0, y0, 0, DOOR.x0, FACADE_T, FACADE_H, WALLC); box(g, DOOR.x1, y0, 0, RX - DOOR.x1, FACADE_T, FACADE_H, WALLC);
    if (DOOR.on) drawDoorFrame(g); }
  function drawExteriorFront(g) {
    if (!IMG.furniture || !A.scene.plant) return;
    for (const [x, y, k] of OUT_PLANTS) drawSprite(g, { sprite: 'plant', ext: [x - 0.3 * k, y - 0.3 * k, 0, x + 0.3 * k, y + 0.3 * k, 0.95 * k] });
  }
  function drawSlabEdge(g) {
    poly(g, [P(0, RY, 0), P(RX, RY, 0), P(RX, RY, -0.16), P(0, RY, -0.16)], '#7a5a3c', INK, 1 * SK);
    poly(g, [P(RX, 0, 0), P(RX, RY, 0), P(RX, RY, -0.16), P(RX, 0, -0.16)], '#6a4e34', INK, 1 * SK);
  }
  function drawFloor(g) {
    drawExterior(g); drawSlabEdge(g);
    if (IMG.floor) drawPlanks(g); else quad(g, 0, 0, RX, RY, 0, '#c99a60', INK);
    drawServerFloor(g); drawWindowLight(g); drawRugs(g); drawContactShadows(g); drawWalls(g); // floor-22: door frame with the facade (front layer)
  }

  const F = [];
  const add = (id, label, fp, draw, o = {}) => F.push({ id, label, fp, draw, ext: o.ext, sprite: o.sprite, collide: o.collide !== false, noShadow: !!o.noShadow, after: o.after || null, under: !!o.under, chair: !!o.chair, onDesk: o.onDesk || null, zone: o.zone, seatAt: o.seatAt, front: !!o.front, person: o.person || null });
  const DESK_H = 0.71;
  function deskSet(id, x0, y0, w, d, zone, opt = {}) {
    add(id, '책상', [x0, y0, x0 + w, y0 + d], g => { for (const [x, y] of [[x0 + 0.05, y0 + 0.05], [x0 + w - 0.11, y0 + 0.05], [x0 + 0.05, y0 + d - 0.11], [x0 + w - 0.11, y0 + d - 0.11]]) box(g, x, y, 0, 0.06, 0.06, DESK_H - 0.05, CHAR); box(g, x0, y0, DESK_H - 0.05, w, d, 0.05, WOOD); },
      { ext: [x0, y0, 0, x0 + w, y0 + d, DESK_H], sprite: 'desk', zone });
    const mx = x0 + w / 2 + (opt.monDx || 0);
    add(id + '-mon', '모니터', [mx - 0.4, y0 + 0.06, mx + 0.4, y0 + 0.14], g => box(g, mx - 0.4, y0 + 0.06, DESK_H + 0.18, 0.8, 0.06, 0.46, CHAR), { collide: false, ext: [mx - 0.4, y0 + 0.02, DESK_H, mx + 0.4, y0 + 0.2, DESK_H + 0.66], sprite: 'monitor', onDesk: id, zone });
    if (opt.second) { const m2 = mx + 0.82; add(id + '-mon2', '모니터', [m2 - 0.36, y0 + 0.06, m2 + 0.36, y0 + 0.14], g => box(g, m2 - 0.36, y0 + 0.06, DESK_H + 0.18, 0.72, 0.06, 0.42, CHAR), { collide: false, ext: [m2 - 0.36, y0 + 0.02, DESK_H, m2 + 0.36, y0 + 0.2, DESK_H + 0.6], sprite: 'monitor', onDesk: id, zone }); }
    if (!opt.noKeys) add(id + '-kb', '키보드', [mx - 0.31, y0 + d - 0.32, mx + 0.31, y0 + d - 0.12], g => box(g, mx - 0.31, y0 + d - 0.32, DESK_H, 0.62, 0.2, 0.025, CHAR), { collide: false, onDesk: id, zone });
  }
  function chairAt(id, x, y, zone) {
    add(id, '의자', [x - 0.3, y - 0.3, x + 0.3, y + 0.3], g => { box(g, x - 0.28, y - 0.26, 0.37, 0.56, 0.52, 0.06, SAGE); box(g, x - 0.28, y + 0.24, 0.55, 0.56, 0.07, 0.42, SAGE); }, { under: true, chair: true, sprite: 'chair', seatAt: [x, y], zone, ext: [x - 0.32, y - 0.32, 0, x + 0.32, y + 0.32, 1.0] });
    add(id + '-back', '의자 등받이', [x - 0.28, y + 0.24, x + 0.28, y + 0.31], () => {}, { chair: true, sprite: 'chair', seatAt: [x, y], front: true, zone, ext: [x - 0.32, y - 0.32, 0, x + 0.32, y + 0.32, 1.0] });
  }
  function plantAt(id, x, y, k = 1) { add(id, '화분', [x - 0.3 * k, y - 0.3 * k, x + 0.3 * k, y + 0.3 * k], g => { box(g, x - 0.17 * k, y - 0.17 * k, 0, 0.34 * k, 0.34 * k, 0.32 * k, CREAM); ell(g, x, y, 0.62 * k, 13 * k * SK, 12 * k * SK, '#7f9a63', '#3c4a33'); }, { ext: [x - 0.3 * k, y - 0.3 * k, 0, x + 0.3 * k, y + 0.3 * k, 0.95 * k], sprite: 'plant' }); }
  const SPINES = ['#5f7a5c', '#3f5466', '#e8dcc4', '#6d8a68', '#4b6070', '#d9ccb0', '#56704f'], SBOX = { top: '#4a4642', left: '#3a3633', right: '#2f2c2a' }, SBOXL = { top: '#e9e2d4', left: '#d8cfbd', right: '#c4baa6' };
  const SHELF_BACK = { top: '#c99a60', left: '#c39561', right: '#a77a45' };
  function drawLowShelf(g, [x0, y0, x1, y1], h) {
    const d = y1 - y0, t = 0.035, post = 0.045, xm = (x0 + x1) / 2, zs = [0, 0.36], bh = 0.3;
    box(g, x0, y0, 0, x1 - x0, 0.025, h, SHELF_BACK);
    box(g, x0, y0, 0, post, d, h, CHAR);
    board(g, x0 + post, y0, 0.0, x1 - x0 - 2 * post, d, t);
    const bay = (a, b, seed) => { for (const [ri, z] of zs.entries()) { const zb = z + t; let x = a + 0.02, k = seed + ri * 3;
        if (ri === 1) board(g, a, y0, z, b - a, d, t);
        while (x < b - 0.05) { const kind = (k * 7 + ri) % 9;
          if (kind === 4 && b - x > 0.2) { box(g, x, y0 + 0.05, zb, 0.18, d - 0.09, 0.15, (k % 2) ? SBOX : SBOXL); x += 0.2; }
          else { const w = 0.035 + (k % 3) * 0.008, hh = bh - 0.04 - ((k * 5) % 4) * 0.02, c = SPINES[k % SPINES.length];
            box(g, x, y0 + 0.06, zb, w, d - 0.1, hh, { top: c, left: c, right: c }, { stroke: 'rgba(43,38,34,.6)' }); x += w + 0.004; }
          k++; } } };
    bay(x0 + post, xm - post / 2, 1);
    box(g, xm - post / 2, y0, 0, post, d, h, CHAR);
    bay(xm + post / 2, x1 - post, 5);
    board(g, x0, y0, h - t, x1 - x0, d, t);
    box(g, x1 - post, y0, 0, post, d, h, CHAR);
  }
  function leafAt(g, x, y, r, a, fill) { const c = Math.cos(a), s1 = Math.sin(a), T = (u, v) => [x + u * c - v * s1, y + u * s1 + v * c];
    g.beginPath(); g.moveTo(...T(0, 0)); g.bezierCurveTo(...T(-0.1 * r, -0.75 * r), ...T(0.75 * r, -0.65 * r), ...T(1.25 * r, 0));
    g.bezierCurveTo(...T(0.75 * r, 0.65 * r), ...T(-0.1 * r, 0.75 * r), ...T(0, 0)); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = '#3c4a33'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = 'rgba(60,74,51,.55)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(...T(0.1 * r, 0)); g.lineTo(...T(1.0 * r, 0)); g.stroke(); }
  const leaf = (g, x, y, z, r, a, fill) => { const q = P(x, y, z); leafAt(g, q[0], q[1], r, a, fill); };
  const LEAF = ['#8fae3c', '#b4c552', '#6f9433']; // yellow-green like the painted pothos plants nearby
  const WOODW = { top: '#d6a062', left: '#b87d45', right: '#9e6a39' };
  const FIN = { shadeBack: 0.34, shadeFront: 0.18, lineDark: 0.55, lineLight: 0.40 }; // L2 (18e was .18/.10/.35/.25)
  function board(g, x, y, z, w, d, t, opt = {}) {
    box(g, x, y, z, w, d, t, WOODW);
    const zt = z + t, top = new Path2D(); [P(x, y, zt), P(x + w, y, zt), P(x + w, y + d, zt), P(x, y + d, zt)].forEach((q, i) => (i ? top.lineTo(...q) : top.moveTo(...q))); top.closePath();
    g.save(); g.clip(top);
    if (opt.lines !== false) for (let k = 1; k < 6; k++) { const yy = y + d * k / 6; g.strokeStyle = k % 2 ? `rgba(140,90,45,${FIN.lineDark})` : `rgba(255,230,190,${FIN.lineLight})`; g.lineWidth = 0.9; g.beginPath();
      for (let u = 0; u <= 12; u++) { const q = P(x + w * u / 12, yy + Math.sin(u * 1.7 + k) * 0.006, zt); u ? g.lineTo(...q) : g.moveTo(...q); } g.stroke(); }
    if (opt.shade !== false) { const gr = g.createLinearGradient(...P(x, y, zt), ...P(x, y + d, zt)); gr.addColorStop(0, `rgba(70,40,15,${FIN.shadeBack})`); gr.addColorStop(1, `rgba(255,240,210,${FIN.shadeFront})`); g.fillStyle = gr; g.fill(top); }
    g.restore();
  }
  function boardProbe(id = 'shelf-r') {
    const [x0, y0, x1, y1] = F.find(f => f.id === id).fp, run = opt => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); board(g, x0, y0, 0.4, x1 - x0, y1 - y0, 0.03, opt); return g.getImageData(0, 0, W, H).data; };
    const full = run({}), noShade = run({ shade: false }), bare = run({ lines: false, shade: false });
    const tc = document.createElement('canvas'); tc.width = W; tc.height = H; const tg = tc.getContext('2d'), zt = 0.43;
    tg.beginPath(); [P(x0, y0, zt), P(x1, y0, zt), P(x1, y1, zt), P(x0, y1, zt)].forEach((q, i) => (i ? tg.lineTo(...q) : tg.moveTo(...q))); tg.closePath(); tg.fillStyle = '#000'; tg.fill(); const tm = tg.getImageData(0, 0, W, H).data;
    const dv = (a, b, i) => Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    let top = 0, shaded = 0, shadedOutsideLines = 0, grain = 0, shadeSum = 0, grainSum = 0;
    for (let i = 0; i < tm.length; i += 4) { if (tm[i + 3] < 250) continue; top++; const ds = dv(full, noShade, i), dg = dv(noShade, bare, i), sh = ds > 2, gl = dg > 2;
      shadeSum += ds; if (sh) shaded++; if (gl) { grain++; grainSum += dg; } if (sh && !gl) shadedOutsideLines++; }
    return { id, top, shaded, shadedOutsideLines, grain, shadeMean: +(shadeSum / top).toFixed(2), grainMean: grain ? +(grainSum / grain).toFixed(2) : 0, fin: { ...FIN } };
  }


  function pieceFinishProbe(id) {
    const f = F.find(x => x.id === id), [x0, y0, x1, y1] = f.fp, h = f.ext[5], keep = { ...FIN };
    const run = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); f.draw(g, 0); return g.getImageData(0, 0, W, H).data; };
    const on = run(); for (const k of Object.keys(FIN)) FIN[k] = 0; const off = run(); Object.assign(FIN, keep);
    const tc = document.createElement('canvas'); tc.width = W; tc.height = H; const tg = tc.getContext('2d');
    tg.beginPath(); [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)].forEach((q, i) => (i ? tg.lineTo(...q) : tg.moveTo(...q))); tg.closePath(); tg.fill(); const tm = tg.getImageData(0, 0, W, H).data;
    const tc0 = parseInt(WOODW.top.slice(1), 16), tr = [tc0 >> 16, (tc0 >> 8) & 255, tc0 & 255];
    let top = 0, visible = 0, changed = 0; for (let i = 0; i < tm.length; i += 4) { if (tm[i + 3] < 250) continue; top++;
      if (Math.max(Math.abs(off[i] - tr[0]), Math.abs(off[i + 1] - tr[1]), Math.abs(off[i + 2] - tr[2])) > 3) continue; visible++;
      if (Math.max(Math.abs(on[i] - off[i]), Math.abs(on[i + 1] - off[i + 1]), Math.abs(on[i + 2] - off[i + 2])) > 2) changed++; }
    return { id, top, visible, changed, ratio: visible ? +(changed / visible).toFixed(3) : 0 };
  }
  function drawOpenShelf(g, [x0, y0, x1, y1], h) {
    const d = y1 - y0, sx = (x1 - x0) / 1.5, sd = d / 0.4, sz = h / 1.15, X = v => x0 + v * sx, Z = v => v * sz, p = 0.04, t = 0.03;
    const zs = [0.06, 0.4, 0.74].map(Z).concat([h - t]), zb = i => zs[i] + t, Y = v => y0 + v * sd;
    const sp = (k, xa, z, n, hh) => { let x = xa;
      for (let i = 0; i < n; i++) { const w = (0.04 + ((k + i) % 3) * 0.007) * sx, c = SPINES[(k + i) % SPINES.length], ht = Z(hh - ((k + i * 5) % 4) * 0.025);
        box(g, x, Y(0.07), z, w, d - 0.12 * sd, ht, { top: c, left: c, right: c }, { stroke: 'rgba(43,38,34,.6)' }); x += w + 0.004 * sx; } };
    box(g, x0, y0, 0, p, p, h, CHAR); box(g, x1 - p, y0, 0, p, p, h, CHAR);
    board(g, x0 + p / 2, y0, zs[0], x1 - x0 - p, d, t);
    box(g, X(0.08), Y(0.06), zb(0), 0.42 * sx, d - 0.1 * sd, Z(0.24), SBOXL); box(g, X(0.62), Y(0.06), zb(0), 0.55 * sx, d - 0.1 * sd, Z(0.22), SBOX);
    board(g, x0 + p / 2, y0, zs[1], x1 - x0 - p, d, t);
    for (let i = 0; i < 3; i++) box(g, X(0.1 + i * 0.01), Y(0.07), zb(1) + Z(i * 0.045), 0.4 * sx, d - 0.13 * sd, Z(0.04), { top: SPINES[i + 2], left: SPINES[(i * 2) % 7], right: '#cbbfa6' }, { stroke: 'rgba(43,38,34,.6)' });
    box(g, X(0.72), Y(0.06), zb(1), 0.5 * sx, d - 0.1 * sd, Z(0.2), SBOX);
    board(g, x0 + p / 2, y0, zs[2], x1 - x0 - p, d, t);
    sp(2, X(0.08), zb(2), 9, 0.3); box(g, X(0.86), Y(0.06), zb(2), 0.4 * sx, d - 0.1 * sd, Z(0.2), SBOX);
    board(g, x0 + p / 2, y0, zs[3], x1 - x0 - p, d, t);
    box(g, x0, y1 - p, 0, p, p, h, CHAR); box(g, x1 - p, y1 - p, 0, p, p, h, CHAR);
    const ls = Math.min(sx, sz), px = x1 - 0.32 * sx, py = (y0 + y1) / 2; box(g, px - 0.08 * ls, py - 0.08 * ls, h, 0.16 * ls, 0.16 * ls, 0.08 * ls, SBOX);
    for (const [dx, dy, dz, r, a, c] of [[-0.16, 0.02, 0.1, 11, -2.2, 0], [0.16, 0.0, 0.1, 11, 0.9, 2], [-0.06, -0.05, 0.22, 12, -1.6, 1], [0.08, -0.04, 0.24, 12, -0.9, 0],
      [-0.12, 0.08, 0.13, 11, 2.6, 1], [0.12, 0.08, 0.14, 11, 0.4, 1], [-0.02, 0.0, 0.08, 11, 2.0, 2], [0.04, 0.02, 0.1, 11, 1.1, 0],
      [0.0, 0.06, 0.28, 12, -1.3, 2], [-0.04, 0.1, 0.06, 11, 1.8, 1], [0.06, 0.09, 0.05, 10, 0.9, 2]])
      leaf(g, px + dx * ls, py + dy * ls, h + dz * ls, r * ls * SK, a, LEAF[c]);
    { const v = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => P(x1 + 0.02, y1 - 0.06 * sd + Math.sin(i * 1.3) * 0.04 * sd, h + Z(0.06 - i * 0.12)));
      g.strokeStyle = '#4c5e38'; g.lineWidth = 1.2; g.beginPath(); v.forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q))); g.stroke();
      v.forEach((q, i) => leafAt(g, q[0], q[1], (8 - i * 0.35) * ls * SK, i % 2 ? 0.5 : 2.5, LEAF[i % 3])); }
  }
  const GLASS_FRAME = { on: true, post: 0.04, rail: 0.05, span: 1.0 };
  function glassFrame(g, x0, y0, x1, y1, h) { const alongX = x1 - x0 >= y1 - y0, L = alongX ? x1 - x0 : y1 - y0, n = Math.max(1, Math.ceil(L / GLASS_FRAME.span)), p = GLASS_FRAME.post;
    for (let i = 0; i <= n; i++) { const u = Math.min(L - p, Math.max(0, i * L / n - p / 2));
      if (alongX) box(g, x0 + u, y0, 0.08, p, y1 - y0, h - 0.08, CHAR); else box(g, x0, y0 + u, 0.08, x1 - x0, p, h - 0.08, CHAR); }
    box(g, x0, y0, h - GLASS_FRAME.rail, x1 - x0, y1 - y0, GLASS_FRAME.rail, CHAR); }
  const glassWall = (id, x0, y0, x1, y1, h, zone, o = {}) => add(id, '유리벽', [x0, y0, x1, y1], g => { box(g, x0, y0, 0, x1 - x0, y1 - y0, h, GLASS, { stroke: '#2f2c2a' }); box(g, x0, y0, 0, x1 - x0, y1 - y0, 0.08, CHAR); if (o.frame && GLASS_FRAME.on) glassFrame(g, x0, y0, x1, y1, h); }, { zone });

  const MONBACK = { top: '#3a3633', left: '#34312e', right: '#2b2826' };
  const spr = (id, label, fp, ext, sprite, draw, o = {}) => add(id, label, fp, draw || (() => {}), { ext, sprite, ...o });
  add('dA0', '책상', [3.8, 2.4, 5.6, 3.2], g => box(g, 3.8, 2.4, DESK_H - 0.05, 1.8, 0.8, 0.05, WOOD), { ext: [3.8, 2.4, 0, 5.6, 3.2, DESK_H], sprite: 'desk', zone: 'research' });
  add('dA1', '책상', [5.6, 2.4, 7.4, 3.2], g => box(g, 5.6, 2.4, DESK_H - 0.05, 1.8, 0.8, 0.05, WOOD), { ext: [5.6, 2.4, 0, 7.4, 3.2, DESK_H], sprite: 'desk', zone: 'research' });
  add('dA2', '책상', [7.4, 2.4, 9.2, 3.2], g => box(g, 7.4, 2.4, DESK_H - 0.05, 1.8, 0.8, 0.05, WOOD), { ext: [7.4, 2.4, 0, 9.2, 3.2, DESK_H], sprite: 'desk', zone: 'research' });
  for (const [id, mx, dk] of [['dA0-mb', 4.7, 'dA0'], ['dA1-mb', 6.5, 'dA1'], ['dA2-mb', 8.3, 'dA2']]) spr(id, '모니터(뒷면)', [mx - 0.75, 2.96, mx + 0.75, 3.1], [mx - 0.75, 2.9, DESK_H, mx + 0.75, 3.12, DESK_H + 0.6], 'monback', g => box(g, mx - 0.75, 3.0, DESK_H + 0.18, 1.5, 0.06, 0.42, MONBACK), { collide: false, onDesk: dk, zone: 'research' });
  add('dA0-kb', '키보드', [4.39, 2.5, 5.01, 2.7], g => box(g, 4.39, 2.5, DESK_H, 0.62, 0.2, 0.025, CHAR), { collide: false, onDesk: 'dA0', zone: 'research' });
  add('dA1-kb', '키보드', [6.19, 2.5, 6.81, 2.7], g => box(g, 6.19, 2.5, DESK_H, 0.62, 0.2, 0.025, CHAR), { collide: false, onDesk: 'dA1', zone: 'research' });
  add('dA2-kb', '키보드', [7.99, 2.5, 8.61, 2.7], g => box(g, 7.99, 2.5, DESK_H, 0.62, 0.2, 0.025, CHAR), { collide: false, onDesk: 'dA2', zone: 'research' });
  deskSet('dB0', 3.8, 3.28, 1.8, 0.8, 'research', { second: true, monDx: -0.4 }); deskSet('dB1', 5.6, 3.28, 1.8, 0.8, 'research', { second: true, monDx: -0.4 }); deskSet('dB2', 7.4, 3.28, 1.8, 0.8, 'research', { second: true, monDx: -0.4 });
  const chairFront = (id, x, y, zone) => spr(id, '의자', [x - 0.28, y - 0.28, x + 0.28, y + 0.28], [x - 0.32, y - 0.32, 0, x + 0.32, y + 0.32, 1.0], 'chairF',
    g => { box(g, x - 0.26, y - 0.24, 0.36, 0.52, 0.5, 0.06, SAGE); box(g, x - 0.26, y - 0.3, 0.42, 0.52, 0.07, 0.46, SAGE); }, { chair: true, zone });
  chairFront('c5', 4.7, 2.0, 'research'); chairFront('c3', 6.5, 2.0, 'research'); chairFront('c4', 8.3, 2.0, 'research');
  chairAt('c0', 4.7, 4.48, 'research'); chairAt('c1', 6.5, 4.48, 'research'); chairAt('c2', 8.3, 4.48, 'research');
  const SR = [5.75, 0.05, 6.95, 0.45], SR_H = 1.15;
  add('shelf-r', '책장', SR, g => drawOpenShelf(g, SR, SR_H), { ext: [SR[0], SR[1], 0, SR[2], SR[3], SR_H], sprite: 'vshelfR', zone: 'research' });
  const cabinet2 = (id, x0, zone = 'research', label = '수납장') => add(id, label, [x0, 0.1, x0 + 0.8, 0.6], g => { box(g, x0, 0.1, 0, 0.8, 0.465, 1.6, CHAR);
    for (const x of [x0 + 0.04, x0 + 0.405]) box(g, x, 0.565, 0.06, 0.355, 0.02, 1.48, WOOD);
    for (const x of [x0 + 0.365, x0 + 0.42]) box(g, x, 0.585, 0.72, 0.015, 0.015, 0.2, CHAR); }, { ext: [x0, 0.1, 0, x0 + 0.8, 0.6, 1.6], zone });
  cabinet2('cabinet', 9.75);
  plantAt('pl-r1', 8.95, 0.5, 1); plantAt('pl-r3', 4.05, 0.5, 0.8);
  add('parts', '부품 서랍장', [2.65, 0.1, 3.45, 0.55], g => { box(g, 2.65, 0.1, 0, 0.8, 0.45, 1.05, CHAR);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { const x = 2.69 + c * 0.18, z = 0.08 + r * 0.155; box(g, x, 0.55, z, 0.16, 0.01, 0.13, { top: '#5c5753', left: '#4f4a46', right: '#45413d' }); box(g, x + 0.06, 0.56, z + 0.05, 0.04, 0.008, 0.02, { top: '#c9b48c', left: '#c9b48c', right: '#b39d74' }); }
    board(g, 2.63, 0.08, 1.05, 0.84, 0.49, 0.03); }, { ext: [2.65, 0.1, 0, 3.45, 0.55, 1.08], zone: 'bench' });
  spr('bench', '실험 벤치', [0.3, 0.1, 2.5, 0.9], [0.3, 0.1, 0, 2.5, 0.9, 1.15], 'bench', g => { box(g, 0.3, 0.1, 0, 2.2, 0.8, 0.9, CHAR); box(g, 0.28, 0.08, 0.9, 2.24, 0.84, 0.05, WOOD); }, { zone: 'bench' });
  spr('stool', '빈 스툴', [1.85, 1.4, 2.25, 1.8], [1.85, 1.4, 0, 2.25, 1.8, 0.65], 'stool', g => { box(g, 2.02, 1.57, 0, 0.06, 0.06, 0.6, CHAR); ell(g, 2.05, 1.6, 0.62, 11 * SK, 6 * SK, '#7d8e6e', INK); }, { zone: 'bench' });

  const SRV = { door: [12.8, 13.8], knee: 0.9, y0: 4.54, y1: 4.66 };
  const WALLC = { top: '#4a4642', left: '#dccab0', right: '#e8d6ba' }, BASE = { top: '#7a5c3f', left: '#8a6a4a', right: '#9c7b55' };
  let doorOpen = 0, doorP = 0; // floor-21: doorP travels 0..1 in DOOR_TRAVEL s toward the target, doorOpen = smoothstep(doorP)
  const DOOR_TRAVEL = 0.8;
  add('sw-side', '서버실 벽', [12.14, 0, 12.26, SRV.y1], g => { box(g, 12.14, 0, 0, 0.12, SRV.y1, WALL, WALLC); box(g, 12.26, 0, 0, 0.015, SRV.y0, 0.09, BASE); box(g, 12.14, 0, WALL, 0.12, SRV.y1, 0.02, CHAR); }, { ext: [12.14, 0, 0, 12.26, SRV.y1, WALL], zone: 'server', noShadow: true });
  const kneeWall = (id, x0, x1, endPost) => add(id, '서버실 앞벽(잘라 낮춤)', [x0, SRV.y0, x1, SRV.y1], g => {
    box(g, x0, SRV.y0, 0, x1 - x0, SRV.y1 - SRV.y0, SRV.knee, WALLC); box(g, x0, SRV.y1, 0, x1 - x0, 0.015, 0.09, BASE); box(g, x0, SRV.y0, SRV.knee, x1 - x0, SRV.y1 - SRV.y0, 0.03, CHAR);
    if (endPost) box(g, x1 - 0.1, SRV.y0, 0, 0.1, SRV.y1 - SRV.y0, WALL, CHAR);
    box(g, x0, SRV.y0 + 0.04, WALL - 0.05, x1 - x0, 0.04, 0.05, CHAR); }, { ext: [x0, SRV.y0, 0, x1, SRV.y1, WALL], zone: 'server', noShadow: true }); // thin ceiling line along the cut
  kneeWall('sw-front-a', 12.26, SRV.door[0], false); kneeWall('sw-front-b', SRV.door[1], RX, true);
  add('sw-door', '서버실 문', [SRV.door[0], 4.48, SRV.door[1], SRV.y1], g => { const [a, b] = SRV.door, hh = 2.1, lw = b - a - 0.08, off = doorOpen * (lw + 0.02);
    const lx = a + 0.04 + off; box(g, lx, 4.48, 0.03, lw, 0.03, hh - 0.06, GLASS, { stroke: '#2f2c2a' });
    for (const x of [lx, lx + lw - 0.03]) box(g, x, 4.48, 0.03, 0.03, 0.03, hh - 0.06, CHAR); box(g, lx, 4.48, 0.03, lw, 0.03, 0.05, CHAR); box(g, lx, 4.48, hh - 0.08, lw, 0.03, 0.05, CHAR);
    box(g, lx + lw - 0.12, 4.51, 0.95, 0.02, 0.01, 0.22, CHAR); // pull
    box(g, a, SRV.y0, 0, 0.06, SRV.y1 - SRV.y0, hh, CHAR); box(g, b - 0.06, SRV.y0, 0, 0.06, SRV.y1 - SRV.y0, hh, CHAR); box(g, a, SRV.y0, hh, b - a, SRV.y1 - SRV.y0, 0.12, CHAR);
    box(g, a, SRV.y0 + 0.04, WALL - 0.05, b - a, 0.04, 0.05, CHAR); }, { collide: false, ext: [SRV.door[0], 4.48, 0, SRV.door[1], SRV.y1, WALL], zone: 'server', noShadow: true });
  for (const [id, x] of [['rack1', 13.55], ['rack2', 14.4], ['rack3', 15.25]]) spr(id, '서버 랙', [x, 0.1, x + 0.75, 0.85], [x, 0.1, 0, x + 0.75, 0.85, 1.65], 'rack', g => box(g, x, 0.1, 0, 0.75, 0.75, 1.65, { top: '#3a3a3c', left: '#252528', right: '#1d1d20' }), { zone: 'server', after: rackLeds });
  spr('console', '진단 콘솔', [12.45, 0.2, 13.0, 0.8], [12.45, 0.2, 0, 13.0, 0.8, 1.45], 'console', g => box(g, 12.45, 0.2, 0, 0.55, 0.6, 0.95, CHAR), { zone: 'server' });

  glassWall('gm-back', 12.3, 6.2, RX, 6.28, 2.1, 'meeting', { frame: true });
  glassWall('gm-w1', 12.3, 6.28, 12.38, 7.3, 2.1, 'meeting', { frame: true }); glassWall('gm-w2', 12.3, 8.3, 12.38, 9.6, 2.1, 'meeting', { frame: true });
  add('gm-sill', '유리벽(앞 잘라 낮춤)', [12.3, 9.56, RX, 9.64], g => { const y0 = 9.56, d = 0.08, h = SRV.knee, L = RX - 12.3, n = Math.ceil(L / GLASS_FRAME.span);
    box(g, 12.3, y0, 0, L, d, 0.08, CHAR); box(g, 12.3, y0, 0.08, L, d, h - 0.08, GLASS, { stroke: '#2f2c2a' });
    for (let i = 0; i < n; i++) box(g, 12.3 + i * L / n, y0, 0.08, GLASS_FRAME.post, d, h - 0.08, CHAR);
    box(g, 12.3, y0, h, L, d, 0.03, CHAR); },
    { ext: [12.3, 9.56, 0, RX, 9.64, SRV.knee + 0.03], zone: 'meeting', noShadow: true });
  const TABLE_H = 0.72, MT = [13.4, 7.4, 15.2, 8.4];
  spr('mtable', '회의 테이블', MT, [MT[0], MT[1], 0, MT[2], MT[3], TABLE_H], 'mtable', g => box(g, MT[0], MT[1], TABLE_H - 0.05, MT[2] - MT[0], MT[3] - MT[1], 0.05, { top: '#e3c693', left: '#cfae78', right: '#be9c66' }), { zone: 'meeting' });
  chairFront('mcL', 13.9, 7.0, 'meeting'); chairFront('mc2', 14.7, 7.0, 'meeting');
  chairAt('cmF', 13.9, 8.75, 'meeting'); chairAt('mc3', 14.7, 8.75, 'meeting');
  add('board', '화이트보드', [12.40, 6.40, 12.46, 7.20], g => { box(g, 12.40, 6.40, 0.85, 0.05, 0.80, 0.70, CHAR);
    box(g, 12.40, 6.44, 0.89, 0.06, 0.72, 0.62, { top: CHAR.top, left: CHAR.left, right: '#efeee6' }); },
    { ext: [12.40, 6.40, 0.85, 12.46, 7.20, 1.55], collide: false, zone: 'meeting' });

  const CB = [13.2, 10.05], /* floor-22: 0.4 m clear of the meeting glass (was 9.85) */ COFFEE_TOP = 0.70, COFFEE_PROPS = [
    { anchor: [510, 748], at: [0.4, 0.38], poly: [[445, 716], [445, 652], [452, 641], [470, 637], [530, 633], [560, 636], [567, 641], [568, 672], [574, 668], [592, 667], [594, 672], [594, 690], [608, 692], [612, 702], [612, 712], [620, 716], [620, 733], [613, 736], [608, 736], [606, 741], [600, 745], [590, 745], [583, 742], [581, 737], [578, 733], [566, 733], [561, 730], [559, 722], [557, 717], [546, 716], [542, 718], [516, 748], [510, 749], [446, 728]] },
    { anchor: [700, 795], at: [1.18, 0.42], poly: [[649, 765], [648, 700], [654, 676], [668, 671], [692, 671], [701, 680], [702, 700], [704, 728], [711, 716], [716, 712], [740, 712], [744, 726], [748, 730], [748, 752], [752, 757], [765, 757], [777, 762], [778, 778], [787, 780], [787, 782], [785, 792], [742, 809], [697, 796], [696, 786], [700, 781], [690, 786], [670, 787], [655, 783], [650, 776]] },
  ];
  const COFFEE_K = 124.5 / 422 * SK; // the 18i sprite fit scale, so the props keep their size
  function drawCoffee(g) { const [x0, y0] = CB;
    for (const [x, y] of [[0.02, 0.02], [1.52, 0.02], [0.02, 0.52], [1.52, 0.52]]) box(g, x0 + x, y0 + y, 0, 0.06, 0.06, 0.06, CHAR);
    box(g, x0 + 0.02, y0 + 0.02, 0.06, 1.56, 0.54, 0.6, CHAR);
    for (let i = 0; i < 3; i++) { const x = x0 + 0.06 + i * 0.5; box(g, x, y0 + 0.56, 0.1, 0.48, 0.02, 0.52, CHAR); box(g, x + 0.17, y0 + 0.58, 0.56, 0.14, 0.012, 0.03, { top: INK, left: INK, right: INK }); }
    board(g, x0, y0, COFFEE_TOP - 0.04, 1.6, 0.6, 0.04);
    const im = IMG.furniture3; if (!im) return; const k = COFFEE_K;
    for (const pr of COFFEE_PROPS) { const t = P(x0 + pr.at[0], y0 + pr.at[1], COFFEE_TOP); g.save(); g.transform(k, 0, 0, k, t[0] - k * pr.anchor[0], t[1] - k * pr.anchor[1]);
      g.beginPath(); pr.poly.forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q))); g.closePath(); g.clip(); g.drawImage(im, 0, 0); g.restore(); }
    brewFx(g);
  }
  function brewFx(g) {
    if (st.reduced || st.where !== 'CO' || !cur().rest) return; const t = st.t, pr = COFFEE_PROPS[0], k = COFFEE_K, b = P(CB[0] + pr.at[0], CB[1] + pr.at[1], COFFEE_TOP);
    const T = (x, y) => [b[0] + (x - pr.anchor[0]) * k, b[1] + (y - pr.anchor[1]) * k], sm = (a, c, x) => { const u = Math.min(1, Math.max(0, (x - a) / (c - a))); return u * u * (3 - 2 * u); };
    g.save(); if (t > 0.5 && t < 3.6 && (t > 1.0 || t % 0.4 < 0.22)) { const q = T(498, 670.5); g.fillStyle = 'rgba(255,190,90,.95)'; g.beginPath(); g.arc(q[0], q[1], Math.max(0.8, 2.6 * k), 0, Math.PI * 2); g.fill(); }
    if (t > 1.0 && t < 3.2) { const a = T(509, 689), c = T(509.5, 699); g.strokeStyle = 'rgba(92,52,24,.92)'; g.lineWidth = Math.max(0.7, (2.2 + Math.sin(st.env * 30) * 0.4) * k); g.beginPath(); g.moveTo(...a); g.lineTo(...c); g.stroke(); }
    const env = sm(2.6, 4.0, t) * (1 - sm(9, 18, t)); /* rises after the pour, gone by 18 s */ if (env > 0.01) { const o = T(512, 698); g.lineCap = 'round'; g.lineWidth = 1.6 * SK;
      for (let i = 0; i < 3; i++) { const u = (st.env * 0.45 + i / 3) % 1, a = Math.sin(Math.PI * u) * 0.5 * env, y = o[1] - u * 26 * SK, x = o[0] + (i - 1) * 3 * SK;
        g.strokeStyle = `rgba(255,252,245,${a.toFixed(3)})`; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 4 * SK, y - 5 * SK, x - 4 * SK, y - 9 * SK, x + 1 * SK, y - 14 * SK); g.stroke(); } }
    g.restore();
  }
  add('coffee', '음료대', [CB[0], CB[1], CB[0] + 1.6, CB[1] + 0.6], drawCoffee, { ext: [CB[0], CB[1], 0, CB[0] + 1.6, CB[1] + 0.6, 1.3], zone: 'entry' });

  const PAPER = { top: '#f4efe4', left: '#e3dccd', right: '#d6cfbf' }, PRN = { top: '#e6e3dc', left: '#d2cec5', right: '#bfbbb2' };
  const BIN = [{ top: '#6f8697', left: '#5d7484', right: '#5f7889' }, { top: '#c9a45a', left: '#b38f49', right: '#bd984f' }, { top: '#93a383', left: '#7d8e6e', right: '#869777' }, { top: '#b46f55', left: '#9c5d46', right: '#a8654c' }];
  function shelfX(g, [x0, y0, x1, y1], h, levels, fill = 'books', seed = 1) {
    const d = x1 - x0, L = y1 - y0, t = 0.03, p = 0.04, step = (h - t) / levels; let k = seed;
    box(g, x0, y0, 0, 0.025, L, h, SHELF_BACK); box(g, x0, y0, 0, d, p, h, CHAR);
    for (let i = 0; i < levels; i++) { const zb = i * step + t; box(g, x0, y0 + p, i * step, d, L - 2 * p, t, WOODW);
      if (fill === 'bins') { const n = Math.max(1, Math.floor((L - 2 * p) / 0.28)), bw = (L - 2 * p - 0.02) / n;
        for (let j = 0; j < n; j++, k++) { const y = y0 + p + 0.01 + j * bw; box(g, x0 + 0.05, y, zb, d - 0.08, bw - 0.03, Math.min(0.2, step - 0.1), BIN[k % BIN.length]);
          box(g, x1 - 0.03, y + bw * 0.3, zb + 0.06, 0.01, bw * 0.34, 0.05, PAPER); } continue; }
      let y = y0 + p + 0.02;
      while (y < y1 - p - 0.05) { const kind = (k * 7 + i) % 9;
        if (kind === 4 && y1 - p - y > 0.22) { box(g, x0 + 0.05, y, zb, d - 0.09, 0.2, Math.min(0.16, step - 0.1), (k % 2) ? SBOX : SBOXL); y += 0.22; }
        else { const w = 0.035 + (k % 3) * 0.008, hh = Math.min(step - 0.07, 0.3) - ((k * 5) % 4) * 0.02, c = SPINES[k % SPINES.length];
          box(g, x0 + 0.06, y, zb, d - 0.1, w, hh, { top: c, left: c, right: c }, { stroke: 'rgba(43,38,34,.6)' }); y += w + 0.004; }
        k++; } }
    box(g, x0, y0 + p, h - t, d, L - 2 * p, t, WOODW); box(g, x0, y1 - p, 0, d, p, h, CHAR);
  }
  function sortTable(g, [x0, y0, x1, y1], h = 0.74) {
    const leg = (x, y) => box(g, x, y, 0, 0.06, 0.06, h - 0.04, CHAR); leg(x0 + 0.04, y0 + 0.04); leg(x1 - 0.1, y0 + 0.04); leg(x0 + 0.04, y1 - 0.1); // back legs, then the low shelf, then the front leg
    box(g, x0 + 0.1, y0 + 0.1, 0.16, x1 - x0 - 0.2, y1 - y0 - 0.2, 0.025, WOODW); box(g, x0 + 0.15, y0 + 0.12, 0.185, 0.3, 0.3, 0.14, SBOX); box(g, x0 + 0.55, y0 + 0.12, 0.185, 0.3, 0.3, 0.14, SBOXL); leg(x1 - 0.1, y1 - 0.1);
    board(g, x0, y0, h - 0.04, x1 - x0, y1 - y0, 0.04);
    for (let i = 0; i < 3; i++) { box(g, x0 + 0.08, y0 + 0.08, h + i * 0.07, 0.34, 0.26, 0.012, CHAR); box(g, x0 + 0.1, y0 + 0.1, h + i * 0.07 + 0.012, 0.3, 0.21, 0.025, PAPER); }
    box(g, x0 + 0.5, y0 + 0.14, h, 0.24, 0.32, 0.06, PAPER);
    for (let i = 0; i < 3; i++) box(g, x0 + 0.8 + i * 0.055, y0 + 0.08, h, 0.05, 0.26, 0.27, { top: SPINES[i * 2], left: SPINES[i * 2], right: SPINES[i * 2] }, { stroke: 'rgba(43,38,34,.6)' });
    box(g, x0 + 0.78, y0 + 0.38, h, 0.26, y1 - y0 - 0.44, 0.18, SBOXL);
  }
  function faceShade(g, q, a0, a1) { const top = Math.min(q[0][1], q[1][1]), bot = Math.max(q[2][1], q[3][1]), gr = g.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, `rgba(255,250,240,${a0})`); gr.addColorStop(0.45, 'rgba(255,250,240,0)'); gr.addColorStop(1, `rgba(40,28,18,${a1})`);
    g.save(); g.fillStyle = gr; g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); g.restore(); }
  const hiLine = (g, a, b, alpha = 0.55, w = 1.1) => { g.save(); g.strokeStyle = `rgba(255,252,244,${alpha})`; g.lineWidth = w * SK; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.restore(); };
  const LOCK = { top: '#4a4642', left: '#3a3633', right: '#3a3633' }, LDOOR = { top: '#a3b293', left: '#8d9d7d', right: '#93a383' };
  function lockersX(g, [x0, y0, x1, y1], h) {
    box(g, x0, y0, 0, x1 - x0, y1 - y0, h, LOCK); const n = Math.round((y1 - y0) / 0.45), dw = (y1 - y0) / n;
    for (let i = 0; i < n; i++) { const y = y0 + i * dw;
      for (const [z, hh] of [[0.08, h / 2 - 0.1], [h / 2 + 0.02, h / 2 - 0.1]]) { box(g, x1, y + 0.02, z, 0.012, dw - 0.04, hh, LDOOR);
        faceShade(g, [P(x1 + 0.012, y + 0.02, z + hh), P(x1 + 0.012, y + dw - 0.02, z + hh), P(x1 + 0.012, y + dw - 0.02, z), P(x1 + 0.012, y + 0.02, z)], 0.22, 0.2);
        hiLine(g, P(x1 + 0.013, y + 0.04, z + hh - 0.01), P(x1 + 0.013, y + dw - 0.04, z + hh - 0.01), 0.45);
        g.strokeStyle = 'rgba(43,38,34,.7)'; g.lineWidth = 1.1 * SK; g.beginPath(); for (let v = 0; v < 3; v++) { const zz = z + hh - 0.08 - v * 0.035; g.moveTo(...P(x1 + 0.013, y + 0.1, zz)); g.lineTo(...P(x1 + 0.013, y + dw - 0.14, zz)); } g.stroke();
        box(g, x1 + 0.012, y + dw - 0.1, z + hh * 0.42, 0.01, 0.025, 0.1, CHAR); } }
    box(g, x0, y0, h, x1 - x0, y1 - y0, 0.02, CHAR);
  }
  function printerStation(g, x0, y0, w, d, h) { credenza(g, x0, y0, w, d, h);
    for (let i = 0; i < 2; i++) { box(g, x0 + 0.08, y0 + 0.08, h + i * 0.07, 0.34, 0.28, 0.012, CHAR); box(g, x0 + 0.1, y0 + 0.1, h + i * 0.07 + 0.012, 0.3, 0.23, 0.03, PAPER); }
    for (let i = 0; i < 4; i++) box(g, x0 + 0.5 + i * 0.06, y0 + 0.08, h, 0.055, 0.28, 0.28, { top: SPINES[(i * 3) % 7], left: SPINES[(i * 3) % 7], right: SPINES[(i * 3) % 7] }, { stroke: 'rgba(43,38,34,.6)' });
    const px = x0 + w - 0.64, py = y0 + 0.02; box(g, px, py, h, 0.58, 0.4, 0.24, PRN); box(g, px + 0.02, py + 0.02, h + 0.24, 0.54, 0.36, 0.07, PRN);
    box(g, px + 0.08, py + 0.4, h + 0.1, 0.42, 0.012, 0.03, PAPER); box(g, px + 0.08, py + 0.4, h + 0.04, 0.42, 0.012, 0.012, CHAR);
    box(g, px + 0.38, py + 0.26, h + 0.31, 0.14, 0.09, 0.01, CHAR);
  }
  function fridge(g, [x0, y0, x1, y1], h) { const F1 = { top: '#efe9dd', left: '#e3dccd', right: '#d3cbbb' }, st = { stroke: '#6b6258' }, w = x1 - x0, FT = { top: '#4a4642', left: '#3a3633', right: '#2f2c2a' };
    for (const [x, y] of [[x0 + 0.03, y0 + 0.03], [x1 - 0.07, y0 + 0.03], [x0 + 0.03, y1 - 0.07], [x1 - 0.07, y1 - 0.07]]) box(g, x, y, 0, 0.04, 0.04, 0.04, FT, st);
    box(g, x0, y0, 0.04, w, y1 - y0, h - 0.04, F1, st);
    faceShade(g, [P(x0, y1, h), P(x1, y1, h), P(x1, y1, 0.04), P(x0, y1, 0.04)], 0.25, 0.16); faceShade(g, [P(x1, y0, h), P(x1, y1, h), P(x1, y1, 0.04), P(x1, y0, 0.04)], 0.08, 0.22);
    hiLine(g, P(x1 - 0.012, y1, h - 0.03), P(x1 - 0.012, y1, 0.12), 0.7, 1.3); hiLine(g, P(x0 + 0.03, y1 - 0.01, h), P(x1 - 0.03, y1 - 0.01, h), 0.6);
    box(g, x0 + 0.04, y1, 0.06, w - 0.08, 0.004, 0.07, { top: '#5a554f', left: '#5a554f', right: '#4a4642' }, { stroke: null });
    g.strokeStyle = 'rgba(200,192,178,.9)'; g.lineWidth = 1 * SK; g.beginPath(); for (let k = 1; k < 6; k++) { const x = x0 + 0.04 + (w - 0.08) * k / 6; g.moveTo(...P(x, y1 + 0.005, 0.065)); g.lineTo(...P(x, y1 + 0.005, 0.125)); } g.stroke();
    const zs = h * 0.6; g.strokeStyle = 'rgba(107,98,88,.9)'; g.lineWidth = 1.2 * SK; g.beginPath(); g.moveTo(...P(x0 + 0.01, y1 + 0.002, zs)); g.lineTo(...P(x1 - 0.01, y1 + 0.002, zs)); g.stroke();
    g.strokeStyle = 'rgba(150,140,126,.55)'; g.lineWidth = 1 * SK; g.beginPath(); for (const z of [0.16, zs - 0.025, zs + 0.025, h - 0.03]) { g.moveTo(...P(x0 + 0.03, y1 + 0.003, z)); g.lineTo(...P(x1 - 0.03, y1 + 0.003, z)); } g.stroke();
    const PULL = { top: '#a39b8f', left: '#9a9286', right: '#878074' }; for (const [z, hh] of [[zs + 0.12, 0.3], [zs - 0.38, 0.28]]) box(g, x1 - 0.09, y1, z, 0.016, 0.018, hh, PULL, { stroke: '#5b544c' }); }
  function drum(g, x, y, z0, z1, r, c, st = INK) { const b = P(x, y, z0), t = P(x, y, z1), rx = 1.2247 * r * S, ry = 0.7071 * r * S;
    g.beginPath(); g.moveTo(b[0] + rx, b[1]); g.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); g.lineTo(t[0] - rx, t[1]); g.lineTo(t[0] + rx, t[1]); g.closePath(); g.fillStyle = c.left; g.fill(); g.strokeStyle = st; g.lineWidth = 1.1; g.stroke();
    g.beginPath(); g.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI * 2); g.fillStyle = c.top; g.fill(); g.stroke(); }
  const SHADE = { top: '#f6ecd6', left: '#ead9b5' };
  function pouf(g, x, y, r, h) { const FT = { top: '#6a4f36', left: '#5a432e', right: '#4e3a28' };
    for (const [dx, dy] of [[0, -0.62], [-0.62, 0], [0.62, 0], [0, 0.62]]) box(g, x + dx * r - 0.02, y + dy * r - 0.02, 0, 0.04, 0.04, 0.07, FT, { stroke: '#3a2a1c' });
    const b = P(x, y, 0.07), t = P(x, y, h), rx = 1.2247 * r * S, ry = 0.7071 * r * S, my = (b[1] + t[1]) / 2;
    const sg = g.createLinearGradient(0, t[1], 0, b[1] + ry); sg.addColorStop(0, '#93a383'); sg.addColorStop(1, '#748667');
    g.beginPath(); g.moveTo(t[0] - rx, t[1]); g.quadraticCurveTo(t[0] - rx * 1.07, my, b[0] - rx * 0.96, b[1]); g.ellipse(b[0], b[1], rx * 0.96, ry * 0.96, 0, Math.PI, 0, true);
    g.quadraticCurveTo(t[0] + rx * 1.07, my, t[0] + rx, t[1]); g.closePath(); g.fillStyle = sg; g.fill(); g.strokeStyle = '#4d5a42'; g.lineWidth = 1 * SK + 0.3; g.stroke();
    g.beginPath(); g.ellipse(t[0], t[1], rx, ry, 0, 0, Math.PI * 2); g.fillStyle = '#a4b391'; g.fill(); g.strokeStyle = '#66755a'; g.lineWidth = 1.8 * SK + 0.4; g.stroke();
    g.beginPath(); g.ellipse(t[0], t[1] - 0.02 * S, rx * 0.72, ry * 0.62, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(214,224,196,.55)'; g.fill();
    g.strokeStyle = 'rgba(77,90,66,.45)'; g.lineWidth = 1 * SK; g.beginPath(); const c = [t[0], t[1] - 0.025 * S];
    for (const a of [0.4, 2.0, 3.55, 5.1]) { g.moveTo(c[0] + Math.cos(a) * rx * 0.12, c[1] + Math.sin(a) * ry * 0.12); g.quadraticCurveTo(c[0] + Math.cos(a + 0.3) * rx * 0.3, c[1] + Math.sin(a + 0.3) * ry * 0.3, c[0] + Math.cos(a) * rx * 0.48, c[1] + Math.sin(a) * ry * 0.48); } g.stroke(); }
  const poufAt = (id, x, y, zone) => add(id, '쿠션 스툴', [x - 0.26, y - 0.26, x + 0.26, y + 0.26], g => pouf(g, x, y, 0.26, 0.4),
    { ext: [x - 0.27, y - 0.27, 0, x + 0.27, y + 0.27, 0.42], sprite: 'pouf', zone });
  const lampAt = (id, x, y, zone) => add(id, '스탠드 조명', [x - 0.18, y - 0.18, x + 0.18, y + 0.18], g => { drum(g, x, y, 0, 0.03, 0.16, CHAR); box(g, x - 0.012, y - 0.012, 0.03, 0.024, 0.024, 1.32, CHAR); drum(g, x, y, 1.3, 1.55, 0.2, SHADE, '#6a5a44'); },
    { ext: [x - 0.2, y - 0.2, 0, x + 0.2, y + 0.2, 1.55], sprite: 'lamp', zone });

  const LS = [1.95, 3.25, 2.6, 3.6], LS_H = 0.75; // 1.2 m clear to the island's west desk (bench branch aisle)
  add('lshelf', '낮은 책장', LS, g => drawLowShelf(g, LS, LS_H), { ext: [LS[0], LS[1], 0, LS[2], LS[3], LS_H], sprite: 'vshelf', zone: 'lounge' });
  deskSet('dw', 0.5, 3.5, 1.4, 0.7, 'lounge', { noKeys: true }); chairAt('cw', 1.2, 4.6, 'lounge');
  const ST = [0.6, 5.75, 1.7, 6.4]; add('sorttable', '자료 분류대', ST, g => sortTable(g, ST), { ext: [ST[0], ST[1], 0, ST[2], ST[3], 1.02], zone: 'lounge' });
  const DV = [2.45, 4.95, 2.85, 6.5]; add('divider', '자료 서가(칸막이)', DV, g => shelfX(g, DV, 0.92, 2, 'books', 3), { ext: [DV[0], DV[1], 0, DV[2], DV[3], 0.92], zone: 'lounge' });
  const TB = [0.05, 7.15, 0.47, 8.4]; add('bookcase', '키 큰 책장', TB, g => shelfX(g, TB, 1.85, 5, 'books', 5), { ext: [TB[0], TB[1], 0, TB[2], TB[3], 1.85], zone: 'lounge' });
  const BR = [0.05, 0.95, 0.5, 1.8]; add('binrack', '부품 빈 선반', BR, g => shelfX(g, BR, 1.6, 4, 'bins', 2), { ext: [BR[0], BR[1], 0, BR[2], BR[3], 1.6], zone: 'bench' });
  spr('sofa', '소파', [0.3, 8.55, 1.15, 10.45], [0.3, 8.55, 0, 1.15, 10.45, 0.85], 'sofa', g => box(g, 0.3, 8.55, 0, 0.85, 1.9, 0.42, SAGE), { zone: 'lounge' });
  for (const [id, x0] of [['armchair', 1.55], ['armchair2', 2.45]]) spr(id, '안락의자', [x0, 7.75, x0 + 0.65, 8.4], [x0, 7.75, 0, x0 + 0.65, 8.4, 0.85], 'armchair', g => box(g, x0, 7.75, 0, 0.65, 0.65, 0.4, CREAM), { zone: 'lounge' });
  spr('rtable', '원형 테이블', [1.75, 9.1, 2.55, 9.9], [1.75, 9.1, 0, 2.55, 9.9, 0.55], 'rtable', g => ell(g, 2.15, 9.5, 0.5, 22 * SK, 12 * SK, '#d9ab6c', INK), { zone: 'lounge' });
  poufAt('pouf1', 3.25, 9.5, 'lounge'); poufAt('pouf2', 2.15, 10.75, 'lounge'); lampAt('lamp', 0.62, 10.9, 'lounge');
  deskSet('dn', 6.4, 8.0, 1.2, 0.7, 'review'); chairAt('cn', 7.0, 9.1, 'review');
  const RT = [4.5, 8.1, 5.94, 8.9];
  spr('rtable2', '공동 검토 테이블', RT, [RT[0], RT[1], 0, RT[2], RT[3], TABLE_H], 'mtable', g => box(g, RT[0], RT[1], TABLE_H - 0.05, RT[2] - RT[0], RT[3] - RT[1], 0.05, { top: '#e3c693', left: '#cfae78', right: '#be9c66' }), { zone: 'review' });
  chairFront('rcF1', 4.85, 7.7, 'review'); chairFront('rcF2', 5.6, 7.7, 'review'); chairAt('rc1', 4.85, 9.3, 'review'); chairAt('rc2', 5.6, 9.3, 'review');
  const RN = [4.4, 6.2, 5.9, 6.55]; add('rnshelf', '검토 자료 서가', RN, g => drawLowShelf(g, RN, 0.75), { ext: [RN[0], RN[1], 0, RN[2], RN[3], 0.75], zone: 'review' });
  const RS = [6.15, 10.3, 7.85, 10.65], RS_H = 0.75;
  add('rshelf', '낮은 서가', RS, g => drawLowShelf(g, RS, RS_H), { ext: [RS[0], RS[1], 0, RS[2], RS[3], RS_H], zone: 'review' });
  plantAt('pl-e', 16.2, 10.7, 0.9);
  function credenza(g, x0, y0, w, d, h) { box(g, x0 + 0.02, y0 + 0.02, 0, w - 0.04, d - 0.06, h - 0.04, CHAR); const n = Math.round(w / 0.45), dw = (w - 0.08) / n;
    for (let i = 0; i < n; i++) { const x = x0 + 0.04 + i * dw; box(g, x + 0.01, y0 + d - 0.04, 0.08, dw - 0.02, 0.02, h - 0.2, CHAR); box(g, x + dw / 2 - 0.07, y0 + d - 0.02, h - 0.24, 0.14, 0.012, 0.03, { top: INK, left: INK, right: INK }); }
    board(g, x0, y0, h - 0.04, w, d, 0.04); }
  add('credenza', '낮은 수납장', [10.55, 0.1, 11.95, 0.55], g => credenza(g, 10.55, 0.1, 1.4, 0.45, 0.78), { ext: [10.55, 0.1, 0, 11.95, 0.55, 0.78], zone: 'research' });
  add('printer', '프린터·문서 작업대', [6.15, 6.2, 7.65, 6.65], g => printerStation(g, 6.15, 6.2, 1.5, 0.45, 0.78), { ext: [6.15, 6.2, 0, 7.65, 6.65, 1.09], zone: 'review' });
  const LK = [9.85, 8.7, 10.3, 9.7]; /* floor-22: 1.0 m (was 1.8), no longer right behind the door frame */ add('lockers', '개인 보관함', LK, g => lockersX(g, LK, 1.5), { ext: [LK[0], LK[1], 0, LK[2], LK[3], 1.52], zone: 'entry' });
  const FR = [12.5, 10.05, 13.1, 10.63]; add('fridge', '냉장고', FR, g => fridge(g, FR, 1.5), { ext: [FR[0], FR[1], 0, FR[2], FR[3], 1.5], zone: 'entry' });
  cabinet2('srv-cab', 16.0, 'server', '예비 장비 수납장');
  plantAt('pl-c1', 10.1, 6.85, 0.9);

  const AVATAR_SLOTS = [
    { id: 'leo', name: '레오', role: '연구 리드', zone: 'meeting', at: [13.9, 7.0], pose: '회의 테이블 안쪽 자리, 계획 태블릿' },
    { id: 'finn', name: '핀', role: '취약점·실습 연구원', zone: 'research', at: [6.5, 4.48], pose: '움직임: 연구석·회의·벤치·검토석·음료대·서버실' },
    { id: 'aria', name: '아리', role: 'LLM·Agent 보안 연구원', zone: 'research', at: [8.3, 4.48], pose: '핀 옆 연구석에서 키보드·마우스 작업' },
    { id: 'zoey', name: '조이', role: '실험·검증 엔지니어', zone: 'bench', at: [1.3, 1.05], pose: '실험 벤치 앞에 서서 보드 시험' },
    { id: 'luna', name: '루나', role: '지식·콘텐츠 담당', zone: 'lounge', at: [1.2, 4.6], pose: '왼쪽 벽 낮은 책장 옆 집필 책상' },
    { id: 'noah', name: '노아', role: '독립 리뷰어', zone: 'review', at: [7.0, 9.1], pose: '자료 서가와 공동검토 테이블 옆 개인 검토석' },
    { id: 'max', name: '맥스', role: '플랫폼·운영 엔지니어', zone: 'server', at: [15.65, 1.5], pose: '서버실 랙 앞 작업 통로에서 패널 점검' },
  ];
  const ZONES = {
    all: { name: '1층 전체', z: 1, c: [W / 2, H / 2] },
    research: { name: '중앙 개발석', z: 2.1, c: P(6.5, 2.9, 0.6) }, bench: { name: '전자실험 벤치', z: 2.5, c: P(1.7, 2.0, 0.7) },
    server: { name: '서버실', z: 2.3, c: P(14.4, 2.4, 0.9) }, meeting: { name: '유리 회의실', z: 2.4, c: P(14.4, 7.9, 0.6) },
    lounge: { name: '라운지·집필', z: 1.9, c: P(1.6, 7.0, 0.5) }, review: { name: '검토·공동검토', z: 2.2, c: P(6.6, 8.4, 0.5) },
    entry: { name: '출입구·음료대', z: 2.1, c: P(12.2, 10.4, 0.6) },
  };

  const NODE = { E: [11.3, 11.5], J1: [11.3, 10.95], CO: [14.0, 10.95], J2: [11.3, 8.35], RV: [7.95, 8.35], J3: [11.3, 7.8], MI: [12.85, 7.8], MW: [12.85, 9.3], MS: [13.3, 8.85],
    J4: [11.3, 5.4], CF: [7.2, 5.4], SA: [7.2, 4.62], K: [3.25, 5.4], JB: [3.25, 1.45], BZ: [2.55, 1.45], SD: [13.3, 5.3], SI: [13.3, 3.7], SV: [14.15, 1.6] };
  const EDGE = [['E', 'J1'], ['J1', 'CO'], ['J1', 'J2'], ['J2', 'RV'], ['J2', 'J3'], ['J3', 'MI'], ['MI', 'MW'], ['MW', 'MS'], ['CF', 'SA'], ['J3', 'J4'], ['J4', 'CF'], ['CF', 'K'], ['K', 'JB'], ['JB', 'BZ'], ['J4', 'SD'], ['SD', 'SI'], ['SI', 'SV']];
  const NODE_NAME = { E: '출입구', J1: '통로(음료대 갈림길)', CO: '음료대 앞', J2: '통로(검토석 갈림길)', RV: '노아 책상 옆', J3: '통로(회의실 갈림길)', MI: '회의실 안', MW: '회의실 안(앞쪽)', MS: '회의 의자 옆',
    J4: '복도 교차점', CF: '핀 자리 옆 통로', SA: '핀 의자 옆', K: '가로 복도(서쪽)', JB: '벤치 쪽 통로', BZ: '조이 옆(벤치 앞)', SD: '서버실 문 앞', SI: '서버실 안', SV: '랙 앞 작업 통로' };
  const SEATS = {
    desk: { seat: [6.5, 4.48], approach: 'SA', chair: 'c1', rest: 'work', name: '연구석에서 작업', surfZ: DESK_H },
    meet: { seat: [13.9, 8.75], approach: 'MS', chair: 'cmF', rest: 'meet', name: '레오와 회의', surfZ: TABLE_H },
  };
  const SEAT = SEATS.desk.seat, dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  function route(from, to) { // Dijkstra over the small graph
    const d = {}, prev = {}, Q = new Set(Object.keys(NODE)); for (const k of Q) d[k] = Infinity; d[from] = 0;
    while (Q.size) { let u = null; for (const k of Q) if (u === null || d[k] < d[u]) u = k; Q.delete(u); if (u === to) break;
      for (const [a, b] of EDGE) { const v = a === u ? b : b === u ? a : null; if (!v || !Q.has(v)) continue; const nd = d[u] + dist(NODE[u], NODE[v]); if (nd < d[v]) { d[v] = nd; prev[v] = u; } } }
    const path = [to]; while (path[0] !== from) path.unshift(prev[path[0]]); return path;
  }

  const SEAT_Z = 0.42, HIP_FROM_FOOT = [-196, -152], HAND_Z = DESK_H + 0.025;
  const HANDS = { seatA: { L: [185, -192], R: [330, -135] }, seatB: { L: [195, -195], R: [329, -138] } };
  function handWorld(cell, which, seat = SEAT, z = HAND_Z) { const o = HANDS[cell][which], hp = P(seat[0], seat[1], SEAT_Z); return Pinv(hp[0] + o[0] * KSB, hp[1] + o[1] * KSB, z); }
  const SEAT_IN_ = -0.19, inSeat = k => [SEATS[k].seat[0], SEATS[k].seat[1] + SEAT_IN_];
  const HLm = handWorld('seatA', 'L', inSeat('meet'), TABLE_H + 0.02), HRm = handWorld('seatA', 'R', inSeat('meet'), TABLE_H + 0.02);
  const S2 = A.sit2, K2 = S2 ? KW * S2.walkHeadWidth / S2.headWidth : 0;
  const LFL = A.legsFL && new URLSearchParams(location.search).get('legs') !== 'off' ? A.legsFL : null;
  const hand2 = (h, seat) => { const f = S2.foot.type, o = [S2[h].at[0] - f[0] - S2.hipFromFoot[0], S2[h].at[1] - f[1] - S2.hipFromFoot[1]], hp = P(seat[0], seat[1], SEAT_Z); return Pinv(hp[0] + o[0] * K2, hp[1] + o[1] * K2, HAND_Z); };
  const HL = S2 ? hand2('handL', inSeat('desk')) : handWorld('seatA', 'L', inSeat('desk')), HR = S2 ? hand2('handR', inSeat('desk')) : handWorld('seatA', 'R', inSeat('desk'));
  for (const k of Object.keys(SEATS)) { const hp = P(SEATS[k].seat[0], SEATS[k].seat[1], SEAT_Z); SEATS[k].foot = Pinv(hp[0] - HIP_FROM_FOOT[0] * KSB, hp[1] - HIP_FROM_FOOT[1] * KSB, 0); }
  if (S2) { const hp = P(SEATS.desk.seat[0], SEATS.desk.seat[1], SEAT_Z); SEATS.desk.foot = Pinv(hp[0] - S2.hipFromFoot[0] * K2, hp[1] - S2.hipFromFoot[1] * K2, 0); SEATS.desk.sit2 = true; }
  const CHAIR_OUT = 0.28, SEAT_IN = SEAT_IN_, hipAt = (k, off) => [SEATS[k].seat[0], SEATS[k].seat[1] + off], footAt = (k, off) => [SEATS[k].foot[0], SEATS[k].foot[1] + off];
  function applyChairs(q) { for (const k of Object.keys(SEATS)) { const off = q && q.seatKey === k && q.chairOff !== undefined ? q.chairOff : CHAIR_OUT;
    for (const id of [SEATS[k].chair, SEATS[k].chair + '-back']) { const f = F.find(x => x.id === id); if (!f) continue; if (!f.base) f.base = { fp: f.fp.slice(), ext: f.ext.slice(), seatAt: f.seatAt.slice() };
      f.fp = [f.base.fp[0], f.base.fp[1] + off, f.base.fp[2], f.base.fp[3] + off]; f.ext = [f.base.ext[0], f.base.ext[1] + off, f.base.ext[2], f.base.ext[3], f.base.ext[4] + off, f.base.ext[5]]; f.seatAt = [f.base.seatAt[0], f.base.seatAt[1] + off]; } } }
  const SEG = { w: 860, pivot: [304, 553],
    upper: [[0, 0], [860, 0], [860, 440], [642, 440], [630, 455], [602, 468], [560, 472], [520, 470], [492, 463], [466, 438], [456, 432], [450, 446], [444, 474], [428, 497], [402, 507], [360, 512], [320, 507], [280, 496], [240, 472], [0, 470]],
    lower: [[0, 430], [240, 432], [280, 456], [320, 467], [360, 472], [402, 467], [428, 457], [446, 436], [456, 432], [466, 438], [492, 463], [520, 470], [560, 472], [602, 468], [630, 455], [642, 440], [860, 440], [860, 724], [0, 724]] };
  const SEGH = {
    mid: { neck: [470, 292], cut: [[0, 245], [300, 245], [330, 236], [352, 258], [400, 276], [450, 288], [500, 296], [540, 306], [580, 306], [610, 290], [640, 250], [860, 250]] },
    seatA: { neck: [340, 298], cut: [[0, 250], [216, 250], [241, 268], [276, 286], [316, 296], [361, 300], [396, 306], [436, 300], [471, 272], [491, 235], [724, 235]] },
    seatB: { neck: [230, 296], cut: [[0, 252], [80, 252], [110, 262], [140, 276], [172, 288], [212, 295], [252, 298], [292, 304], [322, 298], [352, 268], [372, 235], [724, 235]] },
  };
  const MEET_HAND = { hand: [[1252, 412], [1290, 398], [1310, 382], [1330, 374], [1348, 380], [1364, 396], [1378, 420], [1370, 442], [1340, 448], [1310, 448], [1286, 454], [1262, 462], [1250, 458]],
    hole: [[1268, 408], [1290, 398], [1310, 382], [1330, 374], [1348, 380], [1364, 396], [1378, 420], [1370, 442], [1340, 448], [1310, 448], [1286, 454], [1268, 460]],
    mouse: [[1344, 412], [1356, 402], [1368, 410], [1372, 425], [1364, 437], [1345, 443], [1318, 443], [1314, 437], [1330, 433], [1348, 432], [1353, 421]],
    pivot: [1262, 436], pen: [[1306, 452], [1368, 421]] }; // pen: back end in the thumb web (shows below the hand) -> tip just past the fingertips, on the paper
  function meetCycle(c) { const h = k => hash1(c * 7 + k); const a = 4.2 + 1.8 * h(1), b = a + 0.6, f = b + 3.2 + 1.6 * h(2), g2 = f + 0.5, n = g2 + 2.6 + 1.8 * h(3); return { a, b, f, g: g2, n }; }
  const pulse = (u, t0, d) => (u > t0 && u < t0 + d ? Math.sin(Math.PI * (u - t0) / d) : 0);
  const MEET_N = 240; let MEET_TAB = null; // built on first use (hash1 is defined further down)
  function meetAt(t) { const T = MEET_TAB || (MEET_TAB = (() => { const a = []; let t1 = 0; for (let c = 0; c < MEET_N; c++) { const C = meetCycle(c); a.push({ c, t0: t1, C }); t1 += C.n; } return { a, total: t1 }; })()), k = Math.floor(Math.max(0, t) / T.total), r = Math.max(0, t) - k * T.total; let lo = 0, hi = T.a.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T.a[m].t0 <= r) lo = m; else hi = m - 1; } const e = T.a[lo]; return { c: e.c, t0: e.t0 + k * T.total, C: e.C }; }
  const env2 = (w, len, a = 0.35) => ease(Math.min(1, Math.max(0, w) / a)) * ease(Math.min(1, Math.max(0, len - w) / a)); // eased in and out of a span
  const writing = w => 1.2 + 1.3 * Math.sin(2 * Math.PI * w / 0.37) * (0.6 + 0.4 * Math.sin(2 * Math.PI * w / 1.3));
  function meetBeat(t) {
    const { c, t0, C } = meetAt(t), u = t - t0, h = k => hash1(c * 11 + k);
    const speaker = u < C.a ? 'leo' : u >= C.b && u < C.f ? 'finn' : null, notes = u >= C.g;
    let finnNod = 0, finnHand = 0, leoNod = 0, leoHand = 0, leoLook = 0;
    if (speaker === 'leo') { finnNod = 3.2 * (pulse(u, 1.0 + h(1), 0.55) + pulse(u, 2.6 + h(2), 0.5)); const w = u - (C.a - 1.6); if (w > 0) finnHand = writing(u) * env2(w, 1.6); // a short note near the end
      leoHand = Math.sin(Math.PI * Math.min(1, u / C.a)) * (3 + 3 * Math.sin(2 * Math.PI * u / 0.95)); }
    else if (speaker === 'finn') { const w = u - C.b, d = C.f - C.b, lift = env2(w, d, 0.4); finnHand = -9 * lift + 3 * lift * Math.sin(2 * Math.PI * w / 1.25);
      finnNod = -1.6 * pulse(w, 0.6, 0.8) + 1.4 * pulse(w, Math.min(2.2 + h(3), d - 0.8), 0.7); leoHand = 7 * lift; leoNod = 1.4 * (pulse(w, 1.1 + h(4), 0.6) + pulse(w, Math.min(2.5 + h(5), d - 0.7), 0.6)); } // nods end inside the turn
    else if (notes) { const w = u - C.g, len = C.n - C.g, e = env2(w, len, 0.45), lift = pulse(w % 2.1, 1.7, 0.4); finnHand = e * (writing(w) * (1 - lift) - 2.5 * lift); leoHand = 4 * e; leoLook = 1.2 * env2(w, len, 0.6); }
    return { c, u, speaker, notes, finnNod, finnHand, leoNod, leoHand, leoLook };
  }
  const LEAN_A = { rot: 15, dx: 2.7, dy: -3.9 }, LEAN_B = { rot: -15, dx: -1, dy: 5.5 }; // floor-23: A re-read with the KSB body: hair mass centre on the walking frame's (Codex motion audit, /private/tmp/revelare-floor23-motion-audit.cjs)
  const HEAD_KEEP = 0.6; // the head turns back 60% of the upper piece's lean, so it keeps looking at the table while the back bends
  const lerpSeg = (a, b, w) => ({ rot: a.rot + (b.rot - a.rot) * w, dx: a.dx + (b.dx - a.dx) * w, dy: a.dy + (b.dy - a.dy) * w });
  { const i = F.findIndex(f => f.id === 'dB1-kb'); F.splice(i, 1); }
  const KEYB = S2 ? [(HL[0] + HR[0]) / 2 - 0.27, Math.min(HL[1], HR[1]) - 0.12, (HL[0] + HR[0]) / 2 + 0.27, Math.max(HL[1], HR[1]) + 0.05] : [HL[0] - 0.38, HL[1] - 0.15, HL[0] + 0.24, HL[1] + 0.05];
  const MOUSE = S2 ? [KEYB[2] + 0.08, HR[1] - 0.05, KEYB[2] + 0.16, HR[1] + 0.05] : [HR[0] - 0.04, HR[1] - 0.05, HR[0] + 0.04, HR[1] + 0.05];
  const KEYTOP = '#57524c', KEYBASE = { top: '#34302d', left: '#2b2826', right: '#24211f' };
  function keyboard(g, [x0, y0, x1, y1], z) { box(g, x0, y0, z, x1 - x0, y1 - y0, 0.02, KEYBASE, { stroke: '#1f1c1a' }); const zt = z + 0.02, rows = 4, px = 0.012, py = 0.012, rh = (y1 - y0 - 2 * py) / rows;
    for (let r = 0; r < rows; r++) { const ya = y0 + py + r * rh + 0.003, yb = ya + rh - 0.006, n = r === rows - 1 ? 5 : 12, kw = (x1 - x0 - 2 * px) / n;
      for (let i = 0; i < n; i++) { const xa = x0 + px + i * kw + 0.003, xb = xa + (r === rows - 1 && i === 2 ? kw * 1 : kw) - 0.006; quad(g, xa, ya, xb, yb, zt, KEYTOP); } } }
  function mouse(g, [x0, y0, x1, y1], z) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, a = P(cx, cy, z + 0.018);
    g.save(); g.fillStyle = 'rgba(30,22,16,.25)'; const s = P(cx + 0.008, cy + 0.008, z); g.beginPath(); g.ellipse(s[0], s[1], rx * S * 1.05, ry * S * 0.75, -0.5, 0, 7); g.fill();
    g.fillStyle = '#2f2b28'; g.strokeStyle = '#1b1816'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(a[0], a[1], rx * S * 1.0, ry * S * 0.7, -0.5, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(a[0] - 0.6, a[1] - 0.5, rx * S * 0.45, ry * S * 0.3, -0.5, 0, 7); g.fill(); g.restore(); }
  add('f-kb', '키보드', KEYB, g => keyboard(g, KEYB, DESK_H), { collide: false, onDesk: 'dB1', zone: 'research' });
  const PEN_TIP = (() => { const hp = P(inSeat('meet')[0], inSeat('meet')[1], SEAT_Z); return Pinv(hp[0] + (1368 - 1010) * KSB, hp[1] + (421 - 550) * KSB, TABLE_H + 0.012); })(); // MEET_HAND.pen tip - hip (atlas px)
  const PAD = [Math.min(HLm[0] - 0.03, PEN_TIP[0] - 0.2), PEN_TIP[1] - 0.15, PEN_TIP[0] + 0.07, Math.min(MT[3] - 0.012, PEN_TIP[1] + 0.06)]; // an A5 pad, square to the table, the pen tip on its writing area
  function notepad(g, [x0, y0, x1, y1], z) { const zt = z + 0.003, q = [P(x0, y0, zt), P(x1, y0, zt), P(x1, y1, zt), P(x0, y1, zt)];
    g.fillStyle = 'rgba(60,40,20,.18)'; g.beginPath(); [P(x0 + 0.012, y0 + 0.012, z), P(x1 + 0.012, y0 + 0.012, z), P(x1 + 0.012, y1 + 0.012, z), P(x0 + 0.012, y1 + 0.012, z)].forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
    g.fillStyle = '#f7f2e6'; g.strokeStyle = 'rgba(150,135,110,.9)'; g.lineWidth = 0.5; g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); g.stroke();
    { const a = P(x0 + 0.035, y0 + 0.01, zt), b = P(x0 + 0.035, y1 - 0.01, zt); g.strokeStyle = 'rgba(200,90,80,.55)'; g.lineWidth = 0.45; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    g.strokeStyle = 'rgba(120,140,170,.35)'; g.lineWidth = 0.4; for (let i = 1; i < 6; i++) { const yy = y0 + (y1 - y0) * i / 6, a = P(x0 + 0.02, yy, zt), b = P(x1 - 0.02, yy, zt); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    const ph = cur(), t = ph && ph.kind === 'meet' && st.where === 'meet' ? st.t : 0, rows = st.reduced ? 2 : Math.min(5, 1 + Math.floor(t / 14)); // fixed with reduced motion
    g.strokeStyle = 'rgba(44,53,80,.8)'; g.lineWidth = 0.55;
    for (let r = 0; r < rows; r++) { const yy = y0 + (y1 - y0) * (r + 0.6) / 6; let xx = x0 + 0.045; for (let w = 0; w < 5 && xx < x1 - 0.04; w++) { const len = 0.02 + 0.025 * hash1(r * 9 + w), a = P(xx, yy, zt), b = P(xx + len, yy, zt); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1] - 0.6); g.stroke(); xx += len + 0.012; } } }
  add('m-pad', '회의 메모장', PAD, g => notepad(g, PAD, TABLE_H), { collide: false, onDesk: 'mtable', zone: 'meeting' });
  add('f-ms', '마우스', MOUSE, g => mouse(g, MOUSE, DESK_H), { collide: false, onDesk: 'dB1', zone: 'research' });
  { const i = F.findIndex(f => f.id === 'dB2-kb'); F.splice(i, 1); }
  const A_KB = [8.22, 3.86, 8.66, 4.01], A_MS = [8.746, 3.876, 8.826, 3.976], ARIA_MS = [0, 0];
  add('a-kb', '키보드', A_KB, g => keyboard(g, A_KB, DESK_H), { collide: false, onDesk: 'dB2', zone: 'research' });
  add('a-ms', '마우스', A_MS, g => mouse(g, [A_MS[0] + ARIA_MS[0], A_MS[1] + ARIA_MS[1], A_MS[2] + ARIA_MS[0], A_MS[3] + ARIA_MS[1]], DESK_H), { collide: false, onDesk: 'dB2', zone: 'research' });

  const AVATAR_SPOTS = { aria: [8.3, 4.48], luna: [1.2, 4.6], noah: [7.0, 9.1], leo: [13.9, 7.0], zoey: [1.3, 1.05], max: [15.65, 1.5] };
  for (const [id, at] of Object.entries(AVATAR_SPOTS)) add('p-' + id, id, [at[0] - 0.2, at[1] - 0.2, at[0] + 0.2, at[1] + 0.2], (g) => drawPerson(g, id, at), { person: id, zone: id });

  for (const [id, fn] of [['dB1-mon', finnScreen], ['dB2-mon', ariaScreen], ['dw-mon', lunaScreen], ['dn-mon', noahScreen], ['bench', benchFx], ['console', consoleFx]]) { const f = F.find(x => x.id === id); if (f) f.after = fn; }
  const ORDER_INFO = {};
  { const key = f => (f.onDesk ? F.find(x => x.id === f.onDesk) : f);
    const depth = f => { const b = key(f).fp; return (b[0] + b[2] + b[1] + b[3]) / 2; };
    const behind = (a, b) => { const ka = key(a), kb = key(b); if (ka === kb) return F.indexOf(a) < F.indexOf(b);
      const A1 = ka.fp, B1 = kb.fp, sep = (A1[2] <= B1[0] + 1e-9 || A1[3] <= B1[1] + 1e-9), sepB = (B1[2] <= A1[0] + 1e-9 || B1[3] <= A1[1] + 1e-9);
      if (sep && !sepB) return true; if (sepB && !sep) return false;
      const sx = Math.max(A1[0], B1[0]) < Math.min(A1[2], B1[2]), sy = Math.max(A1[1], B1[1]) < Math.min(A1[3], B1[3]);
      if (!(sx && sy)) return false; // apart on screen-irrelevant diagonal: no constraint
      if (a.person && b.chair && b.front) return true; if (b.person && a.chair && a.front) return false; // seated person behind own backrest
      if (a.person && b.chair && !b.front) return false; if (b.person && a.chair && !a.front) return true;  // and above the seat
      return depth(a) < depth(b); };
    const n = F.length, indeg = new Array(n).fill(0), adj = F.map(() => []);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && behind(F[i], F[j])) { adj[i].push(j); indeg[j]++; }
    const sbox = f => { const k = key(f), b = k.fp; return extBox(k.ext || [b[0], b[1], 0, b[2], b[3], k.person ? 1.8 : 2.4]); };
    const meet = (a, b) => { const A2 = sbox(a), B2 = sbox(b); return A2[0] < B2[2] && B2[0] < A2[2] && A2[1] < B2[3] && B2[1] < A2[3]; };
    ORDER_INFO.edges = adj.flatMap((js, i) => js.filter(j => meet(F[i], F[j])).map(j => [F[i].id, F[j].id])); // i drawn before j, overlapping on screen
    ORDER_INFO.allEdges = adj.reduce((s, js) => s + js.length, 0);
    const out = [], done = new Array(n).fill(false); let cycles = 0;
    while (out.length < n) {
      let pick = -1; for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (pick < 0 || depth(F[i]) < depth(F[pick]))) pick = i;
      if (pick < 0) { cycles++; for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || depth(F[i]) < depth(F[pick]))) pick = i; }
      done[pick] = true; out.push(F[pick]); for (const j of adj[pick]) indeg[j]--;
    }
    ORDER_INFO.cycles = cycles; F.length = 0; F.push(...out); }

  const facingOf = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'front-right' : 'back-left') : (dy > 0 ? 'front-left' : 'back-right'); };
  const TURN_BAND = 20, INTER = { 45: 'front', 135: 'left', '-135': 'back', '-45': 'right' };
  const facing8 = v => { const th = Math.atan2(v[1], v[0]) * 180 / Math.PI; for (const k of [45, 135, -135, -45]) { let d = Math.abs(th - k); if (d > 180) d = 360 - d; if (d <= TURN_BAND) return INTER[k]; } return facingOf([0, 0], v); };
  const isInter = f => f === 'front' || f === 'back' || f === 'left' || f === 'right';
  const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], ease = u => u * u * (3 - 2 * u);
  const CORNER = 0.4, RAMP = 0.35, STRIDE = 0.38; // floor-19: RAMP 0.2 -> 0.35 for a softer start and stop
  const walkPhases = path => { let cum = 0; return path.slice(1).map((n, i) => { const a = path[i], L = dist(NODE[a], NODE[n]);
    const first = i === 0, last = i === path.length - 2, ph = { kind: 'walk', from: a, to: n, prev: first ? null : path[i - 1], next: last ? null : path[i + 2], L, cum, round: !st.stepMode,
      name: `${NODE_NAME[a]} → ${NODE_NAME[n]}`, ramp0: first ? Math.min(RAMP, L / 3) : 0, ramp1: last ? Math.min(RAMP, L / 3) : 0 };
    ph.dur = (L + ph.ramp0 + ph.ramp1) / SPEED; cum += L; return ph; }); };
  function legDist(ph, t) { const v = SPEED, L = ph.L, r0 = ph.ramp0, r1 = ph.ramp1, t0 = 2 * r0 / v, t1 = 2 * r1 / v, tc = (L - r0 - r1) / v;
    if (t <= t0) return r0 ? 0.5 * (v / t0) * t * t : 0; if (t <= t0 + tc) return r0 + v * (t - t0);
    const u = Math.min(t - t0 - tc, t1); return r0 + v * tc + (t1 ? v * u - 0.5 * (v / t1) * u * u : 0); }
  const unit = (a, b) => { const d = dist(a, b) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
  const bez = (p0, p1, p2, s) => [0, 1].map(k => (1 - s) * (1 - s) * p0[k] + 2 * (1 - s) * s * p1[k] + s * s * p2[k]);
  const bezT = (p0, p1, p2, s) => [0, 1].map(k => 2 * (1 - s) * (p1[k] - p0[k]) + 2 * s * (p2[k] - p1[k]));
  function legGeom(from, to, prev, next, round, d) {
    const A1 = NODE[from], B1 = NODE[to], dir = unit(A1, B1), L = dist(A1, B1);
    const rad = o => Math.min(CORNER, L / 2, dist(NODE[o[0]], NODE[o[1]]) / 2);
    let pos = [A1[0] + dir[0] * d, A1[1] + dir[1] * d], tan = dir;
    if (round && prev) { const r = rad([prev, from]); if (d < r) { const dp = unit(NODE[prev], A1), s = 0.5 + 0.5 * d / r, P0 = [A1[0] - dp[0] * r, A1[1] - dp[1] * r], P2 = [A1[0] + dir[0] * r, A1[1] + dir[1] * r]; pos = bez(P0, A1, P2, s); tan = bezT(P0, A1, P2, s); } }
    if (round && next) { const r = rad([to, next]); if (d > L - r) { const dn = unit(B1, NODE[next]), s = 0.5 * (d - (L - r)) / r, P0 = [B1[0] - dir[0] * r, B1[1] - dir[1] * r], P2 = [B1[0] + dn[0] * r, B1[1] + dn[1] * r]; pos = bez(P0, B1, P2, s); tan = bezT(P0, B1, P2, s); } }
    return { pos, tan };
  }
  const GLIDE = 0.8;
  function stepTan(ph, n, g0) { const ds = n * STRIDE - ph.cum, L = ph.L;
    return ds >= 0 ? legGeom(ph.from, ph.to, ph.prev, ph.next, ph.round, Math.min(L, ds)).tan
      : ph.prev ? legGeom(ph.prev, ph.from, null, ph.to, ph.round, Math.max(0, dist(NODE[ph.prev], NODE[ph.from]) + ds)).tan : g0.tan; }
  function pathAt(ph, dd) { const L = ph.L;
    return dd > L && ph.next ? legGeom(ph.to, ph.next, ph.from, null, ph.round, Math.min(dd - L, dist(NODE[ph.to], NODE[ph.next])))
      : dd < 0 && ph.prev ? legGeom(ph.prev, ph.from, null, ph.to, ph.round, Math.max(0, dist(NODE[ph.prev], NODE[ph.from]) + dd))
      : legGeom(ph.from, ph.to, ph.prev, ph.next, ph.round, Math.max(0, Math.min(L, dd))); }
  function cornerUpper(ph, d) {
    if (!ph.round || st.reduced || !TURN_UPPER) return null;
    const L = ph.L; let a, b, s;
    if (ph.prev) {
      const r = Math.min(CORNER, L / 2, dist(NODE[ph.prev], NODE[ph.from]) / 2);
      if (d < r) { a = unit(NODE[ph.prev], NODE[ph.from]); b = unit(NODE[ph.from], NODE[ph.to]); s = 0.5 + 0.5 * d / r; }
    }
    if (!a && ph.next) {
      const r = Math.min(CORNER, L / 2, dist(NODE[ph.to], NODE[ph.next]) / 2);
      if (d > L - r) { a = unit(NODE[ph.from], NODE[ph.to]); b = unit(NODE[ph.to], NODE[ph.next]); s = 0.5 * (d - (L - r)) / r; }
    }
    if (!a) return null;
    const from = facingOf([0, 0], a), to = facingOf([0, 0], b), views = LFL.rig.views;
    if (from === to || !views[from] || !views[to]) return null;
    const x = Math.max(0, Math.min(1, (s - 0.2) / 0.6)), u = x * x * (3 - 2 * x);
    return u > 0 && u < 1 ? { from, to, u } : null;
  }
  function walkPose(ph, t) {
    const L = ph.L, d = Math.min(L, legDist(ph, t)), w = ph.cum + d, g0 = legGeom(ph.from, ph.to, ph.prev, ph.next, ph.round, d);
    const n = Math.floor(w / STRIDE + 1e-9), u = w / STRIDE - n;
    let amp = st.reduced ? 0 : GLIDE * STRIDE / (2 * Math.PI);
    if (!ph.prev) amp *= Math.min(1, d / 0.3); if (!ph.next) amp *= Math.min(1, (L - d) / 0.3);
    const walkFacing = tan => { const f8 = IMG.idle && A.idle.turn ? facing8(tan) : facingOf([0, 0], tan); if (!(LFL && IMG.legsFL) || !isInter(f8)) return f8;
      const i = RING.indexOf(f8), V = LFL.rig.views; return V[RING[(i + 7) % 8]] && V[RING[(i + 1) % 8]] ? facingOf([0, 0], tan) : f8; };
    const RV = LFL && IMG.legsFL ? LFL.rig.views : {}, fStep = walkFacing(stepTan(ph, n, g0)), fNow = walkFacing(g0.tan), facingW = RV[fStep] && RV[fNow] ? fNow : fStep;
    const fl = !!RV[facingW];
    let flip = null; if (fl) for (let sb = 0.02; sb <= LFL.rig.flipLook + 1e-9; sb += 0.02) { const f = walkFacing(pathAt(ph, d - sb).tan); if (f !== facingW && RV[f]) { flip = { w: w - sb + 0.01, prev: f }; break; } }
    const dd = fl ? d : d + amp * Math.sin(2 * Math.PI * u);
    const g1 = !amp ? g0 : pathAt(ph, dd);
    const tanF = stepTan(ph, n, g0);
    const moving = (t > 0 || !!ph.prev) && d < L, vr = moving ? Math.min(1, (legDist(ph, t + 0.02) - legDist(ph, t)) / 0.02 / SPEED) : 0;
    const vrFl = !fl || !moving ? vr : ph.next && t + 0.02 > ph.dur ? Math.min(1, (legDist(ph, t) - legDist(ph, Math.max(0, t - 0.02))) / 0.02 / SPEED) : vr;
    return { pos: g0.pos, dpos: g1.pos, spr: 'walk', facing: facingW, row: n % 2, rig: fl ? { w, d, ph, v: vrFl, flip, upper: cornerUpper(ph, d), center: !!ph.afterStand, dip: st.reduced ? 0 : LFL.rig.dip * 0.5 * (1 - Math.cos(2 * Math.PI * u)) * vrFl } : null, moving, idle: !moving && !ph.toSeat, step: n, stepU: +u.toFixed(3),
      bob: moving && !st.reduced ? 0.5 * (1 + Math.cos(2 * Math.PI * u)) * vrFl : 0 };
  }
  const SIT_T = { turn: 0.15, face: 0.18, crouch: 1.0 }, STAND_T = { hold: 0.12, rise: 0.85, face: 0.15, turn: 0.12 };
  const RING = ['front-right', 'front', 'front-left', 'left', 'back-left', 'back', 'back-right', 'right'], TURN_STEP = 0.09;
  function ringSteps(f0, f1) { const a = RING.indexOf(f0), b = RING.indexOf(f1); if (a < 0 || b < 0 || a === b || !(IMG.idle && A.idle.turn)) return [];
    let d = (b - a + 8) % 8, dir = 1; if (d > 4 || (d === 4 && RING[(a + 1) % 8] !== 'front' && RING[(a + 2) % 8] !== 'front' && RING[(a + 3) % 8] !== 'front')) { dir = -1; d = 8 - d; }
    return Array.from({ length: d }, (_, i) => RING[(a + dir * (i + 1) + 8) % 8]); }
  const turnDur = (f0, f1) => ringSteps(f0, f1).length * TURN_STEP;
  const turnAt = (f0, f1, t) => { const s = ringSteps(f0, f1); if (!s.length) return { facing: f1, row: 0 }; const i = Math.min(s.length - 1, Math.floor(Math.max(0, t) / TURN_STEP)); return { facing: s[i], row: i === s.length - 1 ? 0 : (i + 1) % 2 }; };
  const stillAt = (pos, f) => ({ pos, dpos: pos, spr: 'walk', facing: f.facing, row: f.row, moving: false, idle: false, bob: 0 });
  const sideLen = k => dist(NODE[SEATS[k].approach], footAt(k, CHAIR_OUT)), sideDur = k => 0.35 + sideLen(k) / 0.6;
  const sideF = k => facingOf(NODE[SEATS[k].approach], footAt(k, CHAIR_OUT)), backF = k => facingOf(footAt(k, CHAIR_OUT), NODE[SEATS[k].approach]);
  const SIT2_IN = [['stand', 0.12], ['prep', 0.26], ['half', 0.26], ['seat', 0.32], ['hands', 0.24]], SIT2_OUT = [['hands', 0.18], ['seat', 0.3], ['half', 0.24], ['prep', 0.24], ['stand', 0.12]];
  const uses2 = k => !!(SEATS[k].sit2 && IMG.sit2), seqDur = q => q.reduce((m, e) => m + e[1], 0);
  const sitSeg = ph => { const k = ph.seat, a = Math.max(SIT_T.turn, turnDur(ph.enter || sideF(k), sideF(k))), b = Math.max(SIT_T.face, turnDur(sideF(k), 'back-right')); return { a, s: sideDur(k), b, c: uses2(k) ? seqDur(SIT2_IN) : SIT_T.crouch }; };
  const standSeg = ph => { const k = ph.seat, f = Math.max(STAND_T.face, turnDur('back-right', backF(k))), e = Math.max(STAND_T.turn, turnDur(backF(k), ph.exit || backF(k))); return { h: STAND_T.hold, r: uses2(k) ? seqDur(SIT2_OUT) : STAND_T.rise, f, s: sideDur(k), e }; };
  const seqAt = (q, t) => { let t0 = 0; for (const [n, d] of q) { if (t < t0 + d) return { n, u: (t - t0) / d, t0 }; t0 += d; } const e = q[q.length - 1]; return { n: e[0], u: 1, t0: t0 - e[1] }; };
  const segDur = o => Object.values(o).reduce((m, v) => m + v, 0);
  const sitP = (k, enter) => { const ph = { kind: 'sit', seat: k, name: '앉기', enter }; ph.dur = segDur(sitSeg(ph)); return ph; };
  const standP = k => { const ph = { kind: 'stand', seat: k, name: '일어나기' }; ph.dur = segDur(standSeg(ph)); return ph; };
  const turnP = (at, from, to) => ({ kind: 'turn', at, from, to, name: '방향 바꾸기', dur: turnDur(from, to) });
  const restP = k => ({ kind: SEATS[k].rest, seat: k, name: SEATS[k].name, rest: true });
  const idle = (node, name, facing, enter) => ({ kind: 'idle', at: node, name, rest: true, facing, enter });
  const leave = from => (SEATS[from] ? [standP(from)] : []), startNode = from => (SEATS[from] ? SEATS[from].approach : from);
  const walkFace0 = w => walkPose(w, 0).facing, walkFace1 = w => walkPose(w, w.dur).facing;
  const exitFacing = (arr, from) => { const w = arr.find(p => p.kind === 'walk');
    if (arr[0] && arr[0].kind === 'stand' && w) { arr[0].exit = walkFace0(w); arr[0].dur = segDur(standSeg(arr[0])); w.afterStand = true; } // floor-32: its start eases out of the turn's head-centred pose
    else if (w && SPOT_FACING()[from] && turnDur(SPOT_FACING()[from], walkFace0(w)) > 0) arr.unshift(turnP(from, SPOT_FACING()[from], walkFace0(w)));
    return arr; };
  const lastWalk = ws => (ws.length ? walkFace1(ws[ws.length - 1]) : undefined);
  const toSeat = k => from => { if (from === k) return [restP(k)]; const ws = walkPhases(route(startNode(from), SEATS[k].approach)).map(w => Object.assign(w, { toSeat: true }));
    return exitFacing([...leave(from), ...ws, sitP(k, lastWalk(ws)), restP(k)], from); }; // floor-22: legs into a sit never show the idle frame
  const toSpot = (node, name, facing) => from => { if (from === node) return [idle(node, name, facing)]; const ws = walkPhases(route(startNode(from), node));
    return exitFacing([...leave(from), ...ws, idle(node, name, facing, lastWalk(ws))], from); };
  let SPOT_F = null; const SPOT_FACING = () => SPOT_F || (SPOT_F = Object.assign({ E: 'back-right' }, ...Object.values(PLANS).map(p => p.spot ? { [p.spot[0]]: p.spot[1] } : {})));
  const PLAN_TARGET = { toDesk: 'desk', toMeeting: 'meet', toBench: 'BZ', toReview: 'RV', toCoffee: 'CO', toServer: 'SV', toEntry: 'E' };
  const PLANS = {
    toDesk: { label: '연구석에서 작업', short: '연구석', build: toSeat('desk') },
    toMeeting: { label: '회의실에서 레오와 회의', short: '회의실', build: toSeat('meet') },
    toBench: { label: '조이 벤치에서 재현 확인', short: '조이 벤치', build: toSpot('BZ', '조이 옆에서 보드 확인', 'back-right'), spot: ['BZ', 'back-right'] },
    toReview: { label: '노아에게 검토 요청', short: '노아 검토석', build: toSpot('RV', '노아 옆에서 검토 요청', 'back-left'), spot: ['RV', 'back-left'] },
    toCoffee: { label: '음료대 들르기', short: '음료대', build: toSpot('CO', '음료대 앞', 'back-right'), spot: ['CO', 'back-right'] },
    toServer: { label: '서버실에서 맥스와 점검', short: '서버실', build: toSpot('SV', '랙 앞에서 점검', 'back-right'), spot: ['SV', 'back-right'] },
    toEntry: { label: '출입구로 나가기', short: '출입구', build: toSpot('E', '출입구에서 대기', 'back-right'), spot: ['E', 'back-right'] },
  };

  const typing = t => { if (!active('finn')) return false; const u = t % 12; return u < 2.2 || (u > 6.5 && u < 9.2); };
  const hash1 = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const keySlot = t => typing(t) && (t % 1.7) < 1.32 && hash1(Math.floor(t / 0.16)) > 0.4;
  const keyDown = t => keySlot(t) && (t / 0.16) % 1 < 0.62;
  const TYPE_HAND = { L: { piece: [[1128, 330], [1145, 314], [1166, 309], [1188, 311], [1206, 323], [1219, 337], [1212, 348], [1204, 350], [1206, 360], [1195, 368], [1170, 372], [1148, 370], [1143, 352]], pivot: [1140, 345] },
    R: { piece: MEET_HAND.hand, pivot: MEET_HAND.pivot } }, TYPE_DIP = { L: 5, R: 3 };
  const typeHands = (t, rShare = 0.2) => { const n = Math.floor(t / 0.16), u = t / 0.16 - n, p = keySlot(t) && u < 0.62 ? Math.sin(Math.PI * u / 0.62) : 0, right = hash1(n * 3 + 1) > 1 - rShare;
    return { L: right ? 0 : TYPE_DIP.L * p, R: right ? TYPE_DIP.R * p : 0 }; };
  function pose(ph, t) {
    if (!ph) return null;
    if (ph.kind === 'idle') { if (ph.enter && t < turnDur(ph.enter, ph.facing)) return stillAt(NODE[ph.at], turnAt(ph.enter, ph.facing, t)); // floor-28: arrival turn
      return { pos: NODE[ph.at], spr: 'walk', facing: ph.facing, row: 0, idle: true }; }
    if (ph.kind === 'turn') return stillAt(NODE[ph.at], turnAt(ph.from, ph.to, t));
    if (ph.kind === 'walk') return walkPose(ph, t);
    const S1 = SEATS[ph.seat], seat = S1.seat, ap = NODE[S1.approach];
    if (ph.kind === 'work') { const ty = st.reduced ? null : typeHands(t, uses2(ph.seat) ? 0.45 : 0.2);
      if (uses2(ph.seat)) return { pos: seat, hip: hipAt(ph.seat, SEAT_IN), foot: footAt(ph.seat, SEAT_IN), chairOff: SEAT_IN, seatKey: ph.seat, spr: 'seated', cell: 'sit2:type', sit2: 'type', seated: true, type: ty };
      return { pos: seat, hip: hipAt(ph.seat, SEAT_IN), foot: footAt(ph.seat, SEAT_IN), chairOff: SEAT_IN, seatKey: ph.seat, spr: 'seated', cell: 'seatA', seated: true, type: ty }; }
    if (ph.kind === 'meet') { const b = st.reduced ? null : meetBeat(t); return { pos: seat, hip: hipAt(ph.seat, SEAT_IN), foot: footAt(ph.seat, SEAT_IN), chairOff: SEAT_IN, seatKey: ph.seat, spr: 'seated', cell: 'seatA', seated: true, meet: true, hand: b ? b.finnHand : 0, headRot: b ? b.finnNod : 0 }; } // floor-23: listening / speaking turns, pen and pad (no typing)
    const k = ph.seat, Fo = footAt(k, CHAIR_OUT), Ls = dist(ap, Fo), sd = sideDur(k), STEP_IN = 0.26, clamp = v => Math.max(0, Math.min(1, v));
    const sq = (off, cell, seg) => ({ pos: hipAt(k, Math.max(0, off)), hip: hipAt(k, off), foot: footAt(k, off), chairOff: off, seatKey: k, spr: 'seated', cell, seg, seated: !seg });
    const side = (s, back) => ({ pos: lerp(ap, Fo, s), dpos: lerp(ap, Fo, s), seatKey: k, chairOff: CHAIR_OUT, spr: 'walk', facing: back ? facingOf(Fo, ap) : facingOf(ap, Fo), row: Math.floor(Ls * s / STEP_IN + 1e-9) % 2, moving: true, idle: false, bob: 0 });
    const RIG_OK = !!(LFL && IMG.legsFL), outPath = dd => lerp(Fo, ap, clamp(dd / Ls)), outStride = Ls / Math.max(1, Math.round(Ls / STRIDE));
    const sideOut = x => { const s = 1 - ease(x), q = side(s, true); if (!RIG_OK || !LFL.rig.views[q.facing]) return q;
      const w = Ls * ease(x), v = st.reduced ? 1 : Math.min(1, 6 * x * (1 - x) * Ls / sd / SPEED);
      return Object.assign(q, { rig: { w, d: w, path: outPath, stride: outStride, v, center: true, centerFade: x, dip: st.reduced ? 0 : LFL.rig.dip * 0.5 * (1 - Math.cos(2 * Math.PI * w / outStride)) * v } }); };
    const rigRest = (q, at, old = true) => RIG_OK && LFL.rig.views[q.facing] ? Object.assign(q, { rig: { w: 0, d: 0, path: () => at, v: 0, dip: 0, center: true } }) : old ? Object.assign(q, { center: true }) : q;
    const atFo = f => Object.assign(stillAt(Fo, f), { seatKey: k, chairOff: CHAIR_OUT }); // standing at the chair front (floor-23 faceDesk fields)
    const pose2 = (k2, n, off) => n === 'stand' ? Object.assign(atFo({ facing: 'back-right', row: 0 }), { sit2: n })
      : { pos: hipAt(k2, Math.max(0, off)), hip: hipAt(k2, off), foot: footAt(k2, ['prep', 'half'].includes(n) ? CHAIR_OUT : off), chairOff: off, seatKey: k2, spr: 'seated', cell: 'sit2:' + n, sit2: n, seated: !['prep', 'half'].includes(n) };
    const standPrep = (u, off) => Object.assign(pose2(k, u < 0.5 ? 'stand' : 'prep', off), { seatFlow: u });
    if (ph.kind === 'sit') { const T = sitSeg(ph), a1 = T.a, s1 = a1 + T.s, c0 = s1 + T.b; // floor-28: turns through the views at both stops
      if (t < a1) return stillAt(ap, turnAt(ph.enter || sideF(k), sideF(k), t)); // short turns stay on walking frames (no idle-frame flash)
      if (t < s1) return side(ease((t - a1) / sd), false);
      if (t < c0) { const f = turnAt(sideF(k), 'back-right', t - s1); return uses2(k) && f.facing === 'back-right' ? pose2(k, 'stand', CHAIR_OUT) : atFo(f); } // floor-28: the turn lands in the sheet's standing pose (head over both feet), not the mid-stride walking frame
      if (t < ph.dur && uses2(k)) { const flowDur = seqDur(SIT2_IN.slice(0, 2));
        if (SEAT_FLOW && !st.reduced && t - c0 < flowDur) return standPrep(ease(clamp((t - c0) / flowDur)), CHAIR_OUT);
        const e = seqAt(SIT2_IN, t - c0), r0 = seqDur(SIT2_IN.slice(0, 3)), off = SEAT_IN + (CHAIR_OUT - SEAT_IN) * (1 - ease(clamp((t - c0 - r0) / (T.c - r0)))); return Object.assign(pose2(k, e.n, off), e.n === 'half' ? { lean: ease(e.u) } : e.n === 'seat' ? { drop: 1 - ease(e.u) } : {}); }
      if (t < ph.dur) { const u = (t - c0) / T.c; return sq(SEAT_IN + (CHAIR_OUT - SEAT_IN) * (1 - ease(clamp((u - 0.2) / 0.75))), 'mid', lerpSeg(LEAN_A, LEAN_B, ease(clamp(u / 0.85)))); }
      if (uses2(k)) return pose2(k, 'type', SEAT_IN);
      return Object.assign(sq(SEAT_IN, 'seatA'), { meet: k === 'meet' }); }
    const T = standSeg(ph), r1 = T.h + T.r, f1 = r1 + T.f, s1 = f1 + T.s;
    if (t < T.h) return uses2(k) ? pose2(k, 'type', SEAT_IN) : Object.assign(sq(SEAT_IN, 'seatA'), { meet: k === 'meet' });
    if (t < r1 && uses2(k)) { const flowStart = seqDur(SIT2_OUT.slice(0, 3)), flowDur = seqDur(SIT2_OUT.slice(3));
      if (SEAT_FLOW && !st.reduced && t - T.h >= flowStart) return standPrep(1 - ease(clamp((t - T.h - flowStart) / flowDur)), CHAIR_OUT);
      const e = seqAt(SIT2_OUT, t - T.h), r0 = seqDur(SIT2_OUT.slice(0, 2)), off = SEAT_IN + (CHAIR_OUT - SEAT_IN) * ease(clamp((t - T.h) / r0)); return Object.assign(pose2(k, e.n, off), e.n === 'half' ? { lean: 1 - ease(e.u) } : e.n === 'seat' ? { drop: ease(e.u) } : {}); }
    if (t < r1) { const u = (t - T.h) / T.r; return sq(SEAT_IN + (CHAIR_OUT - SEAT_IN) * ease(clamp(u / 0.8)), 'mid', lerpSeg(LEAN_B, LEAN_A, ease(clamp((u - 0.1) / 0.9)))); }
    if (t < f1) return rigRest(atFo(turnAt('back-right', backF(k), t - r1)), Fo, false);
    if (t < s1) return sideOut((t - f1) / sd);
    return rigRest(stillAt(ap, turnAt(backF(k), ph.exit || backF(k), t - s1)), ap);
  }

  const inBox = (pos, fp, r) => pos[0] > fp[0] - r && pos[0] < fp[2] + r && pos[1] > fp[1] - r && pos[1] < fp[3] + r;
  const seatPhase = ph => ph && ['sit', 'work', 'meet', 'stand'].includes(ph.kind);
  const hits = (pos, ph) => F.filter(f => f.collide && !(seatPhase(ph) && (f.id === SEATS[ph.seat].chair || f.id === SEATS[ph.seat].chair + '-back')) && inBox(pos, f.fp, R)).map(f => f.id);
  const roomOk = pos => pos[0] - R >= 0 && pos[1] - R >= 0 && pos[0] + R <= RX && pos[1] + R <= RY;
  const routeCheck = EDGE.map(([a, b]) => { const bad = new Set(); for (let u = 0; u <= 1.0001; u += 0.01) hits(lerp(NODE[a], NODE[b], u), null).forEach(h => bad.add(h)); return { edge: a + '-' + b, len: +dist(NODE[a], NODE[b]).toFixed(2), hits: [...bad] }; });
  function inFront(f, pos, geom) {
    if (f.under && !geom) return false;
    if (f.onDesk) return inFront(F.find(x => x.id === f.onDesk), pos, geom);
    const c = [pos[0] - R, pos[1] - R, pos[0] + R, pos[1] + R], b = f.fp;
    const ahead = b[0] >= c[2] - 1e-6 || b[1] >= c[3] - 1e-6, behindF = c[0] >= b[2] - 1e-6 || c[1] >= b[3] - 1e-6;
    if (ahead && !behindF) return true;
    if (behindF && !ahead) return false;
    if (b[0] - b[3] > pos[0] - pos[1] + 1.0 || b[2] - b[1] < pos[0] - pos[1] - 1.0) return false;
    const u = Math.min(b[2] - b[1], Math.max(b[0] - b[3], pos[0] - pos[1])), fx = Math.min(b[2], u + b[3]);
    return 2 * fx - u > pos[0] + pos[1];
  }

  const IMG = {}, imgState = {};
  function load(key, src) { return new Promise(res => { const im = new Image(); im.onload = () => { IMG[key] = im; imgState[key] = { ok: true, w: im.naturalWidth, h: im.naturalHeight }; res(); }; im.onerror = () => { imgState[key] = { ok: false }; res(); }; im.src = src; }); }
  function extBox(e) { const c = []; for (const x of [e[0], e[3]]) for (const y of [e[1], e[4]]) for (const z of [e[2], e[5]]) c.push(P(x, y, z)); return [Math.min(...c.map(p => p[0])), Math.min(...c.map(p => p[1])), Math.max(...c.map(p => p[0])), Math.max(...c.map(p => p[1]))]; }
  function drawSprite(g, f) {
    const m = A.scene[f.sprite], im = IMG[m.atlas], bb = extBox(f.ext), b = m.bounds, k = (bb[2] - bb[0]) / (b[2] - b[0] + 1);
    let dx = (bb[0] + bb[2]) / 2 - (b[0] + b[2] + 1) / 2 * k, dy = bb[3] - (b[3] + 1) * k;
    if (m.seat && f.seatAt) { const sp = P(f.seatAt[0], f.seatAt[1], SEAT_Z); dx = sp[0] - m.seat[0] * k; dy = sp[1] - m.seat[1] * k; }
    const T = (x, y) => [dx + x * k, dy + y * k];
    g.save();
    if (f.front) { g.beginPath(); for (const pg of m.front) { pg.forEach((p, i) => (i ? g.lineTo(...T(...p)) : g.moveTo(...T(...p)))); g.closePath(); } g.clip(); }
    if (m.poly) { const xs = m.poly.map(p => p[0]), ys = m.poly.map(p => p[1]), rx = Math.min(...xs), ry = Math.min(...ys);
      g.beginPath(); m.poly.forEach((p, i) => (i ? g.lineTo(...T(...p)) : g.moveTo(...T(...p)))); g.closePath(); g.clip();
      g.drawImage(im, rx, ry, Math.max(...xs) - rx, Math.max(...ys) - ry, dx + rx * k, dy + ry * k, (Math.max(...xs) - rx) * k, (Math.max(...ys) - ry) * k);
    } else for (const [rx, ry, rw, rh] of m.rects) g.drawImage(im, rx, ry, rw, rh, dx + rx * k, dy + ry * k, rw * k, rh * k);
    g.restore();
    if (f.after) f.after(g, f, T, k);
  }
  const drawPiece = (g, f, t) => (f.sprite && IMG.furniture && A.scene[f.sprite] ? drawSprite(g, f) : f.draw(g, t));

  function seatedBody(g, q, drawCell) {
    if (q.type && (q.type.L || q.type.R)) { typedBody(g, q.type, drawCell); return; }
    if (!q.meet) { drawCell(); return; }
    const M = MEET_HAND, o = -A.seated.cols.seatA * A.seated.cw, L = pts => pts.map(([x, y]) => [x + o, y]), path = pts => pts.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])));
    const hand = L(M.hand), hole = L(M.hole), mouseCut = L(M.mouse), pv = [M.pivot[0] + o, M.pivot[1]], a = (q.hand || 0) * Math.PI / 180;
    g.save(); g.beginPath(); g.rect(0, 0, A.seated.cw, A.seated.ch); path(hole); g.closePath(); g.clip('evenodd'); drawCell(); g.restore();
    g.save(); g.translate(pv[0], pv[1]); g.rotate(a); g.translate(-pv[0], -pv[1]);
    const [p0, p1] = L(M.pen); g.lineCap = 'round'; g.strokeStyle = '#1d2233'; g.lineWidth = 12; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    g.strokeStyle = '#3d5288'; g.lineWidth = 6; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p0[0] + (p1[0] - p0[0]) * 0.82, p0[1] + (p1[1] - p0[1]) * 0.82); g.stroke();
    g.beginPath(); path(hand); g.closePath(); path(mouseCut); g.closePath(); g.clip('evenodd'); drawCell(); g.restore();
  }
  function typedBody(g, ty, drawCell) {
    const o = -A.seated.cols.seatA * A.seated.cw, L = pts => pts.map(([x, y]) => [x + o, y]), path = pts => pts.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])));
    const moving = Object.keys(TYPE_HAND).filter(h => ty[h]);
    g.save(); g.beginPath(); g.rect(0, 0, A.seated.cw, A.seated.ch); for (const h of moving) { path(L(TYPE_HAND[h].piece)); g.closePath(); } g.clip('evenodd'); drawCell(); g.restore();
    for (const h of moving) { const pv = [TYPE_HAND[h].pivot[0] + o, TYPE_HAND[h].pivot[1]];
      g.save(); g.translate(pv[0], pv[1]); g.rotate(ty[h] * Math.PI / 180); g.translate(-pv[0], -pv[1]); g.beginPath(); path(L(TYPE_HAND[h].piece)); g.closePath(); g.clip(); drawCell(); g.restore(); }
  }
  const SEAT_FLOW_ROWS = {
    stand: [[0, -513], [0, -278], [-21, -158], [-16, -88], [0, -48], [0, 0], [0, 24]],
    prep: [[19, -470], [19, -235], [-33, -127], [-15, -67], [0, -48], [0, 0], [0, 24]],
  }, seatFlowCells = new Map();
  function drawSeatFlow(g, q) {
    const u = q.seatFlow, n = u < 0.5 ? 'stand' : 'prep', src = SEAT_FLOW_ROWS[n];
    const target = SEAT_FLOW_ROWS.stand.map((v, i) => v.map((x, k) => x + (SEAT_FLOW_ROWS.prep[i][k] - x) * u));
    const f = S2.foot[n], r = S2.rect[n], fw = q.spr === 'walk' ? (q.dpos || q.pos) : q.foot, p = P(fw[0], fw[1]);
    if (!seatFlowCells.has(n)) {
      const c = document.createElement('canvas'); c.width = r[2]; c.height = r[3];
      c.getContext('2d').drawImage(IMG.sit2, ...r, 0, 0, r[2], r[3]); seatFlowCells.set(n, c);
    }
    const cell = seatFlowCells.get(n);
    g.save(); g.translate(p[0], p[1]); g.scale(K2, K2);
    for (let i = 0; i < src.length - 1; i++) {
      const y0 = src[i][1] + f[1], y1 = src[i + 1][1] + f[1], dy = y1 - y0;
      const sy = (target[i + 1][1] - target[i][1]) / dy;
      const dx0 = target[i][0] - src[i][0], dx1 = target[i + 1][0] - src[i + 1][0], sx = (dx1 - dx0) / dy;
      g.save(); g.transform(1, 0, sx, sy, -(f[0] - r[0]) + dx0 - sx * y0, target[i][1] - sy * y0);
      g.beginPath(); g.rect(-512, y0 - 0.5, 1536, dy + 1); g.clip(); g.drawImage(cell, 0, 0); g.restore();
    }
    g.restore();
    const head = n2 => [S2.headCx[n2] - S2.foot[n2][0], S2.top[n2] - S2.foot[n2][1]];
    const A0 = head('stand'), B0 = head('prep'), bounds = n2 => S2.bx[n2].map(x => x - S2.foot[n2][0]);
    const BA = bounds('stand'), BB = bounds('prep');
    st.finnHead = [p[0] + (A0[0] + (B0[0] - A0[0]) * u) * K2, p[1] + (A0[1] + (B0[1] - A0[1]) * u) * K2];
    st.finnRect = [p[0] + (BA[0] + (BB[0] - BA[0]) * u) * K2, st.finnHead[1], p[0] + (BA[1] + (BB[1] - BA[1]) * u) * K2, p[1] + 6];
  }
  function drawSit2(g, q) {
    if (q.seatFlow > 0 && q.seatFlow < 1) { drawSeatFlow(g, q); return; }
    const n = q.sit2, r = S2.rect[n], f = S2.foot[n], fw = q.spr === 'walk' ? (q.dpos || q.pos) : q.foot, p = P(fw[0], fw[1]), path = pts => pts.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])));
    const ty = n === 'type' && q.type ? q.type : null, moving = ty ? ['L', 'R'].filter(h => ty[h]) : [], H = h => S2['hand' + h];
    g.save(); g.translate(p[0], p[1]); g.scale(K2, K2); g.translate(-f[0], -f[1]);
    const cell = () => g.drawImage(IMG.sit2, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]), HS = S2.halfSeg, ln = n === 'half' && HS && q.lean ? q.lean : 0;
    const SS = S2.seatSeg, dr = n === 'seat' && SS && q.drop ? q.drop : 0;
    if (dr) { // seat pose straightening up from the half pose's height: legs fixed, upper piece moved down (clip + translate)
      g.save(); g.beginPath(); path(SS.lower); g.closePath(); g.clip(); cell(); g.restore();
      g.save(); g.translate(0, SS.dy * dr); g.beginPath(); path(SS.upper); g.closePath(); g.clip(); cell(); g.restore(); }
    else if (ln) { // half pose leaning back toward the seated pose: legs fixed, upper piece turned about the hip (clip + affine)
      g.save(); g.beginPath(); path(HS.lower); g.closePath(); g.clip(); cell(); g.restore();
      g.save(); g.translate(0, HS.lean.dy * ln); g.translate(HS.pivot[0], HS.pivot[1]); g.rotate(HS.lean.rot * ln * Math.PI / 180); g.translate(-HS.pivot[0], -HS.pivot[1]); g.beginPath(); path(HS.upper); g.closePath(); g.clip(); cell(); g.restore(); }
    else { g.save(); g.beginPath(); g.rect(r[0], r[1], r[2], r[3]); for (const h of moving) { path(H(h).piece); g.closePath(); } g.clip('evenodd'); cell(); g.restore(); }
    for (const h of moving) { const pv = H(h).pivot; g.save(); g.translate(pv[0], pv[1]); g.rotate(ty[h] * Math.PI / 180); g.translate(-pv[0], -pv[1]); g.beginPath(); path(H(h).piece); g.closePath(); g.clip(); g.drawImage(IMG.sit2, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]); g.restore(); }
    g.restore();
    const X = x => p[0] + (x - f[0]) * K2, Y = y => p[1] + (y - f[1]) * K2;
    let hx = S2.headCx[n], hy = S2.top[n]; if (ln) { const a = HS.lean.rot * ln * Math.PI / 180, u = hx - HS.pivot[0], v = hy - HS.pivot[1]; hx = HS.pivot[0] + u * Math.cos(a) - v * Math.sin(a); hy = HS.pivot[1] + u * Math.sin(a) + v * Math.cos(a) + HS.lean.dy * ln; }
    if (dr) hy += SS.dy * dr; st.finnHead = [X(hx), Y(hy)]; st.finnRect = [X(S2.bx[n][0]), Y(S2.top[n]), X(S2.bx[n][1]), p[1] + 6];
  }
  const flAnchor = () => { const G = flRest(); return G.ank[0] + LFL.rig.lat[0] / 2; }, flAnchorIn = V => V.mirror ? V.mirror - flAnchor() : flAnchor();
  const flRest = () => { const R = LFL.rig, [k, tx, ty] = LFL.place[R.cell], c = v => [v[0] * k + tx, v[1] * k + ty]; return { hip: c(R.hip), knee: c(R.knee), ank: c(R.ankle) }; };
  const flHeadOff = V => V.head - flAnchorIn(V);
  function flLegs(q) {
    const R = LFL.rig, V = R.views[q.facing] || R.views['front-left'], mx = V.mirror ? -1 : 1, SL = q.rig.stride || STRIDE, G = flRest(), L1 = Math.hypot(G.knee[0] - G.hip[0], G.knee[1] - G.hip[1]), L2 = Math.hypot(G.ank[0] - G.knee[0], G.ank[1] - G.knee[1]), LL = L1 + L2;
    const raise = (q.bob || 0) * 0.03 * S / KW - q.rig.dip, out = {}; // the floor seen from a raised (lowered) figure
    const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, vv = q.rig.v === undefined ? 1 : q.rig.v, F = q.rig.flip, VP = F ? R.views[F.prev] : null;
    const cf = q.rig.centerFade, want = q.rig.center ? -flHeadOff(V) * (cf === undefined ? 1 - vv : Math.max(1 - sm(cf / 0.25), sm((cf - 0.75) / 0.25))) : 0;
    let shift = CENTER_UPPER ? 0 : want;
    const role = (X, ph0) => ((ph0 === 0) !== !!X.swap ? 'near' : 'far');
    const feetOf = (w, dR, bw, raiseV) => [0, 0.5].map(ph0 => {
      const n = role(V, ph0), o = n === 'far' ? R.lat : [0, 0];
      let oy = o[1];
      if (VP) { const yP = role(VP, ph0) === 'far' ? R.lat[1] : 0, pf = ((((F.w / SL - 0.5) / 2 + ph0) % 1) + 1) % 1;
        const sw = w0 => (w < w0 ? 0 : sm((w - w0) / SL)), b = pf < 0.5 ? sw(F.w + (0.5 - pf) * 2 * SL) : (1 - pf) * 2 * SL >= SL / 2 ? sm((w - F.w) / ((1 - pf) * 2 * SL)) : sw(F.w + (1 - pf) * 2 * SL + SL); // a swing with less than half left waits for the next one
        oy = yP + (o[1] - yP) * b; }
      const ph = ((((w / SL - 0.5) / 2 + ph0) % 1) + 1) % 1, stance = ph < 0.5, k = stance ? ph / 0.5 : (ph - 0.5) / 0.5;
      const u = stance ? SL / 2 - k * SL : -SL / 2 + k * k * (3 - 2 * k) * SL, lift = stance || st.reduced ? 0 : R.lift * Math.sin(Math.PI * k) * vv;
      const fw = q.rig.path ? q.rig.path(dR + u) : pathAt(q.rig.ph, dR + u).pos, fp = P(fw[0], fw[1]), bp = P(bw[0], bw[1]);
      return { n, o, oy, stance, k, lift, hip0: [G.hip[0] + o[0], G.hip[1] + oy], ank0: [G.ank[0] + o[0] + mx * (fp[0] - bp[0]) / KW, G.ank[1] + oy + (fp[1] - bp[1]) / KW - lift + raiseV] }; });
    const feet = feetOf(q.rig.w, q.rig.d, q.dpos || q.pos, raise);
    if (shift) { let lo = -Infinity, hi = Infinity; for (const f of feet) if (f.stance) { const dx = f.ank0[0] - f.hip0[0], dy = f.ank0[1] - f.hip0[1], R2 = (LL * R.maxS) ** 2 - dy * dy; if (R2 <= 0) { lo = 1; hi = -1; break; } lo = Math.max(lo, dx - Math.sqrt(R2)); hi = Math.min(hi, dx + Math.sqrt(R2)); }
      const sx = mx * shift, c2 = lo > hi ? 0 : Math.max(lo, Math.min(hi, sx)); shift = (c2 === 0 || Math.sign(c2) !== Math.sign(sx)) ? 0 : mx * c2; }
    out.shift = shift; out.shiftWanted = want; out.upperCenter = CENTER_UPPER ? want : 0;
    for (const f of feet) { const { n, o, oy, stance, k, lift } = f;
      const hip = [f.hip0[0] + mx * shift, f.hip0[1]];
      let ank = f.ank0.slice(), v = [ank[0] - hip[0], ank[1] - hip[1]], d = Math.hypot(v[0], v[1]), slide = 0;
      const sc = Math.max(R.minS, Math.min(R.maxS, d / LL)); if (d > LL * sc) { slide = d - LL * sc; ank = [hip[0] + v[0] / d * LL * sc, hip[1] + v[1] / d * LL * sc]; v = [ank[0] - hip[0], ank[1] - hip[1]]; d = LL * sc; }
      const l1 = L1 * sc, l2 = L2 * sc, e = [v[0] / d, v[1] / d], ca = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))), sa = Math.sqrt(1 - ca * ca);
      let nv = [-e[1], e[0]]; if (nv[0] > 0) nv = [e[1], -e[0]]; // the knee bends towards screen left (the travel side)
      out[n] = { stance, k, mirror: V.mirror || 0, hip, ank, knee: [hip[0] + e[0] * l1 * ca + nv[0] * l1 * sa, hip[1] + e[1] * l1 * ca + nv[1] * l1 * sa], sc, slide, tilt: stance || st.reduced ? 0 : R.tilt * Math.sin(2 * Math.PI * k) * (k < 0.5 ? 1 : 0.6) };
    }
    return out;
  }
  const TURN_ROWS = [0, 140, 180, 205, 230, 260, 320, A.walk.ch];
  const TURN_GRID = {
    'front-left': [
      [0, 100, 170, 240, 305, 360, A.walk.cw],
      [0, 110, 170, 240, 300, 350, A.walk.cw],
      [0, 140, 180, 211, 245, 310, A.walk.cw],
      [0, 140, 185, 212, 239, 302, A.walk.cw],
      [0, 150, 180, 215, 250, 300, A.walk.cw],
      [0, 135, 190, 230, 270, 345, A.walk.cw],
      [0, 150, 200, 245, 300, 360, A.walk.cw],
      [0, 150, 200, 245, 300, 360, A.walk.cw]],
    'front-right': [
      [0, 100, 170, 239, 305, 360, A.walk.cw],
      [0, 110, 180, 245, 310, 360, A.walk.cw],
      [0, 140, 230, 255, 280, 330, A.walk.cw],
      [0, 160, 232, 254, 277, 315, A.walk.cw],
      [0, 140, 225, 255, 290, 330, A.walk.cw],
      [0, 125, 180, 235, 290, 340, A.walk.cw],
      [0, 126, 180, 235, 300, 356, A.walk.cw],
      [0, 126, 180, 235, 300, 356, A.walk.cw]]
  };
  const upperCells = new Map(); let upperWarp = null, upperOther = null;
  function drawCornerUpper(g, turn, p, footY, shift, centerShift = 0) {
    const cw = A.walk.cw, ch = A.walk.ch, R = LFL.rig, U = R.views[turn.from], V = R.views[turn.to], u = turn.u;
    if (!upperWarp) {
      upperWarp = document.createElement('canvas'); upperWarp.width = Math.ceil(cw + 128); upperWarp.height = Math.ceil(ch);
      upperOther = document.createElement('canvas'); upperOther.width = upperWarp.width; upperOther.height = upperWarp.height;
    }
    const mid = upperWarp.width / 2;
    const centreWeight = y => { const x = Math.max(0, Math.min(1, (y - 230) / 90)); return 1 - x * x * (3 - 2 * x); };
    const target = TURN_ROWS.map((y, r) => TURN_GRID[turn.from][r].map((x, c) => [mid + (x - flAnchorIn(U)) * (1 - u) + (TURN_GRID[turn.to][r][c] - flAnchorIn(V)) * u + centerShift * centreWeight(y), y]));
    const warp = (name, canvas) => {
      const view = R.views[name], wg = canvas.getContext('2d');
      if (!upperCells.has(name)) {
        const c = document.createElement('canvas'); c.width = Math.ceil(cw); c.height = Math.ceil(ch); const cg = c.getContext('2d'), hem = view.hem || LFL.hem;
        cg.beginPath(); [[0, 0], [cw, 0], [cw, ch], [400, ch], ...hem.slice().reverse(), [120, ch], [0, ch]].forEach(([x, y], i) => i ? cg.lineTo(x, y) : cg.moveTo(x, y)); cg.closePath(); cg.clip();
        cg.drawImage(IMG.walk, view.col * cw, 0, cw, ch, 0, 0, cw, ch); upperCells.set(name, c);
      }
      wg.setTransform(1, 0, 0, 1, 0, 0); wg.clearRect(0, 0, canvas.width, canvas.height);
      const grid = TURN_GRID[name], cell = upperCells.get(name);
      const tri = points => {
        const src = points.map(([r, c]) => [grid[r][c], TURN_ROWS[r]]), dst = points.map(([r, c]) => target[r][c]);
        const [a, b, c] = src, [A0, B0, C0] = dst, det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
        const ax = ((B0[0] - A0[0]) * (c[1] - a[1]) - (C0[0] - A0[0]) * (b[1] - a[1])) / det;
        const bx = ((C0[0] - A0[0]) * (b[0] - a[0]) - (B0[0] - A0[0]) * (c[0] - a[0])) / det;
        wg.save(); wg.beginPath();
        const cx = (A0[0] + B0[0] + C0[0]) / 3, cy = (A0[1] + B0[1] + C0[1]) / 3;
        dst.forEach(([x, y], i) => { const l = Math.hypot(x - cx, y - cy), pt = [x + 1.5 * (x - cx) / l, y + 1.5 * (y - cy) / l]; i ? wg.lineTo(...pt) : wg.moveTo(...pt); }); wg.closePath(); wg.clip();
        wg.setTransform(ax, 0, bx, 1, A0[0] - ax * a[0] - bx * a[1], 0); wg.drawImage(cell, 0, 0); wg.restore();
      };
      for (let r = 0; r < TURN_ROWS.length - 1; r++) for (let c = 0; c < grid[r].length - 1; c++) {
        tri([[r, c], [r, c + 1], [r + 1, c]]); tri([[r, c + 1], [r + 1, c + 1], [r + 1, c]]);
      }
    };
    const primary = u < 0.5 ? turn.from : turn.to, other = u < 0.5 ? turn.to : turn.from;
    warp(primary, upperWarp);
    if (BLEND_UPPER && primary !== other) {
      warp(other, upperOther);
      const og = upperOther.getContext('2d'), face = og.createLinearGradient(0, 135, 0, 255);
      face.addColorStop(0, 'rgba(0,0,0,0)'); face.addColorStop(1 / 6, '#000');
      face.addColorStop(5 / 6, '#000'); face.addColorStop(1, 'rgba(0,0,0,0)');
      og.save(); og.globalCompositeOperation = 'destination-out'; og.fillStyle = face;
      og.fillRect(0, 135, upperOther.width, 120); og.restore();
      const wg = upperWarp.getContext('2d');
      wg.save(); wg.globalCompositeOperation = 'source-atop'; wg.globalAlpha = u < 0.5 ? u : 1 - u;
      wg.drawImage(upperOther, 0, 0); wg.restore();
    }
    g.drawImage(upperWarp, p[0] + (shift - mid) * KW, p[1] - footY * KW, upperWarp.width * KW, upperWarp.height * KW);
  }
  function drawFinn(g, q) {
    if (q.sit2 && IMG.sit2) { drawSit2(g, q); return; }
    if (q.spr === 'walk' && IMG.idle && isInter(q.facing)) { // floor-23 in-between view (moving or standing)
      const I = A.idle, c = I.turn[q.facing], row = q.idle ? 0 : q.row, f = c.foot[row], k = CH / I.height, dp = q.dpos || q.pos, p0 = P(dp[0], dp[1]), p = [p0[0] - (q.center && c.head ? (c.head[row] - f[0]) * k : 0), p0[1] - (q.bob || 0) * 0.03 * S]; // floor-32: q.center puts the head over the floor point
      const sx = c.col * I.cw, sy = row * I.ch; g.save(); g.translate(p[0], p[1]); if (c.mirror) g.scale(-1, 1);
      g.drawImage(IMG.idle, sx, sy, I.cw, I.ch, -(f[0] - sx) * k, -(f[1] - sy) * k, I.cw * k, I.ch * k); g.restore();
      st.finnRect = [p[0] - 0.42 * I.cw * k, p[1] - CH * 1.05, p[0] + 0.42 * I.cw * k, p[1] + 6]; st.finnHead = [p[0], p[1] - CH]; return;
    }
    if (q.spr === 'walk' && q.idle && IMG.idle) {
      const I = A.idle, c = I.cells[q.facing.startsWith('front') ? 'front' : 'back'], k = CH / I.height, sx = c.col * I.cw, p = P(q.pos[0], q.pos[1]);
      const ox = p[0] - c.foot[0] * k, oy = p[1] - c.foot[1] * k, ph = cur(), th = c.col === 1 && ph.rest && ph.kind === 'idle' && !st.reduced ? headAngle(FINN_LOOK, st.t) : 0;
      if (!th) g.drawImage(IMG.idle, sx, 0, I.cw, I.ch, p[0] - (c.foot[0] - sx) * k, p[1] - c.foot[1] * k, I.cw * k, I.ch * k);
      else { // floor-21: at a destination Finn (back view) now and then lowers his head to the board / screen / counter in front
        const cut = FINN_LOOK.cut, pv = FINN_LOOK.pivot; g.save(); g.translate(ox, oy); g.scale(k, k); g.beginPath(); g.rect(sx, 0, I.cw, I.ch); g.clip();
        g.save(); g.beginPath(); g.moveTo(sx, I.ch); cut.forEach(([x, y]) => g.lineTo(x, y - 24)); g.lineTo(sx + I.cw, I.ch); g.closePath(); g.clip(); g.drawImage(IMG.idle, 0, 0); g.restore();
        g.translate(pv[0], pv[1]); g.rotate(th * Math.PI / 180); g.translate(-pv[0], -pv[1]); g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + I.cw, 0); for (let i = cut.length - 1; i >= 0; i--) g.lineTo(...cut[i]); g.closePath(); g.clip(); g.drawImage(IMG.idle, 0, 0); g.restore(); }
      st.finnRect = [p[0] - 0.4 * I.cw * k, p[1] - CH * 1.05, p[0] + 0.4 * I.cw * k, p[1] + 6]; st.finnHead = [p[0], p[1] - (c.foot[1] - c.top) * k]; return;
    }
    if (q.spr === 'walk' && q.rig && LFL && IMG.legsFL && LFL.rig.views[q.facing]) { // floor-29 cand2 front-left two-joint legs (floor-30: + views)
      const V = LFL.rig.views[q.facing], col = V.col, f = [A.walk.foot[col + ',0'][0] - col * A.walk.cw, A.walk.foot[col + ',0'][1]], /* atlas -> cell px */ dp = q.dpos || q.pos, p0 = P(dp[0], dp[1]), p = [p0[0], p0[1] - (q.bob || 0) * 0.03 * S + q.rig.dip * KW], R = LFL.rig, [ks, tx, ty] = LFL.place[R.cell], cw = A.walk.cw, H0 = V.hem || LFL.hem;
      const clipP = (pts, disc) => { g.beginPath(); pts.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.closePath(); if (disc) { g.moveTo(disc[0] + disc[2], disc[1]); g.arc(disc[0], disc[1], disc[2], 0, 2 * Math.PI); } g.clip(); };
      const gen = (poly, disc) => { g.translate(tx, ty); g.scale(ks, ks); clipP(poly, disc); g.drawImage(IMG.legsFL, 0, 0); };
      const seg = (a0, b0, a, b, poly, k) => { const r0 = Math.atan2(b0[1] - a0[1], b0[0] - a0[0]), r1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
        g.save(); g.translate(a[0], a[1]); g.rotate(r1); g.scale(k, 1); g.rotate(-r0); g.translate(-a0[0], -a0[1]); gen(poly, [...R.kneeC, R.kneeR]); g.restore(); };
      const L = flLegs(q), G = flRest(), upper = q.rig.upper || (Math.abs(L.upperCenter) > 1e-7 ? { from: q.facing, to: q.facing, u: 0 } : null);
      g.save(); g.translate(p[0] - flAnchorIn(V) * KW, p[1] - f[1] * KW); g.scale(KW, KW); g.beginPath(); g.rect(0, 0, cw, A.walk.ch); g.clip(); // floor-31: ankle-midpoint anchor
      g.save(); if (V.mirror) { g.translate(V.mirror, 0); g.scale(-1, 1); } // legs in [0,0] cell px; a mirrored view flips them only
      for (const n of ['far', 'near']) { g.save(); g.translate(L[n].hip[0] - G.hip[0], L[n].hip[1] - G.hip[1]); gen(R.band); g.restore(); } // floor-32: the pelvis band sits on each hip as drawn (shift, blended depth)
      const leg = n => { const l = L[n]; seg(G.knee, G.ank, l.knee, l.ank, R.shin, l.sc); seg(G.hip, G.knee, l.hip, l.knee, R.thigh, l.sc); };
      const shoe = n => { const l = L[n]; g.save(); g.translate(l.ank[0], l.ank[1]); g.rotate(l.tilt * Math.PI / 180); g.translate(-G.ank[0], -G.ank[1]); gen(R.shoe); g.restore(); };
      const farFront = L.far.ank[1] > L.near.ank[1] + R.shoeOrder;
      leg('far'); if (!farFront) shoe('far'); leg('near'); shoe('near'); if (farFront) shoe('far'); g.restore();
      if (!upper) { g.save(); g.translate(L.shift, 0); clipP([[0, 0], [cw, 0], [cw, A.walk.ch], [400, A.walk.ch], ...H0.slice().reverse(), [120, A.walk.ch], [0, A.walk.ch]]); g.drawImage(IMG.walk, col * cw, 0, cw, A.walk.ch, 0, 0, cw, A.walk.ch); g.restore(); }
      g.restore();
      if (upper) drawCornerUpper(g, upper, p, f[1], L.shift, L.upperCenter);
      st.finnRect = [p[0] - 0.42 * cw * KW, p[1] - CH * 1.05, p[0] + 0.42 * cw * KW, p[1] + 6]; st.finnHead = [p[0], p[1] - (f[1] - 24) * KW]; return;
    }
    if (q.spr === 'walk') {
      const col = A.walk.facings.indexOf(q.facing), f = A.walk.foot[col + ',' + q.row], dp = q.dpos || q.pos, p0 = P(dp[0], dp[1]), p = [p0[0], p0[1] - (q.bob || 0) * 0.03 * S], sx = col * A.walk.cw, sy = q.row * A.walk.ch;
      if (IMG.walk) g.drawImage(IMG.walk, sx, sy, A.walk.cw, A.walk.ch, p[0] - (f[0] - sx) * KW, p[1] - (f[1] - sy) * KW, A.walk.cw * KW, A.walk.ch * KW);
      st.finnRect = [p[0] - 0.42 * A.walk.cw * KW, p[1] - CH * 1.05, p[0] + 0.42 * A.walk.cw * KW, p[1] + 6];
      st.finnHead = [p[0], p[1] - (f[1] - sy - 24) * KW]; // alpha top is 24 px into each walk cell
    } else {
      const col = A.seated.cols[q.cell], f = A.seated.foot[q.cell], sx = col * A.seated.cw, hip = [f[0] + HIP_FROM_FOOT[0] - sx, f[1] + HIP_FROM_FOOT[1]];
      const hw = q.hip || SEATS[q.seatKey].seat, p = P(hw[0], hw[1], SEAT_Z), cw = q.cell === 'mid' ? SEG.w : A.seated.cw, ch = A.seated.ch;
      const sg = q.seg, a = sg ? sg.rot * Math.PI / 180 : 0, pv = SEG.pivot, HD = SEGH[q.cell], x0 = p[0] - hip[0] * KSB, y0 = p[1] - hip[1] * KSB;
      const sdx = sg ? sg.dx / KSB : 0, sdy = sg ? sg.dy / KSB : 0, upPt = ([x, y]) => { if (!sg) return [x, y]; const c = Math.cos(a), s = Math.sin(a), u = x - pv[0], v = y - pv[1]; return [pv[0] + u * c - v * s + sdx, pv[1] + u * s + v * c + sdy]; };
      const clipPoly = pts => { g.beginPath(); pts.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); g.closePath(); g.clip(); };
      const bodyHole = [[0, ch], ...HD.cut.map(([x, y]) => [x, y - HEAD_HOLE]), [cw, ch]], drawCell = () => g.drawImage(IMG.seated, sx, 0, cw, ch, 0, 0, cw, ch);
            if (IMG.seated) { g.save(); g.translate(x0, y0); g.scale(KSB, KSB);
        if (!sg) { g.save(); clipPoly(bodyHole); seatedBody(g, q, drawCell); g.restore(); }
        else { g.save(); clipPoly(SEG.lower); drawCell(); g.restore();
          g.save(); g.translate(sdx, sdy); g.translate(pv[0], pv[1]); g.rotate(a); g.translate(-pv[0], -pv[1]); clipPoly(SEG.upper); clipPoly(bodyHole); drawCell(); g.restore(); }
        g.restore();
        const n = upPt(HD.neck), nS = [x0 + n[0] * KSB, y0 + n[1] * KSB], ha = a * (1 - HEAD_KEEP) + (q.headRot || 0) * Math.PI / 180;
        g.save(); g.translate(nS[0], nS[1]); g.rotate(ha); g.scale(KSH, KSH); g.translate(-HD.neck[0], -HD.neck[1]); clipPoly([[0, 0], [cw, 0], ...HD.cut.slice().reverse()]); drawCell(); g.restore();
        const hd = A.seated.head[q.cell]; st.finnHead = [nS[0] + (hd[0] - HD.neck[0]) * KSH, nS[1] + (hd[1] - HD.neck[1]) * KSH]; }
      st.finnRect = [x0 + 0.25 * A.seated.cw * KSB, (st.finnHead ? st.finnHead[1] : y0), x0 + 0.95 * A.seated.cw * KSB, p[1] + (ch - hip[1]) * KSB];
    }
  }
  const RACK_LED = [[421, 453, 0], [421, 477.5, 0], [421, 501.5, 0], [422.5, 632, 0], [421, 660, 0], [489, 480, 1], [489, 505, 1], [489, 530, 1], [489, 557.5, 1], [491, 636, 1]];
  function rackLeds(g, f, T, k) {
    if (st.reduced) return; const ph = f.id.charCodeAt(f.id.length - 1) * 0.37, r = Math.max(0.9, 3.2 * k);
    const dot = (x, y, col, a) => { const q = T(x, y); g.fillStyle = `rgba(${col},${a.toFixed(3)})`; g.beginPath(); g.arc(q[0], q[1], r, 0, Math.PI * 2); g.fill(); };
    g.save(); for (const [i, [x, y, c]] of RACK_LED.entries()) { let a;
      if (i === 0 || i === 5) a = 0.5;
      else if (c) a = (st.env + ph + i * 0.21) % 1.6 < 0.14 ? 0.85 : 0;
      else a = Math.sin(st.env * 0.7 + i * 1.3 + ph) > -0.2 && hash1(Math.floor(st.env * 9 + i * 3.1) + i * 17 + Math.round(ph * 10)) > 0.5 ? 0.8 : 0;
      if (a) dot(x, y, c ? '150,240,255' : '170,255,150', a); }
    if (f.id === 'rack2' && st.where === 'SV' && cur().rest && st.t % 0.5 < 0.28) dot(RACK_LED[3][0], RACK_LED[3][1] + 14, '255,176,60', 0.95);
    g.restore();
  }
  function drawSteam() {} // floor-21: brewing and steam are drawn with the counter (drawCoffee), behind Finn when he stands there
  const MON_Q = [[955, 61], [1330, 242], [955, 286]], SCOPE_Q = [[977, 45], [1035, 65], [977, 98]], CONSOLE_Q = [[762, 443], [873, 493], [762, 525]];
  const scr = (Q, T) => (u, v) => T(Q[0][0] + u * (Q[1][0] - Q[0][0]) + v * (Q[2][0] - Q[0][0]), Q[0][1] + u * (Q[1][1] - Q[0][1]) + v * (Q[2][1] - Q[0][1]));
  const quadPath = (g, S, u0, v0, u1, v1) => { g.beginPath(); [S(u0, v0), S(u1, v0), S(u1, v1), S(u0, v1)].forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q))); g.closePath(); };
  function finnScreen(g, f, T, k) { const ph = cur(); if (ph.kind !== 'work' || st.reduced) return; codeLines(g, T, st.t); }
  function ariaScreen(g, f, T, k) { if (st.reduced) return; const e = st.env + 3.7, r = role('aria', e); let n = 0; if (r.s === 'type') for (let m = Math.ceil((e - r.w) / 0.16); m * 0.16 <= e; m++) if (ariaKey(m * 0.16 + 1e-4)) n++;
    codeLinesN(g, T, Math.floor(r.cum * 3.2) % 600 + n, r.s === 'type' || e % 1 < 0.5); } // floor-23: characters only appear while she types
  function codeLines(g, T, t) { const c0 = t - (t % 12); let chars = 0;
    for (let n = Math.ceil(c0 / 0.16); n * 0.16 <= t; n++) if (keySlot(n * 0.16 + 1e-4)) chars++;
    codeLinesN(g, T, chars, typing(t) || t % 1 < 0.5); }
  function codeLinesN(g, T, chars, cursor) {
    const S = scr(MON_Q, T), PER = 15, CW = 0.027, lines = Math.ceil((chars + 1) / PER), first = Math.max(0, lines - 4);
    g.save(); quadPath(g, S, 0, 0, 1, 1); g.clip();
    quadPath(g, S, 0.24, 0.59, 0.78, 0.86); g.fillStyle = 'rgba(28,38,44,.92)'; g.fill();
    for (let ln = first; ln < lines; ln++) { const n = Math.min(PER, chars - ln * PER), ind = [0, 0.04, 0.04, 0.08, 0.04][ln % 5], v = 0.61 + (ln - first) * 0.062;
      if (n > 0) { quadPath(g, S, 0.27 + ind, v, 0.27 + ind + n * CW, v + 0.034); g.fillStyle = ln % 4 === 2 ? 'rgba(232,200,120,.92)' : 'rgba(170,222,120,.92)'; g.fill(); }
      if (ln === lines - 1 && cursor) { const x = 0.27 + ind + Math.max(0, n) * CW + 0.004; quadPath(g, S, x, v - 0.004, x + 0.016, v + 0.04); g.fillStyle = 'rgba(235,245,225,.95)'; g.fill(); } }
    g.restore();
  }
  function lunaScreen(g, f, T, k) {
    if (st.reduced) return; const S = scr(MON_Q, T), r = role('luna'), done = r.cum + (r.s === 'write' ? r.w : 0), prog = (done * 0.55) % 7.999; // floor-23: rows grow only while she writes
    g.save(); quadPath(g, S, 0, 0, 1, 1); g.clip();
    quadPath(g, S, 0.26, 0.12, 0.74, 0.9); g.fillStyle = 'rgba(244,238,226,.96)'; g.fill(); g.strokeStyle = 'rgba(58,62,80,.85)'; g.lineWidth = Math.max(0.6, 3 * k); g.lineCap = 'round';
    for (let r = 0; r < Math.ceil(prog); r++) { const len = Math.min(1, prog - r) * (r % 3 === 2 ? 0.28 : 0.38), v = 0.2 + r * 0.095; g.beginPath();
      for (let i = 0; i <= 30 * len / 0.38; i++) { const u = 0.3 + i * 0.38 / 30, vv = v + Math.sin(i * 1.9 + r) * 0.012 + Math.sin(i * 0.7) * 0.006; if (u > 0.3 + len) break; i ? g.lineTo(...S(u, vv)) : g.moveTo(...S(u, vv)); } g.stroke(); }
    g.restore();
  }
  function noahScreen(g, f, T, k) {
    if (st.reduced || st.where !== 'RV' || !cur().rest) return; const S = scr(MON_Q, T), row = Math.floor(st.t / 0.9) % 9, v = 0.18 + row * 0.07;
    g.save(); quadPath(g, S, 0, 0, 1, 1); g.clip(); quadPath(g, S, 0.2, v, 0.8, v + 0.05); g.fillStyle = 'rgba(255,226,140,.30)'; g.fill();
    if (row > 0) { quadPath(g, S, 0.82, v - 0.07, 0.86, v - 0.03); g.fillStyle = 'rgba(120,210,120,.9)'; g.fill(); } g.restore();
  }
  function benchFx(g, f, T, k) {
    if (st.reduced) return; const S = scr(SCOPE_Q, T), check = st.where === 'BZ' && cur().rest, e = st.env;
    g.save(); quadPath(g, S, 0, 0, 1, 1); g.fillStyle = '#17302e'; g.fill(); g.clip();
    g.strokeStyle = 'rgba(120,200,170,.22)'; g.lineWidth = Math.max(0.5, 2 * k); g.beginPath(); for (const u of [0.25, 0.5, 0.75]) { g.moveTo(...S(u, 0)); g.lineTo(...S(u, 1)); } g.moveTo(...S(0, 0.5)); g.lineTo(...S(1, 0.5)); g.stroke();
    g.strokeStyle = '#6ff0aa'; g.lineWidth = Math.max(0.8, 5 * k); g.beginPath();
    for (let i = 0; i <= 48; i++) { const u = 0.04 + 0.92 * i / 48, ph = u * 3 - e * 0.9;
      const v = check ? 0.5 - 0.27 * Math.sign(Math.sin(2 * Math.PI * ph)) * (1 - 0.35 * Math.exp(-((ph % 0.5 + 0.5) % 0.5) * 9)) : 0.5 - 0.28 * Math.sin(2 * Math.PI * (u * 2.2 - e * 0.55));
      i ? g.lineTo(...S(u, v)) : g.moveTo(...S(u, v)); } g.stroke(); g.restore();
    const on = e % 7 < 3.4; if (!on) return; const tip = [1279, 212]; g.save(); g.lineCap = 'round'; g.lineWidth = Math.max(0.6, 4 * k);
    for (let i = 0; i < 3; i++) { const u = (e * 0.5 + i / 3) % 1, a = Math.sin(Math.PI * u) * 0.45 * Math.min(1, (e % 7) / 0.6, (3.4 - e % 7) / 0.6), y = tip[1] - u * 70, x = tip[0] + Math.sin(e * 1.3 + i * 2) * 4;
      g.strokeStyle = `rgba(245,245,240,${a.toFixed(3)})`; g.beginPath(); g.moveTo(...T(x, y)); g.bezierCurveTo(...T(x + 7, y - 9), ...T(x - 7, y - 17), ...T(x + 2, y - 26)); g.stroke(); }
    g.restore();
  }
  function consoleFx(g, f, T, k) {
    if (st.reduced) return; const S = scr(CONSOLE_Q, T), check = st.where === 'SV' && cur().rest, row = Math.floor((check ? st.t : st.env * 0.25) / 0.6) % 8, v = 0.14 + row * 0.085;
    g.save(); quadPath(g, S, 0, 0, 1, 1); g.clip(); quadPath(g, S, 0.06, v, 0.62, v + 0.05); g.fillStyle = check ? 'rgba(140,235,200,.42)' : 'rgba(140,235,200,.18)'; g.fill(); g.restore();
  }
  const PRECT = {}, PHEAD = {}; // last drawn image rect / head top per fixed person (stage coords)
  const FINN_SEATED_H = A.seated.ch * 0.945 * KS; // (the other seated people keep their floor-22 size) // seated cells are ~684 px tall of 724
  function drawPerson(g, id, at) { if (!live.agents[id]) return;
    const m = A.people[id], im = IMG['person-' + id]; if (!im) return;
    const k = (m.mode === 'seated' ? FINN_SEATED_H : CH) / m.h, p = m.mode === 'seated' ? P(at[0], at[1], SEAT_Z) : P(at[0], at[1], 0);
    if (m.mode === 'standing') { g.fillStyle = 'rgba(40,28,16,.28)'; g.beginPath(); g.ellipse(p[0], p[1], 16 * SK, 7 * SK, 0, 0, Math.PI * 2); g.fill(); }
    const ox = p[0] - m.anchor[0] * k, oy = p[1] - m.anchor[1] * k, M = MICRO[id], th = M && M.head && !st.reduced ? (M.head.angle ? M.head.angle() : headAngle(M.head)) : 0;
    const parts = [];
    if (th) { const Wi = im.naturalWidth, cut = M.head.cut; parts.push({ poly: [[0, 0], [Wi, 0], ...cut.slice().reverse()], hole: [[0, 0], [Wi, 0], ...cut.slice().reverse().map(([x, y]) => [x, y - 30])], pivot: M.head.pivot, rot: th }); }
    if (M && M.parts && !st.reduced) for (const pt of M.parts) { const r = pt.angle(); if (r) parts.push({ poly: pt.poly, hole: pt.hole, pivot: pt.pivot, rot: r, under: pt.under }); }
    if (!parts.length) g.drawImage(im, ox, oy, im.naturalWidth * k, im.naturalHeight * k);
    else { const Wi = im.naturalWidth, Hi = im.naturalHeight, path = pts => pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
      g.save(); g.translate(ox, oy); g.scale(k, k);
      g.save(); g.beginPath(); g.rect(0, 0, Wi, Hi); for (const pt of parts) { path(pt.hole); g.closePath(); } g.clip('evenodd'); g.drawImage(im, 0, 0); g.restore();
      for (const pt of parts) for (const un of pt.under || []) { g.save(); g.beginPath(); path(pt.hole); g.closePath(); g.clip(); if (un.clip) { g.beginPath(); path(un.clip); g.closePath(); g.clip(); } g.fillStyle = un.color; g.fillRect(0, 0, Wi, Hi); g.restore(); }
      for (const pt of parts) { g.save(); g.translate(pt.pivot[0], pt.pivot[1]); g.rotate(pt.rot * Math.PI / 180); g.translate(-pt.pivot[0], -pt.pivot[1]); g.beginPath(); path(pt.poly); g.closePath(); g.clip(); g.drawImage(im, 0, 0); g.restore(); }
      g.restore(); }
    if (M && M.face && !st.reduced) { const pv = M.head ? M.head.pivot : [0, 0], ca = Math.cos(th * Math.PI / 180), sa = Math.sin(th * Math.PI / 180); // the face rides on the turned head
      faceFx(g, M.face, (x, y) => { const u = x - pv[0], v = y - pv[1]; return [ox + (pv[0] + u * ca - v * sa) * k, oy + (pv[1] + u * sa + v * ca) * k]; }, k); }
    PHEAD[id] = [p[0] + (m.head[0] - m.anchor[0]) * k, p[1] + (m.head[1] - m.anchor[1]) * k];
    PRECT[id] = [p[0] - m.anchor[0] * k, p[1] - m.anchor[1] * k, p[0] - m.anchor[0] * k + im.naturalWidth * k, p[1] - m.anchor[1] * k + im.naturalHeight * k];
  }
  const ROLE = {
    aria: { seed: 3, first: 'type', head: { type: 0.5, read: -1.0, think: -2.4, pause: 0 }, st: { type: [3.5, 7, { read: 0.5, think: 0.3, pause: 0.2 }], read: [3, 6, { type: 0.7, think: 0.3 }], think: [1.6, 3, { type: 0.8, read: 0.2 }], pause: [1, 2, { type: 1 }] } },
    noah: { seed: 5, first: 'review', head: { review: 1.6, mark: 2.4, think: -2.6, glance: -1.4 }, st: { review: [4, 8, { mark: 0.6, think: 0.25, glance: 0.15 }], mark: [2, 4, { review: 0.6, glance: 0.4 }], think: [2, 3.2, { review: 1 }], glance: [2, 4, { review: 0.7, think: 0.3 }] } },
    luna: { seed: 7, first: 'write', head: { write: 0.4, read: -0.8, think: -0.9 }, st: { write: [4, 9, { read: 0.6, think: 0.4 }], read: [3, 6, { write: 0.8, think: 0.2 }], think: [2, 3.2, { write: 1 }] } },
    max: { seed: 11, first: 'tap', head: { tap: 0.4, check: -2.0, pause: 1.0 }, st: { tap: [2, 4.5, { check: 0.7, pause: 0.3 }], check: [3, 6, { tap: 0.8, pause: 0.2 }], pause: [1.2, 2.2, { tap: 1 }] } },
    zoey: { seed: 13, first: 'solder', head: { solder: 0.4, inspect: -0.8, think: 0.75 }, st: { solder: [4, 8, { inspect: 0.7, think: 0.3 }], inspect: [2, 4, { solder: 0.8, think: 0.2 }], think: [1.8, 3, { solder: 1 }] } },
    leo: { seed: 17, first: 'read', head: { read: 1.0, think: -1.2, scroll: 0.5 }, st: { read: [5, 9, { scroll: 0.6, think: 0.4 }], scroll: [2, 4, { read: 1 }], think: [2, 3.2, { read: 1 }] } },
  };
  const ROLE_TL = {};
  function roleTimeline(id) { if (ROLE_TL[id]) return ROLE_TL[id]; const R = ROLE[id], segs = []; let t = 0, s1 = R.first, i = 0;
    while (t < 900) { const [a, b, nx] = R.st[s1], len = a + (b - a) * hash1(R.seed * 1000 + i * 2), cum = segs.length ? segs[segs.length - 1].cum + (segs[segs.length - 1].s === R.first ? segs[segs.length - 1].len : 0) : 0;
      segs.push({ s: s1, t0: t, len, prev: segs.length ? segs[segs.length - 1].s : s1, cum }); t += len; let r = hash1(R.seed * 1000 + i * 2 + 1); for (const [k, w] of Object.entries(nx)) { s1 = k; if ((r -= w) <= 0) break; } i++; }
    segs[0].prev = segs[segs.length - 1].s; // the loop joins with an eased head change, like any other state change
    const last = segs[segs.length - 1], cumTotal = last.cum + (last.s === R.first ? last.len : 0);
    return (ROLE_TL[id] = { segs, total: t, cumTotal }); }
  function role(id, e = st.env) { const T = roleTimeline(id), tt = e + ROLE[id].seed * 1.7, loops = Math.floor(tt / T.total), t = tt - loops * T.total; let lo = 0, hi = T.segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T.segs[m].t0 <= t) lo = m; else hi = m - 1; } const sg = T.segs[lo]; return { s: sg.s, w: t - sg.t0, len: sg.len, prev: sg.prev, cum: sg.cum + loops * T.cumTotal }; } // cum keeps growing across loops (screens never jump back)
  function roleHead(id) { if (st.reduced || !active(id)) return 0; const r = role(id), H = ROLE[id].head, a = H[r.s] || 0, b = H[r.prev] || 0, k = ease(Math.min(1, r.w / 0.6)); return b + (a - b) * k; }
  const MICRO = {
    aria: { head: { angle: () => roleHead('aria'), cut: [[0, 415], [540, 425], [600, 445], [700, 445], [780, 440], [860, 440], [905, 445], [940, 430], [1536, 430]], pivot: [800, 455], amp: 2.4, period: 7.3, phase: 0.4, hold: 1.8 },
      parts: [
        { poly: [[850, 450], [895, 446], [940, 453], [970, 492], [957, 532], [905, 547], [858, 547], [848, 520]], hole: [[866, 450], [895, 446], [940, 453], [970, 492], [957, 532], [905, 547], [866, 547]], pivot: [858, 505], angle: () => ariaHands().L },
        { poly: [[922, 558], [1000, 553], [1045, 546], [1085, 512], [1140, 512], [1182, 550], [1182, 612], [1130, 632], [1070, 637], [1047, 662], [990, 670], [922, 674]], hole: [[950, 556], [1000, 553], [1045, 546], [1085, 512], [1140, 512], [1182, 550], [1182, 612], [1130, 632], [1070, 637], [1047, 662], [990, 670], [950, 672]], pivot: [905, 615], angle: () => ariaHands().R },
      ] },
    noah: { head: { angle: () => roleHead('noah'), cut: [[0, 420], [560, 440], [700, 450], [800, 450], [880, 445], [940, 428], [1536, 422]], pivot: [790, 455], amp: 2.8, period: 9.1, phase: 3.1, hold: 2.4 },
      parts: [
        { poly: [[846, 466], [900, 460], [946, 476], [970, 505], [962, 534], [925, 550], [870, 552], [844, 530]], hole: [[862, 464], [900, 460], [946, 476], [970, 505], [962, 534], [925, 550], [862, 552]], pivot: [852, 510], angle: () => noahHands().L },
        { poly: [[1000, 575], [957, 563], [1036, 426], [1154, 467], [1104, 557], [1114, 612], [1084, 643], [1040, 654], [1004, 642]], hole: [[1015, 590], [1000, 575], [957, 563], [1036, 426], [1154, 467], [1104, 557], [1114, 612], [1084, 643], [1040, 654], [1016, 642]], pivot: [1000, 615], angle: () => noahHands().P },
      ] },
    max: { head: { angle: () => roleHead('max'), cut: [[0, 562], [300, 556], [380, 546], [440, 548], [500, 522], [560, 472], [600, 420], [1024, 420]], pivot: [450, 556], amp: 2.2, period: 8.3, phase: 5.2, hold: 1.5 },
      parts: [{ poly: [[768, 662], [800, 640], [818, 560], [858, 503], [932, 488], [968, 518], [972, 576], [946, 602], [926, 642], [896, 690], [882, 760], [872, 834], [788, 842], [768, 760]], hole: [[806, 650], [818, 560], [858, 503], [932, 488], [968, 518], [972, 576], [946, 602], [926, 642], [896, 690], [882, 760], [872, 834], [806, 842]], pivot: [760, 780], angle: () => maxHand() }] },
    luna: { parts: [{ poly: [[988, 566], [993, 525], [1008, 505], [1060, 450], [1080, 452], [1076, 470], [1050, 498], [1064, 525], [1060, 556], [1044, 577], [1018, 586], [996, 584]], hole: [[1003, 563], [1008, 505], [1060, 450], [1080, 452], [1076, 470], [1050, 498], [1064, 525], [1060, 556], [1044, 577], [1018, 586], [1003, 584]], pivot: [995, 575], angle: () => lunaPen(), under: [{ color: '#444247', clip: [[926, 464], [1113, 491], [1047, 597], [882, 557]] }] }],
      head: { angle: () => roleHead('luna'), cut: [[0, 640], [470, 640], [540, 690], [640, 700], [700, 672], [745, 630], [770, 575], [805, 510], [840, 482], [895, 476], [950, 455], [1000, 420], [1536, 420]], pivot: [840, 500], amp: 0.9, period: 11.3, phase: 6.4, hold: 2.6, ease: 1.2 } },
    zoey: { head: { angle: () => roleHead('zoey'), cut: [[0, 800], [420, 800], [440, 720], [470, 640], [500, 580], [560, 565], [620, 568], [660, 560], [690, 520], [720, 470], [1024, 470]], pivot: [600, 580], amp: 0.8, period: 10.1, phase: 1.7, hold: 2.0, ease: 1.2 } },
    leo: { head: { cut: [[0, 690], [200, 690], [280, 660], [330, 640], [420, 640], [470, 650], [520, 660], [580, 650], [640, 620], [700, 560], [760, 540], [1024, 540]], pivot: [560, 690], angle: () => leoHead() },
      parts: [{ poly: [[372, 818], [395, 800], [418, 750], [430, 741], [443, 768], [438, 792], [441, 801], [470, 816], [505, 820], [524, 834], [512, 849], [470, 856], [455, 867], [430, 881], [405, 896], [385, 901], [368, 896]],
        hole: [[386, 812], [395, 800], [418, 750], [430, 741], [443, 768], [438, 792], [441, 801], [470, 816], [505, 820], [524, 834], [512, 849], [470, 856], [455, 867], [430, 881], [405, 896], [386, 900]], pivot: [372, 860], angle: () => leoHand(), under: [/* jacket, and the braid behind the fingertips (both sampled next to the hand) */ { color: '#853434', clip: [[300, 700], [472, 700], [472, 960], [300, 960]] }, { color: '#dfc5b1', clip: [[472, 700], [600, 700], [600, 960], [472, 960]] }] }],
      face: {
      eyes: [[[490, 557], [520, 548], [552, 543], [582, 545], [588, 560], [582, 580], [560, 590], [520, 588], [498, 578]], [[650, 492], [668, 482], [694, 486], [701, 512], [698, 548], [680, 557], [660, 553], [649, 528]]],
      lids: [[[490, 559], [540, 575], [587, 553]], [[652, 512], [675, 529], [699, 508]]],
      mouth: [[581, 599], [600, 591], [625, 586], [645, 585], [639, 606], [623, 625], [606, 633], [587, 627]], closed: [[590, 606], [612, 614], [634, 598]] } },
  };
  function headAngle(H, clock = st.env) { const T = clock + H.phase, c = Math.floor(T / H.period), u = T - c * H.period, r = H.ease || 0.7, sg = c % 2 ? 1 : -0.7;
    if (u > 2 * r + H.hold) return 0; const w = u < r ? ease(u / r) : u < r + H.hold ? 1 : ease(1 - (u - r - H.hold) / r); return sg * H.amp * w; }
  const A_HANDR = [1140, 600], A_ELBOW = [905, 615];
  const ariaKey = e => { const r = role('aria', e); return r.s === 'type' && r.w > 0.25 && r.len - r.w > 0.2 && (r.w % 1.7) < 1.32 && hash1(Math.floor(e / 0.16) + 31) > 0.4; };
  function ariaHands() { const e = st.env + 3.7; if (st.reduced || !active('aria')) return { L: 0, R: 0 }; const r = role('aria', e);
    const L = ariaKey(e) ? 8 * Math.sin(Math.PI * ((e / 0.16) % 1)) : 0; let R = 0;
    if (r.s === 'read') { const c = Math.floor((e - r.w) * 10), w = r.w, len = r.len, keys = [[0, 0], [0.4, (hash1(c * 3 + 1) - 0.5) * 8], [Math.min(1.5, len * 0.4), (hash1(c * 3 + 2) - 0.5) * 8], [Math.max(len * 0.5, len - 1.1), (hash1(c * 3 + 3) - 0.5) * 5], [len - 0.55, 0]];
      for (let i = 0; i < keys.length - 1; i++) if (w >= keys[i][0] && w < keys[i + 1][0]) { const [t0, a0] = keys[i], [t1, a1] = keys[i + 1], d = Math.min(0.45, t1 - t0); R = a0 + (a1 - a0) * ease(Math.min(1, (w - t0) / d)); break; } }
    return { L, R }; }
  const stepTo = (keys, u) => { for (let i = 0; i < keys.length - 1; i++) if (u >= keys[i][0] && u < keys[i + 1][0]) { const [t0, a0] = keys[i], [t1, a1] = keys[i + 1], d = Math.min(0.3, t1 - t0); return a0 + (a1 - a0) * ease(Math.min(1, (u - t0) / d)); } return keys[keys.length - 1][1]; };
  const NOAH_SHEET = { amp: 1.8, period: 8.9, phase: 2.2, hold: 2.4, ease: 0.6 };
  function noahHands() { if (st.reduced || !active('noah')) return { L: 0, P: 0 }; const r = role('noah'), w = r.w; // marks in three small steps; the sheet tips while he reviews it
    const L = r.s === 'mark' ? stepTo([[0, 0], [0.4, 3], [0.4 + (r.len - 0.8) / 2, 6], [r.len - 0.4, 0], [r.len, 0]], w) : 0;
    const P = r.s === 'review' ? 1.8 * ease(Math.min(1, w / 0.6)) * ease(Math.min(1, (r.len - w) / 0.6)) : 0; return { L, P }; }
  function lunaPen() { if (st.reduced || !active('luna')) return 0; const e = st.env + 1.3, r = role('luna'); if (r.s !== 'write') return r.s === 'read' ? -3 * ease(Math.min(1, r.w / 0.4)) * ease(Math.min(1, (r.len - r.w) / 0.4)) : 0; // writes while her page fills (lunaScreen); pen lifted while reading back
    const lift = pulse(e % 2.3, 1.95, 0.35), wr = 1.6 + 1.6 * Math.sin(2 * Math.PI * e / 0.42) * (0.65 + 0.35 * Math.sin(2 * Math.PI * e / 1.7)); return env2(r.w, r.len, 0.4) * (wr * (1 - lift) - 3 * lift); } // floor-23: eased into and out of the writing state; the pen lifts smoothly
  const inMeeting = () => st.where === 'meet' && cur().kind === 'meet', leoBeat = () => (!st.reduced && inMeeting() ? meetBeat(st.t) : null);
  function leoHand() { const b = leoBeat(); return b ? b.leoHand : 0; } // floor-23: gestures while he speaks, lowered while he listens
  const LEO_IDLE = { amp: 1.2, period: 9.7, phase: 4.4, hold: 2.2, ease: 1.0 };
  function leoHead() { if (st.reduced) return 0; const b = leoBeat(); return b ? b.leoNod + b.leoLook + (b.speaker === 'leo' ? 0.8 * Math.sin(2 * Math.PI * b.u / 2.3) : 0) : roleHead('leo'); }
  function maxHand() { if (st.reduced || !active('max')) return 0; const r = role('max'); if (r.s !== 'tap') return 0; const u = r.w % (1.1 + 0.6 * hash1(Math.floor(r.w / 1.4) + 5)); return env2(r.w, r.len, 0.3) * stepTo([[0, 0], [0.2, -2.6], [0.5, 1.2], [0.95, 0], [9, 0]], u); }
  function ariaMouseShift() { const R = ariaHands().R; if (!R) { ARIA_MS[0] = 0; ARIA_MS[1] = 0; return; } const m = A.people.aria, k = FINN_SEATED_H / m.h, hp = P(AVATAR_SPOTS.aria[0], AVATAR_SPOTS.aria[1], SEAT_Z), a = R * Math.PI / 180;
    const u = A_HANDR[0] - A_ELBOW[0], v = A_HANDR[1] - A_ELBOW[1], dx = (u * Math.cos(a) - v * Math.sin(a) - u) * k, dy = (u * Math.sin(a) + v * Math.cos(a) - v) * k;
    const s0 = [hp[0] + (A_HANDR[0] - m.anchor[0]) * k, hp[1] + (A_HANDR[1] - m.anchor[1]) * k], w0 = Pinv(s0[0], s0[1], DESK_H + 0.02), w1 = Pinv(s0[0] + dx, s0[1] + dy, DESK_H + 0.02); ARIA_MS[0] = w1[0] - w0[0]; ARIA_MS[1] = w1[1] - w0[1]; }
  const FINN_LOOK = { cut: [[313, 350], [380, 352], [420, 345], [470, 348], [520, 345], [570, 335], [627, 330]], pivot: [470, 352], amp: 2.2, period: 5.6, phase: -1.0, hold: 1.7, ease: 0.6 };
  const SKIN_LEO = '#fdcb9e';
  function faceFx(g, F1, T, k) { const e = st.env, line = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w * k; g.lineCap = 'round'; g.beginPath(); g.moveTo(...T(...pts[0])); g.quadraticCurveTo(...T(...pts[1]), ...T(...pts[2])); g.stroke(); };
    const fill = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(...T(...q)) : g.moveTo(...T(...q)))); g.closePath(); g.fill(); };
    const bc = Math.floor(e / 4.2), bt = e - bc * 4.2 - hash1(bc) * 2.6; g.save();
    if (bt > 0 && bt < 0.14) { for (const eye of F1.eyes) fill(eye, SKIN_LEO); for (const l of F1.lids) line(l, 6, '#3a2722'); }
    const lb = leoBeat(), talk = !!lb && lb.speaker === 'leo' && lb.u > 0.15 && hash1(Math.floor(st.t / 0.15) + 7) > 0.3 && (lb.u % 1.9) < 1.55; // syllables with breath pauses
    if (!talk) { fill(F1.mouth, SKIN_LEO); line(F1.closed, 5, '#6a3428'); }
    g.restore(); }
  function drawMarker(g, pp, sel) {
    const p = P(pp.at[0], pp.at[1], 0.01); g.save();
    g.strokeStyle = sel ? '#e7b75b' : 'rgba(255,240,210,.85)'; g.lineWidth = sel ? 3 : 2; g.setLineDash([5, 4]); g.beginPath(); g.ellipse(p[0], p[1], 20 * SK, 10 * SK, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.restore();
  }
  function drawTags(g, list, guard) { // floor-22 guard: the followed figure's box; only its own chip may overlap it
    const z = cam.z / labelScale, fs = 12.5 / z, hgt = 19 / z, gap = 6 / z, placed = [];
    g.save(); g.font = `700 ${fs}px "Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`; g.textAlign = 'center';
    for (const it of list) if (!it.head) { const at = it.pp.id === 'finn' ? st.q.pos : it.pp.at; const mode = it.pp.id === 'finn' || (A.people[it.pp.id] && A.people[it.pp.id].mode === 'standing') ? 1.8 : 1.45; it.head = P(at[0], at[1], mode); }
    const ov = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]; for (const k of Object.keys(TAGRECT)) delete TAGRECT[k];
    if (guard) { const me = list.find(it => it.pp.id === follow); list = [me, ...list.filter(it => it !== me)]; }
    for (const { pp, head, sel, pending } of guard ? list : list.sort((a, b) => b.head[1] - a.head[1])) { const txt = liveTag(pp.id) + (pending ? ' · 자산 대기' : ''), w = g.measureText(txt).width + 12 / z;
      let r = [head[0] - w / 2, head[1] - gap - hgt, head[0] + w / 2, head[1] - gap];
      for (let k = 0; k < 6 && placed.some(o => o[0] < r[2] && r[0] < o[2] && o[1] < r[3] && r[1] < o[3]); k++) r = [r[0], r[1] - hgt - 2 / z, r[2], r[3] - hgt - 2 / z];
      if (guard && pp.id !== follow && (ov(r, guard) || placed.some(o => ov(o, r)))) continue;
      placed.push(r); TAGRECT[pp.id] = r;
      g.fillStyle = sel ? '#e7b75b' : 'rgba(33,28,24,.78)'; g.beginPath(); g.roundRect(r[0], r[1], w, hgt, hgt / 2); g.fill();
      g.fillStyle = sel ? '#211c18' : '#f4ecdd'; g.fillText(txt, head[0], r[3] - 5 / z);
    }
    g.restore();
  }
  const TAGRECT = {}; let labelScale = 1;
  const ACT = { work: '작업 중', meet: '회의 중', E: '대기', BZ: '보드 확인', RV: '검토 요청', CO: '음료', SV: '서버 점검' };
  function finnTag() { return liveTag('finn'); }

  const st = { plan: [idle('E', '출입구에서 대기', 'back-right')], i: 0, t: 0, paused: false, mode: 'auto', where: 'E', clock: 0, violations: [], frames: 0, loopStarts: 0, log: [], gen: 0,
    reduced: false, tour: false, tourI: 0, dwell: 0, env: 0 }; // floor-19: reduced motion, optional day tour, environment clock
  const L = {}; let debugOn = false, tagsOn = true, sel = null, DPR = 1;
  let cam = ZONES.all, camName = 'all';
  let follow = null, stageCss = W, camT = null; const FOLLOW_CSS = 112, FOLLOW_TAU = 0.18;
  const followZoom = () => Math.max(2.4, Math.min(6.5, FOLLOW_CSS / (CH * stageCss / W)));
  function followAim() { const z = followZoom(); let c;
    if (follow === 'finn') { const q = st.q || pose(cur(), 0), f = q.spr === 'walk' ? (q.dpos || q.pos) : (q.foot || SEATS[q.seatKey].foot), b = P(f[0], f[1]); c = [b[0], b[1] - (q.spr === 'walk' ? 0.5 : 0.58) * CH]; }
    else { const at = AVATAR_SPOTS[follow], m = A.people[follow], b = P(at[0], at[1]); c = [b[0], b[1] - (m && m.mode === 'standing' ? 0.5 : 0.58) * CH]; }
    const hx = W / (2 * z), hy = H / (2 * z); return { z, c: [Math.max(hx, Math.min(W - hx, c[0])), Math.max(hy, Math.min(H - hy, c[1]))] }; }
  function cameraTick(dt, snap) { if (!follow) return false; const a = followAim();
    const far = camT && Math.hypot(a.c[0] - camT.c[0], a.c[1] - camT.c[1]) > 0.5 * Math.min(W, H) / a.z;
    if (!camT || snap || st.reduced || far) camT = { z: a.z, c: a.c.slice() };
    else if (!st.paused && dt > 0) { const w = 1 - Math.exp(-dt / FOLLOW_TAU); camT = { z: camT.z + (a.z - camT.z) * w, c: [camT.c[0] + (a.c[0] - camT.c[0]) * w, camT.c[1] + (a.c[1] - camT.c[1]) * w] }; }
    const z = camT.z, snapC = (c, half) => (half - Math.round((half - c * z) * DPR) / DPR) / z, c = [snapC(camT.c[0], W / 2), snapC(camT.c[1], H / 2)];
    const moved = !cam.follow || Math.abs(cam.z - z) > 1e-6 || cam.c[0] !== c[0] || cam.c[1] !== c[1];
    if (moved) { cam = { z, c, follow: true }; drawBgFollow(); } return moved; }
  let bgC = null;
  function drawBgFollow() { const z = cam.z, s = DPR * z, vw = W / z, vh = H / z, vx = cam.c[0] - vw / 2, vy = cam.c[1] - vh / 2;
    if (!bgC || bgC.z !== z || bgC.dpr !== DPR || vx < bgC.x0 - 1e-6 || vy < bgC.y0 - 1e-6 || vx + vw > bgC.x0 + bgC.w + 1e-6 || vy + vh > bgC.y0 + bgC.h + 1e-6) {
      const mx = Math.round(0.4 * vw * s) / s, my = Math.round(0.4 * vh * s) / s, x0 = vx - mx, y0 = vy - my, w = vw + 2 * mx, h = vh + 2 * my;
      const cv = (bgC && bgC.cv) || document.createElement('canvas'); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
      const g = cv.getContext('2d'); g.setTransform(s, 0, 0, s, -x0 * s, -y0 * s); drawFloor(g); bgC = { cv, z, dpr: DPR, x0, y0, w, h }; st.bgCacheDraws = (st.bgCacheDraws || 0) + 1; }
    const g = L.bg, bw = g.canvas.width, bh = g.canvas.height; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bw, bh);
    g.drawImage(bgC.cv, Math.round((vx - bgC.x0) * s), Math.round((vy - bgC.y0) * s), bw, bh, 0, 0, bw, bh); }
  const camApply = g => { const d = g.__dpr || DPR; g.setTransform(d * cam.z, 0, 0, d * cam.z, d * (W / 2 - cam.c[0] * cam.z), d * (H / 2 - cam.c[1] * cam.z)); }; // floor-22: per-layer backing scale
  const clear = g => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); };
  const cur = () => st.plan[st.i];
  function startPlan(key, mode = 'auto') {
    const from = st.where; st.plan = PLANS[key].build(from); st.i = 0; st.t = 0; st.paused = false; st.mode = mode; st.planKey = key; st.dwell = 0;
    st.log.push([Math.round(performance.now()), key, from]); if (st.log.length > 40) st.log.shift(); st.q = pose(cur(), 0);
  }
  const atRest = () => !!cur().rest;
  const api = {
    go(key) { if (!PLANS[key]) return false; if (!atRest()) { if (st.paused || st.stepMode || key === st.planKey) return false; st.queued = key; st.tour = false; return true; } st.queued = null; st.tour = false; startPlan(key); return true; }, // floor-21: while walking, the choice waits for arrival // a chosen destination ends the tour
    step() { if (atRest()) return false; st.paused = false; st.mode = 'step'; return true; },
    pause() { st.paused = !st.paused; }, // floor-19: always available; stops Finn, the tour and the environment loops
    reset() { st.gen++; st.violations = []; st.plan = [idle('E', '출입구에서 대기', 'back-right')]; st.i = 0; st.t = 0; st.paused = false; st.mode = 'auto'; st.where = 'E'; st.planKey = null; st.dwell = 0; st.tourI = 0; st.tour = false; doorOpen = 0; doorP = 0; st.queued = null; st.q = pose(cur(), 0); applyChairs(st.q); if (follow) cameraTick(0, true); }, // floor-22: follow view snaps with Finn
    setReducedMotion(on) { st.reduced = !!on; if (st.reduced) st.tour = false; },
    setTour(on) { st.tour = !!on && !st.reduced; st.dwell = 0; if (st.tour) st.queued = null; // the day tour replaces a waiting manual choice
      if (st.tour) { st.stepMode = false; st.paused = false; } },
    stepMode(on) { st.stepMode = !!on; if (on) { st.tour = false; st.dwell = 0; } },
    setDebug(on) { debugOn = on; }, setTags(on) { tagsOn = on; },
    setView(z) { if (ZONES[z]) { follow = null; camT = null; cam = ZONES[z]; camName = z; clear(L.bg); camApply(L.bg); drawFloor(L.bg); } }, // floor-22: a chosen zone ends follow
    follow(id) { if (id === null || id === undefined || id === false) { if (follow) { follow = null; camT = null; cam = ZONES[camName]; clear(L.bg); camApply(L.bg); drawFloor(L.bg); } return null; }
      if (!AVATAR_SLOTS.some(pp => pp.id === id)) return follow; const was = follow; follow = id; if (was !== id) { camT = null; cameraTick(0, true); } return follow; },
    select(id) { sel = sel === id ? null : id; return sel; },
    setEnv(v) { st.env = Math.max(0, +v || 0); return st.env; }, // floor-22 frame checks of the environment / people motion
    ariaHands: () => { const h = ariaHands(); return { L: +h.L.toFixed(2), R: +h.R.toFixed(2), mouse: ARIA_MS.map(v => +v.toFixed(4)) }; },
    planInfo(from, key) { if (!PLANS[key]) return null; let t0 = 0; return PLANS[key].build(from).map(ph => { const o = { kind: ph.kind, name: ph.name, t0: +t0.toFixed(3), dur: ph.rest ? null : +ph.dur.toFixed(3) }; t0 += ph.rest ? 0 : ph.dur; return o; }); },
    anchors(from, key, dt = 0.02) { if (!PLANS[key]) return null; const plan = PLANS[key].build(from), keep = [st.finnHead, st.finnRect], c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
      const meas = q => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); drawFinn(g, q); const r = st.finnRect.map(Math.round), x0 = Math.max(0, r[0] - 40), y0 = Math.max(0, r[1] - 20), w = Math.min(W, r[2] + 60) - x0, h = Math.min(H, r[3] + 10) - y0, d = g.getImageData(x0, y0, w, h).data;
        let top = h, bot = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (y < top) top = y; bot = y; }
        let hx = 0, hy = 0, hn = 0, sx = 0, sy = 0, sn = 0; const hl = top + (bot - top) * 0.45, sl = bot - (bot - top) * 0.1;
        for (let y = top; y <= bot; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (d[i + 3] < 128) continue; if (y < hl && d[i] < 110 && d[i + 1] < 100 && d[i + 2] < 100) { hx += x; hy += y; hn++; } if (y > sl) { sx += x; sy += y; sn++; } }
        return { hair: [x0 + hx / hn, y0 + hy / hn], shoe: [x0 + sx / sn, y0 + sy / sn], top: y0 + top }; };
      const out = { hair: 0, shoe: 0, cuts: [] }; let prev = null, T = 0;
      for (const [i, ph] of plan.entries()) { const dur = ph.rest ? 0.3 : ph.dur;
        for (let t = 0; t < dur - 1e-9; t += dt) { const q = pose(ph, t), m = meas(q), spr = q.sit2 && IMG.sit2 ? 'sit2:' + q.sit2 : q.idle && IMG.idle ? 'idle' : q.spr === 'walk' ? 'walk' + q.row + ':' + q.facing : q.cell;
          if (prev) { const jh = dist(prev.m.hair, m.hair), js = dist(prev.m.shoe, m.shoe); if (jh > out.hair) { out.hair = +jh.toFixed(2); out.hairAt = [ph.kind, +t.toFixed(2)]; } if (js > out.shoe) { out.shoe = +js.toFixed(2); out.shoeAt = [ph.kind, +t.toFixed(2)]; }
            if (spr !== prev.spr && !(/^walk/.test(spr) && /^walk/.test(prev.spr))) out.cuts.push({ kind: ph.kind, t: +T.toFixed(2), from: prev.spr, to: spr, hair: [+(m.hair[0] - prev.m.hair[0]).toFixed(1), +(m.hair[1] - prev.m.hair[1]).toFixed(1)], shoe: [+(m.shoe[0] - prev.m.shoe[0]).toFixed(1), +(m.shoe[1] - prev.m.shoe[1]).toFixed(1)] }); }
          prev = { m, spr }; T += dt; } }
      [st.finnHead, st.finnRect] = keep; return out; },
    seek(from, key, time) { if (!PLANS[key]) return null; const plan = PLANS[key].build(from); let t = Math.max(0, time), i = 0;
      while (i < plan.length - 1 && !plan[i].rest && t >= plan[i].dur) { t -= plan[i].dur; i++; }
      const n = plan[i]; st.plan = plan; st.i = i; st.t = t; st.planKey = key; st.paused = true; st.queued = null; st.tour = false; st.mode = 'auto';
      st.where = n.kind === 'idle' ? n.at : n.kind === 'work' || n.kind === 'meet' ? n.seat : n.kind === 'walk' ? n.from : from; st.q = pose(n, t); applyChairs(st.q); if (follow) cameraTick(0, true); return { i, kind: n.kind, t: +t.toFixed(3) }; },
    walkTrace(from, key, dt = 0.02) { if (!PLANS[key]) return null; const plan = PLANS[key].build(from), out = []; let t0 = 0;
      for (const ph of plan) { const dur = ph.rest ? 0 : ph.dur; if (ph.kind === 'walk' || ph.kind === 'stand') for (let t = 0; t < dur - 1e-9; t += dt) { const q = pose(ph, t), dp = q.dpos || q.pos, p = P(dp[0], dp[1]); if (q.spr !== 'walk') continue; // floor-30: + stand (step out)
          const rig = q.rig && LFL && IMG.legsFL && LFL.rig.views[q.facing], yb = p[1] - (q.bob || 0) * 0.03 * S + (rig ? q.rig.dip * KW : 0), row = [+(t0 + t).toFixed(3), q.facing, rig ? 'rig' : q.row ? 'B' : 'A', +p[0].toFixed(2), +yb.toFixed(2), q.moving ? 1 : 0];
          if (rig) { const Lg = flLegs(q), V = LFL.rig.views[q.facing], f = [A.walk.foot[V.col + ',0'][0] - V.col * A.walk.cw, A.walk.foot[V.col + ',0'][1]], ax = v => V.mirror ? V.mirror - v : v; for (const n of V.swap ? ['far', 'near'] : ['near', 'far']) row.push(Lg[n].stance ? 1 : 0, +(p[0] + (ax(Lg[n].ank[0]) - flAnchorIn(V)) * KW).toFixed(2), +(yb + (Lg[n].ank[1] - f[1]) * KW).toFixed(2), +Lg[n].slide.toFixed(2)); }
          out.push(row); }
        t0 += dur; }
      return { KW, out }; },
    trace(from, key, dt = 0.02) { if (!PLANS[key]) return null; const plan = PLANS[key].build(from), keep = [st.finnHead, st.finnRect], g = document.createElement('canvas').getContext('2d');
      const out = {}, cuts = []; let prev = null;
      for (const [i, ph] of plan.entries()) { const dur = ph.rest ? 0.4 : ph.dur;
        for (let t = 0; t < dur - 1e-9; t += dt) { const q = pose(ph, t); drawFinn(g, q); const head = st.finnHead.slice(), dp = q.spr === 'seated' ? (q.foot || SEATS[q.seatKey].foot) : q.dpos || q.pos, spr = q.sit2 && IMG.sit2 ? 'sit2:' + q.sit2 : q.idle && IMG.idle ? 'idle' : q.spr === 'walk' ? 'walk' + q.row : q.cell;
          if (prev) { const o = out[ph.kind] = out[ph.kind] || { draw: 0, logic: 0, head: 0 }, vd = dist(prev.dp, dp) / dt, vl = dist(prev.pos, q.pos) / dt, hj = Math.hypot(head[0] - prev.head[0], head[1] - prev.head[1]);
            o.draw = Math.max(o.draw, +vd.toFixed(3)); o.logic = Math.max(o.logic, +vl.toFixed(3)); o.head = Math.max(o.head, +hj.toFixed(2));
            if (spr !== prev.spr) cuts.push({ i, kind: ph.kind, t: +t.toFixed(2), from: prev.spr, to: spr, head: +hj.toFixed(2), foot: +(dist(prev.dp, dp) * S).toFixed(2) }); }
          prev = { dp, pos: q.pos, head, spr }; } }
      [st.finnHead, st.finnRect] = keep; const big = cuts.filter(c => !/^walk/.test(c.from) || !/^walk/.test(c.to)).sort((a, b) => b.head - a.head);
      return { phases: out, cuts: big.slice(0, 8), walkCuts: cuts.filter(c => /^walk/.test(c.from) && /^walk/.test(c.to)).reduce((m, c) => Math.max(m, c.head), 0) }; },
  };
  const TOUR = ['toCoffee', 'toServer', 'toReview', 'toMeeting', 'toBench', 'toDesk'], DWELL = { desk: 10, meet: 9, CO: 4, SV: 6, RV: 4, BZ: 5, E: 3 };
  function tourTick(dt) {
    if (!st.tour || st.reduced || st.stepMode) return; st.dwell += dt; if (st.dwell < (DWELL[st.where] || 4)) return;
    for (let n = 0; n < TOUR.length; n++) { const key = TOUR[st.tourI++ % TOUR.length]; if (PLAN_TARGET[key] !== st.where) { startPlan(key); return; } }
  }
  function advance(dt) {
    if (st.paused) return; const ph = cur(); st.t += dt; if (ph.rest) { if (st.queued) { const k = st.queued; st.queued = null; if (PLAN_TARGET[k] !== st.where) { startPlan(k); return; } } tourTick(dt); return; }
    if (st.t >= ph.dur) {
      const over = st.t - ph.dur; st.i++; st.t = 0;
      const n = cur(); if (n.kind === 'idle') st.where = n.at; else if (n.kind === 'work' || n.kind === 'meet') st.where = n.seat; else if (n.kind === 'walk') st.where = n.from;
      if (st.stepMode) st.paused = !n.rest; else if (!n.rest) st.t = over;
    }
  }
  function frame(now) {
    if (document.hidden) { frame.last = 0; requestAnimationFrame(frame); return; }
    const raw = (now - (frame.last || now)) / 1000, dt = Math.min(0.05, raw) * SPEEDUP; frame.last = now; st.frames++;
    if (raw > 0) { st.dtSum = (st.dtSum || 0) + raw; st.dtMax = Math.max(st.dtMax || 0, raw); }
    advance(dt); if (!st.paused) { st.clock += dt; if (!st.reduced) st.env += dt; }
    const q = pose(cur(), st.t); applyChairs(q); ariaMouseShift();
    { const ph = cur(), through = ph.kind === 'walk' && ['SD', 'SI'].includes(ph.from) && ['SD', 'SI'].includes(ph.to), target = through || dist(q.pos, DOOR_C) < 1.6 ? 1 : 0;
      if (!st.paused) { doorP = st.reduced ? target : doorP + Math.sign(target - doorP) * Math.min(Math.abs(target - doorP), dt / DOOR_TRAVEL); doorOpen = ease(doorP); } } const h = hits(q.pos, cur()), hd = q.spr === 'walk' && q.dpos && !q.seatKey ? hits(q.dpos, cur()) : []; // floor-21: the drawn walking position is checked too
    if (h.length || hd.length || !roomOk(q.pos)) st.violations.push({ ph: cur().kind, pos: q.pos.map(v => +v.toFixed(3)), hits: [...new Set([...h, ...hd])] });
    if (st.q && dt > 0 && !st.paused && st.q.gen === st.gen) st.maxSpeed = Math.max(st.maxSpeed || 0, dist(st.q.pos, q.pos) / dt);
    q.gen = st.gen; st.q = q; const r0 = performance.now(); cameraTick(dt); render(q); const rm = performance.now() - r0; st.rN = (st.rN || 0) + 1; st.rSum = (st.rSum || 0) + rm; st.rMax = Math.max(st.rMax || 0, rm); requestAnimationFrame(frame);
  }
  const DOOR_C = [(SRV.door[0] + SRV.door[1]) / 2, SRV.y0];
  document.addEventListener('visibilitychange', () => { frame.last = 0; }); // no catch-up jump on return
  function render(q) {
    for (const k of ['shadow', 'back', 'char', 'front', 'marks', 'debug']) { clear(L[k]); camApply(L[k]); }
    const sp = q.spr === 'walk' ? (q.dpos || q.pos) : (q.foot || SEATS[q.seatKey].foot), sh = P(sp[0], sp[1]);
    if (live.agents.finn) { L.shadow.fillStyle = 'rgba(40,28,16,.28)'; L.shadow.beginPath(); L.shadow.ellipse(sh[0], sh[1], (q.spr === 'walk' ? 16 : 12) * SK, (q.spr === 'walk' ? 7 : 5) * SK, 0, 0, Math.PI * 2); L.shadow.fill(); }
    drawContactShadows(L.shadow, true);
    const front = [];
    const own = q.spr === 'seated' ? SEATS[q.seatKey].chair : null, keepBack = id => id === own; // floor-22: not while standing in front of it
    const fset = new Set(F.filter(f => inFront(f, q.pos)).map(f => f.id));
    for (let grew = true; grew;) { grew = false; for (const [a, b] of ORDER_INFO.edges) if (fset.has(a) && !fset.has(b) && !keepBack(b)) { fset.add(b); grew = true; } }
    let drawn = 0; for (const f of F) { const fr = fset.has(f.id); if (fr) front.push(f.id); drawPiece(fr ? L.front : L.back, f, st.clock); drawn++; }
    st.drawn = drawn;
    st.front = front;
    { const fs = new Set(front), inv = ORDER_INFO.edges.filter(([a, b]) => fs.has(a) && !fs.has(b) && !keepBack(b));
      st.inv = inv; if (inv.length > (st.invMax || 0)) { st.invMax = inv.length; st.invFirst = { pos: q.pos.map(v => +v.toFixed(3)), inv }; } }
    if (live.agents.finn) drawFinn(L.char, q);
    { const base = new Set(F.filter(f => inFront(f, q.pos)).map(f => f.id)), fr0 = st.finnRect, over = [];
      if (fr0) for (const f of F) if (fset.has(f.id) && !base.has(f.id) && !inFront(f, q.pos, true)) { const bx = extBox(f.ext || [f.fp[0], f.fp[1], 0, f.fp[2], f.fp[3], f.person ? 1.8 : 2.4]); if (bx[0] < fr0[2] && fr0[0] < bx[2] && bx[1] < fr0[3] && fr0[1] < bx[3]) over.push(f.id); }
      st.promoted = [...fset].filter(id => !base.has(id)); if (over.length) (st.promoOverFinn = st.promoOverFinn || []).push({ pos: q.pos.map(v => +v.toFixed(3)), over }); }
    drawSteam(L.front); drawFacade(L.front); drawExteriorFront(L.front);
    for (const pp of AVATAR_SLOTS.filter(pp => live.agents[pp.id])) { if (pp.id !== 'finn' && (!IMG['person-' + pp.id] || sel === pp.id)) drawMarker(L.marks, pp, sel === pp.id); }
    if (tagsOn) drawTags(L.marks, AVATAR_SLOTS.filter(pp => live.agents[pp.id]).map(pp => ({ pp, head: pp.id === 'finn' ? st.finnHead : PHEAD[pp.id], sel: sel === pp.id, pending: pp.id !== 'finn' && !IMG['person-' + pp.id] })), follow ? (follow === 'finn' ? st.finnRect : PRECT[follow]) : null);
    if (debugOn) drawDebug(L.debug, q);
  }
  function drawDebug(g, q) {
    for (const f of F) { if (!f.collide) continue; const b = f.fp; poly(g, [P(b[0], b[1], 0.02), P(b[2], b[1], 0.02), P(b[2], b[3], 0.02), P(b[0], b[3], 0.02)], 'rgba(220,60,50,.22)', '#c83a32', 1); }
    g.strokeStyle = '#1d6b52'; g.lineWidth = 2.5; g.setLineDash([7, 5]); for (const [a, b] of EDGE) { g.beginPath(); g.moveTo(...P(...NODE[a])); g.lineTo(...P(...NODE[b])); g.stroke(); } g.setLineDash([]);
    g.font = '700 11px system-ui,sans-serif';
    for (const [k, v] of Object.entries(NODE)) { const p = P(...v); g.fillStyle = '#1d6b52'; g.beginPath(); g.arc(p[0], p[1], 4.5, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeText(k, p[0] + 6, p[1] - 5); g.fillText(k, p[0] + 6, p[1] - 5); }
    const c = q.pos; poly(g, [P(c[0] - R, c[1] - R, 0.03), P(c[0] + R, c[1] - R, 0.03), P(c[0] + R, c[1] + R, 0.03), P(c[0] - R, c[1] + R, 0.03)], 'rgba(29,107,82,.25)', '#1d6b52', 1.5);
  }

  window.MV = Object.assign(api, {
    setAgents(agents, connected) {
      const previous = live.agents.finn?.id;
      live.agents = Object.fromEntries(agents.map(a => [a.slot, a])); live.connected = connected;
      if (follow && !live.agents[follow]) { follow = null; camT = null; }
      if (sel && !live.agents[sel]) sel = null;
      st.tour = false; st.queued = null;
      if (live.agents.finn && previous !== live.agents.finn.id) {
        const plan = PLANS.toDesk.build('E'), work = plan.findIndex(p => p.kind === 'work');
        st.plan = plan; st.i = work; st.t = 0; st.where = 'desk'; st.planKey = 'toDesk'; st.paused = false;
        st.q = pose(cur(), 0); applyChairs(st.q);
      }
    },
    agentSlots: () => Object.values(live.agents),
    finnFrame() { const c = document.createElement('canvas'); c.width = W; c.height = H;
      const keep = [st.finnHead, st.finnRect]; try { drawFinn(c.getContext('2d'), st.q); } finally { [st.finnHead, st.finnRect] = keep; } return c; },
    debug: () => { const ph = cur(), q = st.q || pose(ph, 0); return { view: camName, follow, layerPx: L.bg ? [L.bg.canvas.width, L.bg.canvas.height] : null, labelPx: L.marks ? [L.marks.canvas.width, L.marks.canvas.height] : null, bgCacheDraws: st.bgCacheDraws || 0, cam: { z: +cam.z.toFixed(3), c: cam.c.map(v => +v.toFixed(2)) }, sel, reducedMotion: !!st.reduced, tour: !!st.tour, doorOpen: +doorOpen.toFixed(2), env: +st.env.toFixed(2), plan: st.planKey || null, step: st.i, phase: ph.kind, phaseName: ph.name, rest: !!ph.rest, where: st.where, t: +st.t.toFixed(3), paused: st.paused,
      seatFlow: q.seatFlow === undefined ? null : +q.seatFlow.toFixed(4), clock: +st.clock.toFixed(3), stepMode: !!st.stepMode, queued: st.queued || null, micro: st.reduced ? {} : Object.fromEntries(Object.entries(MICRO).filter(e => e[1].head).map(([k, v]) => [k, +(v.head.angle ? v.head.angle() : headAngle(v.head)).toFixed(2)])), finnRect: (st.finnRect || []).map(v => +v.toFixed(1)), dpos: (q.dpos || q.pos).map(v => +v.toFixed(3)), walkStep: q.step === undefined ? null : q.step, stepU: q.stepU === undefined ? null : q.stepU, doorP: +doorP.toFixed(3),
      pos: q.pos.map(v => +v.toFixed(3)), sprite: q.sit2 && IMG.sit2 ? 'sit2:' + q.sit2 : q.idle && IMG.idle ? 'idle:' + q.facing : q.spr === 'walk' ? 'walk:' + q.facing + ':' + (q.rig && LFL && IMG.legsFL && LFL.rig.views[q.facing] ? 'rig' : q.row ? 'B' : 'A') : 'seated:' + q.cell, seated: !!q.seated, type: q.type ? { L: +q.type.L.toFixed(2), R: +q.type.R.toFixed(2) } : null, turnPhase: ph.kind === 'turn', front: st.front || [],
      maxSpeed: +(st.maxSpeed || 0).toFixed(3), walked: ph.kind === 'walk' ? +(ph.cum + legDist(ph, st.t)).toFixed(3) : null, drawnPieces: st.drawn, totalPieces: F.length, inversions: st.inv || [], invMax: st.invMax || 0, invFirst: st.invFirst || null, promoted: st.promoted || [], promoOverFinn: (st.promoOverFinn || []).length, promoLast: (st.promoOverFinn || []).slice(-4), promoOverFinnFirst: (st.promoOverFinn || [])[0] || null, violations: st.violations.length, firstViolation: st.violations[0] || null, frames: st.frames, loopStarts: st.loopStarts, images: imgState, sel, log: st.log.slice(),
      avgFrameMs: st.frames > 1 ? +((st.dtSum || 0) / (st.frames - 1) * 1000).toFixed(1) : null, maxFrameMs: +((st.dtMax || 0) * 1000).toFixed(1), renderMs: st.rN ? +(st.rSum / st.rN).toFixed(2) : null, renderMaxMs: +(st.rMax || 0).toFixed(1) }; },
    spec: { NODE, EDGE, SEAT, SPEED, R, routeCheck, fps: Object.fromEntries(F.map(f => [f.id, f.fp])), rugs: RUGS, shelfR: (f => ({ sprite: f.sprite, ext: f.ext, inAtlas: !!A.scene[f.sprite], finish: 'grain' }))(F.find(f => f.id === 'shelf-r')), // floor-18: footprints for the clearance checks
      routes: Object.fromEntries(Object.keys(NODE).map(k => [k, route('E', k)])), seats: SEATS, meetHands: { L: HLm.map(v => +v.toFixed(3)), R: HRm.map(v => +v.toFixed(3)), table: MT }, planTargets: PLAN_TARGET, rooms: { room: [0, 0, RX, RY], server: { box: [12.2, 0, RX, SRV.y1], door: SRV.door, doorY: SRV.y0, knee: SRV.knee }, meeting: { box: [12.3, 6.2, RX, 9.64], door: [7.3, 8.3] }, entry: { door: [DOOR.x0, DOOR.x1] } }, outPlants: OUT_PLANTS,
      avatarSlots: AVATAR_SLOTS, zones: Object.fromEntries(Object.entries(ZONES).map(([k, v]) => [k, v.name])), furniture: F.map(f => ({ id: f.id, label: f.label, fp: f.fp.map(v => +v.toFixed(3)), collide: f.collide, sprite: f.sprite && A.scene[f.sprite] ? f.sprite : null, zone: f.zone })),
      hands: { L: HL.map(v => +v.toFixed(3)), R: HR.map(v => +v.toFixed(3)), keyboard: KEYB.map(v => +v.toFixed(3)), mouse: MOUSE.map(v => +v.toFixed(3)) }, speedup: SPEEDUP, order: { cycles: ORDER_INFO.cycles, ids: F.map(f => f.id), edges: ORDER_INFO.edges.length, allEdges: ORDER_INFO.allEdges, edgeList: ORDER_INFO.edges }, stage: { W, H, S, RX, RY } },
    boardProbe, pieceFinishProbe,
    doorProbe() { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); if (DOOR.on) drawDoorFrame(g); const d = g.getImageData(0, 0, W, H).data;
      let px = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) px++; return { door: { ...DOOR }, opening: [DOOR.x0 + DOOR.wl, DOOR.x1 - DOOR.wr], E: NODE.E, R, room: [RX, RY], px, inPieces: F.some(f => f.id === 'door') }; },
    glassProbe(id) { const f = F.find(x => x.id === id), run = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); f.draw(g, 0); return g.getImageData(0, 0, W, H).data; };
      const on = run(), keep = GLASS_FRAME.on; GLASS_FRAME.on = false; const off = run(); GLASS_FRAME.on = keep; let changed = 0, glass = 0;
      for (let i = 0; i < on.length; i += 4) { if (off[i + 3] > 0) glass++; if (Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]) + Math.abs(on[i + 3] - off[i + 3]) > 8) changed++; }
      return { id, glass, changed, share: +(changed / glass).toFixed(3) }; },
    roiPiece(id) { const f = F.find(x => x.id === id), b = f.fp, r = extBox(f.ext || [b[0], b[1], 0, b[2], b[3], 1.0]), tx = v => W / 2 + (v - cam.c[0]) * cam.z, ty = v => H / 2 + (v - cam.c[1]) * cam.z; return [tx(r[0]), ty(r[1]), tx(r[2]), ty(r[3])]; },
    finnTag: () => finnTag(),
    tags: () => ({ rects: { ...TAGRECT }, heads: { ...PHEAD, finn: st.finnHead } }),
    roiFinn() { const r = st.finnRect || [0, 0, 0, 0], tx = v => W / 2 + (v - cam.c[0]) * cam.z, ty = v => H / 2 + (v - cam.c[1]) * cam.z; return [tx(r[0]), ty(r[1]), tx(r[2]), ty(r[3])]; },
    roi(id) { const r = PRECT[id], at = AVATAR_SPOTS[id], cb = extBox([at[0] - 0.32, at[1] - 0.32, 0, at[0] + 0.32, at[1] + 0.32, 1.0]);
      const w = r[2] - r[0], h = r[3] - r[1], x0 = Math.min(r[0] + 0.15 * w, cb[0]), y0 = Math.min(r[1], cb[1]), x1 = Math.max(r[2] - 0.15 * w, cb[2]), y1 = Math.max(r[3] - 0.02 * h, cb[3]);
      const tx = v => W / 2 + (v - cam.c[0]) * cam.z, ty = v => H / 2 + (v - cam.c[1]) * cam.z; return [tx(x0), ty(y0), tx(x1), ty(y1)]; },
    zoeyTips: (() => { const m = A.people.zoey, at = AVATAR_SPOTS.zoey, k = CH / m.h, f = P(at[0], at[1], 0);
      return m.tips.map(t => Pinv(f[0] + (t[0] - m.anchor[0]) * k, f[1] + (t[1] - m.anchor[1]) * k, 0.95).map(v => +v.toFixed(3))); })(),
    plans: Object.fromEntries(Object.entries(PLANS).map(([k, v]) => [k, v.label])), zones: ZONES, avatarSlots: AVATAR_SLOTS, phaseList: () => st.plan.map(p => p.name), micro: { aria: '머리 기울임·자기 화면 타자·왼손 타건·오른손 마우스 이동', noah: '머리 기울임·검토 손짓·종이 기울임', max: '머리 기울임·랙 패널 두드림', leo: '눈 깜빡임·회의 중 말하기·말할 때 손짓', luna: '머리 살짝 기울임·화면 필기·스타일러스 필기', zoey: '머리 살짝 기울임·스코프·인두 연기' },
    role: (id, e) => (ROLE[id] ? { ...role(id, e === undefined ? st.env : e), head: +roleHead(id).toFixed(2) } : null), meetBeat: t => meetBeat(t), // floor-23 probes
    hands: () => ({ aria: ariaHands(), noah: noahHands(), luna: +lunaPen().toFixed(2), max: +maxHand().toFixed(2), leo: +leoHand().toFixed(2) }), stepIndex: () => st.i,
  });

  const MAX_LAYER_PX = 1e6, SHARP = new Set(['marks', 'debug']);
  function fitLayers() { if (!L.bg) return false; const full = Math.max(0.25, Math.min(2, window.devicePixelRatio || 1) * Math.min(1, stageCss / W)), want = Math.min(Math.sqrt(MAX_LAYER_PX / (W * H)), full);
    if (Math.abs(want - DPR) / DPR < 0.04 && L.bg.canvas.width === Math.round(W * DPR) && L.marks.canvas.width === Math.round(W * full)) return false; DPR = want; bgC = null;
    for (const k of Object.keys(L)) { const d = SHARP.has(k) ? full : want; L[k].__dpr = d; L[k].canvas.width = Math.round(W * d); L[k].canvas.height = Math.round(H * d); }
    if (cam.follow) { cam = { ...cam, follow: false }; cameraTick(0, true); } else { clear(L.bg); camApply(L.bg); drawFloor(L.bg); } return true; }
  async function start() {
    const stage = document.getElementById('stage');
    new ResizeObserver(([e]) => { labelScale = Math.max(1, Math.min(3.4, 0.84 * W / Math.max(1, e.contentRect.width))); stageCss = Math.max(1, e.contentRect.width); fitLayers(); }).observe(stage);
    for (const k of ['bg', 'shadow', 'back', 'char', 'front', 'marks', 'debug']) {
      const c = document.createElement('canvas'); c.id = 'layer-' + k; c.className = 'layer'; c.dataset.layer = k;
      DPR = Math.min(2, window.devicePixelRatio || 1); c.width = W * DPR; c.height = H * DPR; stage.appendChild(c); L[k] = c.getContext('2d');
    }
    const z = new URLSearchParams(location.search).get('zone'); if (ZONES[z]) { cam = ZONES[z]; camName = z; }
    stageCss = Math.max(1, stage.getBoundingClientRect().width) || W; fitLayers();
    await Promise.all([load('walk', A.walk.src), load('seated', A.seated.src), load('floor', A.floor.src), load('rugs', A.rugs.src), load('idle', A.idle.src), ...(S2 ? [load('sit2', S2.src)] : []), ...(LFL ? [load('legsFL', LFL.src)] : []), ...Object.entries(A.people).map(([k, v]) => load('person-' + k, v.src)), ...Object.entries(A.atlases).map(([k, src]) => load(k, src))]);
    if (S2 && !IMG.sit2) throw new Error('sit-v2 sheet failed to load: ' + S2.src);
    clear(L.bg); camApply(L.bg); drawFloor(L.bg); st.q = pose(cur(), 0);
    if (st.loopStarts++ === 0) requestAnimationFrame(frame);
    document.dispatchEvent(new Event('mv-ready'));
  }
  window.MV.start = start;
})();
