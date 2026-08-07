import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_PREFERENCES,
  normalizeSitePreferences,
} from './sitePreferences';

describe('preferências visuais', () => {
  it('migra preferências antigas para o fundo branco principal', () => {
    expect(normalizeSitePreferences({ accentColor: '#e2b42d' })).toMatchObject({
      theme: 'light',
      accentColor: '#c48400',
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
      accentColor: '#c48400',
    });
  });

  it('descarta uma cor antiga salva e mantém o padrão visual do produto', () => {
    expect(
      normalizeSitePreferences({
        accentColor: '#8b5cf6',
        accentVersion: 3,
        theme: 'light',
        themeVersion: 2,
      })
    ).toMatchObject({
      accentColor: '#c48400',
      theme: 'light',
    });
  });

  it('descarta valores de tema inválidos', () => {
    expect(normalizeSitePreferences({ theme: 'automatic' }).theme).toBe('light');
  });
});
