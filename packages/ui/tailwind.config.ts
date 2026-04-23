import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Monochrome token system — no semantic colors. State is signalled
        // via form, typography, and luminance, never hue.
        bg: "#000000",
        surface: "#0a0a0a",
        "surface-hover": "#111111",
        "surface-elevated": "#1a1a1a",
        "surface-inverted": "#ffffff",
        "border-subtle": "#161616",
        border: "#222222",
        "border-strong": "#3a3a3a",
        "border-inverted": "#ffffff",
        "text-primary": "#ffffff",
        "text-secondary": "#a0a0a0",
        "text-tertiary": "#606060",
        "text-muted": "#3a3a3a",
        "text-inverted": "#000000",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Body 14px (up from planned 13px — see UX review: tool used every few days)
        body: ["14px", { lineHeight: "20px", letterSpacing: "-0.003em" }],
        label: ["11px", { lineHeight: "14px", letterSpacing: "0.01em" }],
        heading: ["15px", { lineHeight: "20px", letterSpacing: "-0.005em" }],
        "heading-lg": ["18px", { lineHeight: "24px", letterSpacing: "-0.01em" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
