import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {DUR, FPS, HAS_VO, T} from './config';
import {HP, L, R, SOFT, sim, ss, XPLATE} from './sim';

const INK = '#111';
const SW = 7;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const eio = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eoc = (u: number) => 1 - Math.pow(1 - u, 3);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
// damped spring pop 0->1 with overshoot
const pop = (t: number, t0: number) => {
  const d = t - t0;
  if (d <= 0) return 0;
  return 1 - Math.exp(-7 * d) * Math.cos(15 * d);
};
const mix = (a: string, b: string, u: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * u)).join(',')})`;
};
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- world constants (screen space at wide camera) ----------
const BASE_X = 540;
const BASE_Y = 1760;
const SC = 1.15; // tower scale

const camAt = (t: number) => {
  const u1 = eio(seg(t, T.zoomIn0, T.zoomIn1));
  const u2 = eio(seg(t, T.zoomOut0, T.zoomOut1));
  const u = u1 * (1 - u2);
  const s = Math.exp(lerp(Math.log(1), Math.log(2.5), u));
  return {s, cx: 540, cy: lerp(960, 800, u)};
};
const camTransform = (c: {s: number; cx: number; cy: number}, d: number) => {
  const s = 1 + (c.s - 1) * d;
  const cx = 540 + (c.cx - 540) * d;
  const cy = 960 + (c.cy - 960) * d;
  return `translate(540 960) scale(${s}) translate(${-cx} ${-cy})`;
};

// ---------- small drawing helpers ----------
const Puff: React.FC<{x: number; y: number; r: number; fill: string}> = ({x, y, r, fill}) => (
  <g>
    <circle cx={x} cy={y} r={r + 5} fill={INK} />
    <circle cx={x} cy={y} r={r} fill={fill} />
  </g>
);
const Cluster: React.FC<{cx: number; cy: number; seed: number; age: number; fill: string; hot?: boolean}> = ({cx, cy, seed, age, fill, hot}) => {
  // one merged outline: all ink circles first, then all fills
  const life = 1.7;
  const u = age / life;
  if (u < 0 || u > 1) return null;
  const sz = Math.sin(Math.PI * Math.pow(u, 0.7)); // grow then shrink away
  const circ = [0, 1, 2, 3, 4].map((k) => {
    const a = rnd(seed * 9 + k) * Math.PI * 2;
    const rr = 6 + rnd(seed * 13 + k) * 16;
    return {
      x: cx + Math.cos(a) * rr * (0.5 + u) + (rnd(seed + k) - 0.5) * 26 * u,
      y: cy - u * (90 + rnd(seed * 5 + k) * 70) + Math.sin(a) * rr * 0.5,
      r: (12 + rnd(seed * 3 + k) * 12) * sz * (hot ? 1 : 1.25),
    };
  });
  return (
    <g>
      {circ.map((c, i) => (
        <circle key={'i' + i} cx={c.x} cy={c.y} r={c.r + 5} fill={INK} />
      ))}
      {circ.map((c, i) => (
        <circle key={'f' + i} cx={c.x} cy={c.y} r={c.r} fill={fill} />
      ))}
    </g>
  );
};

// ---------- ball face ----------
const Eye: React.FC<{x: number; look: {x: number; y: number}; lid: number; squeeze: number; tilt: number}> = ({x, look, lid, squeeze, tilt}) => {
  if (squeeze > 0.5) {
    // "> <" chevron
    const s = x < 0 ? 1 : -1;
    return <path d={`M ${x - s * 8} ${-14} L ${x + s * 8} ${-4} L ${x - s * 8} ${6}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />;
  }
  return (
    <g transform={`translate(${x} -4)`}>
      <clipPath id={`ec${x}`}>
        <ellipse cx={0} cy={0} rx={12} ry={15} />
      </clipPath>
      <ellipse cx={0} cy={0} rx={12} ry={15} fill="#fff" stroke={INK} strokeWidth={4} />
      <g clipPath={`url(#ec${x})`}>
        <circle cx={look.x * 4} cy={look.y * 5} r={6.5} fill={INK} />
        <circle cx={look.x * 4 + 2} cy={look.y * 5 - 2.5} r={2} fill="#fff" />
        <g transform={`rotate(${tilt})`}>
          <rect x={-16} y={-18} width={32} height={36 * lid} fill="#B8C2CD" />
          <line x1={-16} y1={-18 + 36 * lid} x2={16} y2={-18 + 36 * lid} stroke={INK} strokeWidth={4} />
        </g>
      </g>
    </g>
  );
};
const Ball: React.FC<{t: number; alpha: number; speed: number; sq: number}> = ({t, alpha, speed, sq}) => {
  const open = pop(t, T.eyes);
  const blink = [8.2, 12.6, 17.5, 20.5].some((b) => t > b && t < b + 0.12) ? 1 : 0;
  const nearImpact = sim().impacts.some((i) => t >= i.t && t < i.t + 0.28) && t > T.heat0 - 0.1;
  const wind = t > T.windOn + 0.3 && t < T.windOff + 0.6;
  const smug = t > T.smug;
  const lookX = wind ? -1 : smug ? 0.7 : 0.3 * Math.sin(t * 1.3) * (t > T.eyes ? 1 : 0);
  const lookY = wind ? -0.3 : smug ? 0.1 : 0;
  const lid = blink ? 1 : smug ? 0.45 : wind ? 0.12 : 0;
  const browY = smug ? -3 : wind ? -9 : -12;
  const browTilt = wind ? 16 : smug ? 4 : 0;
  const k = open * (1 - ss(DUR - 1.0, DUR - 0.1, t));
  return (
    <g transform={`rotate(${(alpha * 180) / Math.PI * 0.4})`}>
      <g transform={`scale(${1 + sq * 0.14} ${1 - sq * 0.1})`}>
        <circle r={R} fill="#A9B6C4" stroke={INK} strokeWidth={SW} />
        <path d={`M ${R * 0.35} ${-R * 0.85} A ${R} ${R} 0 0 1 ${R * 0.85} ${R * 0.2} A ${R} ${R} 0 0 0 ${R * 0.35} ${-R * 0.85} Z`} fill="#8E9BAA" />
        <path d={`M ${-R * 0.7} ${-R * 0.45} A ${R * 0.85} ${R * 0.85} 0 0 1 ${-R * 0.25} ${-R * 0.78}`} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
        <g transform={`translate(0 ${3}) scale(${k} ${k})`} opacity={k > 0.02 ? 1 : 0}>
          <Eye x={-15} look={{x: lookX, y: lookY}} lid={lid} squeeze={nearImpact ? 1 : 0} tilt={wind ? -8 : smug ? 0 : 0} />
          <Eye x={15} look={{x: lookX, y: lookY}} lid={lid} squeeze={nearImpact ? 1 : 0} tilt={wind ? 8 : 0} />
          <line x1={-26} y1={browY} x2={-6} y2={browY - browTilt * 0.2 + (wind ? 4 : 0)} stroke={INK} strokeWidth={5} strokeLinecap="round" />
          <line x1={6} y1={browY - (wind ? 4 : 0)} x2={26} y2={browY + browTilt * 0.1 + (wind ? 0 : 0)} stroke={INK} strokeWidth={5} strokeLinecap="round" />
          {smug ? (
            <path d="M -12 22 Q 0 28 12 20" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          ) : nearImpact ? (
            <path d="M -9 24 Q 0 16 9 24" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          ) : (
            <ellipse cx={0} cy={23} rx={wind ? 7 : 5} ry={wind ? 6 : 3} fill="#fff" stroke={INK} strokeWidth={3.5} />
          )}
        </g>
      </g>
      {/* sweat drop while wind blows */}
      {t > T.windFull && t < T.windOff
        ? (() => {
            const u = seg(t, T.windFull + 0.2, T.windFull + 2.0);
            const pu = Math.sin(Math.PI * Math.min(1, u * 1.0));
            const x = R * 0.75 + u * 4;
            const y = -R * 0.6 + u * 40;
            return (
              <g transform={`translate(${x} ${y}) scale(${pu})`}>
                <path d="M 0 -12 Q 10 2 0 10 Q -10 2 0 -12 Z" fill="#9AD7FF" stroke={INK} strokeWidth={3.5} />
                <circle cx={-2.5} cy={2} r={2} fill="#fff" />
              </g>
            );
          })()
        : null}
    </g>
  );
};

