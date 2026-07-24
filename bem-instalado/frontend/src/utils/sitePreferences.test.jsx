import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_PREFERENCES,
  normalizeSitePreferences,
} from './sitePreferences';

describe('preferências visuais', () => {
  it('mantém o fundo preto como padrão para preferências antigas', () => {
    expect(normalizeSitePreferences({ accentColor: '#e2b42d' })).toMatchObject({
      theme: 'dark',
      density: 'comfortable',
      motion: 'smooth',
    });
  });

  it('aceita e preserva o fundo branco', () => {
    expect(
      normalizeSitePreferences({
        ...DEFAULT_SITE_PREFERENCES,
        theme: 'light',
      })
    ).toMatchObject({
      theme: 'light',
      accentColor: '#e2b42d',
    });
  });

  it('descarta valores de tema inválidos', () => {
    expect(normalizeSitePreferences({ theme: 'automatic' }).theme).toBe('dark');
  });
});
