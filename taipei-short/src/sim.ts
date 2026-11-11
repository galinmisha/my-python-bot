import {DUR, FPS, T} from './config';

export const ss = (a: number, b: number, t: number) => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// Tower tilt (radians, + = top moves right). Cartoon-exaggerated.
export const theta = (t: number) => {
  const W = T.windOn;
  const breeze = 0.006 * Math.sin(2 * Math.PI * 0.4 * t) * ss(0, 2, t) * (1 - ss(DUR - 1.6, DUR - 0.4, t));
  const lean = 0.035 * ss(W, W + 1.3, t) * (1 - ss(W + 4.5, W + 6.1, t));
  const amp = 0.032 * ss(W, W + 2.2, t) * (1 - 0.72 * ss(W + 5.7, W + 9.2, t)) * (1 - ss(DUR - 1.8, DUR - 0.2, t));
  return breeze + lean + amp * Math.sin(2 * Math.PI * 0.5 * (t - W));
};

export const HP = 980; // pivot height in tower-local px
export const L = 110; // cable length
export const R = 42; // ball radius
export const XPLATE = 70; // damper plate face (x)
export const LIM = Math.asin((XPLATE - R) / L); // contact angle
export const SOFT = 0.17; // damper plates start to push back here

export type Impact = {t: number; side: -1 | 1; v: number};
export type SimOut = {phi: number[]; th: number[]; impacts: Impact[]};

let cache: SimOut | null = null;
export const sim = (): SimOut => {
  if (cache) return cache;
  const n = Math.ceil(DUR * FPS) + 2;
  const sub = 20;
  const dt = 1 / FPS / sub;
  const w0 = 2 * Math.PI * 0.5;
  const kappa = 0.0042;
  let psi = 0; // ball angle relative to tower
  let vel = 0; // d psi/dt
  const phi: number[] = [];
  const th: number[] = [];
  const impacts: Impact[] = [];
  const h = 1 / 200;
  for (let i = 0; i < n; i++) {
    for (let s = 0; s < sub; s++) {
      const t = i / FPS + s * dt;
      const ddth = (theta(t + h) - 2 * theta(t) + theta(t - h)) / (h * h);
      const c = 0.28 + 0.75 * ss(T.heat0, T.heat0 + 0.9, t) + 1.8 * ss(T.calm0, T.calm0 + 1, t);
      const pen = Math.max(0, Math.abs(psi) - SOFT); // dampers: soft zone with spring + extra drag
      const sg = psi > 0 ? 1 : -1;
      const acc =
        -w0 * w0 * psi - kappa * HP * ddth - c * vel - sg * (30 * pen) - (pen > 0 ? 2.2 * vel : 0);
      const prev = vel;
      vel += acc * dt;
      psi += vel * dt;
      if (prev * vel <= 0 && Math.abs(psi) > 0.13 && (impacts.length === 0 || t - impacts[impacts.length - 1].t > 0.4)) {
        impacts.push({t, side: psi > 0 ? 1 : -1, v: Math.abs(psi)});
      }
    }
    const t = i / FPS;
    phi.push(psi);
    th.push(theta(t));
  }
  cache = {phi, th, impacts};
  return cache;
};
