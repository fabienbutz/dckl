// Monochrome design tokens. Mirror of tailwind.config.ts.
// State is communicated via form, typography, and luminance — never hue.
export const tokens = {
  bg: "#000000",
  surface: "#0a0a0a",
  surfaceHover: "#111111",
  surfaceElevated: "#1a1a1a",
  surfaceInverted: "#ffffff",
  borderSubtle: "#161616",
  border: "#222222",
  borderStrong: "#3a3a3a",
  borderInverted: "#ffffff",
  textPrimary: "#ffffff",
  textSecondary: "#a0a0a0",
  textTertiary: "#606060",
  textMuted: "#3a3a3a",
  textInverted: "#000000",
} as const;

export type Token = keyof typeof tokens;
