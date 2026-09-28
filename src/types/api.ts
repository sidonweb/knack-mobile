/**
 * Response contracts for the Knack REST API. The backend is a separate project, so these
 * are deliberately declared here rather than shared; every response is parsed through
 * them, which turns silent contract drift into a loud error at the boundary.
 */
import { z } from 'zod';

const isoDateTime = z.string();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const levelProgressSchema = z.object({
  level: z.number(),
  xp: z.number(),
  levelXp: z.number(),
  levelXpRequired: z.number(),
  progress: z.number(),
});

export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  level: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  isPrivate: z.boolean(),
});

export const meSchema = publicUserSchema.extend({
  email: z.string(),
  timezone: z.string(),
  shareActivity: z.boolean(),
  // Defaults keep older API versions parseable.
  hasPassword: z.boolean().default(true),
  /** When the username can next be changed; null means now. */
  usernameChangeAvailableAt: isoDateTime.nullable().default(null),
  progress: levelProgressSchema,
  createdAt: isoDateTime,
});

export const sessionSchema = z.object({
  user: meSchema,
  tokens: z.object({ accessToken: z.string(), refreshToken: z.string() }),
});

export const priorities = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  date: day,
  priority: z.enum(priorities),
  sortOrder: z.number(),
  completed: z.boolean(),
  completedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const habitFrequencies = ['DAILY', 'WEEKLY'] as const;

export const habitCategories = [
  'GENERAL',
  'READING',
  'WORKOUT',
  'MINDFULNESS',
  'LEARNING',
  'HEALTH',
  'CREATIVE',
  'EARLY_MORNING',
] as const;

export const habitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string(),
  color: z.string(),
  category: z.enum(habitCategories),
  frequency: z.enum(habitFrequencies),
  daysOfWeek: z.array(z.number()),
  timesPerWeek: z.number(),
  targetCount: z.number(),
  priority: z.enum(priorities),
  sortOrder: z.number(),
  archivedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const habitStreakSchema = z.object({
  current: z.number(),
  longest: z.number(),
  unit: z.enum(['day', 'week']),
  /** First day (or week's Monday) of the current run. */
  startedOn: day.nullable().default(null),
});

export const habitDaySchema = habitSchema.extend({
  date: day,
  scheduled: z.boolean(),
  count: z.number(),
  completed: z.boolean(),
  /** Completed days in the ISO week containing `date`. */
  weekCount: z.number(),
  streak: habitStreakSchema,
  history: z.array(z.object({ date: day, scheduled: z.boolean(), completed: z.boolean() })),
});

export const habitDetailSchema = z.object({
  habit: habitSchema,
  stats: z.object({
    streak: habitStreakSchema,
    totalCompletions: z.number(),
    completionRate: z.number().nullable(),
    thisWeek: z.number(),
  }),
  history: z.array(
    z.object({ date: day, scheduled: z.boolean(), count: z.number(), completed: z.boolean(), future: z.boolean() }),
  ),
});

export const dayScoreSchema = z.object({
  date: day,
  /** Weighted 0–100. */
  score: z.number(),
  /** Unweighted share of items fully done, 0–100. */
  percentage: z.number(),
  completed: z.number(),
  total: z.number(),
  pointsEarned: z.number(),
  pointsPossible: z.number(),
  tasksPlanned: z.number(),
  tasksCompleted: z.number(),
  habitsScheduled: z.number(),
  habitsCompleted: z.number(),
  xpEarned: z.number(),
  qualifies: z.boolean(),
  finishedAt: isoDateTime.nullable(),
});

export const streakSchema = z.object({ current: z.number(), longest: z.number() });

export const achievementSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  metric: z.string(),
  category: z.enum(habitCategories).nullable(),
  threshold: z.number(),
  /** Achievements in a family are milestones on one ladder; tier is the rung (1, 2, 3…). */
  family: z.string(),
  tier: z.number(),
  xpReward: z.number(),
  unlockedAt: isoDateTime.nullable(),
});

/** Returned by every write that can move the score; drives celebration UI. */
export const outcomeSchema = z.object({
  days: z.array(dayScoreSchema),
  xpDelta: z.number(),
  progress: levelProgressSchema,
  levelUp: z.number().nullable(),
  streak: streakSchema,
  unlocked: z.array(achievementSchema),
  completedChallenges: z.array(z.object({ id: z.string(), title: z.string() })),
  /** Monday of a perfect week this write completed, the first time only. */
  perfectWeek: day.nullable().default(null),
  /** Single-habit streaks that reached a milestone with this write, the first time only. */
  habitStreaks: z
    .array(z.object({ habitId: z.string(), name: z.string(), icon: z.string(), length: z.number(), unit: z.enum(['day', 'week']) }))
    .default([]),
});

