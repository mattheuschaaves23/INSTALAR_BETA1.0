import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_PREFERENCES,
  normalizeSitePreferences,
} from './sitePreferences';

describe('preferências visuais', () => {
  it('migra preferências antigas para o fundo branco principal', () => {
    expect(normalizeSitePreferences({ accentColor: '#e2b42d' })).toMatchObject({
      theme: 'light',
      accentColor: '#a86600',
      density: 'comfortable',
      motion: 'smooth',
    });
  });

  it('preserva o fundo preto quando ele foi escolhido na versão atual', () => {
    expect(
      normalizeSitePreferences({
        ...DEFAULT_SITE_PREFERENCES,
        theme: 'dark',
      })
    ).toMatchObject({
      theme: 'dark',
      accentColor: '#a86600',
    });
  });

  it('descarta valores de tema inválidos', () => {
    expect(normalizeSitePreferences({ theme: 'automatic' }).theme).toBe('light');
  });
});
