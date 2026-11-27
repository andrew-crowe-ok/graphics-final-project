import { identity, multiply, orthonormalize, rotateAxis } from "../math/mat4.js";
import {
  ARROW_LIT, ARROW_REACH, AIM_MARGIN, AIM_SPACING, AIM_SPEED_STEP,
  AIM_TARGET_SPREAD, AIM_TARGET_STEP, BALL_RADIUS, FIELDS, FLIPPER_Y, GATE_HALF,
  GRAVITY, LAUNCH_FLASH, LANE_X, MAX_SPEED, SUBSTEPS, TILT_GRAVITY, TILT_MAX,
  TILT_SPEED, WALL_SOUND_DV, flipperTip, table,
} from "./table.js";
export const game = {
  ball: { p: [0, 0], v: [0, 0], rotation: identity() },
  score: 0,
  balls: 3,
  field: 0,
  tilt: [0, 0],
  tilting: [false, false, false, false],
  tiltStick: [0, 0],
  difficulty: 0.5,
  state: "ready",
  charge: 0,
  charging: false,
  launch: 0,
  sounds: new Set(),
};

const ballOnPlunger = () => game.ball.p[0] > LANE_X && game.ball.p[1] < 2;

export function resetBall() {
  game.ball.p = [(LANE_X + FIELDS[0].x1) / 2, 0.5 + BALL_RADIUS];
  game.ball.v = [0, 0];
  game.ball.rotation = identity();
  game.charging = false;
  game.charge = 0;
  game.launch = 0;
  game.state = "ready";
}

export function newGame() {
  game.score = 0;
  game.balls = 3;
  resetBall();
}

export function setPlunger(down) {
  if (game.state === "over") { if (down) newGame(); return; }
  if (down) { game.charging = true; return; }
  if (game.charging && ballOnPlunger()) {
    game.ball.v = [0, 36 + 20 * game.charge];
    game.state = "play";
    game.launch = LAUNCH_FLASH;
    game.sounds.add("launch");
  }
  game.charging = false;
  game.charge = 0;
}

export function setTilt(i, down) { game.tilting[i] = down; }
export function setTiltStick(x, y) { game.tiltStick = [x, y]; }

export function setFlipper(i, down) {
  for (const f of table.flippers) if (f.side === (i === 0 ? 1 : -1)) f.pressed = down;
  if (down) game.sounds.add("flipper");
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

function closestOnSegment(p, a, b) {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / dot(ab, ab)));
  return [a[0] + ab[0] * t, a[1] + ab[1] * t];
}

function resolve(ball, q, reach, restitution, vs = [0, 0]) {
  const d = sub(ball.p, q);
  const dist = Math.hypot(d[0], d[1]);
  if (dist >= reach || dist === 0) return false;
  const n = [d[0] / dist, d[1] / dist];
  ball.p[0] += n[0] * (reach - dist);
  ball.p[1] += n[1] * (reach - dist);
  const vn = dot(sub(ball.v, vs), n);
  if (vn < 0) {
    ball.v[0] -= (1 + restitution) * vn * n[0];
    ball.v[1] -= (1 + restitution) * vn * n[1];
  }
  return true;
}

function collideWalls(ball) {
  for (const w of table.walls) {
    const [vx, vy] = ball.v;
    if (resolve(ball, closestOnSegment(ball.p, w.a, w.b), BALL_RADIUS, 0.5)
        && Math.hypot(ball.v[0] - vx, ball.v[1] - vy) > WALL_SOUND_DV) game.sounds.add("wall");
  }
}

function collideBumpers(ball) {
  for (const bp of table.bumpers) {
    if (!resolve(ball, bp.c, BALL_RADIUS + bp.r, 0.9)) {
      bp.touching = false;
      continue;
    }
    const n = sub(ball.p, bp.c);
    const len = Math.hypot(n[0], n[1]);
    const vn = dot(ball.v, n) / len;
    if (vn < bp.kick) {
      ball.v[0] += (bp.kick - vn) * n[0] / len;
      ball.v[1] += (bp.kick - vn) * n[1] / len;
    }
    if (!bp.touching) {
      game.score += bp.points;
      bp.lit = 0.15;
      bp.touching = true;
      game.sounds.add("bumper");
    }
  }
}

function collideFlippers(ball) {
  for (const f of table.flippers) {
    const q = closestOnSegment(ball.p, f.pivot, flipperTip(f));
    const r = sub(q, f.pivot);
    const vs = [-f.omega * r[1], f.omega * r[0]];
    const touching = resolve(ball, q, BALL_RADIUS + f.radius, 0.3, vs);
    if (touching && f.side * f.omega > 0) f.kicking = true;
    else if (!touching && f.kicking) {
      f.kicking = false;
      aimShot(ball, f);
    }
  }
}

function crossArrows(ball) {
  for (const a of table.arrows) {
    const over = Math.hypot(ball.p[0] - a.p[0], ball.p[1] - a.p[1]) < ARROW_REACH;
    if (over && !a.over) {
      a.lit = ARROW_LIT;
      ball.v[0] += a.boost * a.dir[0];
      ball.v[1] += a.boost * a.dir[1];
    }
    a.over = over;
  }
}

