/**
 * 生成 README 用的游戏截图（SVG）。
 * 复刻 lib/game/engine.ts 的绘制逻辑与配色，无需浏览器或额外依赖。
 *
 * 运行: node scripts/gen-screenshots.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const W = 800;
const H = 600;
const T = 24; // wall thickness

// ---------- 数据（与 engine.ts 保持一致） ----------

const COLORS = {
  bg: "#1a1a2e",
  grid: "rgba(255,255,255,0.04)",
  wallFixedFill: "#3d5a80",
  wallFixedStroke: "#98c1d9",
  wallBrickFill: "#5c4033",
  wallBrickStroke: "#8b6f47",
  player: "#2ecc71",
  bulletPlayer: "#f1c40f",
  bulletEnemy: "#ff6b6b",
};

function borderWalls() {
  return [
    { x: 0, y: 0, w: W, h: T },
    { x: 0, y: H - T, w: W, h: T },
    { x: 0, y: 0, w: T, h: H },
    { x: W - T, y: 0, w: T, h: H },
  ];
}

function layoutWalls(level) {
  const layouts = [
    [
      [160, 120, 120, T],
      [520, 120, 120, T],
      [160, 456, 120, T],
      [520, 456, 120, T],
      [384, 240, T, 120],
      [240, 300, 100, T],
      [460, 300, 100, T],
    ],
    [
      [120, 200, T, 200],
      [656, 200, T, 200],
      [280, 120, 240, T],
      [280, 456, 240, T],
      [384, 260, 32, 80],
    ],
    [
      [200, 160, 120, T],
      [480, 160, 120, T],
      [200, 420, 120, T],
      [480, 420, 120, T],
      [384, 120, T, 160],
      [384, 320, T, 160],
      [120, 288, 160, T],
      [520, 288, 160, T],
    ],
  ];
  return layouts[(level - 1) % layouts.length].map(([x, y, w, h]) => ({
    x,
    y,
    w,
    h,
  }));
}

// ---------- SVG 绘制 ----------

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function drawGrid() {
  let out = "";
  for (let x = 0; x <= W; x += 40) {
    out += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${COLORS.grid}" stroke-width="1"/>`;
  }
  for (let y = 0; y <= H; y += 40) {
    out += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>`;
  }
  return out;
}

function drawWall(w, fixed) {
  const fill = fixed ? COLORS.wallFixedFill : COLORS.wallBrickFill;
  const stroke = fixed ? COLORS.wallFixedStroke : COLORS.wallBrickStroke;
  return `
    <rect x="${w.x}" y="${w.y}" width="${w.w}" height="${w.h}" fill="${fill}"/>
    <rect x="${w.x + 1}" y="${w.y + 1}" width="${w.w - 2}" height="${w.h - 2}"
          fill="none" stroke="${stroke}" stroke-width="2"/>`;
}

const DIR_ANGLE = { up: 0, right: 90, down: 180, left: 270 };

function drawTank(t, { hpRatio = null } = {}) {
  const cx = t.x + t.size / 2;
  const cy = t.y + t.size / 2;
  const s = t.size;
  const angle = DIR_ANGLE[t.dir] ?? 0;

  let out = `<g transform="translate(${cx} ${cy}) rotate(${angle})">
    <rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" fill="${t.color}"
          stroke="rgba(0,0,0,0.4)" stroke-width="2"/>
    <rect x="${-s / 2}" y="${-s / 2}" width="${s * 0.22}" height="${s}" fill="rgba(0,0,0,0.35)"/>
    <rect x="${s / 2 - s * 0.22}" y="${-s / 2}" width="${s * 0.22}" height="${s}" fill="rgba(0,0,0,0.35)"/>
    <circle cx="0" cy="0" r="${s * 0.22}" fill="rgba(255,255,255,0.85)"/>
    <rect x="${-s * 0.08}" y="${-s / 2 - s * 0.3}" width="${s * 0.16}" height="${s * 0.5}" fill="#dfe6e9"/>
  </g>`;

  if (hpRatio !== null) {
    out += `
    <rect x="${t.x}" y="${t.y - 8}" width="${s}" height="4" fill="rgba(0,0,0,0.5)"/>
    <rect x="${t.x}" y="${t.y - 8}" width="${s * hpRatio}" height="4" fill="#e74c3c"/>`;
  }
  return out;
}

function drawBullet(b) {
  const color = b.owner === "player" ? COLORS.bulletPlayer : COLORS.bulletEnemy;
  return `<circle cx="${b.x}" cy="${b.y}" r="${b.radius}" fill="${color}" filter="url(#glow)"/>`;
}

/** 顶部 HUD 覆盖层 */
function drawHud({ score, lives, wave, hp }) {
  const items = [
    { label: "得分", value: String(score) },
    { label: "生命", value: "❤".repeat(lives) },
    { label: "关卡", value: `${wave} / 5` },
  ];
  let x = 16;
  let out = "";
  for (const it of items) {
    const pad = 14;
    const wItem = 110;
    out += `
    <rect x="${x}" y="12" width="${wItem}" height="36" rx="10"
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
    <text x="${x + pad}" y="35" font-family="system-ui, sans-serif" font-size="13" fill="#8b93a7">${esc(
      it.label
    )}</text>
    <text x="${x + wItem - pad}" y="35" text-anchor="end"
          font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#f1f5f9">${esc(
            it.value
          )}</text>`;
    x += wItem + 10;
  }
  // HP 条
  const wItem = 110;
  out += `
    <rect x="${x}" y="12" width="${wItem}" height="36" rx="10"
          fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
    <text x="${x + 14}" y="35" font-family="system-ui, sans-serif" font-size="13" fill="#8b93a7">血量</text>
    <rect x="${x + 54}" y="25" width="42" height="10" rx="5" fill="rgba(255,255,255,0.15)"/>
    <rect x="${x + 54}" y="25" width="${42 * (hp / 3)}" height="10" rx="5" fill="#2ecc71"/>`;
  return out;
}

