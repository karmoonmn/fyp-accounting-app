/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 20px 50px rgba(2, 6, 23, 0.18)',
      },
    },
  },
  plugins: [],
}

