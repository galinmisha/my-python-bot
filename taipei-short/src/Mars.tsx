import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {buildChunks} from './captions';
import {Captions, clamp, eio, lerp, pop, rnd, seg} from './Scene';

export const MFPS = 60;
export const MDUR = 24.6;
const INK = '#111';
const SW = 8;
const HORIZON = 1000;

// Phrase boundaries measured from the real voice take (ffmpeg silencedetect); word times inside a phrase are estimated.
const PH = [
  {t0: 0, t1: 2.03, text: 'What color is a sunset on Mars?'},
  {t0: 2.55, t1: 2.91, text: 'Blue.'},
  {t0: 3.49, t1: 4.03, text: 'On Earth,'},
  {t0: 4.28, t1: 5.53, text: 'sunsets turn red,'},
  {t0: 5.75, t1: 7.76, text: 'because air scatters the blue light away.'},
  {t0: 8.39, t1: 9.87, text: 'Mars has very little air,'},
  {t0: 10.16, t1: 12.26, text: 'but its sky is full of fine dust.'},
  {t0: 12.78, t1: 15.78, text: 'That dust is the right size to send blue light forward,'},
  {t0: 15.98, t1: 16.45, text: 'toward you,'},
  {t0: 16.82, t1: 19.07, text: 'so the glow around the setting Sun looks blue.'},
  {t0: 19.66, t1: 20.64, text: 'In the daytime,'},
  {t0: 20.84, t1: 23.21, text: 'though, the Martian sky is more of a butterscotch.'},
];
const CH = buildChunks(PH);

export const TM = {
  bluePulse: 2.55,
  panelIn: 3.45,
  earthRed: 4.3,
  scatter: 6.3,
  flip0: 8.15,
  flip1: 8.6,
  fewAir: 8.8,
  dust0: 10.3,
  ray0: 12.9,
  hit: 13.8,
  forward: 14.6,
  panelOut: 16.7,
  glowPulse: 18.35,
  rise0: 19.7,
  rise1: 21.6,
  candy: 22.0,
  set0: 23.0,
};

