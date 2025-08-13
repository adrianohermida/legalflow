import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./client/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // F1.0 - Hermida Maia Brand Colors (site ↔ app consistency)
        brand: {
          50: "#f5faf8",
          100: "#e9f3ef", // Light brand
          200: "#d3e7df",
          300: "#b0d4c4",
          400: "#86bda4",
          500: "#62a285",
          600: "#4d8169",
          700: "#285245", // Primary brand
          800: "#214239",
          900: "#1b3a2f", // Dark brand
        },
        // F1.0 - State colors - subtons do branding apenas
        success: {
          DEFAULT: "#16a34a",
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
        },
        warning: {
          DEFAULT: "#d97706",
          50: "#fefbf3",
          100: "#fef3e2",
          500: "#d97706",
          600: "#b45309",
        },
        danger: {
          DEFAULT: "#ef4444",
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
        },
        // Neutral scale - tons de cinza neutros para confiança
        neutral: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        // F1.0 - Títulos Montserrat/Inter, textos Inter/Open Sans
        sans: ["Inter", "Open Sans", "system-ui", "sans-serif"],
        heading: ["Montserrat", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // F1.0 - Line-height confortável para legibilidade
        xs: ["0.75rem", { lineHeight: "1.6" }],
        sm: ["0.875rem", { lineHeight: "1.6" }],
        base: ["1rem", { lineHeight: "1.7" }],
        lg: ["1.125rem", { lineHeight: "1.7" }],
        xl: ["1.25rem", { lineHeight: "1.6" }],
        "2xl": ["1.5rem", { lineHeight: "1.5" }],
        "3xl": ["1.875rem", { lineHeight: "1.4" }],
        "4xl": ["2.25rem", { lineHeight: "1.3" }],
      },
      borderRadius: {
        // F1.0 - Bordas 10-12px conforme especificação
        DEFAULT: "10px",
        lg: "12px",
        md: "10px",
        sm: "8px",
      },
      boxShadow: {
        // F1.0 - Sombras suaves baseadas no branding
        soft: "0 1px 3px 0 rgba(27, 58, 47, 0.06), 0 1px 2px 0 rgba(27, 58, 47, 0.04)",
        medium:
          "0 4px 6px -1px rgba(27, 58, 47, 0.08), 0 2px 4px -1px rgba(27, 58, 47, 0.04)",
        strong:
          "0 10px 15px -3px rgba(27, 58, 47, 0.08), 0 4px 6px -2px rgba(27, 58, 47, 0.04)",
        // Focus ring visível para acessibilidade
        focus: "0 0 0 3px rgba(40, 82, 69, 0.1)",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "slide-in-right": "slide-in-right 0.2s ease-out",
        "slide-out-right": "slide-out-right 0.2s ease-out",
      },
      spacing: {
        sidebar: "280px",
        header: "64px",
      },
      screens: {
        xs: "475px",
        ...require("tailwindcss/defaultTheme").screens,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
