// constants/theme.js
// Single source of truth for design tokens.
// Import anywhere: import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export const COLORS = {
  // Brand
  primary: "#087FBD",
  primaryLight: "#E8F5FF",
  primaryDark: "#05689C",

  // Semantic
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  success: "#059669",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",

  // Role accents (used to colour staff portals)
  tech: "#0369A1",
  techLight: "#E7F4FC",

  // Surfaces
  bg: "#F4F7FB",
  bgSoft: "#EEF6FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",

  // Text
  textPrimary: "#172033",
  textSecondary: "#607086",
  textMuted: "#8997A8",

  // Borders
  border: "#DCE5EF",
  borderFocus: "#087FBD",
  borderInput: "#C8D5E3",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FONT = {
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 26,
  bold: "700",
  black: "800",
};

export const SHADOWS = {
  card: {
    shadowColor: "#0F2742",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: "#0F2742",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 6,
  },
};

export const TOUCH = {
  minimum: 44,
  comfortable: 52,
};
