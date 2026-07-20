import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf8f5",
          100: "#faf3ee",
          200: "#f5e6dc",
          300: "#e8cebd",
          400: "#d9a5b3",
          500: "#9e3647",
          600: "#8b2c3b",
          700: "#73202e",
          800: "#5c1724",
          900: "#4a121a",
          border: "#e8d3c3"
        },
        roseGold: {
          300: "#f3cfd6",
          400: "#eaa4b0",
          500: "#d97f8f",
          600: "#c46476",
          700: "#b04d5f"
        },
        gold: {
          300: "#fce8a6",
          400: "#e2b755",
          500: "#d4a343",
          600: "#b88222",
          700: "#8f6517"
        }
      }
    }
  },
  plugins: []
};

export default config;
