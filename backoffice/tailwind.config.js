/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette officielle imaro (navy + orange)
        primary: '#1B4F72',
        'primary-light': '#2980B9',
        'primary-dark': '#154066',
        accent: '#E67E22',
        'accent-dark': '#CA6A18',
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
