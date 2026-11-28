export const BALL_RADIUS = 0.5;
export const GRAVITY = 30;
export const SUBSTEPS = 8;
export const MAX_SPEED = 72;
export const LAUNCH_SPEED = 44, LAUNCH_CHARGE_SPEED = 24;
export const MULTIBALL_SCORE = 1000;
export const LANE_X = 18.4;
export const FLIPPER_Y = 4.6;
export const GATE_X = 9.2;
export const GATE_HALF = 2.0;
export const TILT_MAX = 0.08;
export const TILT_SPEED = 0.6;
export const TILT_GRAVITY = 750;
export const ARROW_REACH = 1.0, ARROW_BOOST = 2.5, LANE_BOOST = 5;
export const ARROW_LIT = 0.25;
export const LAUNCH_FLASH = 0.3;
export const AIM_SPACING = 0.4, AIM_MARGIN = 0.05, AIM_SPEED_STEP = 2, AIM_TARGET_SPREAD = 1.5, AIM_TARGET_STEP = 0.25;
export const WALL_SOUND_DV = 3;

function arc(cx, cy, r, from, to, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = from + (to - from) * i / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function chain(points) {
  const segs = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, b] = [points[i], points[i + 1]];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-6) segs.push({ a, b });
  }
  return segs;
}

function makeFlipper(pivot, side, restAngle = -0.5, upAngle = 0.45) {
  return {
    pivot, side,
    length: 3.2,
    radius: 0.3,
    restAngle,
    upAngle,
    speed: 18,
    angle: restAngle,
    omega: 0,
    pressed: false,
  };
}

function arrowRow(start, step, count, dir, boost = ARROW_BOOST) {
  return Array.from({ length: count }, (_, i) => ({
    p: [start[0] + step[0] * i, start[1] + step[1] * i],
    dir,
    boost: boost * (i + 1),
    lit: 0,
    over: false,
  }));
}

export const FIELDS = [
  { x0: 0, y0: 0, x1: 20, y1: 36 },
  { x0: 2.2, y0: 37.2, x1: 16.2, y1: 63 },
  { x0: 2.2, y0: 64.2, x1: 16.2, y1: 80 },
];

export const fieldIndexForY = y =>
  Math.max(0, FIELDS.findLastIndex(field => y > field.y0 + FLIPPER_Y));

function gate(x, below, above) {
  const y = above.y0 + FLIPPER_Y;
  const left = [x - GATE_HALF - 3.1, y], right = [x + GATE_HALF + 3.1, y];
  return {
    x, below,
    walls: [
      { a: [above.x0, y + 3.4], b: left },
      { a: [above.x1, y + 3.4], b: right },
      ...chain([left, [x - GATE_HALF, above.y0 + 1], [x - GATE_HALF, below.y1]]),
      ...chain([right, [x + GATE_HALF, above.y0 + 1], [x + GATE_HALF, below.y1]]),
    ],
    flippers: [makeFlipper(left, +1), makeFlipper(right, -1)],
  };
}

export const GATES = [
  gate(GATE_X, FIELDS[0], FIELDS[1]),
  gate(GATE_X, FIELDS[1], FIELDS[2]),
];

export const table = {
  fields: FIELDS,
  gates: GATES,
  walls: [
    ...chain([
      [0, 8], [0, 32],
      ...arc(4, 32, 4, Math.PI, Math.PI / 2),
      [GATE_X - GATE_HALF, 36],
    ]),
    ...chain([
      [GATE_X + GATE_HALF, 36],
      ...arc(16, 32, 4, Math.PI / 2, 0),
      [20, 0],
    ]),
    { a: [LANE_X, 0], b: [LANE_X, 28] },
    { a: [LANE_X, 0.5], b: [20, 0.5] },
    { a: [0, 8], b: [5.4, 4.6] },
    { a: [LANE_X, 8], b: [13.0, 4.6] },
    { a: [5.4, 4.6], b: [5.4, -1], hidden: true },
    { a: [13.0, 4.6], b: [13.0, -1], hidden: true },
    ...chain([[2.2, 45.2], [2.2, 59], [6.2, 63], [GATE_X - GATE_HALF, 63]]),
    ...chain([[GATE_X + GATE_HALF, 63], [12.2, 63], [16.2, 59], [16.2, 45.2]]),
    ...chain([[2.2, 72.2], [2.2, 73], ...arc(9.2, 73, 7, Math.PI, 0, 24), [16.2, 72.2]]),
    ...GATES.flatMap(g => g.walls),
  ],
  bumpers: [
    { c: [6, 24], r: 1.2, kick: 22, points: 100, lit: 0 },
    { c: [12.4, 24], r: 1.2, kick: 22, points: 100, lit: 0 },
    { c: [9.2, 19], r: 1.2, kick: 22, points: 100, lit: 0 },
    { c: [5.6, 51], r: 1.0, kick: 22, points: 200, lit: 0 },
    { c: [12.8, 51], r: 1.0, kick: 22, points: 200, lit: 0 },
    { c: [6.2, 75.5], r: 1.0, kick: 22, points: 500, lit: 0 },
    { c: [12.2, 75.5], r: 1.0, kick: 22, points: 500, lit: 0 },
    { c: [9.2, 77.5], r: 1.0, kick: 22, points: 500, lit: 0 },
  ],
  flippers: [
    makeFlipper([5.4, 4.6], +1),
    makeFlipper([13.0, 4.6], -1),
    makeFlipper([0.6, 24], +1, -0.3, 0.2),
    ...GATES.flatMap(g => g.flippers),
  ],
  arrows: [
    ...arrowRow([19.2, 3.01], [0, 2.6], 10, [0, 1], LANE_BOOST),
    ...arrowRow([13.59, 33.2], [-2, 0], 4, [-1, 0]),
    ...arrowRow([9.2, 47.52], [0, 2], 7, [0, 1]),
  ],
};

export function flipperTip(f, angle = f.angle) {
  return [f.pivot[0] + f.side * f.length * Math.cos(angle),
          f.pivot[1] + f.length * Math.sin(angle)];
}