const ss = (a: number, b: number, t: number) => {
  const u = clamp((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const mixc = (a: string, b: string, u: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * u)).join(',')})`;
};
const springK = (t: number, t0: number) => {
  const d = t - t0;
  return d <= 0 ? 0 : 1 - Math.exp(-7 * d) * Math.cos(15 * d);
};

// ---------- small shapes ----------
const Streak: React.FC<{x1: number; y1: number; x2: number; y2: number; color: string; w?: number}> = ({x1, y1, x2, y2, color, w = 12}) => (
  <g>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={w + 8} strokeLinecap="round" />
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeLinecap="round" />
  </g>
);

const Eye: React.FC<{x: number; y: number; k?: number}> = ({x, y, k = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <ellipse rx={44} ry={56} fill="#fff" stroke={INK} strokeWidth={7} />
    <circle cx={-10} cy={0} r={22} fill={INK} />
    <circle cx={-16} cy={-8} r={7} fill="#fff" />
  </g>
);

const Rover: React.FC<{t: number; hop: number; lookX: number; lookY: number}> = ({t, hop, lookX, lookY}) => {
  const blink = [1.5, 8.8, 14.0, 21.5].some((b) => t > b && t < b + 0.12);
  const bob = Math.sin((2 * Math.PI * 14 * t) / MDUR) * 3;
  return (
    <g transform={`translate(290 ${1190 - hop + bob})`}>
      <ellipse cx={0} cy={26} rx={190} ry={16} fill="rgba(60,30,20,0.3)" />
      {/* body */}
      <rect x={-130} y={-70} width={260} height={84} rx={22} fill="#E6E9EE" stroke={INK} strokeWidth={SW} />
      <rect x={-130} y={-30} width={260} height={44} rx={16} fill="#C9CED6" />
      <rect x={-130} y={-70} width={260} height={84} rx={22} fill="none" stroke={INK} strokeWidth={SW} />
      <rect x={-96} y={-96} width={90} height={30} rx={6} fill="#3B4A6B" stroke={INK} strokeWidth={6} />
      <line x1={-86} y1={-92} x2={-12} y2={-70} stroke="#6E86B8" strokeWidth={4} />
      {/* wheels */}
      {[-96, 0, 96].map((x) => (
        <g key={x} transform={`translate(${x} 10)`}>
          <circle r={38} fill="#444" stroke={INK} strokeWidth={SW} />
          <circle r={14} fill="#B8BDC7" stroke={INK} strokeWidth={5} />
        </g>
      ))}
      {/* mast + head */}
      <rect x={62} y={-190} width={18} height={124} fill="#C9CED6" stroke={INK} strokeWidth={6} />
      <g transform="translate(70 -214)">
        <circle r={62} fill="#E6E9EE" stroke={INK} strokeWidth={SW} />
        {blink ? (
          <path d="M -30 -4 Q -14 4 2 -4 M 14 -4 Q 30 4 46 -4" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        ) : (
          <g>
            <ellipse cx={-18} cy={-6} rx={18} ry={22} fill="#fff" stroke={INK} strokeWidth={5} />
            <ellipse cx={26} cy={-6} rx={18} ry={22} fill="#fff" stroke={INK} strokeWidth={5} />
            <circle cx={-18 + lookX * 7} cy={-6 + lookY * 8} r={8} fill={INK} />
            <circle cx={26 + lookX * 7} cy={-6 + lookY * 8} r={8} fill={INK} />
          </g>
        )}
        <path d="M -20 30 Q 4 40 28 30" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      </g>
    </g>
  );
};

// ---------- diagram panel ----------
const Panel: React.FC<{t: number}> = ({t}) => {
  const k = springK(t, TM.panelIn) * (1 - ss(TM.panelOut, TM.panelOut + 0.35, t));
  if (k < 0.01) return null;
  // squash-swap between Earth and Mars
  const flip = eio(seg(t, TM.flip0, TM.flip1));
  const sx = Math.abs(1 - 2 * flip) * 0.92 + 0.08;
  const isMars = flip >= 0.5;
  const W2 = 800;
  const H2 = 600;
  const sunX = -300;
  const eyeX = 300;
  const bg = isMars ? '#E8A566' : '#8FD0FF';
  const sunFill = isMars ? '#fff' : mixc('#FFFFFF', '#FF6A3D', ss(TM.earthRed, TM.earthRed + 0.6, t));
  const label = isMars ? 'MARS' : 'EARTH';

  const parts: React.ReactNode[] = [];
  if (!isMars) {
    // lots of air molecules
    for (let i = 0; i < 46; i++) {
      const x = -330 + rnd(i) * 660 + Math.sin(t * 1.3 + i) * 6;
      const y = -230 + rnd(i + 99) * 400 + Math.cos(t * 1.1 + i * 2) * 6;
      parts.push(<circle key={'a' + i} cx={x} cy={y} r={7} fill="#D9F1FF" stroke={INK} strokeWidth={3} />);
    }
    // ray: white -> orange/red as blue is scattered away
    const u = seg(t, TM.earthRed + 0.2, TM.earthRed + 1.2);
    const sc = ss(TM.scatter, TM.scatter + 1.5, t);
    const ex = lerp(sunX + 50, eyeX - 70, u);
    parts.push(<Streak key="ray" x1={sunX + 50} y1={0} x2={ex} y2={0} color={mixc('#FFFFFF', '#FF5A2E', sc)} w={16} />);
    // blue light scattered away
    if (t > TM.scatter) {
      for (let i = 0; i < 9; i++) {
        const tau = t - TM.scatter - i * 0.12;
        if (tau < 0 || tau > 1.6) continue;
        const px = -180 + rnd(i + 5) * 380;
        const ang = (rnd(i + 17) > 0.5 ? -1 : 1) * (0.6 + rnd(i + 3) * 0.9);
        const dx = Math.sin(ang) * 260 * tau;
        const dy = -Math.cos(ang) * 260 * tau * (rnd(i + 8) > 0.5 ? 1 : -1);
        const s = Math.sin(Math.PI * clamp(tau / 1.6));
        parts.push(<Streak key={'b' + i} x1={px + dx} y1={dy} x2={px + dx + 34 * s} y2={dy + 12 * s} color="#3F7BFF" w={11} />);
      }
    }
  } else {
    // thin air: only a few molecules
    for (let i = 0; i < 6; i++) {
      const o = springK(t, TM.fewAir + i * 0.08);
      parts.push(<circle key={'a' + i} cx={-280 + rnd(i + 40) * 560} cy={-200 + rnd(i + 70) * 330} r={7 * o} fill="#FBE3C8" stroke={INK} strokeWidth={3} />);
    }
    // dust fills the sky
    const dustN = Math.round(34 * ss(TM.dust0, TM.dust0 + 1.2, t));
    const specks: number[][] = [];
    for (let i = 0; i < 34; i++) {
      const x = -250 + rnd(i + 200) * 500;
      const y = -230 + rnd(i + 300) * 440;
      if (i < dustN) specks.push([x + Math.sin(t * 0.9 + i) * 8, y + Math.cos(t * 0.8 + i * 1.7) * 8, 6 + rnd(i + 11) * 7]);
    }
    specks.forEach((s, i) => parts.push(
      <g key={'d' + i}>
        <circle cx={s[0]} cy={s[1]} r={s[2] + 3} fill={INK} />
        <circle cx={s[0]} cy={s[1]} r={s[2]} fill="#9C5A33" />
      </g>,
    ));
    // ray hits one speck; blue goes forward to the eye, red bounces away
    const hitX = -20;
    const hitY = 0;
    const u1 = seg(t, TM.ray0, TM.hit);
    if (t >= TM.ray0) {
      parts.push(<Streak key="ray1" x1={sunX + 50} y1={0} x2={lerp(sunX + 50, hitX - 24, u1)} y2={0} color="#fff" w={16} />);
      parts.push(
        <g key="hit">
          <circle cx={hitX} cy={hitY} r={30} fill={INK} />
          <circle cx={hitX} cy={hitY} r={24} fill="#9C5A33" />
        </g>,
      );
    }
    if (t >= TM.hit) {
      const u2 = ss(TM.forward - 0.3, TM.forward + 0.7, t);
      parts.push(<Streak key="blue" x1={hitX + 30} y1={hitY - 4 * u2} x2={lerp(hitX + 30, eyeX - 80, u2)} y2={lerp(hitY - 4, -10, u2)} color="#3F7BFF" w={16} />);
      // red/orange light bounces off sideways
      for (let i = 0; i < 4; i++) {
        const tau = t - TM.hit - i * 0.1;
        if (tau < 0 || tau > 1.4) continue;
        const a = [-2.2, 2.2, -1.7, 1.7][i];
        const sp = 250 * tau;
        parts.push(<Streak key={'r' + i} x1={hitX + Math.cos(a) * sp} y1={hitY + Math.sin(a) * sp} x2={hitX + Math.cos(a) * (sp + 36)} y2={hitY + Math.sin(a) * (sp + 36)} color="#FF5A2E" w={10} />);
      }
    }
  }

  return (
    <g transform={`translate(540 600) scale(${k * sx} ${k})`}>
      <rect x={-W2 / 2} y={-H2 / 2} width={W2} height={H2} rx={44} fill={bg} stroke={INK} strokeWidth={12} />
      <clipPath id="pclip">
        <rect x={-W2 / 2 + 6} y={-H2 / 2 + 6} width={W2 - 12} height={H2 - 12} rx={38} />
      </clipPath>
      <g clipPath="url(#pclip)">
        <rect x={-W2 / 2} y={170} width={W2} height={130} fill={isMars ? '#B5603A' : '#4FA86B'} />
        <line x1={-W2 / 2} y1={170} x2={W2 / 2} y2={170} stroke={INK} strokeWidth={8} />
        {parts}
        {/* the sun */}
        <circle cx={sunX} cy={0} r={52} fill={sunFill} stroke={INK} strokeWidth={SW} />
        {/* the observer's eye */}
        <Eye x={eyeX} y={0} k={0.9} />
      </g>
      <rect x={-W2 / 2 + 24} y={-H2 / 2 + 22} width={188} height={64} rx={20} fill="#FFD84A" stroke={INK} strokeWidth={7} />
      <text x={-W2 / 2 + 118} y={-H2 / 2 + 68} textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight={900} fontSize={40} fill={INK}>
        {label}
      </text>
    </g>
  );
};

export const Mars: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / MFPS;

  const lift = ss(TM.rise0, TM.rise1, t) * (1 - ss(TM.set0, MDUR - 0.1, t));
  const sunX = 710;
  const sunY = lerp(962, 430, lift);
  const halo = (1 - lift) * (1 + 0.18 * Math.exp(-4 * Math.max(0, t - TM.bluePulse)) * (t > TM.bluePulse && t < TM.bluePulse + 1.5 ? 1 : 0) + 0.2 * Math.exp(-4 * Math.max(0, t - TM.glowPulse)) * (t > TM.glowPulse && t < TM.glowPulse + 1.5 ? 1 : 0));
  const skyTop = mixc('#D98B4E', '#EDB063', lift);
  const skyLow = mixc('#F2BE82', '#F7CC8E', lift);
  const rings: [number, string][] = [[420, '#9BC4F5'], [310, '#78A9EE'], [210, '#5A91E4']];

  // rover reacts when the narrator says "looks blue"
  const hopD = t - TM.glowPulse;
  const hop = hopD > 0 && hopD < 0.6 ? Math.abs(Math.sin(hopD * 5.2)) * 46 * Math.exp(-2.2 * hopD) : 0;
  const lookX = 0.8;
  const lookY = lerp(-0.2, -0.8, lift);

  const candyK = springK(t, TM.candy) * (1 - ss(TM.set0 - 0.3, TM.set0 + 0.2, t));

  return (
    <AbsoluteFill style={{background: skyTop}}>
      <Audio src={staticFile('mars/vo/take1.mp3')} />
      <Audio src={staticFile('mars/sfx.wav')} volume={0.6} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="msky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyLow} />
          </linearGradient>
          <clipPath id="aboveGround">
            <rect x={0} y={0} width={1080} height={HORIZON} />
          </clipPath>
        </defs>
        <rect width={1080} height={1920} fill="url(#msky)" />
        {/* blue glow around the sun (flat rings, clipped at the horizon) */}
        <g clipPath="url(#aboveGround)">
          {rings.map(([r, c], i) => (
            <circle key={i} cx={sunX} cy={sunY} r={r * Math.max(0, halo)} fill={c} />
          ))}
          <circle cx={sunX} cy={sunY} r={56} fill="#fff" stroke={INK} strokeWidth={SW} />
        </g>
        {/* ground */}
        <path d={`M 0 ${HORIZON} Q 260 ${HORIZON - 30} 520 ${HORIZON - 8} T 1080 ${HORIZON - 20} L 1080 1920 L 0 1920 Z`} fill="#B5603A" stroke={INK} strokeWidth={SW} />
        <path d={`M 0 1230 Q 300 1190 600 1230 T 1080 1210 L 1080 1920 L 0 1920 Z`} fill="#A5542F" />
        {[[640, 1090, 46], [820, 1130, 30], [930, 1075, 38], [150, 1110, 26]].map((r, i) => (
          <ellipse key={i} cx={r[0]} cy={r[1]} rx={r[2] * 1.4} ry={r[2]} fill="#8E4528" stroke={INK} strokeWidth={6} />
        ))}
        <Rover t={t} hop={hop} lookX={lookX} lookY={lookY} />
        {/* the butterscotch gag */}
        {candyK > 0.01 ? (
          <g transform={`translate(300 640) scale(${candyK}) rotate(${Math.sin(t * 3) * 6})`}>
            <path d="M -86 0 L -128 -34 L -128 34 Z M 86 0 L 128 -34 L 128 34 Z" fill="#FFD84A" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
            <circle r={72} fill="#E39A2B" stroke={INK} strokeWidth={SW} />
            <path d="M -40 -30 Q 0 -60 40 -30 M -52 6 Q 0 -30 52 6 M -40 44 Q 0 12 40 44" fill="none" stroke="#FFD27A" strokeWidth={10} strokeLinecap="round" />
          </g>
        ) : null}
        <Panel t={t} />
        <Captions t={t} data={CH} />
      </svg>
    </AbsoluteFill>
  );
};
