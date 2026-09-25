import { z } from 'zod';

import {
  feedPageSchema,
  followRequestSchema,
  followStates,
  leaderboardSchema,
  reactionEntrySchema,
  type ReactionType,
} from '@/types/api';

import { request } from './api/client';

export const socialApi = {
  leaderboard: () => request('/friends/leaderboard', { schema: leaderboardSchema }),

  /** Follows, or requests to follow a private account. */
  follow: (userId: string) =>
    request(`/friends/following/${userId}`, { method: 'PUT', schema: z.object({ followState: z.enum(followStates) }) }),
  /** Unfollows, or withdraws a pending request. */
  unfollow: (userId: string) => request(`/friends/following/${userId}`, { method: 'DELETE' }),
  removeFollower: (userId: string) => request(`/friends/followers/${userId}`, { method: 'DELETE' }),

  requests: async () =>
    (await request('/friends/requests', { schema: z.object({ requests: z.array(followRequestSchema) }) })).requests,
  acceptRequest: (userId: string) => request(`/friends/requests/${userId}`, { method: 'PUT' }),
  declineRequest: (userId: string) => request(`/friends/requests/${userId}`, { method: 'DELETE' }),

  feed: (params: { cursor?: string; userId?: string; limit?: number }) =>
    request('/activity', { query: { limit: 20, ...params }, schema: feedPageSchema }),

  react: (activityId: string, type: ReactionType) =>
    request(`/activity/${activityId}/reaction`, { method: 'PUT', body: { type } }),
  unreact: (activityId: string) => request(`/activity/${activityId}/reaction`, { method: 'DELETE' }),
  reactions: async (activityId: string) =>
    (await request(`/activity/${activityId}/reactions`, { schema: z.object({ reactions: z.array(reactionEntrySchema) }) }))
      .reactions,

  /** Owner only: hide an item from everyone else, or show it again. */
  setHidden: (activityId: string, hidden: boolean) =>
    request(`/activity/${activityId}`, { method: 'PATCH', body: { hidden } }),
};
