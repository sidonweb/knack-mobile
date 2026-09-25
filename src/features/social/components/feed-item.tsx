import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Icon, safeIconName, type IconName } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { AchievementBadge } from '@/features/profile/components/achievement-badge';
import { categoryInfo } from '@/lib/categories';
import { timeAgo } from '@/lib/dates';
import { plural } from '@/lib/format';
import type { ColorToken } from '@/lib/theme';
import type { FeedItem as FeedItemType, HabitCategory, ReactionType } from '@/types/api';

import type { FeedEntry } from '../feed';
import { ReactionBar } from './reaction-bar';

type Data = Record<string, string | number | undefined>;

function Bold({ children }: { children: ReactNode }) {
  return (
    <Text variant="body" className="font-inter-semibold">
      {children}
    </Text>
  );
}

/** What happened, phrased around progress rather than the person. */
function describe(item: FeedItemType): { icon: IconName; tint: ColorToken; text: ReactNode } {
  const data = item.data as Data;
  switch (item.type) {
    case 'DAY_COMPLETED':
      return { icon: 'moon', tint: 'iris', text: <>closed out the day with a <Bold>{data.score}</Bold></> };
    case 'PERFECT_DAY':
      return { icon: 'checkmark-done', tint: 'mint', text: <>had a <Bold>perfect day</Bold></> };
    case 'PERFECT_WEEK':
      return { icon: 'star', tint: 'sky', text: <>had a <Bold>Perfect Week</Bold>, seven for seven</> };
    case 'STREAK_MILESTONE':
      return { icon: 'flame', tint: 'ember', text: <>reached a <Bold>{data.days} day streak</Bold></> };
    case 'HABIT_STREAK': {
      const length = Number(data.length);
      const unit = data.unit === 'week' ? 'week' : 'day';
      const category = (data.category as HabitCategory | undefined) ?? 'GENERAL';
      return {
        icon: safeIconName(String(data.icon ?? ''), 'flame'),
        tint: categoryInfo(category).tint,
        text:
          category === 'GENERAL' ? (
            <>hit <Bold>{plural(length, unit)}</Bold> straight of {data.name}</>
          ) : (
            <>reached a <Bold>{length} {unit} {categoryInfo(category).noun} streak</Bold></>
          ),
      };
    }
    case 'ACHIEVEMENT_UNLOCKED':
      return { icon: safeIconName(String(data.icon ?? ''), 'ribbon'), tint: 'amber', text: <>unlocked <Bold>{data.name}</Bold></> };
    case 'LEVEL_UP':
      return { icon: 'arrow-up-circle', tint: 'iris', text: <>reached <Bold>level {data.level}</Bold></> };
    case 'CHALLENGE_JOINED':
      return { icon: 'flag-outline', tint: 'sky', text: <>joined <Bold>{data.title}</Bold></> };
    case 'CHALLENGE_COMPLETED':
      return { icon: 'flag', tint: 'mint', text: <>completed <Bold>{data.title}</Bold></> };
  }
}

/** A glanceable detail under the sentence for the moments that carry numbers. */
function Detail({ item, entry }: { item: FeedItemType; entry: FeedEntry }) {
  const data = item.data as Data;
  if (entry.kind === 'achievements') {
    return (
      <View className="flex-row flex-wrap gap-2">
        {entry.items.slice(0, 6).map((achievement) => {
          const detail = achievement.data as Data;
          return (
            <View key={achievement.id} className="flex-row items-center gap-1.5 rounded-full bg-raised py-1 pl-1 pr-2.5">
              <AchievementBadge icon={String(detail.icon ?? '')} tier={Number(detail.tier ?? 1)} unlocked size={20} />
              <Text variant="footnote" numberOfLines={1}>
                {detail.name}
              </Text>
            </View>
          );
        })}
        {entry.items.length > 6 ? (
          <Text variant="footnote" tone="subtle" className="self-center">
            +{entry.items.length - 6} more
          </Text>
        ) : null}
      </View>
    );
  }
  if (item.type === 'DAY_COMPLETED' && typeof data.total === 'number' && data.total > 0) {
    const score = Number(data.score);
    return (
      <View className="flex-row items-center gap-3 rounded-2xl bg-raised px-3 py-2.5">
        <View className="flex-1">
          <ProgressBar progress={score / 100} color={score === 100 ? 'mint' : 'ember'} height={5} />
        </View>
        <Text variant="footnote" tone="muted" className="tabular-nums">
          {data.completed}/{data.total} done
        </Text>
      </View>
    );
  }
  return null;
}

type Props = {
  entry: FeedEntry;
  onReact: (item: FeedItemType, type: ReactionType | null) => void;
  onOpenReactions: (item: FeedItemType) => void;
  onToggleHidden: (item: FeedItemType) => void;
};

export function FeedItem({ entry, onReact, onOpenReactions, onToggleHidden }: Props) {
  const item = entry.kind === 'achievements' ? entry.lead : entry.item;
  const described = describe(item);
  const text =
    entry.kind === 'achievements' ? (
      <>unlocked <Bold>{entry.items.length} achievements</Bold></>
    ) : (
      described.text
    );

  const openMenu = () =>
    Alert.alert(item.hidden ? 'Hidden from friends' : 'Your activity', item.hidden ? 'Only you can see this.' : 'Friends who can see your profile see this.', [
      { text: 'Cancel', style: 'cancel' },
      { text: item.hidden ? 'Show to friends' : 'Hide from friends', onPress: () => onToggleHidden(item) },
    ]);

  const challengeLink = item.challengeId && (item.type === 'CHALLENGE_JOINED' || item.type === 'CHALLENGE_COMPLETED');

  return (
    <Animated.View entering={FadeIn.duration(220)} className={`flex-row gap-3.5 py-4 ${item.hidden ? 'opacity-60' : ''}`}>
      <Link href={{ pathname: '/users/[username]', params: { username: item.user.username } }} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={`${item.user.displayName}'s profile`}>
          <Avatar name={item.user.displayName} url={item.user.avatarUrl} size={40} />
        </Pressable>
      </Link>
      <View className="flex-1 gap-2.5">
        <Pressable
          disabled={!challengeLink}
          onPress={() => item.challengeId && router.push({ pathname: '/challenges/[id]', params: { id: item.challengeId } })}
          className="gap-1">
          <Text variant="body">
            <Bold>{item.isMine ? 'You' : item.user.displayName}</Bold> <Text tone="muted">{text}</Text>
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Icon name={entry.kind === 'achievements' ? 'ribbon' : described.icon} size={13} color={entry.kind === 'achievements' ? 'amber' : described.tint} />
            <Text variant="footnote" tone="subtle">
              {timeAgo(item.createdAt)}
            </Text>
            {item.hidden ? (
              <View className="ml-1 flex-row items-center gap-1 rounded-full bg-fg/[0.06] px-2 py-0.5">
                <Icon name="eye-off-outline" size={11} color="subtle" />
                <Text variant="caption" tone="subtle">
                  Hidden
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        <Detail item={item} entry={entry} />
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <ReactionBar item={item} onReact={(type) => onReact(item, type)} onOpenReactions={() => onOpenReactions(item)} />
          </View>
          {item.isMine ? (
            <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="Activity options" className="h-8 w-8 items-center justify-center">
              <Icon name="ellipsis-horizontal" size={16} color="subtle" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}
