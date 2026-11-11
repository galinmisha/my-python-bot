// Phrase boundaries measured from the real voice take (ffmpeg silencedetect).
// Word times inside a phrase are ESTIMATED by character count, not measured per word.
export type Word = {w: string; t0: number; t1: number};
export type Chunk = {words: Word[]; t0: number; t1: number};

const PHRASES: {t0: number; t1: number; text: string}[] = [
  {t0: 0.0, t1: 4.35, text: 'So why does Taipei 101 have a giant steel ball hanging inside it?'},
  {t0: 4.98, t1: 5.53, text: 'Basically,'},
  {t0: 5.69, t1: 7.81, text: "it's a 660-ton pendulum,"},
  {t0: 8.06, t1: 8.84, text: 'hung near the top.'},
  {t0: 9.48, t1: 11.32, text: 'When wind pushes the tower one way,'},
  {t0: 11.6, t1: 13.96, text: 'the ball lags behind and swings the other way.'},
  {t0: 14.5, t1: 17.47, text: 'That swing soaks up the energy and turns it into heat.'},
  {t0: 17.98, t1: 19.51, text: "It doesn't stop the tower moving,"},
  {t0: 19.77, t1: 21.08, text: 'it just calms the sway.'},
];

export type Phrase = {t0: number; t1: number; text: string};
export const buildChunks = (PH: Phrase[]): Chunk[] => {
  const out: Chunk[] = [];
  for (const p of PH) {
    const ws = p.text.split(' ');
    const weights = ws.map((w) => w.replace(/[^\w]/g, '').length + 2);
    const total = weights.reduce((a, b) => a + b, 0);
    let t = p.t0;
    const words: Word[] = ws.map((w, i) => {
      const d = ((p.t1 - p.t0) * weights[i]) / total;
      const o = {w, t0: t, t1: t + d};
      t += d;
      return o;
    });
    // groups of at most 3 words, balanced
    const n = Math.ceil(words.length / 3);
    const size = Math.ceil(words.length / n);
    for (let i = 0; i < words.length; i += size) {
      const g = words.slice(i, i + size);
      out.push({words: g, t0: g[0].t0, t1: g[g.length - 1].t1});
    }
  }
  return out;
};
export const chunks: Chunk[] = buildChunks(PHRASES);
