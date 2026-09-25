import { cssInterop } from 'nativewind';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Components created at runtime aren't known to NativeWind; map className → style explicitly.
cssInterop(AnimatedPressable, { className: 'style' });

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** How far to shrink on press. Subtle by default. */
  scaleTo?: number;
};

/** Pressable that dips slightly while held: the app's base micro-interaction. No rebound. */
export function PressableScale({ children, className, style, scaleTo = 0.98, onPressIn, onPressOut, ...props }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
      className={className}
      style={[animatedStyle, style]}
      onPressIn={(event) => {
        scale.set(withTiming(scaleTo, { duration: 90, easing: Easing.out(Easing.cubic) }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }));
        onPressOut?.(event);
      }}>
      {children}
    </AnimatedPressable>
  );
}
