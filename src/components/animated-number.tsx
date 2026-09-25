import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { Text, type TextProps } from './text';

type Props = Omit<TextProps, 'children'> & {
  value: number;
  /** Starting value on mount, e.g. 0 to count up on a reveal. Defaults to `value`. */
  from?: number;
  duration?: number;
  delay?: number;
  format?: (value: number) => string;
};

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts to its new value instead of jumping. Tabular figures keep it steady.
 * Under Reduce Motion it just shows the value. Screen readers always get the final value.
 */
export function AnimatedNumber({ value, from, duration = 650, delay = 0, format, ...props }: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : (from ?? value));
  const current = useRef(reduced ? value : (from ?? value));

  useEffect(() => {
    const start = current.current;
    const delta = value - start;
    if (delta === 0) return;
    if (reduced) {
      current.current = value;
      return;
    }

    let frame = 0;
    let startedAt: number | null = null;
    const step = (now: number) => {
      startedAt ??= now + delay;
      const t = Math.min(Math.max((now - startedAt) / duration, 0), 1);
      const next = Math.round(start + delta * easeOutCubic(t));
      current.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, delay, reduced]);

  const number = reduced ? value : display;
  const shown = format ? format(number) : String(number);
  return (
    <Text accessibilityLabel={format ? format(value) : String(value)} {...props} className={`tabular-nums ${props.className ?? ''}`}>
      {shown}
    </Text>
  );
}
