import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AnimatedView } from '@/components/animated-view';
import { AnimatedNumber } from '@/components/animated-number';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorState, LoadingState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ProgressRing } from '@/components/progress-ring';
import { Screen, SectionHeader } from '@/components/screen';
import { Text } from '@/components/text';
import { StatusChip } from '@/features/challenges/components/challenge-card';
import {
  formatTarget,
  metricIcon,
  metricLabel,
  useChallenge,
  useDeclineInvite,
  useDeleteChallenge,
  useJoinChallenge,
  useLeaveChallenge,
} from '@/features/challenges/hooks';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthDay, today, toDay } from '@/lib/dates';
import { firstName, plural } from '@/lib/format';
import { errorMessage } from '@/services/api/errors';
import type { ChallengeDetail } from '@/types/api';

type Entry = ChallengeDetail['leaderboard'][number];

/** Where the viewer stands against an even pace to the target. */
function paceText(detail: ChallengeDetail): { text: string; tone: 'mint' | 'ember' | 'muted' } | null {
  const { challenge, stillPossible } = detail;
  const membership = challenge.membership;
  if (!membership) return null;
  if (membership.completedAt) {
    return { text: `Target hit ${formatMonthDay(toDay(new Date(membership.completedAt)))}`, tone: 'mint' };
  }
  if (challenge.status === 'UPCOMING') return { text: `Starts ${formatMonthDay(challenge.startDate)}`, tone: 'muted' };
  if (!stillPossible) return { text: 'Out of reach this time. Every day still counts on the board.', tone: 'muted' };
  if (challenge.status === 'ENDED') return { text: 'Challenge over', tone: 'muted' };
  const expected = (challenge.target * challenge.daysElapsed) / challenge.daysTotal;
  const gap = Math.round(membership.progress - expected);
  if (gap >= 1) return { text: `${gap} ahead of pace`, tone: 'mint' };
  if (gap <= -1) return { text: `${-gap} behind pace · ${plural(challenge.daysLeft + 1, 'day')} to catch up`, tone: 'ember' };
  return { text: 'Right on pace', tone: 'mint' };
}

/** One dot per day of the challenge so far: filled when it counted. */
function DayStrip({ days }: { days: NonNullable<ChallengeDetail['myDays']> }) {
  const { color } = useTheme();
  const now = today();
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {days.map((day, index) => (
        <Animated.View
          key={day.date}
          entering={FadeIn.delay(Math.min(index * 18, 500))}
          accessibilityLabel={`${day.date}: ${day.counted ? 'counted' : 'not counted'}`}
          style={{
            width: 14,
            height: 14,
            borderRadius: 4,
            backgroundColor: day.counted ? color('ember') : day.date === now ? 'transparent' : color('fg', 0.07),
            borderWidth: day.date === now && !day.counted ? 1.5 : 0,
            borderColor: color('ember', 0.6),
          }}
        />
      ))}
    </View>
  );
}

function PodiumColumn({ entry, height, delay, ended }: { entry: Entry; height: number; delay: number; ended: boolean }) {
  const { color } = useTheme();
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.set(withDelay(delay, withTiming(height, { duration: 600, easing: Easing.out(Easing.cubic) })));
  }, [rise, height, delay]);
  const style = useAnimatedStyle(() => ({ height: rise.get() }));
  const first = entry.rank === 1;

  return (
    <View className="flex-1 items-center gap-2">
      {first && ended ? <Icon name="trophy" size={18} color="amber" /> : <View className="h-[18px]" />}
      <Avatar name={entry.user.displayName} url={entry.user.avatarUrl} size={first ? 56 : 46} ring={first ? 'amber' : undefined} />
      <Text variant="footnote" numberOfLines={1} className="font-inter-medium">
        {entry.isMe ? 'You' : firstName(entry.user.displayName)}
      </Text>
      <AnimatedView
        style={[
          {
            width: '100%',
            alignItems: 'center',
            paddingTop: 8,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            backgroundColor: color(first ? 'amber' : 'fg', first ? 0.18 : 0.06),
          },
          style,
        ]}>
        <Text variant="numeral" tone={first ? 'default' : 'muted'} className="text-[18px]">
          {entry.progress}
        </Text>
        <Text variant="overline" tone="subtle">
          #{entry.rank}
        </Text>
      </AnimatedView>
    </View>
  );
}