export const scoringRulesSchema = z.object({
  minScore: z.number(),
  weights: z.record(z.enum(priorities), z.number()),
});

export const summarySchema = z.object({
  today: day,
  day: dayScoreSchema,
  streak: streakSchema,
  progress: levelProgressSchema,
  rules: scoringRulesSchema,
  restDay: z.object({ kind: z.enum(['REST', 'FREEZE']) }).nullable(),
  restDaysLeftThisWeek: z.number(),
  /** Unfinished tasks moved off this day. They still count as planned and not done. */
  deferred: z.array(z.object({ taskId: z.string(), title: z.string(), priority: z.enum(priorities), movedTo: day })),
});

export const streakDayStatuses = ['qualified', 'protected', 'missed', 'pending', 'inactive', 'future'] as const;

export const streakCalendarSchema = z.object({
  current: z.number(),
  longest: z.number(),
  minScore: z.number(),
  restDaysPerWeek: z.number(),
  restDaysLeftThisWeek: z.number(),
  upcomingRestDays: z.array(day),
  calendar: z.array(
    z.object({ date: day, score: z.number(), qualified: z.boolean(), status: z.enum(streakDayStatuses) }),
  ),
});

export const achievementWithProgressSchema = achievementSchema.extend({
  current: z.number(),
  /** Percentage of all users who hold it. */
  rarity: z.number(),
});

export const followStates = ['none', 'requested', 'following'] as const;

export const habitStatsSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  category: z.enum(habitCategories),
  frequency: z.enum(habitFrequencies),
  timesPerWeek: z.number(),
  streak: habitStreakSchema,
  totalCompletions: z.number(),
  /** Last 30 days; null before anything was due. */
  completionRate: z.number().nullable(),
});

export const profileSchema = z.object({
  user: publicUserSchema,
  isMe: z.boolean(),
  followState: z.enum(followStates),
  followsMe: z.boolean(),
  /** False for a private account the viewer doesn't follow: only the card is shown. */
  canView: z.boolean(),
  stats: z.object({ followers: z.number(), following: z.number(), achievements: z.number() }),
  consistency: z
    .object({
      progress: levelProgressSchema,
      currentStreak: z.number(),
      longestStreak: z.number(),
      averageScore: z.number().nullable(),
      averageScore30: z.number().nullable(),
      tasksCompleted: z.number(),
      habitsCompleted: z.number(),
      perfectDays: z.number(),
      perfectWeeks: z.number(),
      highScoreMonths: z.number(),
      qualifyingDays: z.number(),
      challengesCompleted: z.number(),
      bestMonth: z.object({ month: day, average: z.number() }).nullable(),
      categoryDays: z.array(z.object({ category: z.enum(habitCategories), days: z.number() })),
      memberSince: day,
      minScore: z.number(),
    })
    .nullable(),
  calendar: z.array(z.object({ date: day, score: z.number(), status: z.enum(streakDayStatuses) })).nullable(),
  habits: z.array(habitStatsSchema).nullable(),
  achievements: z
    .object({ unlocked: z.number(), total: z.number(), showcase: z.array(achievementSchema) })
    .nullable(),
});

export const socialUserSchema = publicUserSchema.extend({
  followState: z.enum(followStates),
  isFollowing: z.boolean(),
});

export const followRequestSchema = z.object({ user: socialUserSchema, requestedAt: isoDateTime });

export const inboxSchema = z.object({ followRequests: z.number(), challengeInvites: z.number() });

export const activityTypes = [
  'PERFECT_DAY',
  'STREAK_MILESTONE',
  'ACHIEVEMENT_UNLOCKED',
  'LEVEL_UP',
  'CHALLENGE_JOINED',
  'CHALLENGE_COMPLETED',
  'DAY_COMPLETED',
  'PERFECT_WEEK',
  'HABIT_STREAK',
] as const;
export const reactionTypes = ['KUDOS', 'FIRE', 'CLAP', 'STRONG'] as const;

export const feedItemSchema = z.object({
  id: z.string(),
  type: z.enum(activityTypes),
  data: z.record(z.string(), z.unknown()),
  challengeId: z.string().nullable(),
  createdAt: isoDateTime,
  user: publicUserSchema,
  isMine: z.boolean(),
  /** Hidden by its owner: only they see it. */
  hidden: z.boolean(),
  reactionCount: z.number(),
  /** Counts per reaction, most used first. */
  reactions: z.array(z.object({ type: z.enum(reactionTypes), count: z.number() })),
  myReaction: z.enum(reactionTypes).nullable(),
});

