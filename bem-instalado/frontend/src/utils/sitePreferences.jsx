import { safeLocalStorage } from './safeStorage';

export const SITE_PREFERENCES_EVENT = 'site-preferences:changed';

const STORAGE_KEY = 'instalar-site-preferences';
const THEME_PREFERENCE_VERSION = 2;
const ACCENT_PREFERENCE_VERSION = 3;
const LEGACY_DEFAULT_GOLDS = ['#e2b42d', '#a86600'];

export const DEFAULT_SITE_PREFERENCES = {
  accentColor: '#c48400',
  accentVersion: ACCENT_PREFERENCE_VERSION,
  theme: 'light',
  themeVersion: THEME_PREFERENCE_VERSION,
  density: 'comfortable',
  motion: 'smooth',
};

export const ACCENT_PRESETS = [
  { name: 'Dourado', value: '#c48400' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Ciano', value: '#06b6d4' },
];

function normalizeHexColor(value) {
  const input = String(value || '').trim();

  if (/^#[0-9a-fA-F]{6}$/.test(input)) {
    return input.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{3}$/.test(input)) {
    return `#${input[1]}${input[1]}${input[2]}${input[2]}${input[3]}${input[3]}`.toLowerCase();
  }

  return DEFAULT_SITE_PREFERENCES.accentColor;
}

function hexToRgb(hex) {
  const safeHex = normalizeHexColor(hex).slice(1);
  const value = Number.parseInt(safeHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixColor(sourceHex, targetHex, weight) {
  const source = hexToRgb(sourceHex);
  const target = hexToRgb(targetHex);
  const ratio = Math.max(0, Math.min(1, weight));

  return rgbToHex({
    r: source.r + (target.r - source.r) * ratio,
    g: source.g + (target.g - source.g) * ratio,
    b: source.b + (target.b - source.b) * ratio,
  });
}

function getContrastText(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#100b03' : '#fff8e8';
}

function buildAccentTokens(accentColor, theme) {
  const accent = normalizeHexColor(accentColor);
  const { r, g, b } = hexToRgb(accent);
  const lightTheme = theme === 'light';
  const isDefaultGold = accent === '#c48400';
  const strong = lightTheme && isDefaultGold ? '#e6b23d' : mixColor(accent, '#ffffff', 0.24);
  const deep = mixColor(accent, '#000000', 0.38);
  const background = lightTheme ? '#e3e1dc' : '#000000';
  const panel = lightTheme ? '#ffffff' : '#050505';
  const panelSoft = lightTheme ? '#f0eee9' : '#0a0a0a';
  const panelElevated = lightTheme ? '#d9d6cf' : '#101010';
  const strongRgb = hexToRgb(strong);
  const deepRgb = hexToRgb(deep);
  const backgroundRgb = hexToRgb(background);
  const panelRgb = hexToRgb(panel);
  const panelSoftRgb = hexToRgb(panelSoft);
  const panelElevatedRgb = hexToRgb(panelElevated);

  return {
    accent,
    strong,
    deep,
    contrast: lightTheme && isDefaultGold ? '#181613' : getContrastText(accent),
    rgb: `${r}, ${g}, ${b}`,
    strongRgb: `${strongRgb.r}, ${strongRgb.g}, ${strongRgb.b}`,
    deepRgb: `${deepRgb.r}, ${deepRgb.g}, ${deepRgb.b}`,
    background,
    backgroundRgb: `${backgroundRgb.r}, ${backgroundRgb.g}, ${backgroundRgb.b}`,
    panel,
    panelSoft,
    panelElevated,
    panelRgb: `${panelRgb.r}, ${panelRgb.g}, ${panelRgb.b}`,
    panelSoftRgb: `${panelSoftRgb.r}, ${panelSoftRgb.g}, ${panelSoftRgb.b}`,
    panelElevatedRgb: `${panelElevatedRgb.r}, ${panelElevatedRgb.g}, ${panelElevatedRgb.b}`,
  };
}

export function normalizeSitePreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  const hasCurrentThemeChoice = Number(source.themeVersion) >= THEME_PREFERENCE_VERSION;
  const hasCurrentAccentChoice = Number(source.accentVersion) >= ACCENT_PREFERENCE_VERSION;
  const normalizedAccent = normalizeHexColor(source.accentColor);
  const accentColor = !hasCurrentAccentChoice && LEGACY_DEFAULT_GOLDS.includes(normalizedAccent)
    ? DEFAULT_SITE_PREFERENCES.accentColor
    : normalizedAccent;

  return {
    accentColor,
    accentVersion: ACCENT_PREFERENCE_VERSION,
    // Preferências salvas antes do novo tema claro não registravam uma escolha
    // consciente de tema. Elas migram para o novo padrão, sem impedir que a
    // pessoa escolha e mantenha o preto a partir de agora.
    theme: source.theme === 'dark' && hasCurrentThemeChoice ? 'dark' : 'light',
    themeVersion: THEME_PREFERENCE_VERSION,
    density: source.density === 'compact' ? 'compact' : 'comfortable',
    motion: source.motion === 'reduced' ? 'reduced' : 'smooth',
  };
}

export function readSitePreferences() {
  if (typeof window === 'undefined') {
    return DEFAULT_SITE_PREFERENCES;
  }

  try {
    const storedValue = safeLocalStorage.getItem(STORAGE_KEY);
    return normalizeSitePreferences(storedValue ? JSON.parse(storedValue) : DEFAULT_SITE_PREFERENCES);
  } catch (_error) {
    return DEFAULT_SITE_PREFERENCES;
  }
}

export function applySitePreferences(nextPreferences = readSitePreferences()) {
  if (typeof document === 'undefined') {
    return normalizeSitePreferences(nextPreferences);
  }

  const preferences = normalizeSitePreferences(nextPreferences);
  const tokens = buildAccentTokens(preferences.accentColor, preferences.theme);
  const root = document.documentElement;
  const lightTheme = preferences.theme === 'light';

  root.style.setProperty('--site-accent', tokens.accent);
  root.style.setProperty('--site-accent-strong', tokens.strong);
  root.style.setProperty('--site-accent-deep', tokens.deep);
  root.style.setProperty('--site-accent-contrast', tokens.contrast);
  root.style.setProperty('--site-accent-rgb', tokens.rgb);
  root.style.setProperty('--site-accent-strong-rgb', tokens.strongRgb);
  root.style.setProperty('--site-accent-deep-rgb', tokens.deepRgb);
  root.style.setProperty('--site-accent-soft', `rgba(${tokens.rgb}, ${lightTheme ? '0.16' : '0.14'})`);
  root.style.setProperty('--site-accent-line', `rgba(${tokens.rgb}, ${lightTheme ? '0.5' : '0.18'})`);
  root.style.setProperty('--site-accent-line-strong', `rgba(${tokens.rgb}, ${lightTheme ? '0.72' : '0.34'})`);
  root.style.setProperty('--bg', tokens.background);
  root.style.setProperty('--bg-soft', tokens.panelSoft);
  root.style.setProperty('--surface', `rgba(${tokens.panelRgb}, 0.9)`);
  root.style.setProperty('--surface-strong', `rgba(${tokens.panelSoftRgb}, 0.98)`);
  root.style.setProperty('--surface-soft', lightTheme ? '#f0eee9' : 'rgba(255, 255, 255, 0.03)');
  root.style.setProperty('--site-bg', tokens.background);
  root.style.setProperty('--site-bg-rgb', tokens.backgroundRgb);
  root.style.setProperty('--site-panel', tokens.panel);
  root.style.setProperty('--site-panel-soft', tokens.panelSoft);
  root.style.setProperty('--site-panel-elevated', tokens.panelElevated);
  root.style.setProperty('--site-panel-rgb', tokens.panelRgb);
  root.style.setProperty('--site-panel-soft-rgb', tokens.panelSoftRgb);
  root.style.setProperty('--site-panel-elevated-rgb', tokens.panelElevatedRgb);
  root.style.setProperty('--gold', tokens.accent);
  root.style.setProperty('--gold-strong', tokens.strong);
  root.style.setProperty('--gold-soft', `rgba(${tokens.rgb}, ${lightTheme ? '0.16' : '0.14'})`);
  root.style.setProperty('--line', lightTheme ? '#b9b5ad' : `rgba(${tokens.rgb}, 0.18)`);
  root.style.setProperty('--text', lightTheme ? '#181613' : '#f6efdf');
  root.style.setProperty('--muted', lightTheme ? '#59554e' : 'rgba(246, 239, 223, 0.64)');
  root.style.setProperty('--shadow', lightTheme ? '0 14px 32px rgba(57, 45, 25, 0.11)' : '0 30px 80px rgba(0, 0, 0, 0.45)');
  root.style.setProperty('--ref-gold', tokens.accent);
  root.style.setProperty('--ref-gold-strong', tokens.strong);
  root.style.setProperty('--ref-line', lightTheme ? '#b9b5ad' : `rgba(${tokens.rgb}, 0.17)`);
  root.style.setProperty('--route-line-gold', `rgba(${tokens.rgb}, ${lightTheme ? '0.52' : '0.22'})`);
  root.dataset.siteTheme = preferences.theme;
  root.dataset.siteDensity = preferences.density;
  root.dataset.siteMotion = preferences.motion;
  root.style.colorScheme = preferences.theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', tokens.background);
  }

  return preferences;
}

export function saveSitePreferences(nextPreferences) {
  const preferences = normalizeSitePreferences(nextPreferences);

  if (typeof window !== 'undefined') {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    applySitePreferences(preferences);
    try {
      window.dispatchEvent(new CustomEvent(SITE_PREFERENCES_EVENT, { detail: preferences }));
    } catch (_error) {
      window.dispatchEvent(new Event(SITE_PREFERENCES_EVENT));
    }
  }

  return preferences;
}

export function resetSitePreferences() {
  if (typeof window !== 'undefined') {
    safeLocalStorage.removeItem(STORAGE_KEY);
  }

  return saveSitePreferences(DEFAULT_SITE_PREFERENCES);
}

export function applyStoredSitePreferences() {
  return applySitePreferences(readSitePreferences());
}
