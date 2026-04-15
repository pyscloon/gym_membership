export const colors = {
  navy: "#000033",
  royal: "#0066CC",
  sky: "#0099FF",
  offwhite: "#EEEEEE",
  white: "#FFFFFF",
  bodyLight: "#555555",
  bodyDark: "rgba(238, 238, 238, 0.82)",
  glassCard: "rgba(0, 0, 30, 0.75)",
  glassBorder: "rgba(0, 102, 204, 0.35)",
  glowShadow: "0 0 40px rgba(0, 102, 204, 0.25)",
  accentGradient: "linear-gradient(90deg, #0066CC, #0099FF)",
  subtleBorder: "rgba(0, 0, 51, 0.08)",
  topBar: "rgba(0, 0, 51, 0.6)",
  topBarBorder: "rgba(0, 102, 204, 0.25)",
  sidebarActive: "rgba(0, 102, 204, 0.15)",
  sidebarHover: "rgba(0, 153, 255, 0.14)",
  focusRing: "0 0 0 3px rgba(0, 102, 204, 0.15)",
} as const;

export const fonts = {
  headline: "'Barlow', sans-serif",
  body: "'Inter', sans-serif",
  label: "'Space Mono', monospace",
} as const;

export const radius = {
  pill: "999px",
  card: "14px",
  compact: "6px",
  section: "24px",
} as const;

export const spacing = {
  container: "80rem",
  sectionDesktopY: "100px",
  sectionDesktopX: "60px",
  sectionTabletY: "60px",
  sectionTabletX: "24px",
  sectionMobileY: "40px",
  sectionMobileX: "16px",
  cardFeatureY: "36px",
  cardFeatureX: "28px",
  dataPillY: "22px",
  dataPillX: "24px",
  compact: "18px",
  gapLarge: "28px",
  gapMedium: "24px",
  gapSmall: "18px",
} as const;

export const shadows = {
  glow: "0 0 40px rgba(0, 102, 204, 0.25)",
  glowHover: "0 0 40px rgba(0, 102, 204, 0.35)",
  glowSoft: "0 0 28px rgba(0, 102, 204, 0.28)",
  buttonGlow: "0 0 24px rgba(0, 102, 204, 0.4)",
} as const;

export const overlays = {
  darkGlass: "rgba(0, 0, 30, 0.75)",
  darkGlassBorder: "1px solid rgba(0, 102, 204, 0.35)",
  accentTopBar: "linear-gradient(90deg, #0066CC, #0099FF)",
} as const;

export const borders = {
  subtle: "1px solid rgba(0, 0, 51, 0.08)",
  input: "1px solid rgba(0, 0, 51, 0.15)",
  sidebarGlowEdge: "inset -1px 0 0 rgba(0, 102, 204, 0.2)",
  locationCard: "1px solid rgba(0, 102, 204, 0.2)",
} as const;

export const transition = {
  base: "all 0.3s ease",
  fast: "all 0.15s ease",
} as const;
