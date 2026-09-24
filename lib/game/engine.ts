import {
  Bullet,
  Direction,
  GameState,
  Tank,
  Vec2,
  Wall,
} from "./types";

export const CANVAS_W = 800;
export const CANVAS_H = 600;

const PLAYER_SIZE = 32;
const ENEMY_SIZE = 32;
const BULLET_SPEED = 7;
const BULLET_RADIUS = 4;
const PLAYER_SPEED = 3;
const ENEMY_SPEED = 1.7;
const PLAYER_COOLDOWN = 18;
const ENEMY_COOLDOWN = 70;
const ENEMY_HP = 2;
const WALL_THICKNESS = 24;

const DIR_VECTORS: Record<Direction, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function dirVector(dir: Direction): Vec2 {
  return DIR_VECTORS[dir];
}

/** AABB overlap test */
function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleRectOverlap(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= r * r;
}

function clampToBounds(tank: Tank): void {
  tank.x = Math.max(0, Math.min(CANVAS_W - tank.size, tank.x));
  tank.y = Math.max(0, Math.min(CANVAS_H - tank.size, tank.y));
}

function collidesWithWalls(
  x: number,
  y: number,
  size: number,
  walls: Wall[]
): boolean {
  for (const w of walls) {
    if (w.hp <= 0) continue;
    if (rectsOverlap(x, y, size, size, w.x, w.y, w.w, w.h)) return true;
  }
  return false;
}

function collidesWithTanks(
  x: number,
  y: number,
  size: number,
  tanks: Tank[],
  selfId: number
): boolean {
  for (const t of tanks) {
    if (t.id === selfId) continue;
    if (rectsOverlap(x, y, size, size, t.x, t.y, t.size, t.size)) return true;
  }
  return false;
}

let bulletIdCounter = 1;

function spawnBullet(tank: Tank, owner: "player" | "enemy"): Bullet {
  const v = dirVector(tank.dir);
  const cx = tank.x + tank.size / 2 + v.x * (tank.size / 2);
  const cy = tank.y + tank.size / 2 + v.y * (tank.size / 2);
  return {
    id: bulletIdCounter++,
    x: cx,
    y: cy,
    dir: tank.dir,
    speed: BULLET_SPEED,
    owner,
    ownerId: tank.id,
    radius: BULLET_RADIUS,
  };
}

function buildWalls(level: number): Wall[] {
  const walls: Wall[] = [];
  const t = WALL_THICKNESS;

  // Border walls
  walls.push({ x: 0, y: 0, w: CANVAS_W, h: t, hp: Infinity });
  walls.push({ x: 0, y: CANVAS_H - t, w: CANVAS_W, h: t, hp: Infinity });
  walls.push({ x: 0, y: 0, w: t, h: CANVAS_H, hp: Infinity });
  walls.push({ x: CANVAS_W - t, y: 0, w: t, h: CANVAS_H, hp: Infinity });

  // Deterministic-ish interior layout based on level
  const layouts: [number, number, number, number][][] = [
    [
      [160, 120, 120, t],
      [520, 120, 120, t],
      [160, 456, 120, t],
      [520, 456, 120, t],
      [384, 240, t, 120],
      [240, 300, 100, t],
      [460, 300, 100, t],
    ],
    [
      [120, 200, t, 200],
      [656, 200, t, 200],
      [280, 120, 240, t],
      [280, 456, 240, t],
      [384, 260, 32, 80],
    ],
    [
      [200, 160, 120, t],
      [480, 160, 120, t],
      [200, 420, 120, t],
      [480, 420, 120, t],
      [384, 120, t, 160],
      [384, 320, t, 160],
      [120, 288, 160, t],
      [520, 288, 160, t],
    ],
  ];

  const layout = layouts[(level - 1) % layouts.length];
  for (const [x, y, w, h] of layout) {
    walls.push({ x, y, w, h, hp: Infinity });
  }
  return walls;
}

