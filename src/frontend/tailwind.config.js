import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Geist Mono', 'monospace'],
      },
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        "cerebro": "0 0 30px rgba(0,255,255,0.1), inset 0 0 30px rgba(0,0,0,0.5)",
        "fire-ember-glow": "0 0 8px oklch(0.62 0.24 28 / 0.7), 0 0 16px oklch(0.62 0.24 28 / 0.3)",
        "ambient-haze": "0 0 40px oklch(0.7 0.1 195 / 0.08), inset 0 0 60px oklch(0.4 0.04 200 / 0.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fire-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 6px oklch(0.62 0.24 28 / 0.6), 0 0 12px oklch(0.62 0.24 28 / 0.25)",
            opacity: "0.85",
          },
          "50%": {
            boxShadow: "0 0 10px oklch(0.7 0.22 55 / 0.85), 0 0 22px oklch(0.62 0.24 28 / 0.45)",
            opacity: "1",
          },
        },
        "deforestation-fade": {
          "0%": { backgroundColor: "oklch(0.45 0.12 145 / 0.6)", filter: "saturate(1)" },
          "50%": { backgroundColor: "oklch(0.42 0.1 100 / 0.55)", filter: "saturate(0.7)" },
          "100%": { backgroundColor: "oklch(0.4 0.08 55 / 0.5)", filter: "saturate(0.45)" },
        },
        "ambient-presence": {
          "0%, 100%": { opacity: "0.5", transform: "translate(0, 0)" },
          "50%": { opacity: "0.8", transform: "translate(2px, -1px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fire-pulse": "fire-pulse 1.8s ease-in-out infinite",
        "deforestation-fade": "deforestation-fade 8s ease-in-out infinite",
        "ambient-presence": "ambient-presence 12s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
