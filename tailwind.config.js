/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#6090fa',
          500: '#3b6ef6',
          600: '#2554eb',
          700: '#1d42d8',
          800: '#1e37af',
          900: '#1e338a',
          950: '#172154'
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 4px 24px -8px rgba(23, 33, 84, 0.12)',
        lift: '0 12px 32px -12px rgba(37, 84, 235, 0.25)'
      }
    }
  },
  plugins: []
};