function spawnEnemies(level: number): Tank[] {
  const neighbors: Vec2[] = [
    { x: 380, y: 40 },
    { x: 40, y: 280 },
    { x: 730, y: 280 },
    { x: 380, y: 530 },
    { x: 120, y: 120 },
    { x: 640, y: 120 },
  ];
  const count = Math.min(2 + level, 6);
  const enemies: Tank[] = [];
  for (let i = 0; i < count; i++) {
    const p = neighbors[i % neighbors.length];
    enemies.push({
      id: 1000 + level * 100 + i,
      x: p.x,
      y: p.y,
      dir: "down",
      size: ENEMY_SIZE,
      speed: ENEMY_SPEED + level * 0.12,
      cooldown: 30 + i * 20,
      hp: ENEMY_HP,
      isPlayer: false,
      aiTimer: 0,
      aiDir: "down",
      color: ["#e74c3c", "#e67e22", "#9b59b6", "#1abc9c", "#f39c12", "#d35400"][
        i % 6
      ],
    });
  }
  return enemies;
}

export function createInitialState(): GameState {
  const player: Tank = {
    id: 1,
    x: 380,
    y: 520,
    dir: "up",
    size: PLAYER_SIZE,
    speed: PLAYER_SPEED,
    cooldown: 0,
    hp: 3,
    isPlayer: true,
    color: "#2ecc71",
  };
  return {
    player,
    enemies: spawnEnemies(1),
    bullets: [],
    walls: buildWalls(1),
    status: "ready",
    score: 0,
    lives: 3,
    wave: 1,
  };
}

