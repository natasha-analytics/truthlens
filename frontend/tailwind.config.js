/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0f172a",
        panel: "#111827",
        accent: "#38bdf8",
      },
      boxShadow: {
        glow: "0 0 40px rgba(56, 189, 248, 0.15)",
      },
    },
  },
  plugins: [],
};
