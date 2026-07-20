import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          border: "#123c30"
        },
        accent: {
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c"
        },
        success: {
          500: "#14b8a6",
          600: "#0d9488"
        }
      }
    }
  },
  plugins: []
};

export default config;
