/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ===== 落地页设计系统：HSL 变量驱动，跟随 .dark 切换 =====
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        'text-primary': 'hsl(var(--text))',
        muted: 'hsl(var(--muted))',
        stroke: 'hsl(var(--stroke))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          // 兼容既有站点（琥珀色系）
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        },
        // ===== 既有品牌色（保留向后兼容） =====
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
        }
      },
      fontFamily: {
        body: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 4px 24px -8px rgba(23, 33, 84, 0.12)',
        lift: '0 12px 32px -12px rgba(37, 84, 235, 0.25)',
        'accent-glow': '0 0 20px rgba(78,133,191,0.3)'
      },
      transitionTimingFunction: {
        'island': 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
