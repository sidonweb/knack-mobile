import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';

type Props = { title: string; subtitle: string; children: ReactNode; footer?: ReactNode };

/** The mark: a flame on an ember tile. Used wherever the brand needs to show up once. */
function Wordmark() {
  return (
    <View className="flex-row items-center gap-2.5" accessibilityRole="header" accessibilityLabel="Rally">
      <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-ember">
        <Icon name="flame" size={19} colorValue="#fff" />
      </View>
      <Text variant="headline" className="tracking-[-0.3px]">
        Rally
      </Text>
    </View>
  );
}

/** Shared chrome for sign-in and sign-up: the mark, a headline, and the form. */
export function AuthShell({ title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-canvas">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerClassName="flex-grow px-6"
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 16 }}>
        <Wordmark />
        <Animated.View entering={FadeInDown.duration(350)} className="mb-9 mt-12 gap-2">
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        </Animated.View>
        <View className="gap-4">{children}</View>
        <View className="min-h-8 flex-1" />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
