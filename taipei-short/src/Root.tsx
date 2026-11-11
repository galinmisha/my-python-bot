import React from 'react';
import {Composition} from 'remotion';
import {Scene} from './Scene';
import {DUR, FPS, H, W} from './config';

export const Root: React.FC = () => (
  <Composition id="Taipei" component={Scene} durationInFrames={Math.round(DUR * FPS)} fps={FPS} width={W} height={H} />
);
