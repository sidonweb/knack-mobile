const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Theming goes through CSS variables (src/lib/theme.ts), not `dark:` variants. 'class'
  // also stops NativeWind throwing on web when the colour scheme is set programmatically.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        raised: token('raised'),
        hairline: token('hairline'),
        fg: token('fg'),
        muted: token('muted'),
        subtle: token('subtle'),
        ember: token('ember'),
        iris: token('iris'),
        mint: token('mint'),
        sky: token('sky'),
        amber: token('amber'),
        rose: token('rose'),
        steel: token('steel'),
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};
