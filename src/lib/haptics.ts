import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

const run = (effect: () => Promise<void>) => {
  if (enabled) void effect().catch(() => {});
};

/**
 * Fire-and-forget haptics with a fixed vocabulary, so every moment of the same weight feels
 * the same. Never let feedback failures surface to the user.
 *
 * - tap: selection changes (segments, chips, pickers)
 * - light: checking something off
 * - impact: picking something up, destructive actions
 * - success: a moment worth marking (streak secured, perfect day, unlock)
 * - warning: validation failures
 */
export const haptics = {
  tap: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  impact: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** A heavier double beat for the biggest moments (perfect day, level up). */
  celebrate: () => {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    setTimeout(() => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 140);
  },
};
