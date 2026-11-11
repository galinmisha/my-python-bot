// Physics for the wombat Short (all in unshifted world px, y down).
export const ANG = Math.atan2(105, 460);
export const CA = Math.cos(ANG);
export const SA = Math.sin(ANG);
export const SURF = (x: number) => 1335 + (x - 330) * (105 / 460); // rock top line
export const ROCK_X1 = 790; // right edge of the sloped top
export const GROUND = 1560;
export const BALL_R = 36;
export const CUBE = 78;
export const PILE_X = 355; // pile origin on the slope
export const PILE_O = {x: PILE_X, y: SURF(PILE_X)};

export const TW = {
  cubePop: 17.94, // "it's a cube"
  cubeLand: 17.94 + 0.65,
  ballShow: 20.6,
  ballRoll: 21.28,
};

// local (along-slope, up) -> world

export const rot = (lx: number, ly: number) => ({x: lx * CA - ly * SA, y: lx * SA + ly * CA});

// ---- pooped cube flight ----
const CUBE_LAND_LOCAL = {x: 192 + CUBE / 2, y: -CUBE / 2}; // centre, local (svg-style, y up is negative)
const r0 = rot(CUBE_LAND_LOCAL.x, CUBE_LAND_LOCAL.y);
export const CUBE_END = {x: PILE_O.x + r0.x, y: PILE_O.y + r0.y};
export const CUBE_START = {x: 232, y: 975};
const T_C = TW.cubeLand - TW.cubePop;
const G_C = 2000;
const VY0 = (CUBE_END.y - CUBE_START.y - 0.5 * G_C * T_C * T_C) / T_C;
export const cubeFlight = (t: number) => {
  const tau = t - TW.cubePop;
  if (tau < 0) return {state: 'hidden' as const, x: CUBE_START.x, y: CUBE_START.y, rot: 0};
  if (tau >= T_C) return {state: 'landed' as const, x: CUBE_END.x, y: CUBE_END.y, rot: ANG};
  const u = tau / T_C;
  return {
    state: 'flying' as const,
    x: CUBE_START.x + (CUBE_END.x - CUBE_START.x) * u,
    y: CUBE_START.y + VY0 * tau + 0.5 * G_C * tau * tau,
    rot: ANG * u + (1 - u) * -0.9 + Math.sin(u * Math.PI) * 0.0,
  };
};

// ---- rolling ball ----
const A_ROLL = 520;
const BALL_X0 = 660;
const G = 2200;
export type BallPt = {t: number; x: number; y: number; rot: number};
export const ballContacts: number[] = [];
const traj: BallPt[] = (() => {
  const out: BallPt[] = [];
  const dt = 1 / 600;
  const sEdge = (ROCK_X1 - BALL_X0) / CA;
  const tau_e = Math.sqrt((2 * sEdge) / A_ROLL);
  const v = A_ROLL * tau_e;
  let vx = v * CA;
  let vy = v * SA;
  let x = ROCK_X1 + BALL_R * SA;
  let y = SURF(ROCK_X1) - BALL_R * CA;
  let angle = sEdge / BALL_R;
  const omega = v / BALL_R;
  let t = TW.ballRoll + tau_e;
  let bounces = 0;
  while (t < TW.ballRoll + 3) {
    vy += G * dt;
    x += vx * dt;
    y += vy * dt;
    angle += omega * dt;
    if (y > GROUND - BALL_R) {
      y = GROUND - BALL_R;
      vy = -vy * 0.45;
      bounces++;
      ballContacts.push(t);
    }
    out.push({t, x, y, rot: angle});
    t += dt;
  }
  return out;
})();
export const ballState = (t: number) => {
  if (t < TW.ballShow) return {visible: false, x: 0, y: 0, rot: 0, on: false};
  if (t < TW.ballRoll) {
    return {visible: true, x: BALL_X0 + BALL_R * SA, y: SURF(BALL_X0) - BALL_R * CA, rot: 0, on: true};
  }
  const tau = t - TW.ballRoll;
  const sEdge = (ROCK_X1 - BALL_X0) / CA;
  const tau_e = Math.sqrt((2 * sEdge) / A_ROLL);
  if (tau <= tau_e) {
    const s = 0.5 * A_ROLL * tau * tau;
    const x = BALL_X0 + s * CA;
    return {visible: true, x: x + BALL_R * SA, y: SURF(x) - BALL_R * CA, rot: s / BALL_R, on: true};
  }
  const idx = Math.min(traj.length - 1, Math.max(0, Math.round((t - (TW.ballRoll + tau_e)) * 600)));
  const p = traj[idx];
  return {visible: p.x < 1250, x: p.x, y: p.y, rot: p.rot, on: false};
};
