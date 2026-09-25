import { z } from 'zod';

import {
  achievementWithProgressSchema,
  inboxSchema,
  meSchema,
  profileSchema,
  socialUserSchema,
} from '@/types/api';

import { request } from './api/client';

const meResult = z.object({ user: meSchema });

export type UpdateMeInput = Partial<{
  displayName: string;
  username: string;
  bio: string | null;
  timezone: string;
  isPrivate: boolean;
  shareActivity: boolean;
}>;

export const usersApi = {
  me: async () => (await request('/users/me', { schema: meResult })).user,

  updateMe: async (patch: UpdateMeInput) => (await request('/users/me', { method: 'PATCH', body: patch, schema: meResult })).user,

  /** `image` is a base64 JPEG, already resized on the device. */
  setAvatar: async (image: string) =>
    (await request('/users/me/avatar', { method: 'PUT', body: { image }, schema: meResult })).user,

  removeAvatar: async () => (await request('/users/me/avatar', { method: 'DELETE', schema: meResult })).user,

  inbox: () => request('/users/me/inbox', { schema: inboxSchema }),

  profile: (username: string) => request(`/users/${encodeURIComponent(username)}`, { schema: profileSchema }),

  achievements: async (username: string) =>
    (
      await request(`/users/${encodeURIComponent(username)}/achievements`, {
        schema: z.object({ achievements: z.array(achievementWithProgressSchema) }),
      })
    ).achievements,

  connections: async (username: string, direction: 'followers' | 'following') =>
    (
      await request(`/users/${encodeURIComponent(username)}/${direction}`, {
        schema: z.object({ users: z.array(socialUserSchema) }),
      })
    ).users,

  search: async (q: string) =>
    (await request('/users/search', { query: { q }, schema: z.object({ users: z.array(socialUserSchema) }) })).users,
};