function isClear(p, v, goalY) {
  const fall = 0.5 * GRAVITY, t = (v[1] - Math.sqrt(v[1] * v[1] - 4 * fall * (goalY - p[1]))) / (2 * fall);
  if (!(t > 0)) return false;
  const steps = Math.ceil(Math.hypot(v[0], v[1]) * t / AIM_SPACING), path = [];
  for (let i = Math.ceil(BALL_RADIUS / AIM_SPACING); i <= steps; i++) {
    const s = t * i / steps;
    path.push([p[0] + v[0] * s, p[1] + v[1] * s - fall * s * s, s]);
  }
  const xs = path.map(q => q[0]), x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1;
  const hits = (closest, reach) => path.some(q => {
    const c = closest(q);
    return Math.hypot(q[0] - c[0], q[1] - c[1]) < reach + AIM_MARGIN;
  });
  const inRange = (a, b) => Math.max(a[0], b[0]) > x0 && Math.min(a[0], b[0]) < x1
    && Math.max(a[1], b[1]) > p[1] - 1 && Math.min(a[1], b[1]) < goalY + 1;
  const reach = f => [[f.pivot[0] - f.length, f.pivot[1] - f.length], [f.pivot[0] + f.length, f.pivot[1] + f.length]];
  return !table.bumpers.some(bp => hits(() => bp.c, BALL_RADIUS + bp.r))
    && !table.walls.some(w => inRange(w.a, w.b) && hits(q => closestOnSegment(q, w.a, w.b), BALL_RADIUS))
    && !table.flippers.some(f => inRange(...reach(f)) && hits(q => closestOnSegment(q, f.pivot,
      flipperTip(f, approach(f.angle, f.pressed ? f.upAngle : f.restAngle, f.speed * q[2]))), BALL_RADIUS + f.radius));
}

function aimShot(ball, hitter) {
  const field = FIELDS.findLastIndex(f => hitter.pivot[1] >= f.y0);
  if (field + 1 >= FIELDS.length || Math.random() < game.difficulty) return;
  const gate = table.gates[field], goalY = FIELDS[field + 1].y0 + FLIPPER_Y + 1;
  const g = GRAVITY, dy = goalY - ball.p[1];
  for (let speed = Math.sqrt(g * (dy + Math.hypot(GATE_HALF, dy))); speed <= MAX_SPEED; speed += AIM_SPEED_STEP)
    for (let tx = gate.x - AIM_TARGET_SPREAD; tx <= gate.x + AIM_TARGET_SPREAD; tx += AIM_TARGET_STEP) {
      const dx = tx - ball.p[0], v2 = speed * speed;
      const disc = v2 * v2 - g * (g * dx * dx + 2 * dy * v2);
      if (disc < 0) continue;
      const angle = Math.atan2(v2 - Math.sqrt(disc), g * dx);
      const v = [speed * Math.cos(angle), speed * Math.sin(angle)];
      if (isClear(ball.p, v, goalY)) { ball.v = v; return; }
    }
}

const approach = (value, target, step) =>
  Math.abs(target - value) <= step ? target : value + Math.sign(target - value) * step;

function moveFlippers(dt) {
  for (const f of table.flippers) {
    if (!f.pressed) f.kicking = false;
    const prev = f.angle;
    f.angle = approach(f.angle, f.pressed ? f.upAngle : f.restAngle, f.speed * dt);
    f.omega = f.side * (f.angle - prev) / dt;
  }
}

export function stepPhysics(dt) {
  if (!(dt > 0)) return;
  const h = dt / SUBSTEPS;
  const ball = game.ball;

  if (game.charging) game.charge = Math.min(1, game.charge + dt);
  game.launch = Math.max(0, game.launch - dt);
  const [left, right, down, up] = game.tilting;
  const tiltTarget = [right - left + game.tiltStick[0], up - down + game.tiltStick[1]]
    .map(d => TILT_MAX * Math.max(-1, Math.min(1, d)));
  game.tilt = game.tilt.map((t, i) => approach(t, tiltTarget[i], TILT_SPEED * dt));
  for (const bp of table.bumpers) bp.lit = Math.max(0, bp.lit - dt);
  for (const a of table.arrows) a.lit = Math.max(0, a.lit - dt);

  for (let i = 0; i < SUBSTEPS; i++) {
    moveFlippers(h);
    if (game.state === "over") continue;

    const [x, y] = ball.p;
    ball.v[0] += TILT_GRAVITY * Math.sin(game.tilt[0]) * h;
    ball.v[1] += (TILT_GRAVITY * Math.sin(game.tilt[1]) - GRAVITY) * h;
    const speed = Math.hypot(ball.v[0], ball.v[1]);
    if (speed > MAX_SPEED) { ball.v[0] *= MAX_SPEED / speed; ball.v[1] *= MAX_SPEED / speed; }
    ball.p[0] += ball.v[0] * h;
    ball.p[1] += ball.v[1] * h;

    collideWalls(ball);
    collideBumpers(ball);
    collideFlippers(ball);
    crossArrows(ball);

    const dx = ball.p[0] - x, dy = ball.p[1] - y, d = Math.hypot(dx, dy);
    if (d > 1e-6) ball.rotation = multiply(rotateAxis([-dy / d, dx / d, 0], d / BALL_RADIUS), ball.rotation);
  }
  ball.rotation = orthonormalize(ball.rotation);
  game.field = Math.max(0, FIELDS.findLastIndex(f => ball.p[1] > f.y0 + FLIPPER_Y));

  if (game.state === "play" && ballOnPlunger() && ball.v[1] <= 0) game.state = "ready";

  if (game.state !== "over" && ball.p[1] < -BALL_RADIUS * 2) {
    game.balls--;
    if (game.balls > 0) resetBall();
    else game.state = "over";
  }
}
