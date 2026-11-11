import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {buildChunks} from './captions';
import {Captions, clamp, eio, lerp, pop, seg} from './Scene';
import {ANG, BALL_R, CA, CUBE, CUBE_END, PILE_O, ROCK_X1, SA, SURF, TW, ballState, cubeFlight, rot} from './wombatPhys';

export const WFPS = 60;
export const WDUR = 23.2;
const INK = '#111';
const SW = 8;
const SHIFT = -280; // whole scene is lifted so captions sit below the rock

// Phrase boundaries measured from the real voice take (ffmpeg silencedetect); word times inside a phrase are estimated.
const PH = [
  {t0: 0, t1: 2.1, text: 'Why do wombats poop cubes?'},
  {t0: 2.5, t1: 3.25, text: 'Not blobs,'},
  {t0: 3.48, t1: 4.92, text: 'actual little cubes.'},
  {t0: 5.48, t1: 7.74, text: "Their intestine isn't the same all the way along."},
  {t0: 8.23, t1: 10.43, text: 'Some parts are stiff, and some stretch.'},
  {t0: 10.99, t1: 12.19, text: 'As the poop moves through,'},
  {t0: 12.44, t1: 15.13, text: 'the stiff parts squeeze faster than the soft parts,'},
  {t0: 15.4, t1: 16.79, text: 'and that pinches in the corners.'},
  {t0: 17.22, t1: 18.49, text: "By the end, it's a cube."},
  {t0: 19.02, t1: 22.16, text: 'That probably helps it stay put on a rock instead of rolling off.'},
];
const CH = buildChunks(PH);

