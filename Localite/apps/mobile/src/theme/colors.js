import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const DEFAULT_ACCENT = 'green';

export const ACCENT_OPTIONS = [
  { id: 'green', label: 'Green', swatch: '#1a7f4b' },
  { id: 'red', label: 'Red', swatch: '#dc2626' },
  { id: 'blue', label: 'Blue', swatch: '#2563eb' },
  { id: 'yellow', label: 'Yellow', swatch: '#ca8a04' },
  { id: 'purple', label: 'Purple', swatch: '#7c3aed' },
  { id: 'orange', label: 'Light orange', swatch: '#fb923c' },
];

const BASE_LIGHT = {
  background: '#f8faf9',
  card: '#ffffff',
  cardAlt: '#ffffff',
  border: '#eeeeee',
  text: '#111111',
  textSecondary: '#666666',
  textMuted: '#888888',
  inputBg: '#ffffff',
  inputBorder: '#dddddd',
  tabBar: '#ffffff',
  tabInactive: '#94a3b8',
  headerText: '#ffffff',
  profileBar: '#ffffff',
  profileBarBorder: '#e8ece9',
  switchTrackOff: '#e2e8f0',
};

const BASE_DARK = {
  background: '#0f1419',
  card: '#1a222d',
  cardAlt: '#1f2a35',
  border: '#2a3544',
  borderLight: '#243040',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  inputBg: '#1a222d',
  inputBorder: '#334155',
  tabBar: '#141b24',
  tabBarBorder: '#243040',
  tabInactive: '#64748b',
  headerText: '#ffffff',
  profileBar: '#1a222d',
  profileBarBorder: '#2a3544',
  switchTrackOff: '#334155',
};

const ACCENT_PALETTES = {
  green: {
    light: {
      brand: '#1a7f4b',
      brandDark: '#145c38',
      brandMuted: '#e8f5ee',
      brandBorder: '#c8e6d4',
      headerBg: '#1a7f4b',
      accentSurface: '#e8f5ee',
      linkCardBg: '#e8f5ee',
      linkCardBorder: '#c8e6d4',
      borderLight: '#e2efe6',
      tabBarBorder: '#e2efe6',
    },
    dark: {
      brand: '#34d399',
      brandDark: '#1a7f4b',
      brandMuted: '#1a3328',
      brandBorder: '#2d5a45',
      headerBg: '#145c38',
      accentSurface: '#1a3328',
      linkCardBg: '#1a3328',
      linkCardBorder: '#2d5a45',
    },
  },
  red: {
    light: {
      brand: '#dc2626',
      brandDark: '#b91c1c',
      brandMuted: '#fee2e2',
      brandBorder: '#fecaca',
      headerBg: '#dc2626',
      accentSurface: '#fee2e2',
      linkCardBg: '#fee2e2',
      linkCardBorder: '#fecaca',
      borderLight: '#fde8e8',
      tabBarBorder: '#fecaca',
    },
    dark: {
      brand: '#f87171',
      brandDark: '#dc2626',
      brandMuted: '#3f1d1d',
      brandBorder: '#7f1d1d',
      headerBg: '#991b1b',
      accentSurface: '#3f1d1d',
      linkCardBg: '#3f1d1d',
      linkCardBorder: '#7f1d1d',
    },
  },
  blue: {
    light: {
      brand: '#2563eb',
      brandDark: '#1d4ed8',
      brandMuted: '#dbeafe',
      brandBorder: '#bfdbfe',
      headerBg: '#2563eb',
      accentSurface: '#dbeafe',
      linkCardBg: '#dbeafe',
      linkCardBorder: '#bfdbfe',
      borderLight: '#e0ecff',
      tabBarBorder: '#bfdbfe',
    },
    dark: {
      brand: '#60a5fa',
      brandDark: '#2563eb',
      brandMuted: '#1e293b',
      brandBorder: '#1e3a8a',
      headerBg: '#1e40af',
      accentSurface: '#1e293b',
      linkCardBg: '#1e293b',
      linkCardBorder: '#1e3a8a',
    },
  },
  yellow: {
    light: {
      brand: '#ca8a04',
      brandDark: '#a16207',
      brandMuted: '#fef9c3',
      brandBorder: '#fde047',
      headerBg: '#ca8a04',
      accentSurface: '#fef9c3',
      linkCardBg: '#fef9c3',
      linkCardBorder: '#fde047',
      borderLight: '#fef3c7',
      tabBarBorder: '#fde047',
    },
    dark: {
      brand: '#facc15',
      brandDark: '#ca8a04',
      brandMuted: '#3f2f05',
      brandBorder: '#854d0e',
      headerBg: '#a16207',
      accentSurface: '#3f2f05',
      linkCardBg: '#3f2f05',
      linkCardBorder: '#854d0e',
    },
  },
  purple: {
    light: {
      brand: '#7c3aed',
      brandDark: '#6d28d9',
      brandMuted: '#ede9fe',
      brandBorder: '#ddd6fe',
      headerBg: '#7c3aed',
      accentSurface: '#ede9fe',
      linkCardBg: '#ede9fe',
      linkCardBorder: '#ddd6fe',
      borderLight: '#ede9fe',
      tabBarBorder: '#ddd6fe',
    },
    dark: {
      brand: '#a78bfa',
      brandDark: '#7c3aed',
      brandMuted: '#2e1065',
      brandBorder: '#5b21b6',
      headerBg: '#6d28d9',
      accentSurface: '#2e1065',
      linkCardBg: '#2e1065',
      linkCardBorder: '#5b21b6',
    },
  },
  orange: {
    light: {
      brand: '#fb923c',
      brandDark: '#ea580c',
      brandMuted: '#ffedd5',
      brandBorder: '#fed7aa',
      headerBg: '#fb923c',
      accentSurface: '#ffedd5',
      linkCardBg: '#ffedd5',
      linkCardBorder: '#fed7aa',
      borderLight: '#ffedd5',
      tabBarBorder: '#fed7aa',
    },
    dark: {
      brand: '#fdba74',
      brandDark: '#ea580c',
      brandMuted: '#431407',
      brandBorder: '#9a3412',
      headerBg: '#c2410c',
      accentSurface: '#431407',
      linkCardBg: '#431407',
      linkCardBorder: '#9a3412',
    },
  },
};

export function isValidAccent(accent) {
  return Boolean(ACCENT_PALETTES[accent]);
}

export function buildThemeColors(isDark, accent = DEFAULT_ACCENT) {
  const palette = ACCENT_PALETTES[accent] || ACCENT_PALETTES.green;
  const accentColors = isDark ? palette.dark : palette.light;
  const base = isDark ? BASE_DARK : BASE_LIGHT;

  return {
    mode: isDark ? 'dark' : 'light',
    accent,
    ...base,
    ...accentColors,
  };
}

/** @deprecated use buildThemeColors */
export const lightColors = buildThemeColors(false, DEFAULT_ACCENT);
/** @deprecated use buildThemeColors */
export const darkColors = buildThemeColors(true, DEFAULT_ACCENT);

export function getNavigationTheme(colors) {
  const base = colors.mode === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: colors.mode === 'dark',
    colors: {
      ...base.colors,
      primary: colors.brand,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.brand,
    },
  };
}
