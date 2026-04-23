import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Monochrome token system — no semantic colours. State via form,
        // typography, and luminance. Pure #000/#fff softened to reduce eye
        // strain; tone stays neutral-cool in the Linear tradition.
        bg: "#08090a",
        surface: "#101114",
        "surface-hover": "#17181c",
        "surface-elevated": "#1d1f24",
        "surface-inverted": "#f6f7f8",
        "border-subtle": "#17181b",
        border: "#232428",
        "border-strong": "#3a3b40",
        "border-inverted": "#f6f7f8",
        "text-primary": "#f6f7f8",
        "text-secondary": "#a0a2a8",
        "text-tertiary": "#62656c",
        "text-muted": "#3a3b40",
        "text-inverted": "#08090a",
        // Single functional accent — amber. Used only for three affordances:
        // in_progress status fill, selected-row border, focus ring. Nowhere
        // else. Do not extend the palette without removing a use first.
        accent: "#d4a04a",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Inter everywhere, no uppercase. Slight positive tracking on small
        // labels for readability; negative tracking on body and headings for
        // the tight, modern Linear-like feel.
        body: ["14px", { lineHeight: "22px", letterSpacing: "-0.003em" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0.01em" }],
        heading: ["16px", { lineHeight: "24px", letterSpacing: "-0.005em" }],
        "heading-lg": ["20px", { lineHeight: "28px", letterSpacing: "-0.012em" }],
      },
    },
  },
  plugins: [],
} satisfies Config;
