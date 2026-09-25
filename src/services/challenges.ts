import { z } from 'zod';

import type { Day } from '@/lib/dates';
import {
  challengeDetailSchema,
  challengeInviteSchema,
  challengeSchema,
  invitableSchema,
  type ChallengeMetric,
  type HabitCategory,
} from '@/types/api';

import { request } from './api/client';

export type CreateChallengeInput = {
  title: string;
  description?: string | null;
  metric: ChallengeMetric;
  habitCategory?: HabitCategory | null;
  target: number;
  startDate: Day;
  endDate: Day;
  visibility: 'PUBLIC' | 'FRIENDS';
  inviteUserIds?: string[];
};

export const challengesApi = {
  list: async (scope: 'joined' | 'discover') =>
    (await request('/challenges', { query: { scope }, schema: z.object({ challenges: z.array(challengeSchema) }) }))
      .challenges,

  invites: async () =>
    (await request('/challenges/invites', { schema: z.object({ invites: z.array(challengeInviteSchema) }) })).invites,

  get: (id: string) => request(`/challenges/${id}`, { schema: challengeDetailSchema }),

  create: (input: CreateChallengeInput) =>
    request('/challenges', { method: 'POST', body: input, schema: challengeDetailSchema }),

  remove: (id: string) => request(`/challenges/${id}`, { method: 'DELETE' }),

  join: (id: string) => request(`/challenges/${id}/membership`, { method: 'PUT', schema: challengeDetailSchema }),

  leave: (id: string) => request(`/challenges/${id}/membership`, { method: 'DELETE' }),

  invitable: async (id: string) =>
    (await request(`/challenges/${id}/invites`, { schema: z.object({ people: z.array(invitableSchema) }) })).people,

  invite: (id: string, userIds: string[]) =>
    request(`/challenges/${id}/invites`, { method: 'POST', body: { userIds }, schema: z.object({ invited: z.number() }) }),

  declineInvite: (id: string) => request(`/challenges/${id}/invites/me`, { method: 'DELETE' }),
};
