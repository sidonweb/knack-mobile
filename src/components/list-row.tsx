import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import type { ColorToken } from '@/lib/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTint?: ColorToken;
  /** Trailing content: a value, a switch, a badge. A chevron is added when `onPress` is set. */
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
};

/**
 * A settings-style row inside a `Card padded={false}`. Separate rows with `<Divider />`.
 * 56pt minimum height so every row is an easy target.
 */
export function ListRow({ title, subtitle, icon, iconTint = 'muted', right, onPress, destructive, accessibilityHint }: Props) {
  const content = (
    <View className="min-h-14 flex-row items-center gap-3.5 px-5 py-3">
      {icon ? (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-raised">
          <Icon name={icon} size={16} color={destructive ? 'rose' : iconTint} />
        </View>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text variant="body" tone={destructive ? 'rose' : 'default'} className="font-inter-medium">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="subtle">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && !destructive ? <Icon name="chevron-forward" size={16} color="subtle" /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      className="active:bg-fg/[0.04]">
      {content}
    </Pressable>
  );
}
