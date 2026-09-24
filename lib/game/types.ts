export type Direction = "up" | "down" | "left" | "right";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Tank {
  id: number;
  x: number;
  y: number;
  dir: Direction;
  size: number;
  speed: number;
  cooldown: number;
  hp: number;
  isPlayer: boolean;
  /** AI decision timer */
  aiTimer?: number;
  aiDir?: Direction;
  color: string;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  dir: Direction;
  speed: number;
  owner: "player" | "enemy";
  ownerId: number;
  radius: number;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
}

export type GameStatus = "ready" | "playing" | "paused" | "won" | "lost";

export interface GameState {
  player: Tank;
  enemies: Tank[];
  bullets: Bullet[];
  walls: Wall[];
  status: GameStatus;
  score: number;
  lives: number;
  wave: number;
}
