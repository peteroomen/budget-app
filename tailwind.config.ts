import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@assistant-ui/react/dist/**/*.{js,mjs}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // ── Typography scale ─────────────────────────────────────────────────────
      // Each token bakes in size + line-height + letter-spacing so a single
      // class replaces multiple arbitrary values. Font-family and font-weight
      // are intentionally separate (font-display / font-sans / font-mono and
      // font-medium / font-semibold) — they vary independently.
      //
      // Display scale (used with font-display = Fraunces):
      //   text-display-h1          page H1s across all routes
      //   text-display-summary-h1  Summary page H1 (larger, more editorial)
      //   text-display-hero        large KPI stat-card metrics
      //   text-display-metric      mid-size metrics (budget cards)
      //   text-display-hero-sm     small hero figures (donut centres, mini stats)
      //   text-display-card-title  CardTitle (Fraunces at body scale)
      //   text-display-wordmark    "Tide" brand name in sidebar / mobile header
      //
      // Body / label scale (used with font-sans or font-mono):
      //   text-body-sm    standard dense body copy (13px)
      //   text-body-xs    card descriptions, sub-labels (12px)
      //   text-label      small labels, badges, sub-text (11px)
      //   text-label-caps uppercase table headers / section labels (11px + tracking)
      fontSize: {
        'display-h1': ['28px', { lineHeight: '1.15', letterSpacing: '-0.018em' }],
        'display-summary-h1': ['32px', { lineHeight: '1.1', letterSpacing: '-0.022em' }],
        'display-hero': ['26px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-metric': ['22px', { lineHeight: '1', letterSpacing: '-0.01em' }],
        'display-hero-sm': ['18px', { lineHeight: '1.1', letterSpacing: '-0.005em' }],
        'display-card-title': ['14px', { lineHeight: '1', letterSpacing: '-0.005em' }],
        'display-wordmark': ['15px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'body-sm': ['13px', { lineHeight: '1.5' }],
        'body-xs': ['12px', { lineHeight: '1.4' }],
        label: ['11px', { lineHeight: '1.3' }],
        'label-caps': ['11px', { lineHeight: '1', letterSpacing: '0.05em' }],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate, typography],
}

export default config
