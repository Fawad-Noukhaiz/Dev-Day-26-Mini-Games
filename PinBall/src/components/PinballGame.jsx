import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import useGameLoop from '../hooks/useGameLoop';
import {
  ballSegmentCollision,
  ballCircleCollision,
  ballRectCollision,
  ballFlipperCollision,
  getFlipperTip,
} from '../utils/physics';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BALL_RADIUS,
  GRAVITY,
  FRICTION,
  BUMPERS,
  TARGETS,
  ROLLOVERS,
  SLINGSHOTS,
  LEFT_FLIPPER_POS,
  RIGHT_FLIPPER_POS,
  PLUNGER_X,
  PLUNGER_REST_Y,
  MAX_BALLS,
  FLIPPER_LENGTH,
  PLUNGER_MAX_FORCE,
  LAUNCH_LANE_LEFT,
  LAUNCH_LANE_RIGHT,
  LAUNCH_LANE_TOP,
  LAUNCH_LANE_BOTTOM,
} from '../utils/constants';
import soundManager from '../utils/sounds';
import './PinballGame.css';

const PLAYFIELD_LEFT = 40;
const PLAYFIELD_RIGHT = 365;
const PLAYFIELD_TOP = 40;
const DRAIN_Y = 690;
const LANE_WALL_START_Y = 140;

const WALL_COLORS = {
  left_main: '#ff00ff',
  left_curve1: '#ff00ff',
  left_curve2: '#ff00aa',
  left_fill: '#ff0088',
  left_guide1: '#ff3366',
  right_main: '#00ffff',
  right_curve1: '#00ffff',
  right_curve2: '#00aaff',
  right_fill: '#0088ff',
  right_guide1: '#3366ff',
  top_wall: '#ff00ff',
  curve_a: '#00ff88',
  curve_b: '#00ff88',
  curve_c: '#00ff88',
  curve_d: '#00ff88',
  lane_left: '#ffaa00',
  lane_right: '#ffaa00',
  lane_bottom: '#ffaa00',
  lane_gate: '#00ff88',
};

function buildWalls() {
  return [
    { x1: PLAYFIELD_LEFT, y1: PLAYFIELD_TOP, x2: PLAYFIELD_LEFT, y2: 470, id: 'left_main' },
    { x1: PLAYFIELD_LEFT, y1: 470, x2: 55, y2: 500, id: 'left_curve1' },
    { x1: 55, y1: 500, x2: 65, y2: 540, id: 'left_curve2' },
    { x1: 65, y1: 540, x2: 65, y2: 590, id: 'left_fill' },
    { x1: 65, y1: 590, x2: 130, y2: 635, id: 'left_guide1' },
    { x1: PLAYFIELD_RIGHT, y1: LANE_WALL_START_Y, x2: PLAYFIELD_RIGHT, y2: 470, id: 'right_main' },
    { x1: PLAYFIELD_RIGHT, y1: 470, x2: 355, y2: 500, id: 'right_curve1' },
    { x1: 355, y1: 500, x2: 350, y2: 540, id: 'right_curve2' },
    { x1: 350, y1: 540, x2: 350, y2: 590, id: 'right_fill' },
    { x1: 350, y1: 590, x2: 300, y2: 635, id: 'right_guide1' },
    { x1: PLAYFIELD_LEFT, y1: PLAYFIELD_TOP, x2: 300, y2: PLAYFIELD_TOP, id: 'top_wall' },
    { x1: LAUNCH_LANE_RIGHT, y1: LAUNCH_LANE_TOP, x2: LAUNCH_LANE_RIGHT - 5, y2: LAUNCH_LANE_TOP - 8, id: 'curve_a' },
    { x1: LAUNCH_LANE_RIGHT - 5, y1: LAUNCH_LANE_TOP - 8, x2: LAUNCH_LANE_LEFT - 20, y2: LAUNCH_LANE_TOP - 20, id: 'curve_b' },
    { x1: LAUNCH_LANE_LEFT - 20, y1: LAUNCH_LANE_TOP - 20, x2: 320, y2: PLAYFIELD_TOP - 5, id: 'curve_c' },
    { x1: 320, y1: PLAYFIELD_TOP - 5, x2: 300, y2: PLAYFIELD_TOP, id: 'curve_d' },
    { x1: LAUNCH_LANE_LEFT, y1: LANE_WALL_START_Y, x2: LAUNCH_LANE_LEFT, y2: LAUNCH_LANE_BOTTOM, id: 'lane_left' },
    { x1: LAUNCH_LANE_RIGHT, y1: LAUNCH_LANE_TOP, x2: LAUNCH_LANE_RIGHT, y2: LAUNCH_LANE_BOTTOM, id: 'lane_right' },
    { x1: LAUNCH_LANE_LEFT, y1: LAUNCH_LANE_BOTTOM, x2: LAUNCH_LANE_RIGHT, y2: LAUNCH_LANE_BOTTOM, id: 'lane_bottom' },
    { x1: PLAYFIELD_RIGHT, y1: LANE_WALL_START_Y, x2: LAUNCH_LANE_LEFT, y2: LANE_WALL_START_Y, id: 'lane_gate' },
  ];
}

const WALLS = buildWalls();
const FLIPPER_REST = 0.45;
const FLIPPER_ACTIVE = -0.55;

