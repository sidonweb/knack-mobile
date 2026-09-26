import type { ReactNode } from 'react';
import { KeyboardAvoidingView, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/features/navigation/tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';

type Props = {
  /** Large title header. Omit on screens that use the native stack header. */
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  children: ReactNode;
  /** Pad for the status bar. Off for screens under a native header. */
  topInset?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  /** Off while something inside is being dragged. */
  scrollEnabled?: boolean;
  /** A slightly smaller title, for long ones like the greeting. */
  compactTitle?: boolean;
};

/**
 * The page shell every scrolling screen shares: 20pt gutters, 24pt between sections,
 * pull to refresh, and keyboard avoidance so a focused field is never hidden.
 */
export function Screen({ title, eyebrow, right, children, topInset = true, refreshing, onRefresh, footer, scrollEnabled = true, compactTitle }: Props) {
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  // Inside the tabs, content scrolls under the floating pill and must clear it at the end.
  const tabBarInset = useTabBarInset();

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-canvas"
      style={{ paddingTop: topInset ? insets.top : 0 }}>
      <ScrollView
        contentContainerClassName="px-5 pb-16 gap-6"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={tabBarInset ? { bottom: tabBarInset } : undefined}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={color('subtle')} /> : undefined
        }>
        {title ? (
          <View className="flex-row items-end justify-between gap-3 pt-3">
            <View className="flex-1 gap-1">
              {eyebrow ? (
                <Text variant="overline" tone="subtle">
                  {eyebrow}
                </Text>
              ) : null}
              <Text
                variant="title"
                accessibilityRole="header"
                numberOfLines={2}
                className={compactTitle ? 'text-[28px] leading-[34px] tracking-[-0.6px]' : ''}>
                {title}
              </Text>
            </View>
            {right}
          </View>
        ) : null}
        {children}
        {/* pb-16 already gives 64pt; top it up to clear the pill. */}
        {tabBarInset > 64 ? <View style={{ height: tabBarInset - 64 - 24 }} /> : null}
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View className="min-h-6 flex-row items-center justify-between">
      <Text variant="overline" tone="subtle" accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}
