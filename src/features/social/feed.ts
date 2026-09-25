import type { FeedItem, ReactionType } from '@/types/api';

/** Reactions are small, warm and wordless: cheering progress, not commenting on it. */
export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'FIRE', emoji: '🔥', label: 'Fire' },
  { type: 'CLAP', emoji: '👏', label: 'Applause' },
  { type: 'STRONG', emoji: '💪', label: 'Strong' },
  { type: 'KUDOS', emoji: '🙌', label: 'Kudos' },
];

export const emojiFor = (type: ReactionType) => REACTIONS.find((reaction) => reaction.type === type)?.emoji ?? '🔥';

export type FeedEntry =
  | { kind: 'single'; item: FeedItem }
  /** A burst of unlocks from one write, shown as one card. Reactions go to the first. */
  | { kind: 'achievements'; lead: FeedItem; items: FeedItem[] };

const BURST_WINDOW_MS = 10 * 60 * 1000;

const time = (item: FeedItem) => new Date(item.createdAt).getTime();

/**
 * Keeps catching up quiet: one person's achievement unlocks within a few minutes of each
 * other become one card (even with other items in between), and a burst of level ups shows
 * only the highest. Items arrive newest first.
 */
export function groupFeed(items: FeedItem[]): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const openBurst = new Map<string, number>();
  const lastLevelUp = new Map<string, FeedItem>();

  for (const item of items) {
    const userId = item.user.id;

    if (item.type === 'LEVEL_UP') {
      const newer = lastLevelUp.get(userId);
      if (newer && time(newer) - time(item) < BURST_WINDOW_MS) continue;
      lastLevelUp.set(userId, item);
    }

    if (item.type === 'ACHIEVEMENT_UNLOCKED') {
      const index = openBurst.get(userId);
      const entry = index === undefined ? undefined : entries[index];
      const newest = entry?.kind === 'achievements' ? entry.items.at(-1) : entry?.item;
      if (entry && newest && time(newest) - time(item) < BURST_WINDOW_MS) {
        entries[index!] =
          entry.kind === 'achievements'
            ? { ...entry, items: [...entry.items, item] }
            : { kind: 'achievements', lead: entry.item, items: [entry.item, item] };
        continue;
      }
      openBurst.set(userId, entries.length);
    }

    entries.push({ kind: 'single', item });
  }
  return entries;
}