const T2 = {
  blobIn: 2.55,
  jig: [3.55, 3.95, 4.35],
  xray0: 5.5,
  xray1: 6.2,
  stiffTag: 8.7,
  softTag: 9.7,
  blobTravel0: 10.99,
  lensIn: 12.4,
  squeeze0: 12.7,
  squeeze1: 13.9,
  slow1: 15.2,
  sparkle: 15.45,
  lensOut: 17.7,
  xrayOff0: 17.9,
  xrayOff1: 18.6,
  smug: 19.2,
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

// ---- camera ----
const cam = (t: number) => {
  const open = 1 - eio(seg(t, 0.15, 1.6));
  const xr = eio(seg(t, T2.xray0, 6.4)) * (1 - eio(seg(t, 17.6, 18.8)));
  const endPush = eio(seg(t, 22.0, WDUR));
  let ls = Math.log(1);
  let cx = 540;
  let cy = 960;
  if (t < T2.xray0) {
    ls = Math.log(1.35) * open;
    cx = lerp(540, 520, open);
    cy = lerp(960, 1010, open);
  } else {
    ls = Math.log(1.45) * xr + Math.log(1.35) * endPush;
    cx = lerp(540, 470, xr);
    cy = lerp(960, 860, xr);
    if (t > 20) {
      cx = lerp(540, 520, endPush);
      cy = lerp(960, 1010, endPush);
    }
  }
  return {s: Math.exp(ls), cx, cy};
};

// ---- drawing helpers ----
const CubeShape: React.FC<{x?: number; y?: number; sc?: number; rotDeg?: number; glow?: number}> = ({x = 0, y = 0, sc = 1, rotDeg = 0, glow = 0}) => {
  const s = CUBE;
  const d = 22;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotDeg}) scale(${sc})`}>
      <rect x={0} y={-s} width={s} height={s} fill={mixc('#8A5A33', '#C28A52', glow)} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M 0 ${-s} L ${d} ${-s - d} L ${s + d} ${-s - d} L ${s} ${-s} Z`} fill={mixc('#A87449', '#E0A96B', glow)} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M ${s} ${-s} L ${s + d} ${-s - d} L ${s + d} ${-d} L ${s} 0 Z`} fill="#6B4325" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
    </g>
  );
};

const bez = (p0: number[], c1: number[], c2: number[], p1: number[], u: number) => {
  const m = 1 - u;
  return [
    m * m * m * p0[0] + 3 * m * m * u * c1[0] + 3 * m * u * u * c2[0] + u * u * u * p1[0],
    m * m * m * p0[1] + 3 * m * m * u * c1[1] + 3 * m * u * u * c2[1] + u * u * u * p1[1],
  ];
};
const SEGS: number[][][] = [
  [[600, 905], [540, 860], [455, 900], [520, 940]],
  [[520, 940], [590, 975], [590, 1010], [515, 1010]],
  [[515, 1010], [450, 1025], [390, 935], [335, 1000]],
  [[335, 1000], [300, 1040], [265, 985], [235, 962]],
];
const GUT: number[][] = [];
for (const sg of SEGS) for (let i = 0; i < 24; i++) GUT.push(bez(sg[0], sg[1], sg[2], sg[3], i / 24));
GUT.push([235, 962]);
const gutAt = (u: number) => {
  const f = clamp(u) * (GUT.length - 1);
  const i = Math.min(GUT.length - 2, Math.floor(f));
  const k = f - i;
  return [lerp(GUT[i][0], GUT[i + 1][0], k), lerp(GUT[i][1], GUT[i + 1][1], k)];
};
const GUT_D = 'M ' + GUT.map((p) => p.join(' ')).join(' L ');

const Rock: React.FC = () => (
  <g>
    <path d={`M 200 1560 L 232 1370 Q 252 1330 330 1335 L ${ROCK_X1} ${SURF(ROCK_X1)} Q 860 1450 880 1500 L 900 1560 Z`} fill="#AEB3BC" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
    <path d={`M 560 1385 L ${ROCK_X1} ${SURF(ROCK_X1)} Q 860 1450 880 1500 L 900 1560 L 640 1560 Z`} fill="#979CA6" />
    <path d={`M 200 1560 L 232 1370 Q 252 1330 330 1335 L ${ROCK_X1} ${SURF(ROCK_X1)} Q 860 1450 880 1500 L 900 1560 Z`} fill="none" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
    <path d="M 300 1480 Q 340 1450 380 1480" fill="none" stroke="#8A8F99" strokeWidth={6} strokeLinecap="round" />
    <path d="M 700 1520 Q 740 1495 775 1520" fill="none" stroke="#8A8F99" strokeWidth={6} strokeLinecap="round" />
  </g>
);

const Wombat: React.FC<{t: number}> = ({t}) => {
  const xr = ss(T2.xray0, T2.xray1, t) * (1 - ss(T2.xrayOff0, T2.xrayOff1, t));
  const breathe = 1 + 0.008 * Math.sin((2 * Math.PI * 14 * t) / WDUR);
  const no = t > 2.5 && t < 3.3 ? Math.sin((t - 2.5) * 22) * 9 * Math.sin(Math.PI * seg(t, 2.5, 3.3)) : 0; // head shake "no"
  const smile = (t > 3.5 && t < 5.0) || t > T2.smug;
  const blink = [1.0, 6.9, 13.2, 21.0].some((b) => t > b && t < b + 0.12);
  const lookY = t > T2.xray0 && t < 17.7 ? 0.3 : 0;
  const body = '#9A7452';
  const op = 1 - 0.7 * xr;
  return (
    <g transform={`translate(0 ${0}) scale(${breathe} ${breathe})`} style={{transformOrigin: '470px 1090px'}}>
      <ellipse cx={470} cy={1098} rx={300} ry={16} fill="rgba(70,50,30,0.22)" />
      {/* legs */}
      {[345, 430, 565, 650].map((x, i) => (
        <rect key={x} x={x - 32} y={1010} width={64} height={80} rx={26} fill={i % 2 ? '#7E5C3E' : body} stroke={INK} strokeWidth={SW} opacity={lerp(1, 0.45, xr)} />
      ))}
      {/* body */}
      <ellipse cx={470} cy={930} rx={250} ry={150} fill={body} stroke={INK} strokeWidth={SW} fillOpacity={op} />
      <path d="M 300 1040 Q 470 1090 640 1030 Q 560 1075 470 1075 Q 380 1075 300 1040 Z" fill="#B89874" fillOpacity={op} />
      <ellipse cx={470} cy={930} rx={250} ry={150} fill="none" stroke={INK} strokeWidth={SW} />
      {/* x-ray: intestine */}
      {xr > 0.01 ? (
        <g opacity={xr}>
          <path d={GUT_D} fill="none" stroke={INK} strokeWidth={52} strokeLinejoin="round" strokeLinecap="round" />
          <path d={GUT_D} fill="none" stroke="#FFA8B8" strokeWidth={36} strokeLinejoin="round" strokeLinecap="round" />
          <path d={GUT_D} pathLength={100} fill="none" stroke={INK} strokeWidth={60} strokeDasharray="12 14" strokeDashoffset={-3} />
          <path d={GUT_D} pathLength={100} fill="none" stroke="#C2334D" strokeWidth={50} strokeDasharray="12 14" strokeDashoffset={-3} />
        </g>
      ) : null}
      {/* head */}
      <g transform={`rotate(${no} 700 960)`}>
        <ellipse cx={725} cy={945} rx={140} ry={115} fill={body} stroke={INK} strokeWidth={SW} />
        <ellipse cx={690} cy={835} rx={34} ry={30} fill="#7E5C3E" stroke={INK} strokeWidth={SW} />
        <ellipse cx={842} cy={985} rx={44} ry={32} fill="#3A2A22" stroke={INK} strokeWidth={SW} />
        <ellipse cx={832} cy={975} rx={14} ry={8} fill="#7A6A60" />
        {blink ? (
          <path d="M 770 930 Q 788 938 806 930" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
        ) : (
          <g>
            <ellipse cx={790} cy={925} rx={16} ry={21} fill="#fff" stroke={INK} strokeWidth={5} />
            <circle cx={796} cy={925 + lookY * 6} r={9} fill={INK} />
            <circle cx={799} cy={921 + lookY * 6} r={3} fill="#fff" />
          </g>
        )}
        <path d={t > T2.smug ? 'M 766 892 Q 790 876 814 890' : 'M 766 888 Q 790 874 814 884'} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
        {smile ? <path d="M 800 1012 Q 836 1036 866 1008" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" /> : null}
      </g>
    </g>
  );
};

const Cross: React.FC<{t: number}> = ({t}) => {
  // cross-section of the intestine: stiff pads (dark red) squeeze faster than the soft parts (pink)
  const e1 = eio(seg(t, T2.squeeze0, T2.squeeze1));
  const e2 = eio(seg(t, T2.squeeze0 + 0.6, T2.slow1));
  const R0 = 168;
  const rAt = (phi: number) => {
    const w = Math.pow(Math.cos(2 * phi), 2);
    return R0 - 46 * w * e1 + 16 * (1 - w) * e2;
  };
  const pts = (off: number) => Array.from({length: 96}, (_, i) => {
    const phi = (i / 96) * Math.PI * 2;
    const r = rAt(phi) + off;
    return [Math.cos(phi) * r, Math.sin(phi) * r];
  });
  const poly = (ps: number[][]) => 'M ' + ps.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L ') + ' Z';
  const wall = pts(30);
  const inner = pts(0);
  const padSegs: string[] = [];
  const centres = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (const c of centres) {
    const seg2 = Array.from({length: 13}, (_, i) => {
      const phi = c - 0.4 + (i / 12) * 0.8;
      const r = rAt(phi) + 30;
      return [Math.cos(phi) * r, Math.sin(phi) * r];
    });
    padSegs.push('M ' + seg2.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L '));
  }
  const arrows = e1 > 0.02 && e1 < 0.98;
  return (
    <g>
      <path d={poly(wall)} fill="none" stroke={INK} strokeWidth={62} strokeLinejoin="round" />
      <path d={poly(wall)} fill="none" stroke="#FFA8B8" strokeWidth={46} strokeLinejoin="round" />
      {padSegs.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={INK} strokeWidth={76} strokeLinecap="butt" />
          <path d={d} fill="none" stroke="#C2334D" strokeWidth={60} strokeLinecap="butt" />
        </g>
      ))}
      <path d={poly(inner)} fill="#8A5A33" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      <path d={poly(inner.map((p) => [p[0] * 0.55 - 10, p[1] * 0.55 - 14]))} fill="#A87449" opacity={0.55} />
      {arrows
        ? centres.map((c, i) => {
            const rr = R0 + 120 - e1 * 40;
            const x = Math.cos(c) * rr;
            const y = Math.sin(c) * rr;
            return <path key={i} d="M -16 -18 L 8 0 L -16 18" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${x} ${y}) rotate(${(c * 180) / Math.PI + 180})`} />;
          })
        : null}
      {/* sparkles on the corners */}
      {t > T2.sparkle && t < T2.lensOut
        ? [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((a, i) => {
            const k = pop(t, T2.sparkle + i * 0.08);
            const r = rAt(a) + 8;
            return (
              <g key={i} transform={`translate(${Math.cos(a) * r} ${Math.sin(a) * r}) scale(${k * 1.0})`}>
                <path d="M 0 -26 L 7 -7 L 26 0 L 7 7 L 0 26 L -7 7 L -26 0 L -7 -7 Z" fill="#FFD84A" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
              </g>
            );
          })
        : null}
    </g>
  );
};

