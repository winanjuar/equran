import type { Config } from 'tailwindcss'

/**
 * e-Quran TailwindCSS Configuration
 *
 * Color system:
 *  - `primary`    — green-600 (#16a34a) base, general UI actions & PWA theme
 *  - `ziyadah`    — green shades  (memorization of new verses)
 *  - `murojahah`  — blue shades   (memorization review)
 *  - `tilawah`    — orange shades (recitation)
 *  - `tadabbur`   — purple shades (contemplative reading)
 *
 * Heat-map intensity naming: `{process}-{level}`
 *   level 0 = grey/inactive, levels 1–4 = light→dark, level 5 = max intensity
 */

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
  ],

  theme: {
    extend: {
      colors: {
        // ── Primary UI color (green-600 base) ───────────────────────────
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a', // ← PWA theme_color
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // ── Ziyadah — green (new memorization) ──────────────────────────
        ziyadah: {
          0:   '#e5e7eb', // grey / inactive
          1:   '#bbf7d0', // green-200  — very light
          2:   '#86efac', // green-300
          3:   '#4ade80', // green-400
          4:   '#22c55e', // green-500
          5:   '#15803d', // green-700  — max intensity
        },

        // ── Murojahah — blue (memorization review) ──────────────────────
        murojahah: {
          0:   '#e5e7eb', // grey / inactive
          1:   '#bfdbfe', // blue-200   — very light
          2:   '#93c5fd', // blue-300
          3:   '#60a5fa', // blue-400
          4:   '#3b82f6', // blue-500
          5:   '#1d4ed8', // blue-700   — max intensity
        },

        // ── Tilawah — orange (recitation) ───────────────────────────────
        tilawah: {
          0:   '#e5e7eb', // grey / inactive
          1:   '#fed7aa', // orange-200 — very light
          2:   '#fdba74', // orange-300
          3:   '#fb923c', // orange-400
          4:   '#f97316', // orange-500
          5:   '#c2410c', // orange-700 — max intensity
        },

        // ── Tadabbur — purple (contemplative reading) ───────────────────
        tadabbur: {
          0:   '#e5e7eb', // grey / inactive
          1:   '#e9d5ff', // purple-200 — very light
          2:   '#d8b4fe', // purple-300
          3:   '#c084fc', // purple-400
          4:   '#a855f7', // purple-500
          5:   '#7e22ce', // purple-700 — max intensity
        },
      },
    },
  },

  plugins: [],
} satisfies Config
