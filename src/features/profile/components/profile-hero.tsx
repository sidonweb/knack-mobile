import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/animated-number';
import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { ProgressRing } from '@/components/progress-ring';
import { Text } from '@/components/text';
import { categoryInfo } from '@/lib/categories';
import { formatMonthYear, plural } from '@/lib/format';
import type { Profile } from '@/types/api';

function Headline({ value, label, suffix = '', index }: { value: number; label: string; suffix?: string; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(300 + index * 80).duration(220)} className="flex-1 gap-0.5">
      <AnimatedNumber
        from={0}
        value={value}
        delay={350 + index * 80}
        duration={900}
        format={(n) => `${n.toLocaleString()}${suffix}`}
        variant="title"
        className="tabular-nums"
      />
      <Text variant="footnote" tone="subtle" numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

type Props = { profile: Profile; action?: ReactNode };

/**
 * The card people screenshot: who they are, the streak in big type, and three numbers that
 * took showing up to earn.
 */
export function ProfileHero({ profile, action }: Props) {
  const { user, stats, consistency } = profile;
  const streak = consistency?.currentStreak ?? user.currentStreak;
  const topCategory = consistency?.categoryDays[0];

  return (
    <Animated.View entering={FadeIn.duration(250)} className="overflow-hidden rounded-card border border-hairline bg-surface">
      <View className="gap-5 p-5">
        <View className="flex-row items-center gap-4">
          <Avatar name={user.displayName} url={user.avatarUrl} size={72} ring={streak > 0 ? 'ember' : undefined} />
          <View className="flex-1 gap-1">
            <Text variant="title" numberOfLines={1} accessibilityRole="header">
              {user.displayName}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text variant="footnote" tone="subtle">
                @{user.username}
              </Text>
              {user.isPrivate ? <Icon name="lock-closed" size={11} color="subtle" /> : null}
            </View>
          </View>
          <ProgressRing progress={consistency?.progress.progress ?? 0} size={58} strokeWidth={5} from="iris" to="sky">
            <Text variant="overline" tone="subtle" className="text-[8px] leading-[10px]">
              Level
            </Text>
            <Text variant="numeral" className="text-[18px] leading-[20px]">
              {user.level}
            </Text>
          </ProgressRing>
        </View>

        {user.bio ? (
          <Text variant="body" tone="muted">
            {user.bio}
          </Text>
        ) : null}

        <View className="flex-row items-end gap-3">
          <View className="mb-2.5">
            <Icon name="flame" size={30} color={streak > 0 ? 'ember' : 'subtle'} />
          </View>
          <AnimatedNumber
            from={0}
            value={streak}
            duration={1000}
            variant="hero"
            accessibilityLabel={`${streak} day streak`}
          />
          <View className="mb-1.5">
            <Text variant="overline" tone={streak > 0 ? 'ember' : 'subtle'}>
              Day streak
            </Text>
            <Text variant="footnote" tone="subtle">
              Best {consistency?.longestStreak ?? user.longestStreak}
            </Text>
          </View>
        </View>

        {consistency ? (
          <View className="flex-row gap-3 border-t border-hairline pt-4">
            <Headline index={0} value={consistency.averageScore ?? 0} suffix="%" label="Average score" />
            <Headline index={1} value={consistency.tasksCompleted} label="Tasks done" />
            {topCategory ? (
              <Headline index={2} value={topCategory.days} label={`${categoryInfo(topCategory.category).label} days`} />
            ) : (
              <Headline index={2} value={consistency.perfectDays} label="Perfect days" />
            )}
          </View>
        ) : null}

        <View className="flex-row items-center gap-5">
          <Link href={{ pathname: '/connections', params: { username: user.username, tab: 'followers' } }} asChild disabled={!profile.canView}>
            <Pressable hitSlop={6} accessibilityRole="link">
              <Text variant="footnote" tone="subtle">
                <Text variant="footnote" className="font-inter-semibold">
                  {stats.followers}
                </Text>{' '}
                {stats.followers === 1 ? 'follower' : 'followers'}
              </Text>
            </Pressable>
          </Link>
          <Link href={{ pathname: '/connections', params: { username: user.username, tab: 'following' } }} asChild disabled={!profile.canView}>
            <Pressable hitSlop={6} accessibilityRole="link">
              <Text variant="footnote" tone="subtle">
                <Text variant="footnote" className="font-inter-semibold">
                  {stats.following}
                </Text>{' '}
                following
              </Text>
            </Pressable>
          </Link>
          {consistency ? (
            <Text variant="footnote" tone="subtle" className="flex-1 text-right" numberOfLines={1}>
              Since {formatMonthYear(consistency.memberSince)}
            </Text>
          ) : null}
        </View>

        {consistency && consistency.qualifyingDays > 0 ? (
          <Text variant="footnote" tone="muted" className="-mt-2">
            {plural(consistency.qualifyingDays, 'day')} that counted
            {profile.followsMe && !profile.isMe ? ' · Follows you' : ''}
          </Text>
        ) : profile.followsMe && !profile.isMe ? (
          <Text variant="footnote" tone="muted" className="-mt-2">
            Follows you
          </Text>
        ) : null}

        {action}
      </View>
    </Animated.View>
  );
}
