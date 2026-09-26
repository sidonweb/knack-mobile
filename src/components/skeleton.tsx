import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

import { AnimatedView } from './animated-view';

type Props = { width?: DimensionValue; height?: number; radius?: number };

/** A placeholder block that breathes gently while content loads. Static under Reduce Motion. */
export function Skeleton({ width = '100%', height = 14, radius = 6 }: Props) {
  const { color } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduced) return;
    opacity.set(withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [opacity, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <AnimatedView
      style={[{ width, height, borderRadius: radius, backgroundColor: color('fg', 0.07) }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** Stand-in for a list of rows (tasks, people, feed items). */
export function SkeletonRows({ count = 3, avatar = false, inset = true }: { count?: number; avatar?: boolean; inset?: boolean }) {
  return (
    <View accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className={`flex-row items-center gap-3.5 py-3.5 ${inset ? 'px-5' : ''}`}>
          <Skeleton width={avatar ? 40 : 24} height={avatar ? 40 : 24} radius={avatar ? 20 : 12} />
          <View className="flex-1 gap-2">
            <Skeleton width={`${70 - index * 12}%`} height={12} />
            {avatar ? <Skeleton width="40%" height={10} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
