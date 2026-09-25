import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@/lib/theme';

type Props = {
  /** 0–1 */
  progress: number;
  color?: ColorToken;
  height?: number;
  /**
   * For bars that loop, like level XP: a drop in value means it wrapped, so the fill runs to
   * the end first and then starts again from empty.
   */
  wraps?: boolean;
};

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
const EASE = Easing.out(Easing.cubic);

/**
 * A thin track with an eased fill. The fill is a full-width bar slid into place with a numeric
 * transform (not an animated percentage width), which renders reliably on every platform.
 */
export function ProgressBar({ progress, color = 'iris', height = 6, wraps }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const value = useSharedValue(0);
  const last = useRef(0);

  useEffect(() => {
    const next = clamp(progress);
    if (wraps && next < last.current) {
      value.set(
        withSequence(
          withTiming(1, { duration: 450, easing: EASE }),
          withTiming(0, { duration: 0 }),
          withTiming(next, { duration: 600, easing: EASE }),
        ),
      );
    } else {
      value.set(withTiming(next, { duration: 700, easing: EASE }));
    }
    last.current = next;
  }, [progress, wraps, value]);

  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: (value.get() - 1) * width }] }));

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className="w-full overflow-hidden rounded-full bg-fg/[0.07]"
      style={{ height }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(progress) * 100) }}>
      {width > 0 ? (
        <Animated.View style={[{ width, height, borderRadius: height / 2, backgroundColor: theme.color(color) }, fill]} />
      ) : null}
    </View>
  );
}
