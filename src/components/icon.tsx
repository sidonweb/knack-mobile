import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: ColorToken;
  /** Raw colour, for when the token system doesn't apply. */
  colorValue?: ColorValue;
};

export function Icon({ name, size = 20, color = 'fg', colorValue }: Props) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={colorValue ?? theme.color(color)} />;
}

/** API-provided icon names are free text; fall back rather than render nothing. */
export function safeIconName(name: string, fallback: IconName = 'ellipse-outline'): IconName {
  return name in Ionicons.glyphMap ? (name as IconName) : fallback;
}
