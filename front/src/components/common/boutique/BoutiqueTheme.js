/**
 * BOUTIQUE THEME TOKENS
 * Shared constants for isolated shop components.
 */

export const BQ_COLORS = {
  brand: "var(--bq-color-brand)",
  brandHover: "var(--bq-color-brand-hover)",
  accent: "var(--bq-color-accent)",

  bg: "var(--bq-color-bg)",
  bgAlt: "var(--bq-color-bg-alt)",
  surface: "var(--bq-color-surface)",
  surfaceAlt: "var(--bq-color-surface-alt)",

  ink: "var(--bq-color-ink)",
  inkMuted: "var(--bq-color-ink-muted)",
  inkFaint: "var(--bq-color-ink-faint)",

  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",

  border: "var(--bq-color-border)",
};

export const BQ_SHADOWS = {
  soft: "0 10px 25px -5px rgba(0,0,0,0.05)",
  float:
    "0 20px 40px -10px rgba(0,0,0,0.08), 0 10px 20px -5px rgba(0,0,0,0.04)",
  hover:
    "0 30px 60px -15px rgba(0,0,0,0.12), 0 15px 25px -5px rgba(0,0,0,0.05)",
  glass: "0 4px 30px rgba(0,0,0,0.03)",
};

export const BQ_GEOMETRY = {
  radiusCard: "24px",
  radiusMd: "16px",
  radiusPill: "999px",
  headerHeight: "80px",
  sidebarWidth: "320px",
  cartWidth: "440px",
};

export const BQ_FONTS = {
  heading: "'Outfit', sans-serif",
  body: "'Outfit', sans-serif",
};

export const BQ_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  header: 800, // Special case for primary page headers only
};
