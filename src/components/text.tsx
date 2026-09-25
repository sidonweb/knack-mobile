import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

/**
 * The type scale. Inter throughout; tight negative tracking at display sizes, neutral at
 * body sizes, open tracking on the uppercase overline. Numbers use tabular figures so
 * counters don't jitter as they change.
 */
const variants = {
  /** The day score and other single hero figures. */
  hero: 'font-inter-bold text-[56px] leading-[60px] tracking-[-2px] tabular-nums',
  /** Screen titles. */
  display: 'font-inter-bold text-[32px] leading-[38px] tracking-[-0.8px]',
  title: 'font-inter-semibold text-[22px] leading-[28px] tracking-[-0.4px]',
  headline: 'font-inter-semibold text-[17px] leading-[22px] tracking-[-0.2px]',
  body: 'font-inter text-[15px] leading-[21px]',
  callout: 'font-inter-medium text-[14px] leading-[19px]',
  footnote: 'font-inter text-[13px] leading-[18px]',
  /** Secondary metadata under a footnote (timestamps, units). */
  caption: 'font-inter text-[12px] leading-[16px]',
  /** Small uppercase section labels. */
  overline: 'font-inter-semibold text-[11px] leading-[14px] uppercase tracking-[1.2px]',
  numeral: 'font-inter-semibold text-[15px] leading-[20px] tabular-nums',
  /** Large stat figures in grids. */
  stat: 'font-inter-semibold text-[24px] leading-[28px] tracking-[-0.5px] tabular-nums',
} as const;

const tones = {
  default: 'text-fg',
  muted: 'text-muted',
  subtle: 'text-subtle',
  ember: 'text-ember',
  iris: 'text-iris',
  mint: 'text-mint',
  sky: 'text-sky',
  amber: 'text-amber',
  rose: 'text-rose',
  inverse: 'text-canvas',
} as const;

export type TextVariant = keyof typeof variants;
export type TextTone = keyof typeof tones;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
};

/** Large type scales less, so Dynamic Type stays readable without breaking layouts. */
const MAX_SCALE: Partial<Record<TextVariant, number>> = { hero: 1.15, display: 1.3, title: 1.4, stat: 1.3 };

export function Text({ variant = 'body', tone = 'default', className = '', ...props }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={MAX_SCALE[variant] ?? 1.8}
      className={`${variants[variant]} ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
