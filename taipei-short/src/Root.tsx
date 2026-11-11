import React from 'react';
import {Composition} from 'remotion';
import {Scene} from './Scene';
import {Wombats, WDUR, WFPS} from './Wombat';
import {DUR, FPS, H, W} from './config';

export const Root: React.FC = () => (
  <>
  <Composition id="Taipei" component={Scene} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={W} height={H} />
  <Composition id="Wombat" component={Wombats} durationInFrames={Math.round(WDUR * WFPS)} fps={WFPS} width={W} height={H} />
  </>
);
