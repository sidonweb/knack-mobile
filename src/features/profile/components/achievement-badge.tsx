import { View } from 'react-native';

import { Icon, safeIconName } from '@/components/icon';
import { Medal } from '@/components/medal';
import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@/lib/theme';

/** Each rung up a ladder has its own colour, so tier reads at a glance. */
const TIER_TINTS: ColorToken[] = ['amber', 'ember', 'rose', 'iris', 'sky'];

export function tierTint(tier: number): ColorToken {
  return TIER_TINTS[Math.min(Math.max(tier, 1), TIER_TINTS.length) - 1]!;
}

type Props = { icon: string; tier: number; unlocked: boolean; size?: number };

/** An earned medal, or a quiet outline with a lock when not yet. */
export function AchievementBadge({ icon, tier, unlocked, size = 52 }: Props) {
  const { color } = useTheme();
  const glyph = safeIconName(icon, 'ribbon');

  if (!unlocked) {
    return (
      <View
        accessibilityLabel="Locked"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: color('subtle', 0.45),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={glyph} size={size * 0.4} colorValue={color('subtle', 0.6)} />
        {size >= 30 ? (
          <View
            style={{ position: 'absolute', right: -2, bottom: -2, width: size * 0.36, height: size * 0.36, borderRadius: size }}
            className="items-center justify-center border border-hairline bg-surface">
            <Icon name="lock-closed" size={size * 0.18} color="subtle" />
          </View>
        ) : null}
      </View>
    );
  }

  return <Medal icon={glyph} tint={tierTint(tier)} size={size} />;
}

/** ●●○ — how far up its ladder an achievement sits. */
export function TierPips({ tier, total, size = 5 }: { tier: number; total: number; size?: number }) {
  const { color } = useTheme();
  const tint = tierTint(tier);
  return (
    <View className="flex-row gap-1" accessibilityLabel={`Tier ${tier} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{ width: size, height: size, borderRadius: size, backgroundColor: index < tier ? color(tint) : color('fg', 0.12) }}
        />
      ))}
    </View>
  );
}
