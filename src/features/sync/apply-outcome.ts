import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { pendingOps } from '@/services/sync/outbox';
import { rebaseSummary } from '@/services/sync/rebase';
import { useCelebrations } from '@/store/celebrations';
import type { Achievement, Me, Outcome, Summary } from '@/types/api';

/** Streak lengths that earn the full-screen reveal. */
export const STREAK_MILESTONES = new Set([3, 7, 14, 30, 50, 100, 200, 365]);

/**
 * Folds a server outcome into the caches and queues the moments worth celebrating.
 * The server is authoritative for score, XP, streak and unlocks.
 */
export function applyOutcome(outcome: Outcome) {
  const previousStreak = queryClient.getQueryData<Me>(queryKeys.me)?.currentStreak ?? 0;

  const pending = pendingOps();
  for (const day of outcome.days) {
    queryClient.setQueryData<Summary>(queryKeys.summary(day.date), (old) =>
      old ? rebaseSummary({ ...old, day, streak: outcome.streak, progress: outcome.progress }, day.date, pending) : old,
    );
  }
  // Streak and level are global: every cached day's header should agree.
  queryClient.setQueriesData<Summary>({ queryKey: ['summary'] }, (old) =>
    old ? { ...old, streak: outcome.streak, progress: outcome.progress } : old,
  );
  queryClient.setQueryData<Me>(queryKeys.me, (old) =>
    old
      ? {
          ...old,
          level: outcome.progress.level,
          progress: outcome.progress,
          currentStreak: outcome.streak.current,
          longestStreak: outcome.streak.longest,
        }
      : old,
  );
  void queryClient.invalidateQueries({ queryKey: queryKeys.streaks });
  // The profile's numbers (average, totals, calendar) move with every scored write.
  void queryClient.invalidateQueries({ queryKey: ['profile'] });
  if (outcome.unlocked.length > 0) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
    void queryClient.invalidateQueries({ queryKey: ['profile-achievements'] });
  }
  if (outcome.completedChallenges.length > 0) {
    void queryClient.invalidateQueries({ queryKey: ['challenges'] });
    void queryClient.invalidateQueries({ queryKey: ['challenge'] });
  }
  if (outcome.unlocked.length > 0 || outcome.perfectWeek || outcome.habitStreaks.length > 0 || outcome.levelUp) {
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
  }

  const { push } = useCelebrations.getState();
  if (outcome.xpDelta > 0) push({ kind: 'xp', amount: outcome.xpDelta });
  if (outcome.streak.current > previousStreak && STREAK_MILESTONES.has(outcome.streak.current)) {
    push({ kind: 'streak', days: outcome.streak.current });
  }
  if (outcome.perfectWeek) push({ kind: 'perfectWeek' });
  for (const streak of outcome.habitStreaks) push({ kind: 'habitStreak', ...streak });
  pushAchievements(outcome.unlocked);
  if (outcome.levelUp) push({ kind: 'level', level: outcome.levelUp });
  for (const challenge of outcome.completedChallenges) push({ kind: 'challenge', title: challenge.title });
}

/** Most reveals the user sits through for one write. The rest wait on the profile. */
const MAX_ACHIEVEMENT_REVEALS = 2;

function pushAchievements(unlocked: Achievement[]) {
  const { push } = useCelebrations.getState();
  // Biggest milestones first; a backlog (e.g. after a long offline stretch) is summarised.
  const ranked = [...unlocked].sort((a, b) => b.tier - a.tier || b.xpReward - a.xpReward);
  const shown = ranked.length > MAX_ACHIEVEMENT_REVEALS ? ranked.slice(0, 1) : ranked;
  const extra = ranked.length - shown.length;
  for (const achievement of shown) {
    push({
      kind: 'achievement',
      name: achievement.name,
      description: extra > 0 ? `${achievement.description}. Plus ${extra} more on your profile.` : achievement.description,
      icon: achievement.icon,
      tier: achievement.tier,
      xpReward: extra > 0 ? unlocked.reduce((sum, entry) => sum + entry.xpReward, 0) : achievement.xpReward,
    });
  }
}