export const reactionEntrySchema = z.object({ type: z.enum(reactionTypes), createdAt: isoDateTime, user: publicUserSchema });

export const feedPageSchema = z.object({ items: z.array(feedItemSchema), nextCursor: z.string().nullable() });

export const leaderboardSchema = z.object({
  from: day,
  to: day,
  entries: z.array(
    z.object({
      rank: z.number(),
      user: publicUserSchema,
      xp: z.number(),
      averageScore: z.number(),
      isMe: z.boolean(),
    }),
  ),
});

export const challengeMetrics = [
  'CATEGORY_DAYS',
  'ACTIVE_DAYS',
  'QUALIFYING_DAYS',
  'PERFECT_DAYS',
  'TASKS_COMPLETED',
  'HABIT_CHECKINS',
  'XP',
] as const;

export const challengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  metric: z.enum(challengeMetrics),
  habitCategory: z.enum(habitCategories).nullable(),
  target: z.number(),
  startDate: day,
  endDate: day,
  visibility: z.enum(['PUBLIC', 'FRIENDS']),
  creatorId: z.string(),
  isCreator: z.boolean(),
  status: z.enum(['UPCOMING', 'ACTIVE', 'ENDED']),
  daysTotal: z.number(),
  daysElapsed: z.number(),
  daysLeft: z.number(),
  memberCount: z.number(),
  membership: z
    .object({ progress: z.number(), completedAt: isoDateTime.nullable(), joinedAt: isoDateTime })
    .nullable(),
});

const leaderboardEntrySchema = z.object({
  rank: z.number(),
  user: publicUserSchema,
  progress: z.number(),
  completedAt: isoDateTime.nullable(),
  isMe: z.boolean(),
});

export const challengeDetailSchema = z.object({
  challenge: challengeSchema,
  leaderboard: z.array(leaderboardEntrySchema),
  /** The viewer's row when they rank outside the top of the board. */
  me: leaderboardEntrySchema.nullable(),
  completedCount: z.number(),
  /** Day-by-day record for day-based metrics, up to today. */
  myDays: z.array(z.object({ date: day, counted: z.boolean() })).nullable(),
  /** Whether the target can still be reached in the days left. */
  stillPossible: z.boolean(),
  canInvite: z.boolean(),
  invitedBy: publicUserSchema.nullable(),
});

export const challengeInviteSchema = z.object({ challenge: challengeSchema, inviter: publicUserSchema, invitedAt: isoDateTime });

export const invitableSchema = z.object({ user: socialUserSchema, state: z.enum(['member', 'invited', 'available']) });

export type Me = z.infer<typeof meSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type SocialUser = z.infer<typeof socialUserSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskPriority = Task['priority'];
export type Habit = z.infer<typeof habitSchema>;
export type HabitDay = z.infer<typeof habitDaySchema>;
export type HabitFrequency = Habit['frequency'];
export type HabitCategory = Habit['category'];
export type HabitStats = z.infer<typeof habitStatsSchema>;
export type HabitStreak = z.infer<typeof habitStreakSchema>;
export type HabitDetail = z.infer<typeof habitDetailSchema>;
export type ScoringRules = z.infer<typeof scoringRulesSchema>;
export type DayScore = z.infer<typeof dayScoreSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type StreakCalendar = z.infer<typeof streakCalendarSchema>;
export type Achievement = z.infer<typeof achievementSchema>;
export type AchievementWithProgress = z.infer<typeof achievementWithProgressSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Consistency = NonNullable<Profile['consistency']>;
export type FollowState = (typeof followStates)[number];
export type FollowRequest = z.infer<typeof followRequestSchema>;
export type Inbox = z.infer<typeof inboxSchema>;
export type ReactionEntry = z.infer<typeof reactionEntrySchema>;
export type FeedItem = z.infer<typeof feedItemSchema>;
export type FeedPage = z.infer<typeof feedPageSchema>;
export type ReactionType = (typeof reactionTypes)[number];
export type Leaderboard = z.infer<typeof leaderboardSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type ChallengeMetric = Challenge['metric'];
export type ChallengeDetail = z.infer<typeof challengeDetailSchema>;
export type ChallengeInvite = z.infer<typeof challengeInviteSchema>;
export type Invitable = z.infer<typeof invitableSchema>;
