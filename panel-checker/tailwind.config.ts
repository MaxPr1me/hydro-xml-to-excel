import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f0fb',
          100: '#c9def5',
          200: '#9bc3ec',
          300: '#6ea6e2',
          400: '#3b82d4',
          500: '#1f6bc4',
          600: '#0f56a5',
          700: '#0a447f',
          800: '#053058',
          900: '#021b33'
        },
        accent: {
          100: '#f1f9e3',
          200: '#d9efb8',
          300: '#bde481',
          400: '#9cd956',
          500: '#7cc242',
          600: '#5e9a30'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