function wrapScene(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${COLORS.bg}"/>
  ${drawGrid()}
  ${inner}
</svg>`;
}

// ---------- 场景 1: 游戏进行中 ----------

function sceneGameplay() {
  const walls = [...borderWalls(), ...layoutWalls(1)];
  const player = {
    x: 380,
    y: 500,
    dir: "up",
    size: 32,
    color: COLORS.player,
  };
  const enemies = [
    { x: 200, y: 200, dir: "down", size: 32, color: "#e74c3c", hp: 2 },
    { x: 560, y: 280, dir: "left", size: 32, color: "#e67e22", hp: 1 },
    { x: 380, y: 120, dir: "down", size: 32, color: "#9b59b6", hp: 2 },
  ];
  const bullets = [
    { x: 396, y: 440, owner: "player", radius: 4 },
    { x: 200, y: 350, owner: "enemy", radius: 4 },
    { x: 480, y: 280, owner: "enemy", radius: 4 },
  ];

  let inner = walls.map((w) => drawWall(w, true)).join("\n");
  inner += "\n" + enemies.map((e) => drawTank(e, { hpRatio: e.hp / 2 })).join("\n");
  inner += "\n" + drawTank(player);
  inner += "\n" + bullets.map(drawBullet).join("\n");
  inner += "\n" + drawHud({ score: 400, lives: 3, wave: 2, hp: 3 });
  return wrapScene(inner);
}

// ---------- 场景 2: 开始界面 ----------

function sceneStart() {
  const walls = [...borderWalls(), ...layoutWalls(1)];
  let inner = walls.map((w) => drawWall(w, true)).join("\n");
  inner += "\n" + drawTank({ x: 380, y: 520, dir: "up", size: 32, color: COLORS.player });
  inner += `
  <rect width="${W}" height="${H}" fill="rgba(10,12,22,0.82)"/>
  <text x="${W / 2}" y="250" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="36" font-weight="700" fill="#f1f5f9">准备开始</text>
  <text x="${W / 2}" y="295" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="16" fill="#aab2c5">方向键 / WASD 移动 · 空格 开火 · P 暂停</text>
  <rect x="${W / 2 - 90}" y="330" width="180" height="52" rx="10" fill="#2ecc71"/>
  <text x="${W / 2}" y="363" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#0b1120">开始游戏</text>`;
  return wrapScene(inner);
}

// ---------- 场景 3: 胜利界面 ----------

function sceneWin() {
  const walls = [...borderWalls(), ...layoutWalls(3)];
  let inner = walls.map((w) => drawWall(w, true)).join("\n");
  inner += "\n" + drawTank({ x: 380, y: 300, dir: "up", size: 32, color: COLORS.player });
  inner += `
  <rect width="${W}" height="${H}" fill="rgba(10,12,22,0.82)"/>
  <text x="${W / 2}" y="250" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="38" font-weight="700" fill="#2ecc71">胜利！ 🏆</text>
  <text x="${W / 2}" y="295" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="16" fill="#aab2c5">你击退了所有敌人，最终得分 2500</text>
  <rect x="${W / 2 - 90}" y="330" width="180" height="52" rx="10" fill="#2ecc71"/>
  <text x="${W / 2}" y="363" text-anchor="middle"
        font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#0b1120">再玩一次</text>`;
  return wrapScene(inner);
}

// ---------- 输出 ----------

const files = {
  "gameplay.svg": sceneGameplay(),
  "start.svg": sceneStart(),
  "win.svg": sceneWin(),
};

for (const [name, svg] of Object.entries(files)) {
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, svg, "utf8");
  console.log("✓ 已生成", path);
}

console.log("\n完成，共生成", Object.keys(files).length, "张截图");