// ---------- character ----------
const Hero: React.FC<{t: number}> = ({t}) => {
  const breathe = 1 + 0.009 * Math.sin((2 * Math.PI * 14 * t) / DUR);
  const pointing = t < T.windOn - 0.5 || t > T.zoomOut1 - 0.3;
  const qPop = t < 5 ? 1 - seg(t, T.zoomIn0 - 0.5, T.zoomIn0 - 0.2) : pop(t, T.zoomOut1 - 0.1) * seg(t, T.zoomOut1 - 0.1, T.zoomOut1 - 0.05);
  const qk = clamp(qPop, 0, 1.15);
  const armUp = pointing;
  return (
    <g transform={`translate(230 ${BASE_Y}) scale(${breathe} ${breathe})`}>
      {/* shadow */}
      <ellipse cx={0} cy={4} rx={70} ry={11} fill="rgba(60,50,40,0.25)" />
      {/* legs */}
      <path d="M -18 -58 L -20 -8" stroke={INK} strokeWidth={22} strokeLinecap="round" />
      <path d="M -18 -58 L -20 -8" stroke="#fff" strokeWidth={10} strokeLinecap="round" />
      <path d="M 18 -58 L 20 -8" stroke={INK} strokeWidth={22} strokeLinecap="round" />
      <path d="M 18 -58 L 20 -8" stroke="#fff" strokeWidth={10} strokeLinecap="round" />
      <ellipse cx={-26} cy={-2} rx={22} ry={10} fill="#fff" stroke={INK} strokeWidth={SW} />
      <ellipse cx={26} cy={-2} rx={22} ry={10} fill="#fff" stroke={INK} strokeWidth={SW} />
      {/* body */}
      <path d="M -34 -150 Q -42 -66 -22 -56 L 22 -56 Q 42 -66 34 -150 Q 0 -166 -34 -150 Z" fill="#fff" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 10 -150 Q 36 -120 28 -64 L 22 -56 Q 42 -66 34 -150 Z" fill="#E3E6EB" />
      {/* arms */}
      {armUp ? (
        <>
          <path d="M 30 -138 Q 70 -170 104 -214" fill="none" stroke={INK} strokeWidth={20} strokeLinecap="round" />
          <path d="M 30 -138 Q 70 -170 104 -214" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
          <circle cx={108} cy={-220} r={13} fill="#fff" stroke={INK} strokeWidth={5} />
          <path d="M 108 -232 L 112 -256" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d="M 108 -232 L 112 -256" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M 32 -138 Q 66 -112 60 -84" fill="none" stroke={INK} strokeWidth={20} strokeLinecap="round" />
          <path d="M 32 -138 Q 66 -112 60 -84" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
        </>
      )}
      <path d="M -32 -138 Q -66 -112 -60 -84" fill="none" stroke={INK} strokeWidth={20} strokeLinecap="round" />
      <path d="M -32 -138 Q -66 -112 -60 -84" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
      {/* head */}
      <g transform={`translate(0 -222) rotate(${armUp ? 8 : 0})`}>
        <circle r={74} fill="#fff" stroke={INK} strokeWidth={SW} />
        <path d="M 30 -62 A 74 74 0 0 1 60 38 A 74 74 0 0 0 30 -62 Z" fill="#E3E6EB" />
        {[-26, 26].map((x) => (
          <ellipse key={x} cx={x + 6} cy={-6} rx={8} ry={11} fill={INK} />
        ))}
        <ellipse cx={-20} cy={-10} rx={2.5} ry={3.5} fill="#fff" />
        <ellipse cx={32} cy={-10} rx={2.5} ry={3.5} fill="#fff" />
        <path d="M -40 -30 Q -26 -42 -12 -32" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d="M 22 -34 Q 36 -46 50 -34" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <ellipse cx={12} cy={34} rx={9} ry={6} fill="#fff" stroke={INK} strokeWidth={4} />
      </g>
      {/* question mark bubble */}
      <g transform={`translate(110 -330) scale(${qk})`} opacity={qk > 0.01 ? 1 : 0}>
        <circle r={36} fill="#fff" stroke={INK} strokeWidth={SW} />
        <text x={0} y={19} textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight={900} fontSize={54} fill={INK}>
          ?
        </text>
      </g>
    </g>
  );
};

