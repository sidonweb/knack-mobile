import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';

type Action = { label: string; onPress: () => void; disabled?: boolean };

type Props = {
  title: string;
  onCancel: () => void;
  action?: Action;
  /**
   * The screen is a full-screen modal on Android (iOS shows it as a sheet below the status
   * bar), so the header must clear the status bar itself.
   */
  fullScreen?: boolean;
};

/**
 * The header for editor modals and sheets: Cancel on the left, title centred, the commit
 * action on the right. Mirrors the iOS convention people already know.
 */
export function ModalHeader({ title, onCancel, action, fullScreen }: Props) {
  const insets = useSafeAreaInsets();
  const top = fullScreen && Platform.OS !== 'ios' ? insets.top : 0;
  return (
    <View className="flex-row items-center justify-between px-3 pb-1 pt-3" style={top ? { paddingTop: top + 8 } : undefined}>
      <Pressable onPress={onCancel} hitSlop={6} accessibilityRole="button" className="min-h-11 min-w-16 justify-center px-2 active:opacity-60">
        <Text variant="body" tone="muted">
          Cancel
        </Text>
      </Pressable>
      <Text variant="headline" accessibilityRole="header" numberOfLines={1} className="flex-1 text-center">
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          disabled={action.disabled}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ disabled: action.disabled }}
          className="min-h-11 min-w-16 items-end justify-center px-2 active:opacity-60">
          <Text variant="body" tone={action.disabled ? 'subtle' : 'default'} className="font-inter-semibold">
            {action.label}
          </Text>
        </Pressable>
      ) : (
        <View className="min-w-16" />
      )}
    </View>
  );
}
