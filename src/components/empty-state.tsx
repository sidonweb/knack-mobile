import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/services/api/errors';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = { icon: IconName; title: string; message?: string; action?: ReactNode; compact?: boolean };

/**
 * Nothing here yet. No box around it: an empty state is a pause in the page, not
 * another container. Always say what would fill it.
 */
export function EmptyState({ icon, title, message, action, compact }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(250)} className={`items-center gap-2 px-6 ${compact ? 'py-6' : 'py-12'}`}>
      <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-raised">
        <Icon name={icon} size={22} color="subtle" />
      </View>
      <Text variant="headline" className="text-center" accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text variant="footnote" tone="muted" className="max-w-[300px] text-center">
          {message}
        </Text>
      ) : null}
      {action ? <View className="mt-3">{action}</View> : null}
    </Animated.View>
  );
}

/** Centred spinner for a screen or section whose content hasn't arrived. */
export function LoadingState({ label = 'Loading', className = 'py-16' }: { label?: string; className?: string }) {
  const { color } = useTheme();
  return (
    <View className={`items-center justify-center ${className}`} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator color={color('subtle')} />
    </View>
  );
}

/** Something failed to load. Says what, and offers the one useful action. */
export function ErrorState({
  error,
  title = 'Couldn’t load this',
  onRetry,
  compact,
}: {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title={title}
      message={error ? errorMessage(error) : 'Check your connection and try again.'}
      compact={compact}
      action={onRetry ? <Button label="Try again" size="sm" variant="secondary" icon="refresh" onPress={onRetry} /> : undefined}
    />
  );
}
