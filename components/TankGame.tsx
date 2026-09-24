"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CANVAS_H,
  CANVAS_W,
  createInitialState,
  draw,
  InputState,
  update,
} from "@/lib/game/engine";
import { GameState, GameStatus } from "@/lib/game/types";
import styles from "@/app/TankGame.module.css";

const HUD_KEYS: Record<string, keyof InputState> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

const CONTROL_KEYS = new Set([
  ...Object.keys(HUD_KEYS),
  " ",
  "Spacebar",
  "Enter",
  "p",
  "P",
]);

export default function TankGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
  });
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [playerHp, setPlayerHp] = useState(3);

  const syncHud = useCallback(() => {
    const s = stateRef.current;
    setStatus(s.status);
    setScore(s.score);
    setLives(s.lives);
    setWave(s.wave);
    setPlayerHp(s.player.hp);
  }, []);

  const startGame = useCallback(() => {
    stateRef.current = createInitialState();
    stateRef.current.status = "playing";
    inputRef.current = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
    };
    syncHud();
  }, [syncHud]);

  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "playing") s.status = "paused";
    else if (s.status === "paused") s.status = "playing";
    syncHud();
  }, [syncHud]);

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();
    let acc = 0;
    const STEP = 1000 / 60;

    const loop = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      acc += dt;

      while (acc >= STEP) {
        update(stateRef.current, inputRef.current, {
          onScore: (v) => setScore(v),
        });
        acc -= STEP;
      }

      draw(ctx, stateRef.current);
      syncHud();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [syncHud]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (CONTROL_KEYS.has(e.key)) e.preventDefault();

      const mapKey = HUD_KEYS[e.key];
      if (mapKey) inputRef.current[mapKey] = true;

      if (e.key === " " || e.key === "Spacebar") inputRef.current.fire = true;

      if (e.key === "p" || e.key === "P") togglePause();

      if (e.key === "Enter") {
        const s = stateRef.current;
        if (s.status !== "playing" && s.status !== "paused") startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const mapKey = HUD_KEYS[e.key];
      if (mapKey) inputRef.current[mapKey] = false;
      if (e.key === " " || e.key === "Spacebar") inputRef.current.fire = false;
    };

    const handleBlur = () => {
      inputRef.current = {
        up: false,
        down: false,
        left: false,
        right: false,
        fire: false,
      };
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [startGame, togglePause]);

  // Touch controls
  const bindTouch = (key: keyof InputState) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current[key] = true;
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current[key] = false;
    },
    onPointerLeave: () => {
      inputRef.current[key] = false;
    },
    onPointerCancel: () => {
      inputRef.current[key] = false;
    },
  });

  const isOverlayVisible = status !== "playing";

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>🎮 皮皮明坦克大战</h1>
        <p className={styles.subtitle}>Next.js + Canvas Tank Battle</p>
      </header>

      <div className={styles.hud}>
        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>得分</span>
          <span className={styles.hudValue}>{score}</span>
        </div>
        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>生命</span>
          <span className={styles.hudValue}>{"❤".repeat(Math.max(0, lives))}</span>
        </div>
        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>关卡</span>
          <span className={styles.hudValue}>{wave} / 5</span>
        </div>
        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>血量</span>
          <span className={styles.hudValue}>
            <span className={styles.hpBar}>
              <span
                className={styles.hpFill}
                style={{ width: `${(playerHp / 3) * 100}%` }}
              />
            </span>
          </span>
        </div>
      </div>

      <div className={styles.canvasWrap} style={{ maxWidth: CANVAS_W }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className={styles.canvas}
        />

        {isOverlayVisible && (
          <div className={styles.overlay}>
            {status === "ready" && (
              <>
                <h2>准备开始</h2>
                <p>方向键 / WASD 移动 · 空格 开火 · P 暂停</p>
                <button className={styles.btn} onClick={startGame}>
                  开始游戏
                </button>
              </>
            )}
            {status === "paused" && (
              <>
                <h2>已暂停</h2>
                <button className={styles.btn} onClick={togglePause}>
                  继续
                </button>
                <button className={styles.btn} onClick={startGame}>
                  重新开始
                </button>
              </>
            )}
            {status === "won" && (
              <>
                <h2 className={styles.win}>胜利！ 🏆</h2>
                <p>你击退了所有敌人，最终得分 {score}</p>
                <button className={styles.btn} onClick={startGame}>
                  再玩一次
                </button>
              </>
            )}
            {status === "lost" && (
              <>
                <h2 className={styles.lose}>游戏结束 💥</h2>
                <p>最终得分 {score}</p>
                <button className={styles.btn} onClick={startGame}>
                  重新开始
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile / touch controls */}
      <div className={styles.touchControls}>
        <div className={styles.dpad}>
          <button className={styles.touchBtn} {...bindTouch("up")}>
            ▲
          </button>
          <div className={styles.dpadRow}>
            <button className={styles.touchBtn} {...bindTouch("left")}>
              ◀
            </button>
            <button className={styles.touchBtn} {...bindTouch("down")}>
              ▼
            </button>
            <button className={styles.touchBtn} {...bindTouch("right")}>
              ▶
            </button>
          </div>
        </div>
        <button
          className={`${styles.touchBtn} ${styles.fireBtn}`}
          {...bindTouch("fire")}
        >
          开火
        </button>
      </div>

      <footer className={styles.help}>
        <span>移动：方向键 / WASD</span>
        <span>开火：空格</span>
        <span>暂停：P</span>
      </footer>
    </div>
  );
}
