/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#07080a',
          800: '#0d0f12',
          700: '#151820',
          600: '#1c2028',
        },
        accent: {
          DEFAULT: '#00d4ff',
          dim: '#0099bb',
        }
      }
    },
  },
  plugins: [],
}
