/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1B4F72', // couleur thème imaro
      },
    },
  },
  plugins: [],
}