function nextLevel(state: GameState): void {
  const wave = state.wave + 1;
  state.wave = wave;
  state.walls = buildWalls(wave);
  state.enemies = spawnEnemies(wave);
  state.bullets = [];
  state.player.x = 380;
  state.player.y = 520;
  state.player.dir = "up";
  state.player.hp = 3;
  state.status = "playing";
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

function tryMove(
  tank: Tank,
  dir: Direction,
  tanks: Tank[],
  walls: Wall[]
): void {
  tank.dir = dir;
  const v = dirVector(dir);
  const nx = tank.x + v.x * tank.speed;
  const ny = tank.y + v.y * tank.speed;
  if (
    !collidesWithWalls(nx, ny, tank.size, walls) &&
    !collidesWithTanks(nx, ny, tank.size, tanks, tank.id)
  ) {
    tank.x = nx;
    tank.y = ny;
    clampToBounds(tank);
  }
}

interface UpdateCallbacks {
  onScore?: (score: number) => void;
}

/** Advance simulation one tick. Mutates `state`. */
export function update(
  state: GameState,
  input: InputState,
  callbacks: UpdateCallbacks = {}
): void {
  if (state.status !== "playing") return;

  const allTanks = [state.player, ...state.enemies];

  // Player movement
  if (input.up) tryMove(state.player, "up", allTanks, state.walls);
  else if (input.down) tryMove(state.player, "down", allTanks, state.walls);
  else if (input.left) tryMove(state.player, "left", allTanks, state.walls);
  else if (input.right) tryMove(state.player, "right", allTanks, state.walls);

  // Cooldowns
  if (state.player.cooldown > 0) state.player.cooldown--;
  for (const e of state.enemies) if (e.cooldown > 0) e.cooldown--;

  // Player fire
  if (input.fire && state.player.cooldown <= 0) {
    state.bullets.push(spawnBullet(state.player, "player"));
    state.player.cooldown = PLAYER_COOLDOWN;
  }

  // Enemy AI
  for (const e of state.enemies) {
    e.aiTimer = (e.aiTimer ?? 0) - 1;
    const dirs: Direction[] = ["up", "down", "left", "right"];

    // If aligned with player, face and shoot
    const dx = state.player.x - e.x;
    const dy = state.player.y - e.y;
    const alignedX = Math.abs(dx) < 20;
    const alignedY = Math.abs(dy) < 20;

    if (alignedX || alignedY) {
      if (alignedX) e.dir = dy > 0 ? "down" : "up";
      else e.dir = dx > 0 ? "right" : "left";
      if (e.cooldown <= 0 && Math.random() < 0.5) {
        state.bullets.push(spawnBullet(e, "enemy"));
        e.cooldown = ENEMY_COOLDOWN;
      }
    }

    if ((e.aiTimer ?? 0) <= 0) {
      // Prefer moving toward player sometimes
      if (Math.random() < 0.6) {
        if (Math.abs(dx) > Math.abs(dy)) {
          e.aiDir = dx > 0 ? "right" : "left";
        } else {
          e.aiDir = dy > 0 ? "down" : "up";
        }
      } else {
        e.aiDir = dirs[Math.floor(Math.random() * dirs.length)];
      }
      e.aiTimer = 30 + Math.floor(Math.random() * 60);
    }

    if (e.aiDir) tryMove(e, e.aiDir, allTanks, state.walls);
  }

  // Move bullets
  for (const b of state.bullets) {
    const v = dirVector(b.dir);
    b.x += v.x * b.speed;
    b.y += v.y * b.speed;
  }

  // Bullet collisions
  const survivingBullets: Bullet[] = [];
  for (const b of state.bullets) {
    let hit = false;

    // Out of bounds
    if (b.x < 0 || b.x > CANVAS_W || b.y < 0 || b.y > CANVAS_H) {
      hit = true;
    }

    // Wall hit
    if (!hit) {
      for (const w of state.walls) {
        if (w.hp <= 0) continue;
        if (circleRectOverlap(b.x, b.y, b.radius, w.x, w.y, w.w, w.h)) {
          hit = true;
          if (w.hp !== Infinity) {
            w.hp -= 1;
          }
          break;
        }
      }
    }

    // Tank hit
    if (!hit) {
      if (b.owner === "player") {
        for (const e of state.enemies) {
          if (
            circleRectOverlap(b.x, b.y, b.radius, e.x, e.y, e.size, e.size)
          ) {
            hit = true;
            e.hp -= 1;
            break;
          }
        }
      } else {
        if (
          b.ownerId !== state.player.id &&
          circleRectOverlap(
            b.x,
            b.y,
            b.radius,
            state.player.x,
            state.player.y,
            state.player.size,
            state.player.size
          )
        ) {
          hit = true;
          state.player.hp -= 1;
        }
      }
    }

    if (!hit) survivingBullets.push(b);
  }
  state.bullets = survivingBullets;

  // Remove dead enemies
  const before = state.enemies.length;
  state.enemies = state.enemies.filter((e) => e.hp > 0);
  const killed = before - state.enemies.length;
  if (killed > 0) {
    state.score += killed * 100;
    callbacks.onScore?.(state.score);
  }

  // Player death
  if (state.player.hp <= 0) {
    state.lives -= 1;
    if (state.lives <= 0) {
      state.status = "lost";
      return;
    }
    state.player.hp = 3;
    state.player.x = 380;
    state.player.y = 520;
    state.player.dir = "up";
    state.bullets = state.bullets.filter((b) => b.owner !== "enemy");
  }

  // Wave clear
  if (state.enemies.length === 0) {
    if (state.wave >= 5) {
      state.status = "won";
    } else {
      nextLevel(state);
    }
  }
}

// ---------------- Rendering ----------------

export function draw(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // Walls
  for (const w of state.walls) {
    if (w.hp <= 0) continue;
    const fixed = w.hp === Infinity;
    ctx.fillStyle = fixed ? "#3d5a80" : "#5c4033";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = fixed ? "#98c1d9" : "#8b6f47";
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
  }

  // Tanks
  drawTank(ctx, state.player);
  for (const e of state.enemies) drawTank(ctx, e);

  // Bullets
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.owner === "player" ? "#f1c40f" : "#ff6b6b";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawTank(ctx: CanvasRenderingContext2D, tank: Tank): void {
  const { x, y, size } = tank;
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);

  const angle =
    tank.dir === "up"
      ? 0
      : tank.dir === "right"
      ? Math.PI / 2
      : tank.dir === "down"
      ? Math.PI
      : -Math.PI / 2;
  ctx.rotate(angle);

  // Body
  ctx.fillStyle = tank.color;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-size / 2, -size / 2, size, size);

  // Treads
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-size / 2, -size / 2, size * 0.22, size);
  ctx.fillRect(size / 2 - size * 0.22, -size / 2, size * 0.22, size);

  // Turret
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();

  // Barrel points up
  ctx.fillStyle = "#dfe6e9";
  ctx.fillRect(-size * 0.08, -size / 2 - size * 0.3, size * 0.16, size * 0.5);

  ctx.restore();

  // HP bar (enemies only)
  if (!tank.isPlayer) {
    const maxHp = ENEMY_HP;
    const ratio = Math.max(0, tank.hp) / maxHp;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x, y - 8, size, 4);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(x, y - 8, size * ratio, 4);
  }
}
