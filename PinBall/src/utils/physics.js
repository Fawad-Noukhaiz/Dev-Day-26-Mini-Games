import { BALL_RADIUS, RESTITUTION } from './constants';

export const vec = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (v, s) => ({ x: v.x * s, y: v.y * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  len: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v) => {
    const l = Math.sqrt(v.x * v.x + v.y * v.y);
    return l > 0.0001 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 };
  },
  dist: (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2),
};

export function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.001) return { x: x1, y: y1, t: 0 };
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, y: y1 + t * dy, t };
}

export function ballSegmentCollision(ball, x1, y1, x2, y2, restitution = RESTITUTION) {
  const closest = closestPointOnSegment(ball.x, ball.y, x1, y1, x2, y2);
  const dx = ball.x - closest.x;
  const dy = ball.y - closest.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < BALL_RADIUS && dist > 0.001) {
    const nx = dx / dist;
    const ny = dy / dist;
    const velDotN = ball.vx * nx + ball.vy * ny;

    const pushOut = BALL_RADIUS - dist + 1;
    const newX = ball.x + nx * pushOut;
    const newY = ball.y + ny * pushOut;

    if (velDotN < 0) {
      const newVx = (ball.vx - 2 * velDotN * nx) * restitution;
      const newVy = (ball.vy - 2 * velDotN * ny) * restitution;
      return { x: newX, y: newY, vx: newVx, vy: newVy, hit: true };
    } else {
      return { x: newX, y: newY, vx: ball.vx, vy: ball.vy, hit: false };
    }
  }
  return null;
}

export function ballCircleCollision(ball, cx, cy, cr, bounceForce = 6) {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = BALL_RADIUS + cr;

  if (dist < minDist && dist > 0.001) {
    const nx = dx / dist;
    const ny = dy / dist;

    const newX = cx + nx * (minDist + 1);
    const newY = cy + ny * (minDist + 1);

    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const outSpeed = Math.max(speed * 0.9, bounceForce);

    return {
      x: newX,
      y: newY,
      vx: nx * outSpeed,
      vy: ny * outSpeed,
      hit: true,
    };
  }
  return null;
}

export function ballRectCollision(ball, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(ball.x, rx + rw));
  const closestY = Math.max(ry, Math.min(ball.y, ry + rh));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < BALL_RADIUS && dist > 0.001) {
    const nx = dx / dist;
    const ny = dy / dist;
    const velDotN = ball.vx * nx + ball.vy * ny;

    if (velDotN < 0) {
      const pushOut = BALL_RADIUS - dist + 1;
      return {
        x: ball.x + nx * pushOut,
        y: ball.y + ny * pushOut,
        vx: (ball.vx - 2 * velDotN * nx) * RESTITUTION,
        vy: (ball.vy - 2 * velDotN * ny) * RESTITUTION,
        hit: true,
      };
    }
  }
  return null;
}

export function getFlipperTip(flipper) {
  const dir = flipper.side === 'left' ? 1 : -1;
  return {
    x: flipper.x + Math.cos(flipper.angle) * flipper.length * dir,
    y: flipper.y + Math.sin(flipper.angle) * flipper.length,
  };
}

export function ballFlipperCollision(ball, flipper) {
  const tip = getFlipperTip(flipper);

  const cos = Math.cos(flipper.angle);
  const sin = Math.sin(flipper.angle);
  const perpX = sin * 5;
  const perpY = -cos * 5;

  const lines = [
    { x1: flipper.x, y1: flipper.y, x2: tip.x, y2: tip.y },
    { x1: flipper.x + perpX, y1: flipper.y + perpY, x2: tip.x + perpX, y2: tip.y + perpY },
    { x1: flipper.x - perpX, y1: flipper.y - perpY, x2: tip.x - perpX, y2: tip.y - perpY },
  ];

  for (const line of lines) {
    const res = ballSegmentCollision(ball, line.x1, line.y1, line.x2, line.y2, 0.5);
    if (res && res.hit) {
      if (flipper.active) {
        const distFromPivot = vec.dist(ball, { x: flipper.x, y: flipper.y });
        const leverage = Math.min(distFromPivot / flipper.length, 1);
        const force = 22 * leverage;

        res.vy -= force;
        const dir = flipper.side === 'left' ? 1 : -1;
        res.vx += dir * force * 0.5;
      }
      return res;
    }
  }

  for (const point of [
    { x: flipper.x, y: flipper.y, r: 7 },
    { x: tip.x, y: tip.y, r: 4 },
  ]) {
    const dx = ball.x - point.x;
    const dy = ball.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = BALL_RADIUS + point.r;
    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const velDotN = ball.vx * nx + ball.vy * ny;
      if (velDotN < 0) {
        const pushOut = minDist - dist + 1;
        const res = {
          x: ball.x + nx * pushOut,
          y: ball.y + ny * pushOut,
          vx: (ball.vx - 2 * velDotN * nx) * 0.5,
          vy: (ball.vy - 2 * velDotN * ny) * 0.5,
          hit: true,
        };
        if (flipper.active) {
          const leverage = vec.dist(ball, { x: flipper.x, y: flipper.y }) / flipper.length;
          res.vy -= 18 * Math.min(leverage, 1);
          res.vx += (flipper.side === 'left' ? 1 : -1) * 6;
        }
        return res;
      }
    }
  }

  return null;
}

export function limitSpeed(ball, maxSpeed = 30) {
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > maxSpeed) {
    const ratio = maxSpeed / speed;
    return { ...ball, vx: ball.vx * ratio, vy: ball.vy * ratio };
  }
  return ball;
}