import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedView } from '@/components/animated-view';
import { AnimatedNumber } from '@/components/animated-number';
import { Button } from '@/components/button';
import { Confetti } from '@/components/confetti';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ProgressRing } from '@/components/progress-ring';
import { Text } from '@/components/text';
import {
  useDayActions,
  useDayProgress,
  useRestDay,
  useStreakDisplay,
  useSummary,
  useTasks,
  type StreakDisplay,
} from '@/features/today/hooks';
import { useMe } from '@/features/profile/hooks';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong, relativeDayName, today } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import type { DayProgress } from '@/lib/scoring';
import { errorMessage } from '@/services/api/errors';

function verdict(progress: DayProgress, minScore: number): { title: string; message: string } {
  if (progress.empty) return { title: 'A quiet day.', message: 'Nothing was planned. Tomorrow is a blank page.' };
  if (progress.score === 100) return { title: 'Perfect day.', message: 'Everything you planned, done.' };
  if (progress.score >= 80) return { title: 'Strong day.', message: 'The important things got done.' };
  if (progress.score >= minScore) return { title: 'Solid day.', message: 'Enough to keep the chain going.' };
  if (progress.score > 0) return { title: 'Progress is progress.', message: 'Every check counted. Go again tomorrow.' };
  return { title: 'Fresh start tomorrow.', message: 'Rest up. The streak starts with one good day.' };
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'iris' }) {
  return (
    <View className="flex-1 items-center gap-0.5 py-4" accessible accessibilityLabel={`${label} ${value}`}>
      <Text variant="numeral" tone={tone} className="text-[20px] leading-[24px]">
        {value}
      </Text>
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
    </View>
  );
}

