import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { IconName } from '@/components/icon';
import { categoryInfo } from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { challengesApi, type CreateChallengeInput } from '@/services/challenges';
import { usersApi } from '@/services/users';
import type { Challenge, ChallengeDetail, ChallengeMetric, HabitCategory, Inbox, SocialUser } from '@/types/api';

import { useMe } from '../profile/hooks';

type MetricInfo = { label: string; unit: string; singular: string; icon: IconName; explain: string; daily: boolean };

export const METRICS: Record<ChallengeMetric, MetricInfo> = {
  CATEGORY_DAYS: {
    label: 'Habit days',
    unit: 'days',
    singular: 'day',
    icon: 'repeat',
    explain: 'Days you complete a habit of a chosen kind.',
    daily: true,
  },
  ACTIVE_DAYS: {
    label: 'No zero days',
    unit: 'days',
    singular: 'day',
    icon: 'pulse',
    explain: 'Days you get anything done at all.',
    daily: true,
  },
  QUALIFYING_DAYS: {
    label: 'Days that count',
    unit: 'days',
    singular: 'day',
    icon: 'flame',
    explain: 'Days scoring 60 or more, the streak threshold.',
    daily: true,
  },
  PERFECT_DAYS: {
    label: 'Perfect days',
    unit: 'days',
    singular: 'day',
    icon: 'checkmark-done',
    explain: 'Days you finish everything you planned.',
    daily: true,
  },
  TASKS_COMPLETED: { label: 'Tasks completed', unit: 'tasks', singular: 'task', icon: 'checkbox-outline', explain: 'Every task you tick off.', daily: false },
  HABIT_CHECKINS: { label: 'Habits completed', unit: 'habits', singular: 'habit', icon: 'leaf-outline', explain: 'Every habit you complete.', daily: false },
  XP: { label: 'XP earned', unit: 'XP', singular: 'XP', icon: 'sparkles-outline', explain: 'All XP earned in the window.', daily: false },
};

/** "Workout days", "Perfect days"… */
export function metricLabel(challenge: Pick<Challenge, 'metric' | 'habitCategory'>) {
  if (challenge.metric === 'CATEGORY_DAYS') return `${categoryInfo(challenge.habitCategory).label} days`;
  return METRICS[challenge.metric].label;
}

export function metricIcon(challenge: Pick<Challenge, 'metric' | 'habitCategory'>): IconName {
  return challenge.metric === 'CATEGORY_DAYS' ? categoryInfo(challenge.habitCategory).icon : METRICS[challenge.metric].icon;
}

/** "1 day", "25 days", "500 XP". */
export function formatTarget(metric: ChallengeMetric, count: number) {
  const labels = METRICS[metric];
  return `${count.toLocaleString()} ${count === 1 ? labels.singular : labels.unit}`;
}

export type ChallengeTemplate = {
  key: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  habitCategory?: HabitCategory;
  duration: number;
  target: number;
};

/** One tap to a well-shaped challenge; every field stays editable. */
export const TEMPLATES: ChallengeTemplate[] = [
  {
    key: 'workout',
    title: '30 Day Workout',
    description: 'Train on 25 of the next 30 days. Any workout habit counts.',
    metric: 'CATEGORY_DAYS',
    habitCategory: 'WORKOUT',
    duration: 30,
    target: 25,
  },
  {
    key: 'no-zero',
    title: 'No Zero Days',
    description: 'Get at least one thing done every single day. No zeros.',
    metric: 'ACTIVE_DAYS',
    duration: 30,
    target: 30,
  },
  {
    key: 'reading',
    title: '30 Day Reading',
    description: 'Read every day for a month.',
    metric: 'CATEGORY_DAYS',
    habitCategory: 'READING',
    duration: 30,
    target: 30,
  },
  {
    key: 'early',
    title: 'Early Morning Challenge',
    description: 'Hit your early-morning habit 21 days in a row.',
    metric: 'CATEGORY_DAYS',
    habitCategory: 'EARLY_MORNING',
    duration: 21,
    target: 21,
  },
  {
    key: 'streak',
    title: 'Two Week Streak',
    description: 'Score 60 or more every day for 14 days.',
    metric: 'QUALIFYING_DAYS',
    duration: 14,
    target: 14,
  },
  {
    key: 'perfect-week',
    title: 'Perfect Week',
    description: 'Finish everything you plan, seven days straight.',
    metric: 'PERFECT_DAYS',
    duration: 7,
    target: 7,
  },
];

export function useChallenges(scope: 'joined' | 'discover') {
  return useQuery({ queryKey: queryKeys.challenges(scope), queryFn: () => challengesApi.list(scope) });
}

export function useChallenge(id: string) {
  return useQuery({ queryKey: queryKeys.challenge(id), queryFn: () => challengesApi.get(id) });
}

export function useChallengeInvites() {
  return useQuery({ queryKey: queryKeys.challengeInvites, queryFn: challengesApi.invites });
}

export function useInvitable(id: string) {
  return useQuery({ queryKey: queryKeys.invitable(id), queryFn: () => challengesApi.invitable(id) });
}

/** Everyone the user is connected with either way: who they can invite to a new challenge. */
export function useMyConnections() {
  const username = useMe().data?.username ?? '';
  return useQuery({
    queryKey: ['connections', username, 'all'],
    enabled: username.length > 0,
    queryFn: async () => {
      const [followers, following] = await Promise.all([
        usersApi.connections(username, 'followers'),
        usersApi.connections(username, 'following'),
      ]);
      const byId = new Map<string, SocialUser>();
      for (const user of [...following, ...followers]) if (!byId.has(user.id)) byId.set(user.id, user);
      return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
    },
  });
}

function useInvalidateChallenges() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['challenges'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.challengeInvites });
    void queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
  };
}

function useChallengeMutation<TInput>(mutationFn: (input: TInput) => Promise<ChallengeDetail>) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn,
    onSuccess: (detail) => {
      haptics.success();
      queryClient.setQueryData(queryKeys.challenge(detail.challenge.id), detail);
      invalidate();
    },
  });
}

export const useCreateChallenge = () => useChallengeMutation((input: CreateChallengeInput) => challengesApi.create(input));
export const useJoinChallenge = () => useChallengeMutation((id: string) => challengesApi.join(id));

export function useLeaveChallenge() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (id: string) => challengesApi.leave(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.challenge(id) });
      invalidate();
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (id: string) => challengesApi.declineInvite(id),
    onMutate: (id) => {
      haptics.tap();
      queryClient.setQueryData<{ challenge: Challenge }[]>(queryKeys.challengeInvites, (old) =>
        old?.filter((invite) => invite.challenge.id !== id),
      );
      queryClient.setQueryData<Inbox>(queryKeys.inbox, (old) =>
        old ? { ...old, challengeInvites: Math.max(0, old.challengeInvites - 1) } : old,
      );
    },
    onSettled: (_data, _error, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.challenge(id) });
      invalidate();
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (id: string) => challengesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.challenge(id) });
      invalidate();
    },
  });
}

export function useInvite(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) => challengesApi.invite(id, userIds),
    onSuccess: () => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitable(id) });
    },
  });
}
