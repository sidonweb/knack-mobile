import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { ColorToken } from '@/lib/theme';

import { AnimatedNumber } from './animated-number';
import { Card } from './card';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type Stat = {
  label: string;
  /** Numbers count up on reveal; strings (e.g. "4/7", "–") render as-is. */
  value: number | string;
  suffix?: string;
  caption?: string;
  icon?: IconName;
  tint?: ColorToken;
};

function Cell({ stat, index, animate }: { stat: Stat; index: number; animate: boolean }) {
  return (
    <View className="flex-1 gap-1 px-5 py-4">
      <View className="flex-row items-center gap-1.5">
        {stat.icon ? <Icon name={stat.icon} size={13} color={stat.tint ?? 'subtle'} /> : null}
        <Text variant="footnote" tone="subtle" numberOfLines={1} className="flex-1">
          {stat.label}
        </Text>
      </View>
      {typeof stat.value === 'number' ? (
        <AnimatedNumber
          variant="stat"
          from={animate ? 0 : stat.value}
          value={stat.value}
          delay={animate ? 80 + index * 40 : 0}
          format={(n) => `${n.toLocaleString()}${stat.suffix ?? ''}`}
        />
      ) : (
        <Text variant="stat">
          {stat.value}
          {stat.suffix ?? ''}
        </Text>
      )}
      {stat.caption ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {stat.caption}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Figures in a two-column grid inside a single card, separated by hairlines rather than
 * boxed individually. Reads as one instrument panel instead of a wall of tiles.
 */
export function StatGrid({ stats, animate = true }: { stats: Stat[]; animate?: boolean }) {
  const rows: Stat[][] = [];
  for (let index = 0; index < stats.length; index += 2) rows.push(stats.slice(index, index + 2));

  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <Card padded={false}>
        {rows.map((row, rowIndex) => (
          <View key={row[0]!.label} className={`flex-row ${rowIndex > 0 ? 'border-t border-hairline' : ''}`}>
            <Cell stat={row[0]!} index={rowIndex * 2} animate={animate} />
            <View className="w-px bg-hairline" />
            {row[1] ? <Cell stat={row[1]} index={rowIndex * 2 + 1} animate={animate} /> : <View className="flex-1" />}
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}