const Label: React.FC<{x: number; y: number; k: number; text: string; fill: string; color?: string}> = ({x, y, k, text, fill, color = '#fff'}) => (
  <g transform={`translate(${x} ${y}) scale(${k})`} opacity={k > 0.01 ? 1 : 0}>
    <rect x={-95} y={-32} width={190} height={64} rx={20} fill={fill} stroke={INK} strokeWidth={7} />
    <text x={0} y={17} textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight={900} fontSize={42} fill={color} stroke={INK} strokeWidth={0}>
      {text}
    </text>
  </g>
);

export const Wombats: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / WFPS;
  const c = cam(t);
  const xr = ss(T2.xray0, T2.xray1, t) * (1 - ss(T2.xrayOff0, T2.xrayOff1, t));
  const cf = cubeFlight(t);
  const ball = ballState(t);

  // pile cubes (local coords on the slope): [x0, y0]
  const pile: [number, number][] = [[0, 0], [96, 0], [0, -CUBE - 22 + 22]];
  const jigk = (i: number) => {
    const d = t - T2.jig[i];
    return d > 0 && d < 0.5 ? 1 + 0.22 * Math.exp(-7 * d) * Math.cos(26 * d) : 1;
  };

  // pooped cube landing squash
  const landD = t - TW.cubeLand;
  const landSq = landD > 0 && landD < 0.5 ? 0.18 * Math.exp(-8 * landD) * Math.cos(30 * landD) : 0;

  // blob "no" gag
  const blobK = pop(t, T2.blobIn) * (1 - ss(3.2, 3.45, t));
  const blobShake = Math.sin(t * 40) * 4 * (1 - ss(3.0, 3.3, t));

  // moving poop inside the gut while the narrator says "moves through"
  const travel = ss(T2.blobTravel0, 12.2, t) * 0.55 + 0.0;
  const gutBlob = gutAt(clamp(travel + ss(12.2, 17.5, t) * 0.45));

  const lensK = pop(t, T2.lensIn) * (1 - ss(T2.lensOut, T2.lensOut + 0.35, t));
  const stiffK = pop(t, T2.stiffTag) * (1 - ss(10.4, 10.7, t));
  const softK = pop(t, T2.softTag) * (1 - ss(10.4, 10.7, t));

  // glow on the pooped cube
  const camTf = `translate(540 960) scale(${c.s}) translate(${-c.cx} ${-c.cy})`;

  return (
    <AbsoluteFill style={{background: '#FFE9B8'}}>
      <Audio src={staticFile('wombat/vo/take1.mp3')} />
      <Audio src={staticFile('wombat/sfx.wav')} volume={0.6} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="wsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD28A" />
            <stop offset="1" stopColor="#FFF1CF" />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#wsky)" />
        <g transform={camTf}>
          <g transform={`translate(0 ${SHIFT})`}>
            {/* distant hills */}
            <path d="M -400 1100 Q -100 960 220 1060 Q 480 1140 760 1030 Q 1000 940 1500 1090 L 1500 1200 L -400 1200 Z" fill="#E7B574" stroke={INK} strokeWidth={6} />
            {/* ground */}
            <rect x={-1000} y={1090} width={4000} height={1200} fill="#D9A86C" stroke={INK} strokeWidth={SW} />
            <rect x={-1000} y={1560} width={4000} height={800} fill="#CF9A5C" />
            <line x1={-1000} y1={1560} x2={3000} y2={1560} stroke={INK} strokeWidth={5} opacity={0.35} />
            <Wombat t={t} />
            <Rock />
            {/* cube pile on the slope */}
            <g transform={`translate(${PILE_O.x} ${PILE_O.y}) rotate(${(ANG * 180) / Math.PI})`}>
              {pile.map(([x0, y0], i) => (
                <CubeShape key={i} x={x0 + CUBE / 2} y={y0} sc={jigk(i)} rotDeg={0} glow={0} />
              ))}
            </g>
            {/* the pooped cube: flies from the rear, lands next to the pile */}
            {cf.state !== 'hidden' ? (
              cf.state === 'flying' ? (
                <g transform={`translate(${cf.x} ${cf.y}) rotate(${(cf.rot * 180) / Math.PI}) scale(${pop(t, TW.cubePop) * 1})`}>
                  <g transform={`translate(${-CUBE / 2 - 11} ${CUBE / 2 + 11})`}>
                    <CubeShape glow={0.25} />
                  </g>
                </g>
              ) : (
                <g transform={`translate(${PILE_O.x} ${PILE_O.y}) rotate(${(ANG * 180) / Math.PI})`}>
                  <g transform={`translate(${192 + CUBE / 2} 0) scale(${1 + landSq} ${1 - landSq})`}>
                    <CubeShape x={-CUBE / 2} />
                  </g>
                </g>
              )
            ) : null}
            {/* the round blob that does NOT get the cube treatment */}
            {blobK > 0.02 ? (
              <g transform={`translate(${620 + blobShake} 1190) scale(${blobK})`}>
                <circle r={58} fill="#8A5A33" stroke={INK} strokeWidth={SW} />
                <path d="M -36 -30 Q -16 -48 6 -38" fill="none" stroke="#C28A52" strokeWidth={8} strokeLinecap="round" />
                <path d="M -80 -80 L 80 80 M 80 -80 L -80 80" stroke={INK} strokeWidth={26} strokeLinecap="round" />
                <path d="M -80 -80 L 80 80 M 80 -80 L -80 80" stroke="#E0343C" strokeWidth={14} strokeLinecap="round" />
              </g>
            ) : null}
            {/* rolling ball */}
            {ball.visible ? (
              <g transform={`translate(${ball.x} ${ball.y}) rotate(${(ball.rot * 180) / Math.PI}) scale(${ball.on && t < TW.ballRoll ? pop(t, TW.ballShow) : 1})`}>
                <circle r={BALL_R} fill="#8A5A33" stroke={INK} strokeWidth={SW} />
                <path d="M -20 -14 Q -6 -28 10 -22" fill="none" stroke="#C28A52" strokeWidth={6} strokeLinecap="round" />
              </g>
            ) : null}
            {/* poop moving through the gut */}
            {xr > 0.3 && t < T2.lensOut ? (
              <circle cx={gutAt(clamp(travel + ss(12.2, 17.5, t) * 0.45))[0]} cy={gutAt(clamp(travel + ss(12.2, 17.5, t) * 0.45))[1]} r={22 * xr} fill="#8A5A33" stroke={INK} strokeWidth={6} />
            ) : null}
            {/* labels on the gut */}
            <Label x={470} y={800} k={stiffK} text="STIFF" fill="#C2334D" />
            <Label x={470} y={1170} k={softK} text="STRETCHY" fill="#FF7D95" />
          </g>
        </g>
        {/* magnifier with the cross-section (screen space) */}
        {lensK > 0.01 ? (
          <g transform={`translate(540 520) scale(${lensK})`}>
            <circle r={330} fill="#FFF6EA" stroke={INK} strokeWidth={12} />
            <circle r={318} fill="none" stroke="#fff" strokeWidth={6} opacity={0.6} />
            <Cross t={t} />
          </g>
        ) : null}
        <Captions t={t} data={CH} />
      </svg>
    </AbsoluteFill>
  );
};
