import { z } from 'zod';

import type { Day } from '@/lib/dates';
import {
  achievementWithProgressSchema,
  dayScoreSchema,
  outcomeSchema,
  streakCalendarSchema,
  summarySchema,
} from '@/types/api';

import { request } from './api/client';

const dayResult = z.object({ day: dayScoreSchema });

/** Scores, streaks and achievements: everything that measures progress. */
export const progressApi = {
  summary: (date: Day) => request('/scores/summary', { query: { date }, schema: summarySchema }),

  scores: async (from: Day, to: Day) =>
    (await request('/scores', { query: { from, to }, schema: z.object({ scores: z.array(dayScoreSchema) }) })).scores,

  /** Closes out a day. Idempotent; never changes the score. */
  finishDay: (date: Day) => request(`/scores/${date}/finish`, { method: 'PUT', schema: dayResult }),

  reopenDay: (date: Day) => request(`/scores/${date}/finish`, { method: 'DELETE', schema: dayResult }),

  streaks: () => request('/streaks', { schema: streakCalendarSchema }),

  /** Protects a day (today or later) so it neither breaks nor extends the streak. */
  planRestDay: (date: Day) =>
    request(`/streaks/rest-days/${date}`, {
      method: 'PUT',
      schema: z.object({ restDaysLeftThisWeek: z.number(), outcome: outcomeSchema }),
    }),

  cancelRestDay: (date: Day) =>
    request(`/streaks/rest-days/${date}`, {
      method: 'DELETE',
      schema: z.object({ restDaysLeftThisWeek: z.number(), outcome: outcomeSchema }),
    }),

  achievements: async () =>
    (await request('/achievements', { schema: z.object({ achievements: z.array(achievementWithProgressSchema) }) }))
      .achievements,
};
