import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@/lib/theme';

const DEFAULT_TINTS: ColorToken[] = ['mint', 'sky', 'amber'];

/** Deterministic PRNG (mulberry32), so the burst is scattered but render stays pure. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PieceSpec = {
  x: number;
  drift: number;
  delay: number;
  duration: number;
  spin: number;
  width: number;
  height: number;
  tint: string;
};

function Piece({ spec, fall }: { spec: PieceSpec; fall: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(spec.delay, withTiming(1, { duration: spec.duration, easing: Easing.out(Easing.quad) })));
  }, [progress, spec]);

  const style = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      opacity: t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25,
      transform: [
        { translateX: spec.x + Math.sin(t * Math.PI * 2) * spec.drift },
        { translateY: -30 + t * fall },
        { rotate: `${t * spec.spin}deg` },
        { rotateY: `${t * spec.spin * 1.5}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[{ position: 'absolute', width: spec.width, height: spec.height, borderRadius: 1.5, backgroundColor: spec.tint }, style]}
    />
  );
}

/**
 * A single, short burst of falling paper in the moment's own colours, for perfect days and
 * level ups only. Purely decorative, and skipped entirely under Reduce Motion.
 */
export function Confetti({ count = 44, seed = 7, tints = DEFAULT_TINTS }: { count?: number; seed?: number; tints?: ColorToken[] }) {
  const { width, height } = useWindowDimensions();
  const { color } = useTheme();
  const reduced = useReducedMotion();
  const tintKey = tints.join();

  const pieces = useMemo<PieceSpec[]>(() => {
    const random = seeded(seed);
    const palette = [...tintKey.split(','), 'fg'] as ColorToken[];
    return Array.from({ length: count }, (_, index) => ({
      x: random() * width,
      drift: 10 + random() * 22,
      delay: random() * 300,
      duration: 1700 + random() * 1200,
      spin: (random() > 0.5 ? 1 : -1) * (300 + random() * 420),
      width: 5 + random() * 4,
      height: 8 + random() * 7,
      // Mostly the moment's tints, with a few neutral flecks to keep it from reading as a rainbow.
      tint: color(palette[index % palette.length]!, palette[index % palette.length] === 'fg' ? 0.5 : 1),
    }));
  }, [count, seed, width, tintKey, color]);

  if (reduced) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none', overflow: 'hidden' }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {pieces.map((spec, index) => (
        <Piece key={index} spec={spec} fall={height * 0.9} />
      ))}
    </View>
  );
}
