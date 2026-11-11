export const FPS = 60;
export const W = 1080;
export const H = 1920;
export const DUR = 22.6; // seconds (voice end + ~0.5 s once the real voice is in)
export const HAS_VO = false; // flip to true once public/taipei/vo/take1.mp3 exists

// Beat times in seconds. ESTIMATED from word count (~2.6 words/s) until a real voice take is measured.
export const T = {
  q0: 0.1, // "So why does Taipei 101 ..."
  zoomIn0: 4.1,
  zoomIn1: 5.7,
  tag: 5.3, // "660-ton"
  eyes: 6.7, // "pendulum"
  windOn: 8.3, // "When wind pushes"
  windFull: 9.8,
  windOff: 13.0,
  heat0: 13.9, // "That swing soaks up"
  smug: 19.0,
  zoomOut0: 18.2,
  zoomOut1: 20.3,
};
