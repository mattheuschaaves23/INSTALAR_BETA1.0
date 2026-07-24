import { describe, expect, it } from 'vitest';
import {
  getLoadingStepDelay,
  LOADING_PROGRESS_MAX,
} from './DecoratingWallLoader';

describe('animação de carregamento da parede', () => {
  it('avança rapidamente no começo e desacelera perto do fim', () => {
    expect(getLoadingStepDelay(1)).toBe(55);
    expect(getLoadingStepDelay(79)).toBe(55);
    expect(getLoadingStepDelay(80)).toBe(120);
    expect(getLoadingStepDelay(94)).toBe(120);
    expect(getLoadingStepDelay(95)).toBe(250);
  });

  it('encerra a sequência visual em 100%', () => {
    expect(LOADING_PROGRESS_MAX).toBe(100);
  });
});
