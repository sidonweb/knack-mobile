import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/lib/haptics';
import { useToast } from '@/store/toast';

import { Text } from './text';

const VISIBLE_MS = 4500;
/** Clears the floating tab bar. */
const BOTTOM_OFFSET = 76;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toast = useToast((state) => state.toast);
  const hide = useToast((state) => state.hide);

  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast.actionLabel ? `${toast.message}. ${toast.actionLabel} available` : toast.message);
    const timer = setTimeout(() => hide(toast.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;

  return (
    <View
      style={{
        pointerEvents: 'box-none',
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + BOTTOM_OFFSET,
        alignItems: 'center',
      }}>
      <Animated.View key={toast.id} entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)}>
        <View
          className="min-h-12 flex-row items-center gap-4 rounded-full border border-hairline bg-surface py-1.5 pl-5 pr-1.5"
          style={{ boxShadow: '0px 8px 24px rgba(0,0,0,0.14)' }}
          accessibilityLiveRegion="polite">
          <Text variant="callout">{toast.message}</Text>
          {toast.actionLabel ? (
            <Pressable
              onPress={() => {
                haptics.tap();
                toast.onAction?.();
                hide(toast.id);
              }}
              hitSlop={8}
              accessibilityRole="button"
              className="min-h-9 justify-center rounded-full bg-fg px-4 active:opacity-70">
              <Text variant="callout" tone="inverse" className="font-inter-semibold">
                {toast.actionLabel}
              </Text>
            </Pressable>
          ) : (
            <View className="w-3" />
          )}
        </View>
      </Animated.View>
    </View>
  );
}