// ---------- tower ----------
const Tower: React.FC<{t: number; thetaRad: number; psi: number; impacts: {t: number; side: number}[]}> = ({t, thetaRad, psi, impacts}) => {
  const segs = Array.from({length: 8}, (_, i) => i);
  const wb = (i: number) => 175 - 5 * i;
  const ballX = L * Math.sin(psi);
  const ballY = -HP + 5 + L * Math.cos(psi);
  const squeeze = (side: number) => {
    // damper plate compression: from ball penetration plus a small kick after impacts
    const pen = Math.max(0, side * ballX + R - XPLATE) * 3.2;
    const kick = impacts.filter((i) => i.side === side && t >= i.t && t < i.t + 0.25).length ? 3 : 0;
    return Math.min(pen + kick, 16);
  };
  const sqL = squeeze(-1);
  const sqR = squeeze(1);
  const touching = Math.abs(psi) > SOFT && t > T.heat0 - 0.2;
  return (
    <g transform={`translate(${BASE_X} ${BASE_Y}) scale(${SC}) rotate(${(thetaRad * 180) / Math.PI})`}>
      {/* podium */}
      <rect x={-185} y={-90} width={370} height={90} rx={6} fill="#6FB9A3" stroke={INK} strokeWidth={SW} />
      <rect x={20} y={-90} width={165} height={90} fill="#5BA48E" />
      <rect x={-185} y={-90} width={370} height={90} rx={6} fill="none" stroke={INK} strokeWidth={SW} />
      <rect x={-36} y={-70} width={72} height={70} rx={4} fill="#26384A" stroke={INK} strokeWidth={5} />
      {segs.map((i) => {
        const yb = -90 - i * 115;
        const yt = yb - 115;
        const b = wb(i);
        const tp = b + 12;
        return (
          <g key={i}>
            <path d={`M ${-b} ${yb} L ${-tp} ${yt} L ${tp} ${yt} L ${b} ${yb} Z`} fill="#7CC9B2" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
            <path d={`M ${b * 0.2} ${yb} L ${tp * 0.2} ${yt} L ${tp} ${yt} L ${b} ${yb} Z`} fill="#62AE98" />
            <path d={`M ${-b} ${yb} L ${-tp} ${yt} L ${tp} ${yt} L ${b} ${yb} Z`} fill="none" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
            {[-0.6, -0.2, 0.2, 0.6].map((f) => (
              <line key={f} x1={f * b * 0.9} y1={yb - 12} x2={f * tp * 0.9} y2={yt + 14} stroke="#4F9C86" strokeWidth={3} />
            ))}
          </g>
        );
      })}
      {/* crown + spire */}
      <rect x={-105} y={-1070} width={210} height={60} rx={4} fill="#7CC9B2" stroke={INK} strokeWidth={SW} />
      <rect x={-72} y={-1130} width={144} height={60} rx={4} fill="#7CC9B2" stroke={INK} strokeWidth={SW} />
      <path d="M -16 -1130 L 0 -1300 L 16 -1130 Z" fill="#E8EDF2" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {/* cutaway window */}
      <rect x={-120} y={-990} width={240} height={200} rx={6} fill="#26384A" stroke={INK} strokeWidth={SW} />
      <clipPath id="win">
        <rect x={-120} y={-990} width={240} height={200} rx={6} />
      </clipPath>
      <g clipPath="url(#win)">
        <rect x={-120} y={-990} width={240} height={26} fill="#34506B" />
        {/* heat glow when dampers work */}
        {t > T.heat0 && t < T.calm0 + 1.5 ? (
          <ellipse cx={0} cy={-870} rx={130} ry={110} fill="#FF8A3D" opacity={0.07 * seg(t, T.heat0, T.heat0 + 0.8) * (1 - seg(t, T.calm0 - 1, T.calm0 + 1.5))} />
        ) : null}
        {/* damper bodies + plates */}
        {[-1, 1].map((sd) => {
          const comp = sd === -1 ? sqL : sqR;
          const heat = ss(T.heat0, T.heat0 + 1, t) * (1 - ss(T.calm0 - 1, T.calm0 + 0.6, t));
          return (
            <g key={sd}>
              <rect x={sd === -1 ? -120 : 96} y={-896} width={24} height={52} fill={mix('#8791A0', '#E2713A', heat)} stroke={INK} strokeWidth={5} />
              <rect x={sd === -1 ? -96 : 70 + 0} y={-884} width={26 - 0} height={28} fill="#C9D1DB" stroke={INK} strokeWidth={4} />
              <rect x={sd === -1 ? -XPLATE - 6 + comp : XPLATE - 2 - comp} y={-910} width={8} height={80} rx={3} fill="#C9D1DB" stroke={INK} strokeWidth={4} />
            </g>
          );
        })}
        {/* cables + ball */}
        {[-1, 1].map((sd) => {
          const ax = sd * 26;
          const ay = -985;
          const bx = ballX + Math.cos(psi) * sd * 20 + Math.sin(psi) * -R * 0.78;
          const by = ballY - Math.cos(psi) * R * 0.78 + Math.sin(psi) * sd * 20 * -1;
          return <line key={sd} x1={ax} y1={ay} x2={bx} y2={by} stroke={INK} strokeWidth={5} strokeLinecap="round" />;
        })}
        <rect x={-34} y={-996} width={68} height={14} rx={4} fill="#C9D1DB" stroke={INK} strokeWidth={4} />
        <g transform={`translate(${ballX} ${ballY})`}>
          <Ball t={t} alpha={psi} speed={0} sq={t > T.heat0 - 0.2 ? clamp((Math.abs(psi) - SOFT + 0.02) / 0.08) * 0.6 : 0} />
        </g>
      </g>
    </g>
  );
};

