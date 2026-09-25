import { View } from 'react-native';

import { Icon, safeIconName } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { habitToken } from '@/lib/theme';

type Props = { icon: string; color: string; filled?: boolean; size?: number };

/** Tinted disc: 12% wash normally, solid when the habit is done for the day. */
export function HabitIcon({ icon, color, filled, size = 36 }: Props) {
  const theme = useTheme();
  const token = habitToken(color);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: filled ? theme.color(token) : theme.color(token, 0.12),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon
        name={filled ? 'checkmark' : safeIconName(icon)}
        size={size * 0.5}
        colorValue={filled ? theme.color('canvas') : theme.color(token)}
      />
    </View>
  );
}
