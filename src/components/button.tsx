import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const containers: Record<Variant, string> = {
  // Inverted neutral rather than a brand colour: confident and quiet.
  primary: 'bg-fg',
  secondary: 'bg-raised',
  ghost: 'bg-transparent',
  danger: 'bg-rose/10',
};

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  accessibilityHint?: string;
};

/**
 * The app's one button. `md` is the full-width call to action (52pt); `sm` sits inline in
 * rows (40pt, with slop to a 44pt target).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  className = '',
  accessibilityHint,
}: Props) {
  const { color } = useTheme();
  const inactive = disabled || loading;
  const foreground =
    variant === 'primary'
      ? color('canvas')
      : variant === 'danger'
        ? color('rose')
        : variant === 'ghost'
          ? color('muted')
          : color('fg');

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      hitSlop={size === 'sm' ? 4 : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`${containers[variant]} ${size === 'md' ? 'h-[52px] px-6' : 'h-10 px-4'} flex-row items-center justify-center rounded-full ${inactive && !loading ? 'opacity-40' : ''} ${className}`}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Icon name={icon} size={size === 'md' ? 18 : 15} colorValue={foreground} /> : null}
          <Text variant={size === 'md' ? 'headline' : 'callout'} style={{ color: foreground }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