function StreakCard({ streak, isToday, restDaysLeft, onRest, resting }: {
  streak: StreakDisplay;
  isToday: boolean;
  restDaysLeft: number;
  onRest: () => void;
  resting: boolean;
}) {
  const flame = useSharedValue(0.9);
  useEffect(() => {
    flame.set(
      withDelay(
        900,
        streak.secured
          ? withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
          : withTiming(1, { duration: 300 }),
      ),
    );
  }, [flame, streak.secured]);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flame.get() }] }));

  const days = (n: number) => `${n}-day streak`;
  const atRisk = isToday && !streak.secured && !streak.resting && streak.base > 0;

  let title: string;
  let caption: string;
  if (streak.secured) {
    title = days(streak.current);
    caption = streak.current >= streak.longest ? 'Your longest yet.' : `Best: ${streak.longest} days`;
  } else if (streak.resting) {
    title = 'Rest day';
    caption = streak.base > 0 ? `Your ${days(streak.base)} is safe.` : 'Recharge. The streak starts tomorrow.';
  } else if (atRisk) {
    title = `Score ${streak.minScore} to keep it`;
    caption = `Your ${days(streak.base)} ends if today doesn't count.`;
  } else {
    title = 'No streak yet';
    caption = `Any day scoring ${streak.minScore}+ starts one.`;
  }

  return (
    <Animated.View entering={FadeInDown.delay(850).duration(220)} className="gap-4 rounded-card border border-hairline bg-surface p-5">
      <View className="flex-row items-center gap-4">
        <View
          className={`h-14 w-14 items-center justify-center rounded-full ${streak.secured ? 'bg-ember/15' : streak.resting ? 'bg-sky/15' : 'bg-raised'}`}>
          <AnimatedView style={flameStyle}>
            <Icon
              name={streak.resting && !streak.secured ? 'moon' : 'flame'}
              size={28}
              color={streak.secured ? 'ember' : streak.resting ? 'sky' : 'subtle'}
            />
          </AnimatedView>
        </View>
        <View className="flex-1 gap-0.5">
          {streak.secured ? (
            <Text variant="title" tone="ember">
              <AnimatedNumber variant="title" tone="ember" from={streak.base} value={streak.current} delay={1050} duration={500} />
              -day streak
            </Text>
          ) : (
            <Text variant="headline">{title}</Text>
          )}
          <Text variant="footnote" tone="muted">
            {caption}
          </Text>
        </View>
      </View>
      {atRisk && restDaysLeft > 0 && !resting ? (
        <Pressable
          onPress={onRest}
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-2xl border border-hairline px-4 py-3 active:opacity-70">
          <Icon name="moon-outline" size={18} color="sky" />
          <View className="flex-1">
            <Text variant="callout">Take a rest day</Text>
            <Text variant="footnote" tone="subtle">
              Protects your streak · {restDaysLeft} left this week
            </Text>
          </View>
          <Icon name="chevron-forward" size={16} color="subtle" />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export default function DayCompleteScreen() {
  const params = useLocalSearchParams<{ date?: string; auto?: string }>();
  const date = params.date ?? today();
  const auto = params.auto === '1';
  const insets = useSafeAreaInsets();
  const { color } = useTheme();

  const summary = useSummary(date);
  const tasks = useTasks(date);
  const progress = useDayProgress(date);
  const streak = useStreakDisplay(date, progress);
  const dayActions = useDayActions(date);
  const restDay = useRestDay(date);
  const sharing = useMe().data?.shareActivity ?? false;

  const isToday = date === today();
  const finished = Boolean(summary.data?.day.finishedAt);
  const unfinished = (tasks.data ?? []).filter((task) => !task.completed);
  const [rollover, setRollover] = useState(true);
  const perfect = progress.score === 100;
  const { title, message } = verdict(progress, streak.minScore);

  const finish = () => {
    dayActions.finish({ rollover: rollover ? unfinished : [] });
    router.back();
  };

  const takeRestDay = () =>
    restDay.mutate({ rest: true }, { onError: (error) => Alert.alert('Could not plan a rest day', errorMessage(error)) });

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      {perfect ? <Confetti tints={['mint', 'sky']} /> : null}

      <View className="flex-row items-center justify-between px-5 pt-2">
        <Text variant="overline" tone="subtle">
          {isToday ? formatDayLong(date) : `${relativeDayName(date)} · ${formatDayLong(date)}`}
        </Text>
        <IconButton icon="close" label="Close" color="muted" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerClassName="gap-6 px-5 pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <View className="items-center gap-5 pt-2">
          <Animated.View entering={FadeIn.duration(220)}>
            <ProgressRing
              progress={progress.score / 100}
              size={196}
              strokeWidth={14}
              from={perfect ? 'mint' : 'ember'}
              to={perfect ? 'sky' : 'amber'}>
              <AnimatedNumber
                variant="hero"
                from={0}
                value={progress.score}
                duration={1100}
                delay={150}
                accessibilityLabel={`Day score ${progress.score}`}
              />
              <Text variant="overline" tone="subtle">
                Day score
              </Text>
            </ProgressRing>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).duration(220)} className="items-center gap-1.5">
            <Text variant="display" className="text-center" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="body" tone="muted" className="text-center">
              {message}
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(500).duration(220)} className="flex-row items-center rounded-card border border-hairline bg-surface">
          <Stat label="Tasks" value={`${progress.tasksCompleted}/${progress.tasksPlanned}`} />
          <View className="h-8 w-px bg-hairline" />
          <Stat label="Habits" value={`${progress.habitsCompleted}/${progress.habitsScheduled}`} />
          <View className="h-8 w-px bg-hairline" />
          <Stat label="XP earned" value={`+${summary.data?.day.xpEarned ?? 0}`} tone="iris" />
        </Animated.View>

        <StreakCard
          streak={streak}
          isToday={isToday}
          restDaysLeft={summary.data?.restDaysLeftThisWeek ?? 0}
          resting={restDay.isPending || streak.resting}
          onRest={takeRestDay}
        />

        {!finished && unfinished.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(1000).duration(220)} className="flex-row items-center gap-4 rounded-card border border-hairline bg-surface p-5">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-raised">
              <Icon name="arrow-redo-outline" size={18} color="muted" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text variant="callout">
                Carry {unfinished.length} unfinished {unfinished.length === 1 ? 'task' : 'tasks'} over
              </Text>
              <Text variant="footnote" tone="subtle" numberOfLines={2}>
                To the top of tomorrow. They still count as unfinished today.
              </Text>
            </View>
            <Switch
              value={rollover}
              onValueChange={(value) => {
                haptics.tap();
                setRollover(value);
              }}
              trackColor={{ true: color('mint'), false: color('hairline') }}
              accessibilityLabel="Carry unfinished tasks over to tomorrow"
            />
          </Animated.View>
        ) : null}
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(700)} className="gap-2 px-5 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
        {finished ? (
          <>
            <Button label="Done" onPress={() => router.back()} />
            <Button
              label="Reopen day"
              variant="ghost"
              onPress={() => {
                dayActions.reopen();
                router.back();
              }}
            />
          </>
        ) : (
          <>
            <Button label={isToday ? 'Finish the day' : 'Close out the day'} icon="checkmark-done" onPress={finish} />
            {sharing && !progress.empty ? (
              <Text variant="footnote" tone="subtle" className="text-center">
                Friends will see you closed out the day with a {progress.score}.
              </Text>
            ) : null}
            <Button label={auto ? 'Keep going' : 'Not yet'} variant="ghost" onPress={() => router.back()} />
          </>
        )}
      </Animated.View>
    </View>
  );
}
