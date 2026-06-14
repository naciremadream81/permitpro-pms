import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-inset": "var(--surface-inset)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          foreground: "var(--accent-foreground)",
          muted: "var(--accent-muted)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
        },
        review: {
          DEFAULT: "var(--review)",
          foreground: "var(--review-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        status: {
          neutral: {
            DEFAULT: "var(--status-neutral)",
            foreground: "var(--status-neutral-foreground)",
          },
          info: {
            DEFAULT: "var(--status-info)",
            foreground: "var(--status-info-foreground)",
          },
          warning: {
            DEFAULT: "var(--status-warning)",
            foreground: "var(--status-warning-foreground)",
          },
          success: {
            DEFAULT: "var(--status-success)",
            foreground: "var(--status-success-foreground)",
          },
          danger: {
            DEFAULT: "var(--status-danger)",
            foreground: "var(--status-danger-foreground)",
          },
          review: {
            DEFAULT: "var(--status-review)",
            foreground: "var(--status-review-foreground)",
          },
        },
        band: {
          DEFAULT: "var(--band)",
          foreground: "var(--band-foreground)",
          dim: "var(--band-dim)",
        },
        court: {
          us: "var(--court-us)",
          county: "var(--court-county)",
          contractor: "var(--court-contractor)",
          field: "var(--court-field)",
          closed: "var(--court-closed)",
        },
        urgent: "var(--urgent)",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      borderRadius: {
        DEFAULT: "var(--radius-md)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
