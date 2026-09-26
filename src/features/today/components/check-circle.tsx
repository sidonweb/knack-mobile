import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedView } from '@/components/animated-view';
import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@/lib/theme';

type Props = { checked: boolean; tint?: ColorToken; size?: number };

/**
 * Round checkbox. Checking it eases the fill in and sends a faint ring outwards; unchecking
 * drains the fill. Nothing animates on first render.
 */
export function CheckCircle({ checked, tint = 'mint', size = 24 }: Props) {
  const { color } = useTheme();
  const fill = useSharedValue(checked ? 1 : 0);
  const burst = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    fill.set(withTiming(checked ? 1 : 0, { duration: checked ? 220 : 160, easing: Easing.out(Easing.cubic) }));
    if (checked) {
      burst.set(0);
      burst.set(withTiming(1, { duration: 520 }));
    }
  }, [checked, fill, burst]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fill.get(), [0, 0.3], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(fill.get(), [0, 1], [0.6, 1]) }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fill.get(), [0.5, 1], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(fill.get(), [0.5, 1], [0.8, 1], 'clamp') }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.get(), [0, 0.15, 1], [0, 0.35, 0]),
    transform: [{ scale: interpolate(burst.get(), [0, 1], [1, 1.7]) }],
  }));

  const circle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={circle}>
      <AnimatedView
        style={[circle, { position: 'absolute', borderWidth: 2, borderColor: color(tint), pointerEvents: 'none' }, burstStyle]}
      />
      <View style={[circle, { position: 'absolute', borderWidth: 1.5, borderColor: color('subtle') }]} />
      <AnimatedView
        style={[circle, { position: 'absolute', backgroundColor: color(tint), alignItems: 'center', justifyContent: 'center' }, fillStyle]}>
        <AnimatedView style={markStyle}>
          <Icon name="checkmark" size={size * 0.64} colorValue={color('canvas')} />
        </AnimatedView>
      </AnimatedView>
    </View>
  );
}
