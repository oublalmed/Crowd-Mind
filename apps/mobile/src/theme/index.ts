export const colors = {
  // Primary palette
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#4A3DB5',

  // Secondary palette
  secondary: '#00CEC9',
  secondaryLight: '#81ECEC',
  secondaryDark: '#00A8A3',

  // Accent
  accent: '#FD79A8',
  accentLight: '#FAB1C8',
  accentDark: '#E84393',

  // Game-specific
  gold: '#FDCB6E',
  silver: '#B2BEC3',
  bronze: '#E17055',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF7675',
  info: '#74B9FF',

  // Backgrounds
  background: '#0A0E1A',
  backgroundLight: '#141929',
  backgroundCard: '#1A1F35',
  backgroundElevated: '#222842',

  // Text
  text: '#FFFFFF',
  textSecondary: '#A0A3BD',
  textMuted: '#6B6F8D',
  textInverse: '#0A0E1A',

  // Borders
  border: '#2A2F4A',
  borderLight: '#363B5E',

  // Overlays
  overlay: 'rgba(10, 14, 26, 0.7)',
  overlayLight: 'rgba(10, 14, 26, 0.4)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  // Font sizes
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  // Font weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  }),
} as const;

const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} as const;

export type Theme = typeof theme;

export default theme;
