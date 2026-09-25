import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@/lib/theme';

import { Button } from './button';
import { Confetti } from './confetti';
import type { IconName } from './icon';
import { Medal } from './medal';
import { Text } from './text';

export type UnlockContent = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon: IconName;
  tint: ColorToken;
  /** Filled pips for a milestone ladder: `{ tier: 2 }` → ●●. */
  tier?: number;
  xpReward?: number;
  confetti?: boolean;
};

const MEDAL = 120;
const SPARKS = 10;

/** One ring that expands out of the medal as it lands, like a struck bell. */
function Pulse({ tint }: { tint: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(160, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) })));
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: (1 - t.get()) * 0.7,
    transform: [{ scale: 0.9 + t.get() * 1.1 }],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', width: MEDAL, height: MEDAL, borderRadius: MEDAL / 2, borderWidth: 2, borderColor: tint }, style]}
    />
  );
}

/** Small dots flung outward from the medal as it lands. */
function Spark({ angle, distance, tint, delay }: { angle: number; distance: number; tint: string; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) })));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() < 0.5 ? 1 : 1 - (t.get() - 0.5) / 0.5,
    transform: [
      { translateX: Math.cos(angle) * distance * t.get() },
      { translateY: Math.sin(angle) * distance * t.get() },
      { scale: 1 - t.get() * 0.5 },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: tint }, style]} />;
}

function Reveal({ content, reduced }: { content: UnlockContent; reduced: boolean }) {
  const { color } = useTheme();
  const scale = useSharedValue(reduced ? 1 : 0.85);
  const shine = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    scale.set(withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    shine.set(withDelay(500, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) })));
  }, [reduced, scale, shine]);

  const medalStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -MEDAL + shine.get() * MEDAL * 2 }, { rotate: '20deg' }],
  }));

  const sparks = useMemo(
    () =>
      Array.from({ length: SPARKS }, (_, index) => ({
        angle: (index / SPARKS) * Math.PI * 2 + 0.3,
        distance: 96 + (index % 2) * 18,
        tint: color(content.tint, index % 2 === 0 ? 1 : 0.6),
        delay: 140 + (index % 3) * 30,
      })),
    [color, content.tint],
  );

  return (
    <View style={{ width: 260, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      {reduced ? null : (
        <>
          <Pulse tint={color(content.tint, 0.6)} />
          {sparks.map((spark, index) => (
            <Spark key={index} {...spark} />
          ))}
        </>
      )}
      <Animated.View style={[{ width: MEDAL, height: MEDAL, borderRadius: MEDAL / 2, overflow: 'hidden' }, medalStyle]}>
        <Medal icon={content.icon} tint={content.tint} size={MEDAL} />
        <Animated.View
          style={[{ position: 'absolute', top: -20, bottom: -20, width: 28, backgroundColor: 'rgba(255,255,255,0.3)' }, shineStyle]}
        />
      </Animated.View>
    </View>
  );
}

function Pips({ tier, tint }: { tier: number; tint: string }) {
  return (
    <View className="flex-row items-center gap-1.5" accessibilityLabel={`Tier ${tier}`}>
      {Array.from({ length: Math.max(tier, 1) }, (_, index) => (
        <Animated.View
          key={index}
          entering={FadeIn.delay(650 + index * 80).duration(220)}
          style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tint }}
        />
      ))}
    </View>
  );
}

/**
 * The full-screen reveal for moments that deserve a pause: achievements, level ups, perfect
 * weeks, streak milestones, challenge wins. The medal lands with one pulse, a spray of
 * sparks and a single light sweep; Reduce Motion keeps just the content.
 */
export function UnlockOverlay({ content, onDismiss }: { content: UnlockContent; onDismiss: () => void }) {
  const reduced = useReducedMotion();
  const { color } = useTheme();
  const enter = (delay: number) => (reduced ? FadeIn.duration(150) : FadeInDown.delay(delay).duration(220));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(180)}
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive">
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.66)' }]}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      />
      {content.confetti ? <Confetti count={40} seed={content.title.length * 31} tints={[content.tint, 'amber']} /> : null}
      <View style={{ pointerEvents: 'box-none', flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Reveal content={content} reduced={reduced} />
        <View className="w-full items-center gap-2 rounded-[28px] border border-hairline bg-surface px-6 pb-5 pt-6">
          <Animated.View entering={enter(320)}>
            <Text variant="overline" style={{ color: color(content.tint) }}>
              {content.eyebrow}
            </Text>
          </Animated.View>
          <Animated.View entering={enter(390)}>
            <Text variant="title" className="text-center text-[26px] leading-[32px]" accessibilityRole="header">
              {content.title}
            </Text>
          </Animated.View>
          {content.subtitle ? (
            <Animated.View entering={enter(460)}>
              <Text variant="body" tone="muted" className="text-center">
                {content.subtitle}
              </Text>
            </Animated.View>
          ) : null}
          {content.tier || content.xpReward ? (
            <Animated.View entering={FadeIn.delay(reduced ? 0 : 600)} className="mt-1 flex-row items-center gap-3">
              {content.tier ? <Pips tier={content.tier} tint={color(content.tint)} /> : null}
              {content.xpReward ? (
                <View className="rounded-full bg-iris/[0.12] px-2.5 py-1">
                  <Text variant="callout" tone="iris" className="font-inter-semibold tabular-nums">
                    +{content.xpReward} XP
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          ) : null}
          <Animated.View entering={enter(650)} className="mt-4 w-full">
            <Button label="Continue" onPress={onDismiss} />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}
