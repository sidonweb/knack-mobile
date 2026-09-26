import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { Icon, safeIconName, type IconName } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { useTheme } from '@/hooks/use-theme';
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
      return { icon: 'star', tint: 'sky', text: <>had a <Bold>Perfect Week</Bold></> };
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

/** A tinted strip that restates the moment at a glance. */
function Highlight({ icon, tint, children }: { icon: IconName; tint: 'mint' | 'sky' | 'ember' | 'iris' | 'amber'; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View className="flex-row items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: color(tint, 0.1) }}>
      <Icon name={icon} size={16} color={tint} />
      <Text variant="footnote" tone={tint} className="font-inter-medium">
        {children}
      </Text>
    </View>
  );
}

/** A glanceable detail under the sentence for the moments that carry numbers. */
function Detail({ item, entry }: { item: FeedItemType; entry: FeedEntry }) {
  const data = item.data as Data;
  const unlocks = entry.kind === 'achievements' ? entry.items : item.type === 'ACHIEVEMENT_UNLOCKED' ? [item] : [];
  if (unlocks.length > 0) {
    return (
      <View className="flex-row flex-wrap gap-2">
        {unlocks.slice(0, 6).map((achievement) => {
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
        {unlocks.length > 6 ? (
          <Text variant="footnote" tone="subtle" className="self-center">
            +{unlocks.length - 6} more
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
  if (item.type === 'PERFECT_DAY') return <Highlight icon="checkmark-circle" tint="mint">Everything planned, done</Highlight>;
  if (item.type === 'PERFECT_WEEK') return <Highlight icon="star" tint="sky">Seven perfect days in a row</Highlight>;
  return null;
}

/** "17h ago"; "now" and dates stay as they are. */
const ago = (iso: string) => {
  const relative = timeAgo(iso);
  return /^\d+[mhd]$/.test(relative) ? `${relative} ago` : relative;
};

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
    <Animated.View entering={FadeIn.duration(220)} className={item.hidden ? 'opacity-60' : ''}>
      <Card padded={false} className="flex-row gap-3.5 p-4">
        <Link href={{ pathname: '/users/[username]', params: { username: item.user.username } }} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={`${item.user.displayName}'s profile`}>
            <Avatar name={item.user.displayName} url={item.user.avatarUrl} size={40} />
          </Pressable>
        </Link>
        <View className="flex-1 gap-3">
          <View className="flex-row items-start gap-2">
            <Pressable
              disabled={!challengeLink}
              onPress={() => item.challengeId && router.push({ pathname: '/challenges/[id]', params: { id: item.challengeId } })}
              className="flex-1 gap-1">
              <Text variant="body">
                <Bold>{item.isMine ? 'You' : item.user.displayName}</Bold> <Text tone="muted">{text}</Text>
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Icon name={entry.kind === 'achievements' ? 'ribbon' : described.icon} size={13} color={entry.kind === 'achievements' ? 'amber' : described.tint} />
                <Text variant="footnote" tone="subtle">
                  {ago(item.createdAt)}
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
            {item.isMine ? (
              <Pressable
                onPress={openMenu}
                hitSlop={10}
                accessibilityLabel="Activity options"
                className="-mr-1 -mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-fg/[0.04]">
                <Icon name="ellipsis-horizontal" size={16} color="subtle" />
              </Pressable>
            ) : challengeLink ? (
              <Icon name="chevron-forward" size={16} color="subtle" />
            ) : null}
          </View>
          <Detail item={item} entry={entry} />
          <ReactionBar item={item} onReact={(type) => onReact(item, type)} onOpenReactions={() => onOpenReactions(item)} />
        </View>
      </Card>
    </Animated.View>
  );
}
