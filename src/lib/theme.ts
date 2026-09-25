import { vars } from 'nativewind';

/**
 * Single source of truth for colour. Values are space-separated RGB channels so
 * Tailwind can apply opacity modifiers (`bg-fg/10`). The same values feed the
 * `vars()` object applied at the root and the hex helpers used by SVG/icons.
 *
 * Direction: warm neutrals, one brand accent (ember) reserved for streaks and the
 * score, and muted semantic accents. Colour is a reward, not decoration.
 *
 * Text contrast on canvas: fg ≥ 15:1, muted ≥ 7:1, subtle ≥ 4.5:1 (WCAG AA for body text).
 */
const light = {
  canvas: '250 250 249',
  surface: '255 255 255',
  raised: '244 244 243',
  hairline: '231 229 228',
  fg: '12 10 9',
  muted: '82 78 74',
  subtle: '117 111 106',
  ember: '232 68 22',
  iris: '88 80 230',
  mint: '14 150 95',
  sky: '22 128 206',
  amber: '201 124 6',
  rose: '214 56 94',
  steel: '100 116 139',
};

const dark: typeof light = {
  canvas: '11 11 13',
  surface: '21 21 24',
  raised: '30 30 34',
  hairline: '40 40 45',
  fg: '245 245 244',
  muted: '168 168 176',
  subtle: '128 128 138',
  ember: '255 97 51',
  iris: '145 141 255',
  mint: '61 220 151',
  sky: '96 186 255',
  amber: '255 184 77',
  rose: '255 112 142',
  steel: '154 163 178',
};

export type ColorScheme = 'light' | 'dark';
export type ColorToken = keyof typeof light;

export const palette = { light, dark } as const;

export const themeVars = {
  light: vars(Object.fromEntries(Object.entries(light).map(([key, value]) => [`--color-${key}`, value]))),
  dark: vars(Object.fromEntries(Object.entries(dark).map(([key, value]) => [`--color-${key}`, value]))),
};

export function rgb(scheme: ColorScheme, token: ColorToken, alpha = 1): string {
  const [r, g, b] = palette[scheme][token].split(' ');
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Habit colour keys as stored by the API, mapped onto palette tokens. */
export const HABIT_COLORS = ['iris', 'ember', 'mint', 'sky', 'amber', 'rose', 'slate'] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

export function habitToken(color: string): ColorToken {
  if (color === 'slate') return 'steel';
  return (HABIT_COLORS as readonly string[]).includes(color) ? (color as ColorToken) : 'iris';
}

/**
 * Motion vocabulary: short eased timings, never springs or overshoot. Movement should feel
 * precise, not playful. Reanimated honours the system Reduce Motion setting.
 */
export const motion = {
  /** Press feedback, toggles. */
  quick: 120,
  /** Elements entering or settling into place. */
  settle: 220,
  /** Progress fills (rings, bars). */
  fill: 800,
} as const;
