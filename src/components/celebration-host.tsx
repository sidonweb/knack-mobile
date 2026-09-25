import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tierTint } from '@/features/profile/components/achievement-badge';
import { haptics } from '@/lib/haptics';
import type { ColorToken } from '@/lib/theme';
import { isMajor, useCelebrations, type Celebration } from '@/store/celebrations';

import { Icon, safeIconName, type IconName } from './icon';
import { Text } from './text';
import { UnlockOverlay, type UnlockContent } from './unlock-overlay';

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'}`;

function capsule(item: Celebration): { icon: IconName; tint: ColorToken; title: string; subtitle?: string } {
  switch (item.kind) {
    case 'xp':
      return { icon: 'sparkles', tint: 'iris', title: `+${item.amount} XP` };
    case 'streakSecured':
      return {
        icon: 'flame',
        tint: 'ember',
        title: item.days === 1 ? 'Streak started' : `${item.days}-day streak`,
        subtitle: 'Today counts',
      };
    case 'habitStreak':
      return {
        icon: safeIconName(item.icon, 'flame'),
        tint: 'ember',
        title: `${plural(item.length, item.unit)} of ${item.name}`,
        subtitle: 'Habit streak',
      };
    default:
      return { icon: 'sparkles', tint: 'iris', title: '' };
  }
}

function reveal(item: Celebration): UnlockContent | null {
  switch (item.kind) {
    case 'achievement':
      return {
        eyebrow: 'Achievement unlocked',
        title: item.name,
        subtitle: item.description,
        icon: safeIconName(item.icon, 'ribbon'),
        tint: tierTint(item.tier),
        tier: item.tier,
        xpReward: item.xpReward || undefined,
      };
    case 'level':
      return {
        eyebrow: 'Level up',
        title: `Level ${item.level}`,
        subtitle: 'Every day you showed up got you here.',
        icon: 'arrow-up',
        tint: 'iris',
        confetti: true,
      };
    case 'streak':
      return {
        eyebrow: 'Streak milestone',
        title: `${item.days} days in a row`,
        subtitle: item.days >= 30 ? 'That’s not luck. That’s who you are now.' : 'The chain is getting hard to break.',
        icon: 'flame',
        tint: 'ember',
        confetti: item.days >= 30,
      };
    case 'perfectWeek':
      return {
        eyebrow: 'Perfect week',
        title: 'Seven for seven',
        subtitle: 'Every day this week, everything you planned. Done.',
        icon: 'star',
        tint: 'mint',
        confetti: true,
      };
    case 'challenge':
      return {
        eyebrow: 'Challenge complete',
        title: item.title,
        subtitle: 'Target hit. The leaderboard noticed.',
        icon: 'flag',
        tint: 'mint',
        confetti: true,
      };
    case 'habitStreak':
      return {
        eyebrow: 'Habit streak',
        title: `${plural(item.length, item.unit)} of ${item.name}`,
        subtitle: 'Not a single one missed.',
        icon: safeIconName(item.icon, 'flame'),
        tint: 'ember',
      };
    default:
      return null;
  }
}

/**
 * Shows queued celebrations one at a time: small wins as a floating capsule, big ones as a
 * full-screen reveal the user dismisses. Both are announced to screen readers.
 */
export function CelebrationHost() {
  const insets = useSafeAreaInsets();
  const current = useCelebrations((state) => state.queue[0]);
  const dismiss = useCelebrations((state) => state.dismiss);
  const major = current ? isMajor(current) : false;

  useEffect(() => {
    if (!current) return;
    if (major) {
      haptics.celebrate();
      const content = reveal(current);
      if (content) AccessibilityInfo.announceForAccessibility(`${content.eyebrow}. ${content.title}`);
      // Dismiss eventually so a forgotten reveal never blocks the app.
      const timer = setTimeout(() => dismiss(current.id), 9000);
      return () => clearTimeout(timer);
    }
    const { title, subtitle } = capsule(current);
    AccessibilityInfo.announceForAccessibility(subtitle ? `${title}. ${subtitle}` : title);
    if (current.kind !== 'xp') haptics.success();
    const timer = setTimeout(() => dismiss(current.id), current.kind === 'xp' ? 1500 : 2600);
    return () => clearTimeout(timer);
  }, [current, major, dismiss]);

  if (!current) return null;

  if (major) {
    const content = reveal(current);
    if (content) return <UnlockOverlay key={current.id} content={content} onDismiss={() => dismiss(current.id)} />;
  }

  const { icon, tint, title, subtitle } = capsule(current);
  return (
    <View style={{ pointerEvents: 'none', position: 'absolute', top: insets.top + 8, left: 0, right: 0, alignItems: 'center' }}>
      <Animated.View key={current.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)}>
        <View
          className="flex-row items-center gap-2.5 rounded-full border border-hairline bg-surface py-2 pl-2 pr-4"
          style={{ boxShadow: '0px 8px 24px rgba(0,0,0,0.12)' }}>
          <View className="h-7 w-7 items-center justify-center rounded-full bg-fg/[0.06]">
            <Icon name={icon} size={15} color={tint} />
          </View>
          <View>
            <Text variant="callout" className="font-inter-semibold tabular-nums">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" tone="muted">
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
