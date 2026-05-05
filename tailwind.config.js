/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    safelist: [
    "bg-purple-50", "text-purple-600", "border-purple-200",
    "bg-green-50",  "text-green-600",  "border-green-200",
    "bg-yellow-50", "text-yellow-600", "border-yellow-200",
    "bg-red-50",    "text-red-600",    "border-red-200",
  ],
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