// ---------- wind ----------
const Wind: React.FC<{t: number}> = ({t}) => {
  if (t < T.windOn - 0.2 || t > T.windOff + 0.8) return null;
  const on = ss(T.windOn - 0.2, T.windOn + 0.6, t) * (1 - ss(T.windOff, T.windOff + 0.8, t));
  const lines = Array.from({length: 9}, (_, i) => i);
  return (
    <g opacity={on}>
      {lines.map((i) => {
        const y = 620 + i * 62 + rnd(i) * 20;
        const sp = 1100 + rnd(i + 3) * 700;
        const len = 150 + rnd(i + 9) * 150;
        const x = ((t * sp + rnd(i + 5) * 1400) % 1900) - 450;
        const wob = Math.sin(t * 6 + i) * 8;
        const d = `M ${x - len} ${y + wob} Q ${x - len * 0.4} ${y - 20 + wob} ${x} ${y + wob}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={INK} strokeWidth={17} strokeLinecap="round" />
            <path d={d} fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
};

// ---------- background ----------
const Cloud: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g>
      {[[0, 0, 46], [-52, 14, 34], [52, 14, 36], [14, -24, 36]].map((c, i) => (
        <circle key={'o' + i} cx={c[0]} cy={c[1]} r={c[2] + 6} fill={INK} />
      ))}
      {[[0, 0, 46], [-52, 14, 34], [52, 14, 36], [14, -24, 36]].map((c, i) => (
        <circle key={'f' + i} cx={c[0]} cy={c[1]} r={c[2]} fill="#fff" />
      ))}
    </g>
  </g>
);

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const S = sim();
  const idx = Math.min(S.phi.length - 1, frame);
  // blend the pendulum to rest at the very end so the last frame loops to frame 0
  const endBlend = 1 - ss(DUR - 1.3, DUR - 0.2, t);
  const psi = S.phi[idx] * endBlend;
  const thetaRad = S.th[idx];
  const cam = camAt(t);
  const zoom = cam.s;
  // shake on damper hits
  let sh = 0;
  for (const im of S.impacts) if (t >= im.t && t < im.t + 0.5 && im.t > T.heat0 - 0.2) sh += 2.4 * Math.exp(-7 * (t - im.t)) * Math.sin((t - im.t) * 38);
  const impactsB = S.impacts.filter((i) => i.t > T.heat0 - 0.2);

  const farBlur = 3.4 * clamp((zoom - 1) / 1.2);
  const tagK = pop(t, T.tag) * (1 - seg(t, T.windOn - 0.8, T.windOn - 0.5));

  // heat + steam clusters, anchored in tower-local space near the damper on the impact side
  const clusters = impactsB.flatMap((im, i) => {
    const age = t - im.t;
    if (age < 0 || age > 1.7) return [];
    return [
      {key: 'h' + i, seed: i + 1, age, side: im.side, fill: '#FF8A3D', hot: true},
      {key: 's' + i, seed: i + 40, age: age - 0.15, side: im.side, fill: '#fff', hot: false},
    ];
  });

  return (
    <AbsoluteFill style={{background: '#BFE6FF'}}>
      {HAS_VO ? <Audio src={staticFile('taipei/vo/take1.mp3')} startFrom={0} /> : null}
      <Sequence from={0}>
        <Audio src={staticFile('taipei/sfx.wav')} volume={0.6} />
      </Sequence>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8FD0FF" />
            <stop offset="1" stopColor="#D9F1FF" />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#sky)" />
        {/* far clouds + skyline */}
        <g transform={camTransform(cam, 0.2)} style={{filter: farBlur ? `blur(${farBlur}px)` : undefined}}>
          <Cloud x={150 + 22 * Math.sin((2 * Math.PI * t) / DUR)} y={420} s={1.3} />
          <Cloud x={820 - 18 * Math.sin((2 * Math.PI * t) / DUR)} y={640} s={1.0} />
          <Cloud x={560 + 12 * Math.sin((2 * Math.PI * t) / DUR)} y={260} s={0.9} />
        </g>
        <g transform={camTransform(cam, 0.45)} style={{filter: farBlur ? `blur(${farBlur}px)` : undefined}}>
          {[[-60, 160, 110], [70, 260, 90], [160, 200, 120], [790, 230, 100], [890, 330, 90], [980, 190, 120], [1070, 280, 80]].map((b, i) => (
            <rect key={i} x={b[0]} y={BASE_Y - b[1]} width={b[2]} height={b[1] + 60} fill="#A9C1D9" stroke={INK} strokeWidth={5} />
          ))}
        </g>
        {/* main world */}
        <g transform={`${camTransform(cam, 1)} translate(${sh} ${sh * 0.6})`}>
          <rect x={-2000} y={BASE_Y} width={5000} height={2000} fill="#8FD18F" stroke={INK} strokeWidth={SW} />
          <Wind t={t} />
          <Tower t={t} thetaRad={thetaRad} psi={psi} impacts={impactsB} />
          {/* puffs, in world space above the damper that was hit */}
          {clusters.map((c) => {
            // damper world position from tower tilt at that moment (approx. at current tilt)
            const lx = c.side * 96;
            const ly = -870;
            const a = thetaRad;
            const wx = BASE_X + SC * (lx * Math.cos(a) - ly * Math.sin(a));
            const wy = BASE_Y + SC * (lx * Math.sin(a) + ly * Math.cos(a));
            return <Cluster key={c.key} cx={wx} cy={wy - 60} seed={c.seed} age={c.age} fill={c.fill} hot={c.hot} />;
          })}
          <Hero t={t} />
        </g>
        {/* weight tag (screen space) */}
        <g transform={`translate(540 300) scale(${tagK * 1.0})`} opacity={tagK > 0.01 ? 1 : 0}>
          <rect x={-170} y={-50} width={340} height={100} rx={26} fill="#FFD84A" stroke={INK} strokeWidth={8} />
          <text x={0} y={24} textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight={900} fontSize={66} fill={INK}>
            660 tons
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
