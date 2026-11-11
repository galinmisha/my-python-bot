# Taipei 101 pendulum Short (code-only Remotion animation)

Vertical 1080x1920 @ 60 fps cartoon Short, drawn entirely in SVG/React (no AI pictures).

- `src/Scene.tsx` drawing + camera, `src/sim.ts` pendulum physics, `src/config.ts` beat times + `HAS_VO` switch
- `tools/sfx.py` builds `public/taipei/sfx.wav` from `tools/impacts.json` (run `npx tsx tools/impacts.ts` first)
- Voice: `public/taipei/vo/take1.mp3` (ElevenLabs "Jerry B.", eleven_v4, 21.3 s). Beat times in `src/config.ts` were measured from it with ffmpeg silencedetect. Loudness-normalise the render with `ffmpeg -i in.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=7 out.mp4`.

```bash
npm install
npm run studio
npx remotion render src/index.ts Taipei out/taipei-4K.mp4 --scale=2 --concurrency=4 --crf=16 --pixel-format=yuv420p
```
(In a container without a bundled browser add `--browser-executable=/opt/pw-browsers/chromium --chrome-mode=chrome-for-testing`.)

Narration (60 words): "So why does Taipei 101 have a giant steel ball hanging inside it? Basically, it's a 660-ton pendulum, hung near the top. When wind pushes the tower one way, the ball lags behind and swings the other way. That swing soaks up the energy and turns it into heat. It doesn't stop the tower moving, it just calms the sway."