function Podium({ leaders, ended }: { leaders: Entry[]; ended: boolean }) {
  const [first, second, third] = leaders;
  if (!first || !second) return null;
  return (
    <View className="flex-row items-end gap-2 px-2 pt-2">
      <PodiumColumn entry={second} height={78} delay={150} ended={ended} />
      <PodiumColumn entry={first} height={104} delay={0} ended={ended} />
      {third ? <PodiumColumn entry={third} height={60} delay={300} ended={ended} /> : <View className="flex-1" />}
    </View>
  );
}

function LeaderRow({ entry, index }: { entry: Entry; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(220)}
      className={`flex-row items-center gap-3 rounded-xl px-2 py-2.5 ${entry.isMe ? 'bg-raised' : ''}`}>
      <Text variant="numeral" tone={entry.rank <= 3 ? 'ember' : 'subtle'} className="w-6 text-center">
        {entry.rank}
      </Text>
      <Pressable
        onPress={() => router.push({ pathname: '/users/[username]', params: { username: entry.user.username } })}
        accessibilityRole="link"
        className="flex-1 flex-row items-center gap-3 active:opacity-60">
        <Avatar name={entry.user.displayName} url={entry.user.avatarUrl} size={36} />
        <Text variant="callout" className="flex-1" numberOfLines={1}>
          {entry.isMe ? 'You' : entry.user.displayName}
        </Text>
      </Pressable>
      {entry.completedAt ? <Icon name="checkmark-circle" size={16} color="mint" /> : null}
      <Text variant="numeral" tone={entry.completedAt ? 'mint' : 'default'}>
        {entry.progress.toLocaleString()}
      </Text>
    </Animated.View>
  );
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useChallenge(id);
  const join = useJoinChallenge();
  const leave = useLeaveChallenge();
  const decline = useDeclineInvite();
  const remove = useDeleteChallenge();

  const data = detail.data;
  const onError = (error: unknown) => Alert.alert('Something went wrong', errorMessage(error));

  if (!data) {
    return (
      <View className="flex-1 justify-center bg-canvas">
        {detail.isError ? (
          <ErrorState title="This challenge isn’t available" error={detail.error} onRetry={() => void detail.refetch()} />
        ) : (
          <LoadingState />
        )}
      </View>
    );
  }

  const { challenge, leaderboard } = data;
  const membership = challenge.membership;
  const done = Boolean(membership?.completedAt);
  const ended = challenge.status === 'ENDED';
  const pace = paceText(data);
  const myRank = leaderboard.find((entry) => entry.isMe)?.rank ?? data.me?.rank;
  const showPodium = leaderboard.length >= 2 && leaderboard.some((entry) => entry.progress > 0);

  const confirmLeave = () =>
    Alert.alert('Leave this challenge?', 'Your progress comes off the leaderboard. You can rejoin while it’s running.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leave.mutate(challenge.id, { onError }) },
    ]);

  const openMenu = () =>
    Alert.alert(challenge.title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete challenge',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete for everyone?', 'Every member loses this challenge and its leaderboard.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => remove.mutate(challenge.id, { onSuccess: () => router.back(), onError }),
            },
          ]),
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: challenge.isCreator
            ? () => (
                <IconButton icon="ellipsis-horizontal" label="Challenge options" variant="plain" onPress={openMenu} />
              )
            : undefined,
        }}
      />
      <Screen topInset={false} refreshing={detail.isRefetching} onRefresh={() => void detail.refetch()}>
        <Animated.View entering={FadeIn} className="gap-2">
          <View className="flex-row items-center gap-2">
            <StatusChip challenge={challenge} />
            <Text variant="footnote" tone="subtle">
              {formatMonthDay(challenge.startDate)} – {formatMonthDay(challenge.endDate)} · {plural(challenge.memberCount, 'member')}
            </Text>
          </View>
          <Text variant="display">{challenge.title}</Text>
          {challenge.description ? (
            <Text variant="body" tone="muted">
              {challenge.description}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-1.5 pt-1">
            <Icon name={metricIcon(challenge)} size={14} color="ember" />
            <Text variant="callout" tone="muted">
              {metricLabel(challenge)} · target {formatTarget(challenge.metric, challenge.target)}
            </Text>
          </View>
        </Animated.View>

        {!membership && data.invitedBy && !ended ? (
          <Animated.View entering={FadeInDown.duration(220)} className="flex-row items-center gap-3 rounded-card border border-ember/30 bg-ember/[0.06] p-4">
            <Avatar name={data.invitedBy.displayName} url={data.invitedBy.avatarUrl} size={36} />
            <Text variant="callout" className="flex-1">
              {firstName(data.invitedBy.displayName)} invited you
            </Text>
            <Button label="Not now" size="sm" variant="ghost" onPress={() => decline.mutate(challenge.id)} />
          </Animated.View>
        ) : null}

        <Card className="items-center gap-5 py-7">
          <ProgressRing progress={membership ? membership.progress / challenge.target : 0} size={168} strokeWidth={13} from={done ? 'mint' : 'ember'} to={done ? 'sky' : 'amber'}>
            {done ? <Icon name="checkmark-circle" size={20} color="mint" /> : null}
            <AnimatedNumber variant="display" from={0} value={membership?.progress ?? 0} duration={900} />
            <Text variant="footnote" tone="subtle">
              of {formatTarget(challenge.metric, challenge.target)}
            </Text>
          </ProgressRing>

          {pace ? (
            <Text variant="callout" tone={pace.tone} className="text-center">
              {pace.text}
            </Text>
          ) : null}

          {membership ? (
            <View className="w-full flex-row gap-2 px-1">
              {[
                { label: ended ? 'Finished' : 'Days left', value: ended ? '—' : String(challenge.daysLeft) },
                { label: 'Your rank', value: myRank ? `#${myRank}` : '—' },
                { label: 'Hit target', value: `${data.completedCount}/${challenge.memberCount}` },
              ].map((stat) => (
                <View key={stat.label} className="flex-1 items-center gap-0.5 py-1" accessible accessibilityLabel={`${stat.label} ${stat.value}`}>
                  <Text variant="numeral" className="text-[18px]">
                    {stat.value}
                  </Text>
                  <Text variant="caption" tone="subtle">
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {data.myDays && data.myDays.length > 0 ? (
            <View className="w-full gap-2 px-1">
              <Text variant="overline" tone="subtle">
                Your days
              </Text>
              <DayStrip days={data.myDays} />
            </View>
          ) : null}

          <View className="w-full gap-2 px-1">
            {!membership && !ended ? (
              <Button label={data.invitedBy ? 'Accept & join' : 'Join challenge'} icon="flag" loading={join.isPending} onPress={() => join.mutate(challenge.id, { onError })} />
            ) : null}
            {data.canInvite ? (
              <Button
                label="Invite friends"
                icon="person-add-outline"
                variant="secondary"
                onPress={() => router.push({ pathname: '/challenges/invite', params: { id: challenge.id } })}
              />
            ) : null}
            {ended && !membership ? (
              <Text variant="callout" tone="muted" className="text-center">
                This challenge has ended
              </Text>
            ) : null}
          </View>
        </Card>

        <View className="gap-2">
          <SectionHeader title={ended ? 'Final standings' : 'Leaderboard'} />
          {showPodium ? <Podium leaders={leaderboard.slice(0, 3)} ended={ended} /> : null}
          <View className="gap-0.5">
            {(showPodium ? leaderboard.slice(3) : leaderboard).map((entry, index) => (
              <LeaderRow key={entry.user.id} entry={entry} index={index} />
            ))}
            {data.me ? (
              <View className="border-t border-hairline pt-1">
                <LeaderRow entry={data.me} index={0} />
              </View>
            ) : null}
          </View>
        </View>

        {membership && !ended ? (
          <Button variant="ghost" size="sm" label="Leave challenge" loading={leave.isPending} onPress={confirmLeave} />
        ) : null}
      </Screen>
    </>
  );
}
