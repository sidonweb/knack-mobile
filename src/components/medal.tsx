import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@/lib/theme';

import { Icon, type IconName } from './icon';

type MedalProps = { icon: IconName; tint: ColorToken; size: number };

/**
 * A solid disc in one colour with a soft top light and a fine inner rim: reads as struck
 * metal rather than a rainbow sticker. Shared by badges and the unlock reveal.
 */
export function Medal({ icon, tint, size }: MedalProps) {
  const { color } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color(tint),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      <LinearGradient
        colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.12)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: 'absolute',
          width: size - Math.max(4, size * 0.12),
          height: size - Math.max(4, size * 0.12),
          borderRadius: size,
          borderWidth: size > 40 ? 1.5 : 1,
          borderColor: 'rgba(255,255,255,0.28)',
        }}
      />
      <Icon name={icon} size={size * 0.44} colorValue="#fff" />
    </View>
  );
}