function generateStars(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * BOARD_WIDTH,
      y: Math.random() * BOARD_HEIGHT,
      r: 0.3 + Math.random() * 1.2,
      opacity: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 2 + Math.random() * 3,
      twinkleDelay: Math.random() * 3,
    });
  }
  return stars;
}

function useResponsiveScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const targetHeight = BOARD_HEIGHT + 40;
      const targetWidth = BOARD_WIDTH + 220;
      const scaleH = (vh - 40) / targetHeight;
      const scaleW = (vw - 40) / targetWidth;
      const newScale = Math.min(scaleH, scaleW, 1.2);
      setScale(Math.max(0.4, newScale));
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  return scale;
}

/* ── Pre-built static SVG data to avoid recalculating in render ── */
const LEFT_ACCENT_COLORS = ['#ff3366', '#00aaff', '#ffaa00', '#00ffaa', '#ff66aa'];
const LEFT_ACCENT_YS = [180, 280, 380, 480, 580];
const RIGHT_ACCENT_COLORS = ['#00aaff', '#ff3366', '#00ffaa', '#ffaa00', '#aa66ff'];
const RIGHT_ACCENT_YS = [200, 300, 400, 500, 600];

function PinballGame() {
  const [gameState, setGameState] = useState('start');
  const [score, setScore] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(MAX_BALLS);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('pinballHighScore') || '0')
  );
  const [, setTick] = useState(0);

  const scale = useResponsiveScale();
  
  const stars = useMemo(() => generateStars(100), []);
  const overlayStars = useMemo(() => {
    const s = [];
    for (let i = 0; i < 120; i++) {
      s.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
        bright: Math.random() > 0.85,
      });
    }
    return s;
  }, []);

  const g = useRef({
    ball: null,
    leftFlipper: {
      ...LEFT_FLIPPER_POS,
      angle: FLIPPER_REST,
      active: false,
      side: 'left',
      length: FLIPPER_LENGTH,
      width: 10,
    },
    rightFlipper: {
      ...RIGHT_FLIPPER_POS,
      angle: FLIPPER_REST,
      active: false,
      side: 'right',
      length: FLIPPER_LENGTH,
      width: 10,
    },
    plunger: { compression: 0, charging: false },
    score: 0,
    ballsLeft: MAX_BALLS,
    bumperHits: {},
    targetStates: {},
    rolloverStates: {},
    multiplier: 1,
    particles: [],
    scorePopups: [],
    ballLaunched: false,
    lastBumperHit: 0,
    comboCount: 0,
    prevLeftActive: false,
    prevRightActive: false,
    slingshotHits: {},
    roundStartScore: 0,
    drainCooldown: 0,
  }).current;

  const keysRef = useRef({});
  const touchRef = useRef({ left: false, right: false, plunger: false });

  const initBall = useCallback(() => {
    g.ball = {
      x: PLUNGER_X,
      y: PLUNGER_REST_Y - 30,
      vx: 0,
      vy: 0,
    };
    g.ballLaunched = false;
    g.plunger.compression = 0;
    g.plunger.charging = false;
    g.drainCooldown = 0;
  }, [g]);

  const resetGame = useCallback(() => {
    g.score = 0;
    g.ballsLeft = MAX_BALLS;
    g.bumperHits = {};
    g.targetStates = {};
    g.rolloverStates = {};
    g.multiplier = 1;
    g.particles = [];
    g.scorePopups = [];
    g.comboCount = 0;
    g.slingshotHits = {};
    setScore(0);
    setBallsLeft(MAX_BALLS);
    initBall();
    soundManager.launchReady();
  }, [g, initBall]);

  const startGame = useCallback(() => {
    soundManager.init();
    soundManager.startGame();
    setGameState('playing');
    resetGame();
  }, [resetGame]);

  const goToMainMenu = useCallback(() => {
    setGameState('start');
  }, []);

  const restartRound = useCallback(() => {
    const savedScore = g.roundStartScore || 0;
    g.score = savedScore;
    setScore(savedScore);
    initBall();
    soundManager.launchReady();
  }, [g, initBall]);

  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
    };
    const up = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
      if (e.key === ' ') e.preventDefault();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const handleTouchStart = (e) => {
      for (const touch of e.touches) {
        const x = touch.clientX;
        const screenWidth = window.innerWidth;
        if (x < screenWidth * 0.33) {
          touchRef.current.left = true;
        } else if (x > screenWidth * 0.66) {
          touchRef.current.right = true;
        } else {
          touchRef.current.plunger = true;
        }
      }
    };

    const handleTouchEnd = (e) => {
      const activePoints = new Set();
      for (const touch of e.touches) {
        const x = touch.clientX;
        const screenWidth = window.innerWidth;
        if (x < screenWidth * 0.33) activePoints.add('left');
        else if (x > screenWidth * 0.66) activePoints.add('right');
        else activePoints.add('plunger');
      }
      if (!activePoints.has('left')) touchRef.current.left = false;
      if (!activePoints.has('right')) touchRef.current.right = false;
      if (!activePoints.has('plunger')) touchRef.current.plunger = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  const addScore = useCallback(
    (pts, x, y) => {
      const total = pts * g.multiplier;
      g.score += total;
      setScore(g.score);
      if (g.scorePopups.length < 10) {
        g.scorePopups.push({ x, y, text: `+${total}`, life: 60, maxLife: 60 });
      }
    },
    [g]
  );

  const addParticles = useCallback(
    (x, y, color, count = 5) => {
      if (g.particles.length > 30) return;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 1 + Math.random() * 2;
        g.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 20 + Math.random() * 10,
          maxLife: 30,
          color,
          size: 2 + Math.random() * 2,
        });
      }
    },
    [g]
  );

  const gameLoop = useCallback(() => {
    if (gameState !== 'playing' || !g.ball) return;

    const keys = keysRef.current;
    const touch = touchRef.current;

    const leftActive = !!(keys['arrowleft'] || keys['a'] || keys['z'] || touch.left);
    const rightActive = !!(keys['arrowright'] || keys['d'] || keys['/'] || touch.right);

    if (leftActive && !g.prevLeftActive) soundManager.flipperUp();
    if (!leftActive && g.prevLeftActive) soundManager.flipperDown();
    if (rightActive && !g.prevRightActive) soundManager.flipperUp();
    if (!rightActive && g.prevRightActive) soundManager.flipperDown();

    g.prevLeftActive = leftActive;
    g.prevRightActive = rightActive;

    g.leftFlipper.active = leftActive;
    g.rightFlipper.active = rightActive;

    const lTarget = leftActive ? FLIPPER_ACTIVE : FLIPPER_REST;
    const rTarget = rightActive ? FLIPPER_ACTIVE : FLIPPER_REST;
    g.leftFlipper.angle += (lTarget - g.leftFlipper.angle) * 0.35;
    g.rightFlipper.angle += (rTarget - g.rightFlipper.angle) * 0.35;

    if (!g.ballLaunched) {
      const plungerActive = keys[' '] || touch.plunger;
      if (plungerActive) {
        g.plunger.charging = true;
        g.plunger.compression = Math.min(g.plunger.compression + 0.022, 1);
      } else if (g.plunger.charging && g.plunger.compression > 0.01) {
        g.roundStartScore = g.score;
        const minForce = PLUNGER_MAX_FORCE * 0.4;
        const force = minForce + g.plunger.compression * (PLUNGER_MAX_FORCE - minForce);
        g.ball.vy = -force;
        g.ball.vx = (Math.random() - 0.5) * 0.3;
        g.plunger.compression = 0;
        g.plunger.charging = false;
        g.ballLaunched = true;
        g.drainCooldown = 90;
        soundManager.plungerRelease();
      }
    }

    /* Cache timestamp once per frame instead of calling Date.now() repeatedly */
    const now = Date.now();

    const SUB = 4;
    for (let step = 0; step < SUB; step++) {
      const b = g.ball;

      b.vy += GRAVITY / SUB;
      b.vx *= FRICTION;
      b.vy *= FRICTION;
      b.x += b.vx / SUB;
      b.y += b.vy / SUB;

      /* Inline speed limit to avoid object allocation */
      const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (spd > 30) {
        const ratio = 30 / spd;
        b.vx *= ratio;
        b.vy *= ratio;
      }

      for (const wall of WALLS) {
        const res = ballSegmentCollision(b, wall.x1, wall.y1, wall.x2, wall.y2);
        if (res) {
          b.x = res.x;
          b.y = res.y;
          if (res.hit) {
            b.vx = res.vx;
            b.vy = res.vy;
            soundManager.wallBounce();
          }
        }
      }

      for (const sling of SLINGSHOTS) {
        for (const line of sling.lines) {
          const res = ballSegmentCollision(b, line.x1, line.y1, line.x2, line.y2, 0.8);
          if (res && res.hit) {
            b.x = res.x;
            b.y = res.y;
            b.vx = res.vx + sling.force.x;
            b.vy = res.vy + sling.force.y;
            if (!g.slingshotHits[sling.id] || now - g.slingshotHits[sling.id] > 200) {
              g.slingshotHits[sling.id] = now;
              addScore(sling.score, sling.cx, sling.cy - 20);
              addParticles(b.x, b.y, sling.color, 4);
              soundManager.slingshotHit();
            }
          }
        }
      }

      for (const bumper of BUMPERS) {
        const res = ballCircleCollision(b, bumper.x, bumper.y, bumper.radius, 5.5);
        if (res && res.hit) {
          b.x = res.x;
          b.y = res.y;
          b.vx = res.vx;
          b.vy = res.vy;
          if (!g.bumperHits[bumper.id] || now - g.bumperHits[bumper.id] > 80) {
            g.bumperHits[bumper.id] = now;
            addScore(bumper.score, bumper.x, bumper.y - bumper.radius - 12);
            addParticles(bumper.x, bumper.y, bumper.color, 5);
            soundManager.bumperHit();
            if (now - g.lastBumperHit < 1500) {
              g.comboCount++;
              if (g.comboCount >= 3 && g.multiplier < 5) {
                g.multiplier++;
                soundManager.scoreMultiplier();
              }
            } else {
              g.comboCount = 1;
            }
            g.lastBumperHit = now;
          }
        }
      }

      for (const target of TARGETS) {
        if (g.targetStates[target.id]) continue;
        const res = ballRectCollision(b, target.x, target.y, target.width, target.height);
        if (res && res.hit) {
          b.x = res.x;
          b.y = res.y;
          b.vx = res.vx;
          b.vy = res.vy;
          g.targetStates[target.id] = true;
          addScore(target.score, target.x, target.y - 15);
          addParticles(target.x + 4, target.y + 12, target.color, 4);
          soundManager.targetHit();
          const same = TARGETS.filter((t) => t.color === target.color);
          if (same.every((t) => g.targetStates[t.id])) {
            addScore(1000, BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
            soundManager.allTargets();
            if (g.scorePopups.length < 10) {
              g.scorePopups.push({
                x: BOARD_WIDTH / 2,
                y: BOARD_HEIGHT / 2 - 30,
                text: 'ALL TARGETS!',
                life: 90,
                maxLife: 90,
                big: true,
              });
            }
            same.forEach((t) => {
              g.targetStates[t.id] = false;
            });
            g.multiplier = Math.min(g.multiplier + 1, 5);
          }
        }
      }

      for (const ro of ROLLOVERS) {
        if (g.rolloverStates[ro.id] && now - g.rolloverStates[ro.id] < 500) continue;
        const res = ballRectCollision(b, ro.x, ro.y, ro.width, ro.height);
        if (res && res.hit) {
          g.rolloverStates[ro.id] = now;
          addScore(ro.score, ro.x + ro.width / 2, ro.y - 12);
          soundManager.rollover();
          if (ROLLOVERS.every((r) => g.rolloverStates[r.id])) {
            addScore(500, BOARD_WIDTH / 2, 80);
            if (g.scorePopups.length < 10) {
              g.scorePopups.push({
                x: BOARD_WIDTH / 2,
                y: 100,
                text: 'ROLLOVER BONUS!',
                life: 90,
                maxLife: 90,
                big: true,
              });
            }
            ROLLOVERS.forEach((r) => {
              g.rolloverStates[r.id] = null;
            });
          }
        }
      }

      const lRes = ballFlipperCollision(b, g.leftFlipper);
      if (lRes && lRes.hit) {
        b.x = lRes.x;
        b.y = lRes.y;
        b.vx = lRes.vx;
        b.vy = lRes.vy;
      }
      const rRes = ballFlipperCollision(b, g.rightFlipper);
      if (rRes && rRes.hit) {
        b.x = rRes.x;
        b.y = rRes.y;
        b.vx = rRes.vx;
        b.vy = rRes.vy;
      }
    }

    if (g.drainCooldown > 0) g.drainCooldown--;

    const b = g.ball;
    if (g.ballLaunched) {
      const inLaneX = b.x > LAUNCH_LANE_LEFT && b.x < LAUNCH_LANE_RIGHT;
      const inLaneY = b.y > PLUNGER_REST_Y - 60;
      const movingSlow = Math.abs(b.vy) < 2 && Math.abs(b.vx) < 2;
      const movingDown = b.vy > 0;

      if (inLaneX && inLaneY && (movingSlow || movingDown)) {
        g.ballLaunched = false;
        g.plunger.compression = 0;
        g.plunger.charging = false;
        b.x = PLUNGER_X;
        b.y = PLUNGER_REST_Y - 30;
        b.vx = 0;
        b.vy = 0;
        soundManager.launchReady();
      }
    }

    if (b.y > DRAIN_Y && b.x < LAUNCH_LANE_LEFT && g.drainCooldown <= 0) {
      g.ballsLeft--;
      g.multiplier = 1;
      g.comboCount = 0;
      setBallsLeft(g.ballsLeft);
      soundManager.drain();
      if (g.ballsLeft <= 0) {
        g.ball = null;
        if (g.score > highScore) {
          setHighScore(g.score);
          localStorage.setItem('pinballHighScore', g.score.toString());
        }
        setGameState('gameOver');
        soundManager.gameOver();
        return;
      } else {
        g.roundStartScore = g.score;
        initBall();
        soundManager.launchReady();
        return;
      }
    }

    if (b.y < LAUNCH_LANE_TOP - 25) {
      b.y = LAUNCH_LANE_TOP - 25 + BALL_RADIUS;
      b.vy = Math.abs(b.vy) * 0.5;
    }
    if (b.x < PLAYFIELD_LEFT + BALL_RADIUS) {
      b.x = PLAYFIELD_LEFT + BALL_RADIUS;
      b.vx = Math.abs(b.vx) * 0.5;
    }
    if (b.x > LAUNCH_LANE_RIGHT - BALL_RADIUS) {
      b.x = LAUNCH_LANE_RIGHT - BALL_RADIUS;
      b.vx = -Math.abs(b.vx) * 0.5;
    }

    const now2 = Date.now();
    if (now2 - g.lastBumperHit > 5000 && g.multiplier > 1) g.multiplier = 1;

    /* In-place particle update — avoids .map().filter() allocations each frame */
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 1;
      p.size *= 0.96;
      if (p.life <= 0) {
        g.particles.splice(i, 1);
      }
    }

    /* In-place score popup update */
    for (let i = g.scorePopups.length - 1; i >= 0; i--) {
      const p = g.scorePopups[i];
      p.y -= 0.7;
      p.life -= 1;
      if (p.life <= 0) {
        g.scorePopups.splice(i, 1);
      }
    }

    setTick((t) => t + 1);
  }, [gameState, g, addScore, addParticles, initBall, highScore]);

  useGameLoop(gameLoop);

  const renderFlipper = (flipper) => {
    const tip = getFlipperTip(flipper);
    const cos = Math.cos(flipper.angle);
    const sin = Math.sin(flipper.angle);
    const hw = 6,
      tw = 3;
    const points = [
      `${flipper.x + sin * hw},${flipper.y - cos * hw}`,
      `${tip.x + sin * tw},${tip.y - cos * tw}`,
      `${tip.x - sin * tw},${tip.y + cos * tw}`,
      `${flipper.x - sin * hw},${flipper.y + cos * hw}`,
    ].join(' ');
    const col = flipper.side === 'left' ? '#ff4444' : '#4488ff';
    const light = flipper.side === 'left' ? '#ff8888' : '#88bbff';
    return (
      <g key={flipper.side}>
        <polygon points={points} fill={col} stroke={light} strokeWidth="2" />
        <circle cx={flipper.x} cy={flipper.y} r={7} fill={col} stroke={light} strokeWidth="1" />
        <circle cx={flipper.x} cy={flipper.y} r={2} fill="#fff" />
        <circle cx={tip.x} cy={tip.y} r={4} fill={col} stroke={light} strokeWidth="0.5" />
      </g>
    );
  };

  const renderPlunger = () => {
    const comp = g.plunger.compression;
    const headY = PLUNGER_REST_Y - 20 + comp * 35;
    const intensity = comp;
    return (
      <g>
        <rect
          x={PLUNGER_X - 7}
          y={headY}
          width={14}
          height={PLUNGER_REST_Y - headY + 20}
          fill="#555"
          stroke="#777"
          strokeWidth="1"
          rx="2"
        />
        <rect
          x={PLUNGER_X - 9}
          y={headY - 6}
          width={18}
          height={10}
          fill={`rgb(${180 + intensity * 75},${120 - intensity * 80},${80 - intensity * 60})`}
          stroke="#ddd"
          strokeWidth="1"
          rx="4"
        />
        {Array.from({ length: 5 }, (_, i) => {
          const sy = headY + 8 + (i * (PLUNGER_REST_Y - headY + 5)) / 5;
          return (
            <line
              key={i}
              x1={PLUNGER_X - 4 + (i % 2 === 0 ? -2 : 2)}
              y1={sy}
              x2={PLUNGER_X + 4 + (i % 2 === 0 ? 2 : -2)}
              y2={sy + (PLUNGER_REST_Y - headY) / 7}
              stroke={`rgba(${200 + intensity * 55},${200 - intensity * 150},50,0.5)`}
              strokeWidth="1.5"
            />
          );
        })}
        {comp > 0 && (
          <rect
            x={LAUNCH_LANE_RIGHT + 3}
            y={PLUNGER_REST_Y + 5 - comp * 50}
            width={4}
            height={comp * 50}
            fill={`rgb(${intensity * 255},${(1 - intensity) * 200},0)`}
            rx="2"
            opacity="0.8"
          />
        )}
      </g>
    );
  };

  /* ── Memoize all static SVG content so it's not re-diffed every frame ── */
  const staticSvgContent = useMemo(() => (
    <>
      <defs>
        <linearGradient id="spaceBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#050015" />
          <stop offset="25%" stopColor="#0a0828" />
          <stop offset="50%" stopColor="#120a35" />
          <stop offset="75%" stopColor="#0a0620" />
          <stop offset="100%" stopColor="#030010" />
        </linearGradient>
        <radialGradient id="nebula1" cx="20%" cy="15%" r="40%">
          <stop offset="0%" stopColor="rgba(150, 50, 200, 0.4)" />
          <stop offset="50%" stopColor="rgba(100, 30, 150, 0.2)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <radialGradient id="nebula2" cx="80%" cy="70%" r="35%">
          <stop offset="0%" stopColor="rgba(50, 100, 200, 0.35)" />
          <stop offset="60%" stopColor="rgba(30, 60, 150, 0.15)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <radialGradient id="nebula3" cx="70%" cy="25%" r="30%">
          <stop offset="0%" stopColor="rgba(200, 80, 150, 0.25)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <radialGradient id="nebula4" cx="25%" cy="80%" r="35%">
          <stop offset="0%" stopColor="rgba(80, 150, 200, 0.2)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <radialGradient id="nebula5" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="rgba(100, 50, 150, 0.15)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <radialGradient id="ballGrad" cx="30%" cy="25%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#f0f0f8" />
          <stop offset="60%" stopColor="#c0c0d0" />
          <stop offset="100%" stopColor="#808090" />
        </radialGradient>
      </defs>

      {/* Deep space background */}
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#spaceBg)" />
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#nebula1)" />
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#nebula2)" />
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#nebula3)" />
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#nebula4)" />
      <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#nebula5)" />

      {/* Stars */}
      {stars.map((star, i) => (
        <circle key={`star-${i}`} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.opacity} />
      ))}

      {/* Bright accent stars */}
      <circle cx={60} cy={100} r={1.8} fill="#fff" opacity={0.95} />
      <circle cx={180} cy={60} r={1.5} fill="#aaf" opacity={0.9} />
      <circle cx={320} cy={150} r={2} fill="#fff" opacity={0.95} />
      <circle cx={90} cy={300} r={1.6} fill="#ffa" opacity={0.88} />
      <circle cx={350} cy={450} r={1.8} fill="#fff" opacity={0.92} />
      <circle cx={55} cy={550} r={1.5} fill="#aff" opacity={0.85} />
      <circle cx={280} cy={250} r={1.7} fill="#faf" opacity={0.9} />
      <circle cx={150} cy={500} r={1.4} fill="#fff" opacity={0.87} />

      {/* Distant galaxies */}
      <ellipse cx={70} cy={120} rx={25} ry={8} fill="rgba(180,150,255,0.08)" transform="rotate(-20 70 120)" />
      <ellipse cx={340} cy={350} rx={20} ry={6} fill="rgba(150,180,255,0.06)" transform="rotate(15 340 350)" />
      <ellipse cx={180} cy={580} rx={30} ry={10} fill="rgba(200,150,220,0.05)" transform="rotate(-8 180 580)" />

      {/* Shooting star trails */}
      <line x1={40} y1={80} x2={80} y2={120} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round" />
      <line x1={280} y1={180} x2={310} y2={210} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" />
      <line x1={100} y1={400} x2={130} y2={430} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" />

      {/* Subtle grid */}
      <g opacity="0.03">
        {Array.from({ length: 15 }, (_, i) => (
          <line key={`vg-${i}`} x1={i * 30} y1={0} x2={i * 30} y2={BOARD_HEIGHT} stroke="#88f" strokeWidth="1" />
        ))}
        {Array.from({ length: 25 }, (_, i) => (
          <line key={`hg-${i}`} x1={0} y1={i * 30} x2={BOARD_WIDTH} y2={i * 30} stroke="#88f" strokeWidth="1" />
        ))}
      </g>

      {/* Decorative elements */}
      <circle cx={210} cy={400} r={60} fill="none" stroke="rgba(255,100,200,0.1)" strokeWidth="1" strokeDasharray="4,8" />
      <circle cx={210} cy={400} r={40} fill="none" stroke="rgba(100,200,255,0.08)" strokeWidth="1" strokeDasharray="3,6" />
      <path d="M 210 370 L 225 400 L 210 430 L 195 400 Z" fill="rgba(255,200,50,0.06)" stroke="rgba(255,200,50,0.15)" strokeWidth="1" />

      {/* Side accent lights */}
      {LEFT_ACCENT_YS.map((y, i) => (
        <g key={`left-light-${i}`}>
          <circle cx={12} cy={y} r={5} fill={LEFT_ACCENT_COLORS[i]} opacity={0.5} />
          <circle cx={12} cy={y} r={2} fill="#fff" opacity={0.8} />
        </g>
      ))}
      {RIGHT_ACCENT_YS.map((y, i) => (
        <g key={`right-light-${i}`}>
          <circle cx={BOARD_WIDTH - 12} cy={y} r={5} fill={RIGHT_ACCENT_COLORS[i]} opacity={0.5} />
          <circle cx={BOARD_WIDTH - 12} cy={y} r={2} fill="#fff" opacity={0.8} />
        </g>
      ))}

      {/* Launch lane */}
      <rect
        x={LAUNCH_LANE_LEFT}
        y={LAUNCH_LANE_TOP}
        width={LAUNCH_LANE_RIGHT - LAUNCH_LANE_LEFT}
        height={LAUNCH_LANE_BOTTOM - LAUNCH_LANE_TOP}
        fill="rgba(0,0,0,0.5)"
        rx="3"
      />

      {/* Arrow indicators */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={`arr${i}`}
          d={`M ${PLUNGER_X} ${LAUNCH_LANE_BOTTOM - 80 - i * 80} l 6 12 l -12 0 Z`}
          fill={`rgba(255,100,100,${0.12 + i * 0.04})`}
        />
      ))}

      {/* Entry indicator */}
      <text
        x={(300 + LAUNCH_LANE_LEFT) / 2}
        y={(PLAYFIELD_TOP + LANE_WALL_START_Y) / 2 - 5}
        textAnchor="middle"
        fontSize="8"
        fill="rgba(100,255,150,0.7)"
        fontWeight="bold"
      >
        ← ENTRY
      </text>

      {/* Walls — Neon colored */}
      {WALLS.map((w, i) => {
        const color = WALL_COLORS[w.id] || '#00ffff';
        return (
          <g key={`w${i}`}>
            <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={color} strokeWidth="10" strokeLinecap="round" opacity="0.15" />
            <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.4" />
            <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={color} strokeWidth="3" strokeLinecap="round" />
            <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
          </g>
        );
      })}

      {/* Drain indicator */}
      <line x1={100} y1={DRAIN_Y} x2={330} y2={DRAIN_Y} stroke="rgba(255,50,50,0.25)" strokeWidth="2" strokeDasharray="5,5" />

      {/* Board border */}
      <rect x="2" y="2" width={BOARD_WIDTH - 4} height={BOARD_HEIGHT - 4} fill="none" stroke="#222" strokeWidth="3" rx="6" />
    </>
  ), [stars]);

  /* Cache render timestamp for dynamic hit-state checks */
  const renderNow = Date.now();

  return (
    <div className="pinball-container">
      <div className="pinball-cabinet">
        {/* ── Left Panel — Stats & Controls ── */}
        <div className="side-panel left-panel">
          <div className="panel-title">STATS</div>
          <div className="panel-score-label">CURRENT SCORE</div>
          <div className="panel-score" style={{ color: '#00ff88' }}>{score.toLocaleString()}</div>
          <div className="panel-divider" />
          <div className="panel-score-label">BALLS LEFT</div>
          <div className="balls-display">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className={`ball-indicator ${i < ballsLeft ? 'active' : ''}`}
              />
            ))}
          </div>
          <div className="panel-divider" />
          <div className="panel-score-label">MULTIPLIER</div>
          <div className="panel-score" style={{ color: g.multiplier > 1 ? '#ff2d75' : '#666' }}>
            x{g.multiplier}
          </div>
          <div className="panel-divider" />
          <div className="panel-controls">
            <div className="scoring-title">CONTROLS</div>
            <div className="control-item">
              <span className="key">← A</span>
              <span className="desc">Left Flipper</span>
            </div>
            <div className="control-item">
              <span className="key">→ D</span>
              <span className="desc">Right Flipper</span>
            </div>
            <div className="control-item">
              <span className="key">SPACE</span>
              <span className="desc">Plunger</span>
            </div>
          </div>
        </div>

        <div className="pinball-board-wrapper" style={{ transform: `scale(${scale})` }}>
          <svg
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
            className="pinball-svg"
          >
            {/* Static background — memoized, skips React reconciliation */}
            {staticSvgContent}

            {/* ── Dynamic elements below ── */}

            {/* Slingshots */}
            {SLINGSHOTS.map((sling) => {
              const isHit = g.slingshotHits[sling.id] && renderNow - g.slingshotHits[sling.id] < 150;
              return (
                <g key={sling.id}>
                  {sling.lines.map((line, i) => (
                    <line
                      key={i}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={sling.color}
                      strokeWidth={isHit ? 4 : 2.5}
                      strokeLinecap="round"
                      opacity={isHit ? 1 : 0.7}
                    />
                  ))}
                </g>
              );
            })}

            {/* Targets */}
            {TARGETS.map((target) => {
              const isHit = g.targetStates[target.id];
              return (
                <rect
                  key={target.id}
                  x={target.x}
                  y={target.y}
                  width={target.width}
                  height={target.height}
                  fill={isHit ? `${target.color}22` : target.color}
                  stroke={target.color}
                  strokeWidth="1"
                  rx="2"
                  opacity={isHit ? 0.25 : 1}
                />
              );
            })}

            {/* Rollovers */}
            {ROLLOVERS.map((ro) => {
              const isActive = g.rolloverStates[ro.id] && renderNow - g.rolloverStates[ro.id] < 500;
              return (
                <g key={ro.id}>
                  <rect
                    x={ro.x}
                    y={ro.y}
                    width={ro.width}
                    height={ro.height}
                    fill={isActive ? ro.color : `${ro.color}55`}
                    rx="2"
                  />
                  <path d={`M ${ro.x + ro.width / 2} ${ro.y - 8} l 4 5 l -8 0 Z`} fill={isActive ? ro.color : `${ro.color}33`} />
                </g>
              );
            })}

            {/* Bumpers */}
            {BUMPERS.map((bumper) => {
              const isHit = g.bumperHits[bumper.id] && renderNow - g.bumperHits[bumper.id] < 150;
              const s = isHit ? 1.12 : 1;
              return (
                <g key={bumper.id} transform={`translate(${bumper.x},${bumper.y}) scale(${s})`}>
                  <circle r={bumper.radius + 4} fill="none" stroke={bumper.color} strokeWidth="2" opacity={isHit ? 0.6 : 0.15} />
                  <circle r={bumper.radius} fill={`${bumper.color}25`} stroke={bumper.color} strokeWidth="2.5" />
                  <circle r={bumper.radius * 0.55} fill={isHit ? bumper.color : `${bumper.color}66`} stroke={bumper.color} strokeWidth="1.5" />
                  <circle r={bumper.radius * 0.18} fill="#fff" opacity={isHit ? 1 : 0.5} />
                  {isHit && (
                    <text y={bumper.radius + 14} textAnchor="middle" fontSize="9" fill={bumper.color} fontWeight="bold">
                      {bumper.score}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Flippers */}
            {renderFlipper(g.leftFlipper)}
            {renderFlipper(g.rightFlipper)}

            {/* Plunger */}
            {renderPlunger()}

            {/* Particles */}
            {g.particles.map((p, i) => (
              <circle key={`p${i}`} cx={p.x} cy={p.y} r={p.size} fill={p.color} opacity={p.life / p.maxLife} />
            ))}

            {/* Score popups */}
            {g.scorePopups.map((popup, i) => (
              <text
                key={`sp${i}`}
                x={popup.x}
                y={popup.y}
                textAnchor="middle"
                fontSize={popup.big ? '14' : '11'}
                fontWeight="bold"
                fill={popup.big ? '#ffd000' : '#fff'}
                opacity={popup.life / popup.maxLife}
                stroke="#000"
                strokeWidth="2"
                paintOrder="stroke"
              >
                {popup.text}
              </text>
            ))}

            {/* Ball */}
            {g.ball && (
              <g>
                {g.ballLaunched && Math.abs(g.ball.vx) + Math.abs(g.ball.vy) > 5 && (
                  <circle
                    cx={g.ball.x - g.ball.vx * 0.8}
                    cy={g.ball.y - g.ball.vy * 0.8}
                    r={BALL_RADIUS * 0.6}
                    fill="rgba(180,180,255,0.15)"
                  />
                )}
                <circle cx={g.ball.x + 2} cy={g.ball.y + 2} r={BALL_RADIUS} fill="rgba(0,0,0,0.3)" />
                <circle cx={g.ball.x} cy={g.ball.y} r={BALL_RADIUS} fill="url(#ballGrad)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                <circle cx={g.ball.x - 2} cy={g.ball.y - 2} r={BALL_RADIUS * 0.3} fill="rgba(255,255,255,0.8)" />
              </g>
            )}
          </svg>

          {/* Score overlay */}
          <div className="score-overlay">
            <div className="score-section">
              <div className="score-label">SCORE</div>
              <div className="score-value">{score.toLocaleString()}</div>
            </div>
            {g.multiplier > 1 && <div className="multiplier-badge">x{g.multiplier}</div>}
            <div className="balls-section">
              <div className="score-label">BALLS</div>
              <div className="balls-display">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className={`ball-indicator ${i < ballsLeft ? 'active' : ''}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Multiplier display */}
          {g.multiplier > 1 && <div className="multiplier-display">x{g.multiplier}</div>}

          {/* Launch instruction */}
          {gameState === 'playing' && !g.ballLaunched && (
            <div className="launch-instruction">
              Hold SPACE to charge
              <br />
              Release to launch!
            </div>
          )}
        </div>

        {/* ── Right Panel — Scoring, Tips & Actions ── */}
        <div className="side-panel">
          <div className="panel-title">PINBALL</div>
          <div className="panel-score-label">HIGH SCORE</div>
          <div className="panel-score">{Math.max(score, highScore).toLocaleString()}</div>
          <div className="panel-divider" />
          <div className="scoring-info">
            <div className="scoring-title">SCORING</div>
            <div className="scoring-item">
              <span style={{ color: '#ff3366' }}>●</span> Bumper — 100
            </div>
            <div className="scoring-item">
              <span style={{ color: '#00ffd5' }}>■</span> Target — 200
            </div>
            <div className="scoring-item">
              <span style={{ color: '#ff3366' }}>◆</span> Slingshot — 50
            </div>
            <div className="scoring-item">
              <span style={{ color: '#ffaa00' }}>▬</span> Rollover — 50
            </div>
            <div className="scoring-item special">All Targets — 1000!</div>
            <div className="scoring-item special">All Rollovers — 500!</div>
          </div>
          <div className="panel-divider" />
          <div className="tips-section">
            <div className="scoring-title">TIPS</div>
            <div className="tip-item">• Hit bumpers for combos</div>
            <div className="tip-item">• Complete all targets for bonus</div>
            <div className="tip-item">• Multiplier increases with combos</div>
          </div>
          <div className="panel-divider" />
          <div className="panel-controls">
            <button 
              className="panel-btn retry-btn" 
              onClick={restartRound}
            >
              ⟳ Restart Round
            </button>
            <button 
              className="panel-btn reset-btn" 
              onClick={resetGame}
            >
              ↺ Reset Game
            </button>
            <button 
              className="panel-btn home-btn" 
              onClick={goToMainMenu}
            >
              ⌂ Main Menu
            </button>
          </div>
        </div>
      </div>

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="overlay-screen start-screen">
          <div className="space-bg" />
          <div className="nebula-layer n1" />
          <div className="nebula-layer n2" />
          <div className="nebula-layer n3" />
          <div className="nebula-layer n4" />
          
          <div className="stars-container">
            {overlayStars.map((star, i) => (
              <div
                key={i}
                className={`star ${star.bright ? 'bright' : ''}`}
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  animationDelay: `${star.delay}s`,
                  animationDuration: `${star.duration}s`,
                }}
              />
            ))}
          </div>
          
          <div className="shooting-star" style={{ top: '15%', right: '10%', animationDelay: '0s' }} />
          <div className="shooting-star" style={{ top: '40%', right: '30%', animationDelay: '3s' }} />
          <div className="shooting-star" style={{ top: '70%', right: '20%', animationDelay: '6s' }} />

          <div className="start-content">
            <h1 className="game-title">
              <span className="title-fast">FAST</span>
              <span className="title-pinball">PINBALL</span>
            </h1>
            <div className="subtitle">★ DEV DAY EDITION ★</div>

            {highScore > 0 && (
              <div className="high-score-display">
                <div className="high-score-label">HIGH SCORE</div>
                <div className="high-score-value">{highScore.toLocaleString()}</div>
              </div>
            )}

            <div className="controls-info">
              <div>
                <span className="key-hint">← →</span> or <span className="key-hint">A D</span> — Flippers
              </div>
              <div>
                <span className="key-hint">SPACE</span> — Hold & Release = Launch
              </div>
            </div>
            <button className="start-button" onClick={startGame}>
              START
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameOver' && (
        <div className="overlay-screen game-over-screen">
          <div className="space-bg" />
          <div className="nebula-layer n1" />
          <div className="nebula-layer n2" />
          <div className="nebula-layer n3" />
          <div className="nebula-layer n4" />
          
          <div className="stars-container">
            {overlayStars.map((star, i) => (
              <div
                key={i}
                className={`star ${star.bright ? 'bright' : ''}`}
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                  animationDelay: `${star.delay}s`,
                  animationDuration: `${star.duration}s`,
                }}
              />
            ))}
          </div>

          <div className="game-over-content">
            <h2 className="game-over-title">GAME OVER</h2>
            {score >= highScore && score > 0 && <div className="new-high-score">★ NEW HIGH SCORE! ★</div>}
            <div className="final-score-label">SCORE</div>
            <div className="final-score">{score.toLocaleString()}</div>
            <div className="high-score-label">HIGH SCORE</div>
            <div className="high-score-value">{Math.max(score, highScore).toLocaleString()}</div>

            <div className="game-over-buttons">
              <button
                className="play-again-button"
                onClick={() => {
                  setGameState('playing');
                  resetGame();
                }}
              >
                PLAY AGAIN
              </button>
              <button className="main-menu-button" onClick={goToMainMenu}>
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PinballGame;
