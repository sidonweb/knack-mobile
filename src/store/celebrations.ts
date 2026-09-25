import { create } from 'zustand';

export type Celebration =
  | { id: number; kind: 'xp'; amount: number }
  /** Today just crossed the streak threshold, from the user's own tap. Shown before sync. */
  | { id: number; kind: 'streakSecured'; days: number }
  | { id: number; kind: 'achievement'; name: string; description: string; icon: string; tier: number; xpReward: number }
  | { id: number; kind: 'level'; level: number }
  | { id: number; kind: 'streak'; days: number }
  | { id: number; kind: 'challenge'; title: string }
  | { id: number; kind: 'perfectWeek' }
  | { id: number; kind: 'habitStreak'; name: string; icon: string; length: number; unit: 'day' | 'week' };

type NewCelebration = Celebration extends infer C ? (C extends Celebration ? Omit<C, 'id'> : never) : never;

type CelebrationState = {
  queue: Celebration[];
  push: (celebration: NewCelebration) => void;
  dismiss: (id: number) => void;
};

/**
 * Moments big enough for the full-screen unlock reveal. Everything else is a capsule.
 * A habit streak is big once it's a month (or twelve weeks) long.
 */
export function isMajor(celebration: Celebration): boolean {
  if (celebration.kind === 'xp' || celebration.kind === 'streakSecured') return false;
  if (celebration.kind === 'habitStreak') return celebration.length >= (celebration.unit === 'week' ? 12 : 30);
  return true;
}

let nextId = 1;

/**
 * Queue of moments worth marking (XP gained, achievement unlocked…). Shown one at a time
 * by <CelebrationHost/>. Consecutive XP gains are merged so rapid taps read as one total.
 */
export const useCelebrations = create<CelebrationState>()((set) => ({
  queue: [],
  push: (celebration) =>
    set((state) => {
      const last = state.queue.at(-1);
      if (celebration.kind === 'xp' && last?.kind === 'xp' && state.queue.length > 1) {
        return { queue: [...state.queue.slice(0, -1), { ...last, amount: last.amount + celebration.amount }] };
      }
      return { queue: [...state.queue, { ...celebration, id: nextId++ } as Celebration] };
    }),
  dismiss: (id) => set((state) => ({ queue: state.queue.filter((item) => item.id !== id) })),
}));
