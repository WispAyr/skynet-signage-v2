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
          500: '#252a35',
        },
        accent: {
          DEFAULT: '#F97316',
          dim: '#EA580C',
          light: '#FB923C',
          glow: '#FED7AA',
        },
        lcars: {
          orange: '#F97316',
          amber: '#FBBF24',
          blue: '#60A5FA',
          purple: '#A78BFA',
          red: '#F87171',
          teal: '#2DD4BF',
          pink: '#F472B6',
        }
      },
      fontFamily: {
        antonio: ['Antonio', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
        'pulse-slow': 'pulse 3s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(249, 115, 22, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
