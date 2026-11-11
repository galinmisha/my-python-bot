export const FPS = 60;
export const W = 1080;
export const H = 1920;
export const DUR = 22.0; // voice ends 21.08 s, plus a short hold so the last frame loops to frame 0
export const HAS_VO = true; // public/taipei/vo/take1.mp3 (ElevenLabs, Jerry B., eleven_v4)

// Beat times in seconds, measured from the real voice take with ffmpeg silencedetect:
// S1 0-4.35 | S2 "Basically," 4.98-5.53, "it's a 660-ton pendulum," 5.69-7.81, "hung near the top." 8.06-8.84
// S3 "When wind pushes the tower one way," 9.48-11.32, "the ball lags behind and swings the other way." 11.60-13.96
// S4 14.50-17.47 | S5 17.98-19.51 "...moving," 19.77-21.08 "it just calms the sway."
export const T = {
  zoomIn0: 4.5,
  zoomIn1: 6.0,
  tag: 6.05, // "660-ton"
  eyes: 6.9, // "pendulum"
  windOn: 9.7, // "When wind pushes"
  windFull: 11.1,
  windOff: 14.0,
  heat0: 14.5, // "That swing soaks up"
  calm0: 19.0,
  zoomOut0: 19.0,
  zoomOut1: 21.0,
  smug: 19.8, // "it just calms the sway"
};
