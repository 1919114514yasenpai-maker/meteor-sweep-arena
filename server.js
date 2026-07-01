// 流星掃射 -ARENA- Socket.io サーバー
// Node.js + Express + Socket.io によるリアルタイム対戦サーバー
// 位置同期・射撃判定(ヒットスキャン)・リスポーンをすべてサーバー側で権威的に処理します。

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ---- ワールド定義(クライアントと同じ値を共有) ----
const WORLD = { w: 1400, h: 1400 };
const OBSTACLES = [
  { x: 300, y: 300, r: 55 }, { x: 1100, y: 300, r: 55 },
  { x: 300, y: 1100, r: 55 }, { x: 1100, y: 1100, r: 55 },
  { x: 700, y: 700, r: 75 }, { x: 700, y: 250, r: 40 },
  { x: 700, y: 1150, r: 40 }, { x: 250, y: 700, r: 40 }, { x: 1150, y: 700, r: 40 }
];

const rooms = {}; // roomCode -> { players: { socketId: {...} } }

function getRoom(code) {
  if (!rooms[code]) rooms[code] = { players: {} };
  return rooms[code];
}

function respawnPoint() {
  for (let i = 0; i < 20; i++) {
    const x = 80 + Math.random() * (WORLD.w - 160);
    const y = 80 + Math.random() * (WORLD.h - 160);
    let ok = true;
    for (const o of OBSTACLES) {
      if (Math.hypot(x - o.x, y - o.y) < o.r + 40) { ok = false; break; }
    }
    if (ok) return { x, y };
  }
  return { x: WORLD.w / 2, y: WORLD.h / 2 };
}

// レイ(半直線) vs 円 の交差判定。命中距離tを返す(なければnull)
function rayCircleT(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx, fy = oy - cy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / 2, t2 = (-b + sq) / 2;
  if (t1 >= 0) return t1;
  if (t2 >= 0) return t2;
  return null;
}

io.on('connection', (socket) => {
  let roomCode = null;

  socket.on('join', ({ name, color, room }) => {
    roomCode = String(room || 'default').slice(0, 24) || 'default';
    socket.join(roomCode);
    const r = getRoom(roomCode);
    const sp = respawnPoint();
    const player = {
      id: socket.id,
      name: String(name || 'PILOT').slice(0, 12),
      color: color || '#4cf3ff',
      x: sp.x, y: sp.y, angle: 0,
      hp: 100, alive: true,
      kills: 0, deaths: 0,
      invulnUntil: Date.now() + 2000
    };
    r.players[socket.id] = player;

    socket.emit('init', {
      selfId: socket.id,
      world: WORLD,
      obstacles: OBSTACLES,
      players: Object.values(r.players)
    });
    socket.to(roomCode).emit('playerJoined', player);
  });

  socket.on('move', ({ x, y, angle }) => {
    if (!roomCode) return;
    const r = rooms[roomCode]; if (!r) return;
    const p = r.players[socket.id]; if (!p || !p.alive) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    // ワールド範囲の簡易バリデーション(チート対策の最低限)
    p.x = Math.max(0, Math.min(WORLD.w, x));
    p.y = Math.max(0, Math.min(WORLD.h, y));
    p.angle = angle || 0;
    socket.to(roomCode).volatile.emit('playerMoved', { id: socket.id, x: p.x, y: p.y, angle: p.angle });
  });

  socket.on('shoot', ({ angle }) => {
    if (!roomCode) return;
    const r = rooms[roomCode]; if (!r) return;
    const shooter = r.players[socket.id];
    if (!shooter || !shooter.alive) return;
    shooter.angle = angle || 0;

    const range = 620;
    const dx = Math.cos(shooter.angle), dy = Math.sin(shooter.angle);
    let bestT = range, hitId = null;

    for (const o of OBSTACLES) {
      const t = rayCircleT(shooter.x, shooter.y, dx, dy, o.x, o.y, o.r);
      if (t !== null && t < bestT) { bestT = t; hitId = null; }
    }
    for (const id in r.players) {
      if (id === socket.id) continue;
      const target = r.players[id];
      if (!target.alive) continue;
      if (target.invulnUntil > Date.now()) continue;
      const t = rayCircleT(shooter.x, shooter.y, dx, dy, target.x, target.y, 24);
      if (t !== null && t < bestT) { bestT = t; hitId = id; }
    }

    const endX = shooter.x + dx * bestT, endY = shooter.y + dy * bestT;
    io.to(roomCode).emit('shotFired', {
      shooterId: socket.id, x1: shooter.x, y1: shooter.y, x2: endX, y2: endY, hit: !!hitId
    });

    if (hitId) {
      const target = r.players[hitId];
      target.hp -= 20;
      if (target.hp <= 0 && target.alive) {
        target.alive = false;
        target.hp = 0;
        target.deaths++;
        shooter.kills++;
        io.to(roomCode).emit('killed', {
          targetId: hitId, targetName: target.name,
          killerId: socket.id, killerName: shooter.name
        });
        setTimeout(() => {
          const rr = rooms[roomCode]; if (!rr) return;
          const t2 = rr.players[hitId]; if (!t2) return;
          const sp = respawnPoint();
          t2.x = sp.x; t2.y = sp.y; t2.hp = 100; t2.alive = true;
          t2.invulnUntil = Date.now() + 2000;
          io.to(roomCode).emit('respawned', { id: hitId, x: t2.x, y: t2.y });
        }, 3000);
      } else {
        io.to(roomCode).emit('damaged', { id: hitId, hp: target.hp });
      }
    }
  });

  socket.on('disconnect', () => {
    if (!roomCode) return;
    const r = rooms[roomCode]; if (!r) return;
    delete r.players[socket.id];
    socket.to(roomCode).emit('playerLeft', { id: socket.id });
    if (Object.keys(r.players).length === 0) delete rooms[roomCode];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('流星掃射ARENA server listening on port ' + PORT));
