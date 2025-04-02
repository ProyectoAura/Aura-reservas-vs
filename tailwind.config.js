/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          claro: '#D3C6A3',
          medio: '#806C4F',
          oscuro: '#0A1034'
        }
      }
    }
  },
  plugins: []
}
