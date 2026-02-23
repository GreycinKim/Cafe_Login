/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#E8F4FA",
          100: "#D1E9F5",
          200: "#A3D3EB",
          300: "#5CB8DF",
          400: "#1AAFE0",
          500: "#009CDE",   // PANTONE 2925C - bright cyan
          600: "#0080B8",
          700: "#006899",
          800: "#00587C",   // PANTONE 647C - deep blue
          900: "#004060",
          950: "#002E45",
        },
        brand: {
          cyan: "#009CDE",
          blue: "#00587C",
          black: "#000000",
          gray: "#BBBCBC",  // Cool Gray 4
          light: "#D0D0CE", // Cool Gray 2
        },
      },
    },
  },
  plugins: [],
};
