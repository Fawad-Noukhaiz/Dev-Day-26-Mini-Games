export const BOARD_WIDTH = 420;
export const BOARD_HEIGHT = 720;

export const GRAVITY = 0.11;
export const FRICTION = 0.9992;
export const BALL_RADIUS = 8;
export const RESTITUTION = 0.85;
export const PLUNGER_MAX_FORCE = 34;

export const FLIPPER_LENGTH = 55;
export const FLIPPER_WIDTH = 12;

export const LEFT_FLIPPER_POS = { x: 130, y: 635 };
export const RIGHT_FLIPPER_POS = { x: 300, y: 635 };

export const LAUNCH_LANE_LEFT = 370;
export const LAUNCH_LANE_RIGHT = 405;
export const LAUNCH_LANE_TOP = 60;
export const LAUNCH_LANE_BOTTOM = 680;

export const PLUNGER_X = (LAUNCH_LANE_LEFT + LAUNCH_LANE_RIGHT) / 2;
export const PLUNGER_REST_Y = 670;

export const MAX_BALLS = 3;

export const BUMPERS = [
  { x: 200, y: 170, radius: 25, score: 100, color: '#ff3366', id: 'b1' },
  { x: 125, y: 280, radius: 22, score: 100, color: '#ffcc00', id: 'b2' },
  { x: 275, y: 280, radius: 22, score: 100, color: '#3366ff', id: 'b3' },
];

export const TARGETS = [
  { x: 48, y: 200, width: 8, height: 32, score: 200, color: '#00ffd5', id: 't1' },
  { x: 48, y: 320, width: 8, height: 32, score: 200, color: '#00ffd5', id: 't2' },
  { x: 358, y: 240, width: 8, height: 32, score: 200, color: '#ff6600', id: 't3' },
  { x: 358, y: 360, width: 8, height: 32, score: 200, color: '#ff6600', id: 't4' },
];

export const ROLLOVERS = [
  { x: 130, y: 95, width: 24, height: 6, score: 50, color: '#ff00ff', id: 'r1' },
  { x: 250, y: 95, width: 24, height: 6, score: 50, color: '#ff00ff', id: 'r2' },
];

export const SLINGSHOTS = [
  {
    id: 'sl_left',
    lines: [
      { x1: 70, y1: 460, x2: 70, y2: 540 },
      { x1: 70, y1: 540, x2: 105, y2: 575 },
    ],
    force: { x: 5, y: -4 },
    score: 50,
    color: '#ff3366',
    cx: 82,
    cy: 510,
  },
  {
    id: 'sl_right',
    lines: [
      { x1: 345, y1: 460, x2: 345, y2: 540 },
      { x1: 345, y1: 540, x2: 310, y2: 575 },
    ],
    force: { x: -5, y: -4 },
    score: 50,
    color: '#3366ff',
    cx: 333,
    cy: 510,
  },
];