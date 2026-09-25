import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import type { ColorToken } from '@/lib/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Icon colour while unselected. */
  iconTint?: ColorToken;
};

/** A selectable pill for single- or multi-choice pickers. Selected inverts to solid fg. */
export function Chip({ label, selected, onPress, icon, iconTint = 'muted' }: Props) {
  const { color } = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (!selected) haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-10 flex-row items-center gap-1.5 rounded-full border px-4 py-2 active:opacity-70 ${selected ? 'border-transparent bg-fg' : 'border-hairline bg-surface'}`}>
      {icon ? <Icon name={icon} size={14} colorValue={selected ? color('canvas') : color(iconTint)} /> : null}
      <Text variant="callout" tone={selected ? 'inverse' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}
