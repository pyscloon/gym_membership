/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        flexBlack: "#000033",
        flexBlue: "#0099FF",
        flexNavy: "#0066CC",
        flexWhite: "#EDEDED",
      },
    },
  },
  plugins: [],
};

