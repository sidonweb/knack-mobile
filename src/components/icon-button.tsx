import { Pressable } from 'react-native';

import { haptics } from '@/lib/haptics';
import type { ColorToken } from '@/lib/theme';

import { Icon, type IconName } from './icon';

type Props = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** `filled` sits on canvas as a quiet disc; `plain` is just the glyph (e.g. in headers). */
  variant?: 'filled' | 'plain';
  size?: 'md' | 'sm';
  color?: ColorToken;
  disabled?: boolean;
};

/** Icon-only control with a guaranteed 44pt target. Always carries an accessible label. */
export function IconButton({ icon, label, onPress, variant = 'filled', size = 'md', color = 'fg', disabled }: Props) {
  const box = size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      disabled={disabled}
      hitSlop={size === 'md' ? 4 : 8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`${box} items-center justify-center rounded-full active:opacity-60 ${variant === 'filled' ? 'bg-raised' : ''} ${disabled ? 'opacity-40' : ''}`}>
      <Icon name={icon} size={size === 'md' ? 19 : 16} color={color} />
    </Pressable>
  );
}
