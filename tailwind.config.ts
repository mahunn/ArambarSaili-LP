import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff5ed",
          500: "#d97706",
          600: "#b45309",
          700: "#92400e",
          border: "#5e2b35"
        },
        accent: {
          400: "#f59e0b",
          500: "#d97706",
          600: "#b45309"
        },
        success: {
          500: "#10b981",
          600: "#059669"
        }
      }
    }
  },
  plugins: []
};

export default config;
