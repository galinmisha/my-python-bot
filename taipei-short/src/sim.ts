import {DUR, FPS} from './config';

export const ss = (a: number, b: number, t: number) => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// Tower tilt (radians, + = top moves right). Cartoon-exaggerated.
export const theta = (t: number) => {
  const breeze = 0.006 * Math.sin(2 * Math.PI * 0.4 * t) * ss(0, 2, t) * (1 - ss(21, 22.4, t));
  const lean = 0.035 * ss(8.3, 9.6, t) * (1 - ss(12.8, 14.4, t));
  const amp = 0.032 * ss(8.3, 10.5, t) * (1 - 0.72 * ss(14, 17.5, t)) * (1 - ss(20.6, 22.4, t));
  return breeze + lean + amp * Math.sin(2 * Math.PI * 0.5 * (t - 8.3));
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
      const c = 0.28 + 0.75 * ss(13.9, 14.8, t) + 1.8 * ss(18.6, 19.6, t);
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
