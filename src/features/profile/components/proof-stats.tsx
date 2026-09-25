import { StatGrid, type Stat } from '@/components/stat-grid';
import { categoryInfo } from '@/lib/categories';
import { formatMonth } from '@/lib/format';
import type { Consistency } from '@/types/api';

/** Every number on the profile is derived from history on the server; nothing is self-reported. */
export function ProofStats({ consistency }: { consistency: Consistency }) {
  const stats: Stat[] = [
    {
      icon: 'speedometer-outline',
      tint: 'ember',
      value: consistency.averageScore ?? 0,
      suffix: '%',
      label: 'Average score',
      caption: consistency.averageScore30 === null ? undefined : `${consistency.averageScore30}% last 30 days`,
    },
    { icon: 'trophy-outline', tint: 'amber', value: consistency.longestStreak, label: 'Longest streak', caption: 'days' },
    { icon: 'checkmark-circle-outline', tint: 'mint', value: consistency.tasksCompleted, label: 'Tasks done' },
    { icon: 'repeat', tint: 'iris', value: consistency.habitsCompleted, label: 'Habit check-ins' },
    { icon: 'checkmark-done', tint: 'mint', value: consistency.perfectDays, label: 'Perfect days' },
    { icon: 'star-outline', tint: 'sky', value: consistency.perfectWeeks, label: 'Perfect weeks' },
    ...consistency.categoryDays.slice(0, 2).map(({ category, days }): Stat => {
      const info = categoryInfo(category);
      return { icon: info.icon, tint: info.tint, value: days, label: `${info.label} days` };
    }),
    {
      icon: 'calendar-outline',
      tint: 'rose',
      value: consistency.highScoreMonths,
      label: '90%+ months',
      caption: consistency.bestMonth ? `Best ${formatMonth(consistency.bestMonth.month)} · ${consistency.bestMonth.average}%` : undefined,
    },
    { icon: 'flag-outline', tint: 'mint', value: consistency.challengesCompleted, label: 'Challenges won' },
  ];

  return <StatGrid stats={stats} />;
}
