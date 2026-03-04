/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#d7b9ad", // Soft sand/pink brand color
        "primary-dark": "#2f5151", // Alternative dark green
        "brand-muted": "#f4e9e4",
        "background-light": "#fcfaf9",
        "background-dark": "#161c1c",
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.8rem",
        "xl": "1.2rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
