import { useEffect, useId, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** 0–1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  from?: ColorToken;
  to?: ColorToken;
  /** 0–1: draws a small tick on the track, e.g. the streak threshold. */
  marker?: number;
  children?: ReactNode;
};

/** Apple Fitness–style ring with a soft two-stop gradient and an eased fill. */
export function ProgressRing({ progress, size = 160, strokeWidth = 12, from = 'ember', to = 'amber', marker, children }: Props) {
  const { color } = useTheme();
  const gradientId = useId().replace(/:/g, '');
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animated = useSharedValue(0);
  useEffect(() => {
    animated.set(
      withTiming(Math.min(Math.max(progress, 0), 1), {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [animated, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.get()),
  }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color(from)} />
            <Stop offset="1" stopColor={color(to)} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color('fg', 0.07)}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
        />
        {marker !== undefined && progress < marker ? (
          <Circle
            cx={size / 2 + radius * Math.cos(2 * Math.PI * marker)}
            cy={size / 2 + radius * Math.sin(2 * Math.PI * marker)}
            r={strokeWidth / 5}
            fill={color('fg', 0.35)}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
