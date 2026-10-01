/**
 * BOUTIQUE THEME TOKENS
 * Shared constants for isolated shop components.
 */

export const BQ_COLORS = {
  brand: "var(--ap-color-primary)",
  brandHover: "var(--ap-color-primary-hover)",
  accent: "var(--ap-color-secondary)",

  bg: "var(--ap-color-background)",
  bgAlt: "var(--ap-color-surface-secondary)",
  surface: "var(--ap-color-surface)",
  surfaceAlt: "var(--ap-color-surface-secondary)",

  ink: "var(--ap-color-foreground)",
  inkMuted: "var(--ap-color-muted-foreground)",
  inkFaint: "var(--ap-color-input)",

  success: "var(--ap-color-success)",
  danger: "var(--ap-color-error)",
  warning: "var(--ap-color-warning)",
  information: "var(--ap-color-information)",

  border: "var(--ap-color-border)",
  input: "var(--ap-color-input)",
};

export const BQ_SHADOWS = {
  soft: "var(--ap-shadow-soft)",
  float: "var(--ap-shadow-card)",
  hover: "var(--ap-shadow-raised)",
  glass: "var(--ap-shadow-soft)",
};

export const BQ_GEOMETRY = {
  radiusCard: "var(--ap-radius-card)",
  radiusMd: "var(--ap-radius-control)",
  radiusPill: "var(--ap-radius-full)",
  headerHeight: "80px",
  sidebarWidth: "320px",
  cartWidth: "440px",
};

export const BQ_FONTS = {
  heading: "var(--ap-font-family)",
  body: "var(--ap-font-family)",
};

export const BQ_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  header: 700,
};

export const BQ_TYPOGRAPHY = {
  pageTitle: {
    fontSize: "var(--ap-text-page-title)",
    lineHeight: "var(--ap-leading-page-title)",
  },
  sectionTitle: {
    fontSize: "var(--ap-text-section-title)",
    lineHeight: "var(--ap-leading-section-title)",
  },
  cardTitle: {
    fontSize: "var(--ap-text-card-title)",
    lineHeight: "var(--ap-leading-card-title)",
  },
  body: {
    fontSize: "var(--ap-text-body)",
    lineHeight: "var(--ap-leading-body)",
  },
  label: {
    fontSize: "var(--ap-text-label)",
    lineHeight: "var(--ap-leading-label)",
  },
  metadata: {
    fontSize: "var(--ap-text-metadata)",
    lineHeight: "var(--ap-leading-metadata)",
  },
  caption: {
    fontSize: "var(--ap-text-caption)",
    lineHeight: "var(--ap-leading-caption)",
  },
};
