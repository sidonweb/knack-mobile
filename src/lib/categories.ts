import type { IconName } from '@/components/icon';
import type { HabitCategory } from '@/types/api';

import type { ColorToken } from './theme';

type CategoryInfo = {
  label: string;
  /** Reads naturally in "26 ___ days" and "a 30-day ___ streak". */
  noun: string;
  icon: IconName;
  tint: ColorToken;
};

/**
 * What each habit category is called and how it looks. Categories let achievements and
 * challenges target a kind of habit ("50 reading days") whatever the habit is named.
 */
export const CATEGORIES: Record<HabitCategory, CategoryInfo> = {
  GENERAL: { label: 'General', noun: 'habit', icon: 'ellipse-outline', tint: 'steel' },
  READING: { label: 'Reading', noun: 'reading', icon: 'book', tint: 'iris' },
  WORKOUT: { label: 'Workout', noun: 'workout', icon: 'barbell', tint: 'ember' },
  MINDFULNESS: { label: 'Mindfulness', noun: 'mindful', icon: 'flower', tint: 'mint' },
  LEARNING: { label: 'Learning', noun: 'learning', icon: 'school', tint: 'rose' },
  HEALTH: { label: 'Health', noun: 'health', icon: 'heart', tint: 'sky' },
  CREATIVE: { label: 'Creative', noun: 'creative', icon: 'color-palette', tint: 'amber' },
  EARLY_MORNING: { label: 'Early morning', noun: 'early-morning', icon: 'partly-sunny', tint: 'amber' },
};

export const categoryInfo = (category: HabitCategory | null | undefined): CategoryInfo =>
  CATEGORIES[category ?? 'GENERAL'] ?? CATEGORIES.GENERAL;
