/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Manrope'", "system-ui", "sans-serif"],
        display: ["'Fraunces'", "serif"],
      },
      colors: {
        ink: {
          950: "#0B1220",
          900: "#111A2E",
          800: "#1A2540",
          700: "#243155",
          600: "#334169",
        },
        brass: {
          50: "#FBF6E9",
          100: "#F5E9C2",
          300: "#E4C065",
          400: "#D4A017",
          500: "#B8860F",
          600: "#93690B",
        },
        mist: {
          50: "#F7F8FB",
          100: "#EEF1F7",
          200: "#DCE2EE",
          400: "#96A2BC",
        },
        good: "#1E8E5A",
        bad: "#D33B3B",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,18,32,0.04), 0 8px 24px -8px rgba(11,18,32,0.12)",
        lifted: "0 12px 32px -12px rgba(11,18,32,0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
