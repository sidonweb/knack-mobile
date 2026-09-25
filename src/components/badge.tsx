import { View } from 'react-native';

import type { ColorToken } from '@/lib/theme';

import { Icon, type IconName } from './icon';
import { Text, type TextTone } from './text';

type Tint = 'ember' | 'iris' | 'mint' | 'sky' | 'amber' | 'rose' | 'neutral';

const WASH: Record<Tint, string> = {
  ember: 'bg-ember/[0.12]',
  iris: 'bg-iris/[0.12]',
  mint: 'bg-mint/[0.12]',
  sky: 'bg-sky/[0.12]',
  amber: 'bg-amber/[0.15]',
  rose: 'bg-rose/[0.12]',
  neutral: 'bg-fg/[0.06]',
};

type Props = { label: string; tint?: Tint; icon?: IconName };

/** A small status label: "Live", "Finished", "Upcoming". Tinted wash, never a solid block. */
export function Badge({ label, tint = 'neutral', icon }: Props) {
  const tone: TextTone = tint === 'neutral' ? 'muted' : tint;
  const iconColor: ColorToken = tint === 'neutral' ? 'muted' : tint;
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2 py-[3px] ${WASH[tint]}`}>
      {icon ? <Icon name={icon} size={10} color={iconColor} /> : null}
      <Text variant="overline" tone={tone} className="text-[10px] leading-[13px] tracking-[0.6px]">
        {label}
      </Text>
    </View>
  );
}

/** A count bubble for things waiting on the user. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View className="h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1.5" accessibilityLabel={`${count} waiting`}>
      <Text variant="caption" tone="inverse" className="font-inter-semibold text-[11px] leading-[14px]">
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}
