import type { ReactNode } from 'react';
import { Share, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { SectionHeader } from '@/components/screen';
import { categoryInfo } from '@/lib/categories';
import { firstName, plural } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { Profile } from '@/types/api';

import { AchievementShowcase } from './achievement-showcase';
import { ConsistencyCalendar } from './consistency-calendar';
import { HabitStatsList } from './habit-stats-list';
import { ProfileHero } from './profile-hero';
import { ProofStats } from './proof-stats';

/** A plain-text brag that reads well in any chat app. */
export function shareProfile(profile: Profile) {
  haptics.tap();
  const { user, consistency } = profile;
  const lines = [`${user.displayName} on Rally (@${user.username})`];
  if (consistency) {
    lines.push(`🔥 ${plural(consistency.currentStreak, 'day')} streak · best ${consistency.longestStreak}`);
    if (consistency.averageScore !== null) lines.push(`📈 ${consistency.averageScore}% average daily score`);
    lines.push(`✅ ${plural(consistency.tasksCompleted, 'task')} completed`);
    const top = consistency.categoryDays[0];
    if (top) lines.push(`${categoryInfo(top.category).label}: ${plural(top.days, 'day')}`);
    if (profile.achievements) lines.push(`🏅 ${profile.achievements.unlocked} achievements`);
  }
  void Share.share({ message: lines.join('\n') });
}

type Props = {
  profile: Profile;
  /** Follow button, or the owner's edit actions. */
  action?: ReactNode;
  children?: ReactNode;
};

/**
 * A person's proof of consistency: the hero card, their half-year calendar, the numbers
 * behind it, per-habit streaks and their best badges. Private accounts show the card only.
 */
export function ProfileView({ profile, action, children }: Props) {
  const { consistency, calendar, habits, achievements } = profile;

  return (
    <>
      <ProfileHero profile={profile} action={action} />

      {!profile.canView ? (
        <EmptyState
          icon="lock-closed-outline"
          title="This account is private"
          message={
            profile.followState === 'requested'
              ? `Request sent. Once ${firstName(profile.user.displayName)} approves, you’ll see their calendar, habits and achievements.`
              : `Follow ${firstName(profile.user.displayName)} to see their calendar, habits and achievements.`
          }
        />
      ) : null}

      {calendar && consistency ? <ConsistencyCalendar calendar={calendar} minScore={consistency.minScore} /> : null}

      {consistency ? (
        <View className="gap-3">
          <SectionHeader title="Proof of consistency" />
          <ProofStats consistency={consistency} />
        </View>
      ) : null}

      {habits && habits.length > 0 ? (
        <View className="gap-3">
          <SectionHeader title={`Habits · ${habits.length}`} />
          <HabitStatsList habits={habits} />
        </View>
      ) : null}

      {achievements ? (
        <AchievementShowcase
          username={profile.user.username}
          unlocked={achievements.unlocked}
          total={achievements.total}
          showcase={achievements.showcase}
        />
      ) : null}

      {children}
    </>
  );
}
