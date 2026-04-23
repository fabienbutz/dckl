// Monochrome design tokens. Mirror of tailwind.config.ts.
// State is communicated via form, typography, and luminance — never hue.
export const tokens = {
  bg: "#08090a",
  surface: "#101114",
  surfaceHover: "#17181c",
  surfaceElevated: "#1d1f24",
  surfaceInverted: "#f6f7f8",
  borderSubtle: "#17181b",
  border: "#232428",
  borderStrong: "#3a3b40",
  borderInverted: "#f6f7f8",
  textPrimary: "#f6f7f8",
  textSecondary: "#a0a2a8",
  textTertiary: "#62656c",
  textMuted: "#3a3b40",
  textInverted: "#08090a",
  accent: "#d4a04a",
} as const;

export type Token = keyof typeof tokens;
