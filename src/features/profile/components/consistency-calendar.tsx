import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useTheme } from '@/hooks/use-theme';
import { formatDayShort, formatMonthDay, parseDay } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import type { Profile } from '@/types/api';

type Day = NonNullable<Profile['calendar']>[number];

const STATUS_TEXT: Record<Day['status'], string> = {
  qualified: 'Counted',
  protected: 'Rest day',
  missed: 'Missed',
  pending: 'Today, in progress',
  inactive: 'Before joining',
  future: 'Still to come',
};

/**
 * Half a year of days, one column per week (Monday on top), shaded by score. Days that
 * counted for the streak are solid ember; tap any day for its score.
 */
export function ConsistencyCalendar({ calendar, minScore }: { calendar: Day[]; minScore: number }) {
  const { color } = useTheme();
  const [selected, setSelected] = useState<Day | null>(null);
  const weeks = Array.from({ length: Math.ceil(calendar.length / 7) }, (_, index) => calendar.slice(index * 7, index * 7 + 7));

  const past = calendar.filter((day) => day.status !== 'future' && day.status !== 'inactive');
  const counted = past.filter((day) => day.status === 'qualified').length;

  const fill = (day: Day) => {
    switch (day.status) {
      case 'qualified':
        // Stronger for higher scores, so a 100 stands out from a 61.
        return color('ember', 0.55 + ((day.score - minScore) / (100 - minScore)) * 0.45);
      case 'protected':
        return color('sky', 0.3);
      case 'future':
        return 'transparent';
      case 'inactive':
        return color('fg', 0.025);
      default:
        return day.score > 0 ? color('ember', 0.1 + (day.score / minScore) * 0.2) : color('fg', 0.06);
    }
  };

  const monthLabel = (week: Day[]) => {
    const first = week.find((day) => parseDay(day.date).getDate() <= 7 && parseDay(day.date).getDay() === 1) ?? null;
    return first ? formatMonthDay(first.date).split(' ')[0] : '';
  };

  return (
    <Card className="gap-4">
      <View className="flex-row items-baseline justify-between">
        <Text variant="headline">Consistency</Text>
        <Text variant="footnote" tone="subtle" className="tabular-nums">
          {counted} of {past.length} days counted
        </Text>
      </View>

      <View className="flex-row gap-[3px]">
        {weeks.map((week) => (
          <View key={week[0]?.date} className="flex-1 gap-[3px]">
            <View className="h-[13px]">
              <Text variant="overline" tone="subtle" className="absolute left-0 top-0 w-10 text-[9px] tracking-normal">
                {monthLabel(week)}
              </Text>
            </View>
            {week.map((day) => (
              <Pressable
                key={day.date}
                onPress={() => {
                  haptics.tap();
                  setSelected((current) => (current?.date === day.date ? null : day));
                }}
                accessibilityLabel={`${day.date}: ${STATUS_TEXT[day.status]}${day.score ? `, score ${day.score}` : ''}`}
                style={{
                  aspectRatio: 1,
                  borderRadius: 3,
                  backgroundColor: fill(day),
                  borderWidth: selected?.date === day.date ? 1.5 : day.status === 'pending' || day.status === 'future' ? 1 : 0,
                  borderColor: selected?.date === day.date ? color('fg') : day.status === 'pending' ? color('ember', 0.6) : color('hairline'),
                }}
              />
            ))}
          </View>
        ))}
      </View>

      {selected ? (
        <Animated.View key={selected.date} entering={FadeInUp.duration(220)} className="flex-row items-center gap-2 rounded-2xl bg-raised px-3.5 py-2.5">
          <Icon
            name={selected.status === 'qualified' ? 'flame' : selected.status === 'protected' ? 'moon' : 'ellipse-outline'}
            size={14}
            color={selected.status === 'qualified' ? 'ember' : selected.status === 'protected' ? 'sky' : 'subtle'}
          />
          <Text variant="callout" className="flex-1">
            {formatDayShort(selected.date)}
          </Text>
          <Text variant="footnote" tone="muted">
            {STATUS_TEXT[selected.status]}
            {selected.status !== 'future' && selected.status !== 'inactive' ? ` · ${selected.score}` : ''}
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn} className="flex-row items-center justify-between">
          <Text variant="footnote" tone="subtle">
            Tap a day for its score
          </Text>
          <View className="flex-row items-center gap-1">
            <Text variant="footnote" tone="subtle" className="mr-1">
              Less
            </Text>
            {[color('fg', 0.06), color('ember', 0.2), color('ember', 0.6), color('ember')].map((swatch) => (
              <View key={swatch} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: swatch }} />
            ))}
            <Text variant="footnote" tone="subtle" className="ml-1">
              More
            </Text>
          </View>
        </Animated.View>
      )}
    </Card>
  );
}
