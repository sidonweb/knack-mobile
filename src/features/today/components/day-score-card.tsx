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
import { AnimatedNumber } from '@/components/animated-number';
import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { ProgressRing } from '@/components/progress-ring';
import { Text, type TextTone } from '@/components/text';
import { useTheme } from '@/hooks/use-theme';
import type { DayProgress } from '@/lib/scoring';
import type { Summary } from '@/types/api';

import type { StreakDisplay } from '../hooks';

type Props = {
  progress: DayProgress;
  streak: StreakDisplay;
  summary?: Summary;
  isToday: boolean;
  finished: boolean;
};

const RING = 130;
const STROKE = 12;

/** One expanding ring off the score the moment it climbs to 100 (not when it loads at 100). */
function CompletionBurst({ score, tint }: { score: number; tint: string }) {
  const t = useSharedValue(0);
  const last = useRef(score);
  useEffect(() => {
    if (score === 100 && last.current < 100) {
      t.set(0);
      t.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    }
    last.current = score;
  }, [score, t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, 0.1, 1], [0, 0.4, 0]),
    transform: [{ scale: interpolate(t.get(), [0, 1], [1, 1.2]) }],
  }));
  return (
    <AnimatedView
      style={[
        { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: STROKE / 2, borderColor: tint, pointerEvents: 'none' },
        style,
      ]}
    />
  );
}

function StatRow({ label, value, tone = 'default', divider }: { label: string; value: string; tone?: TextTone; divider?: boolean }) {
  return (
    <View
      className={`flex-row items-baseline justify-between py-2.5 ${divider ? 'border-t border-gray-200' : ''}`}
      accessible
      accessibilityLabel={`${label} ${value}`}>
      <Text variant="footnote" tone="muted">
        {label}
      </Text>
      <Text variant="numeral" tone={tone} className="text-[17px] leading-[22px]">
        {value}
      </Text>
    </View>
  );
}

/** The day at a glance: the weighted score beside what went into it, then the level. */
export function DayScoreCard({ progress, streak, summary, isToday }: Props) {
  const { color } = useTheme();
  const level = summary?.progress;
  const perfect = progress.score === 100;

  return (
    <Card className="gap-5">
      <View className="flex-row items-center gap-5">
        <View className="items-center justify-center">
          <CompletionBurst score={progress.score} tint={color('mint')} />
          <ProgressRing
            progress={progress.score / 100}
            size={RING}
            strokeWidth={STROKE}
            from={perfect ? 'mint' : 'ember'}
            to={perfect ? 'sky' : 'amber'}
            marker={isToday && !streak.secured ? streak.minScore / 100 : undefined}>
            <View className="items-center">
              <AnimatedNumber
                variant="hero"
                value={progress.score}
                className="text-[40px] leading-[48px] tracking-[-1.5px]"
                accessibilityLabel={`Day score ${progress.score} out of 100`}
              />
              <Text variant="overline" tone="subtle" className="text-[10px] text-center">
                Score
              </Text>
            </View>
          </ProgressRing>
        </View>

        <View className="flex-1">
          <StatRow label="Tasks" value={`${progress.tasksCompleted}/${progress.tasksPlanned}`} />
          <StatRow divider label="Habits" value={`${progress.habitsCompleted}/${progress.habitsScheduled}`} />
          <StatRow divider label="XP today" value={`+${summary?.day.xpEarned ?? 0}`} tone="iris" />
        </View>
      </View>

      {level ? (
        <View className="gap-2" accessible accessibilityLabel={`Level ${level.level}, ${level.levelXp} of ${level.levelXpRequired} XP`}>
          <View className="flex-row items-baseline justify-between">
            <Text variant="callout">Level {level.level}</Text>
            <Text variant="caption" tone="subtle" className="tabular-nums">
              {(level.levelXpRequired - level.levelXp).toLocaleString()} XP to level {level.level + 1}
            </Text>
          </View>
          <ProgressBar progress={level.progress} color="iris" height={4} wraps />
        </View>
      ) : null}
    </Card>
  );
}
