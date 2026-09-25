import { View } from 'react-native';

import { AnimatedNumber } from '@/components/animated-number';
import { Icon } from '@/components/icon';
import { Text, type TextTone } from '@/components/text';

import type { StreakDisplay } from '../hooks';

type Props = { streak: StreakDisplay };

/**
 * The streak, always in view: a flame beside "12 days / streak". Ember once today counts,
 * sky on a rest day, neutral while today still has to earn it.
 */
export function StreakPill({ streak }: Props) {
  const lit = streak.secured;
  const resting = !lit && streak.resting;
  const days = streak.current;

  const wash = lit ? 'bg-ember/[0.12]' : resting ? 'bg-sky/[0.12]' : 'bg-raised';
  const tone: TextTone = lit ? 'ember' : resting ? 'sky' : days > 0 ? 'default' : 'subtle';
  const iconColor = lit || days > 0 ? (resting ? 'sky' : 'ember') : 'subtle';

  return (
    <View
      accessible
      accessibilityLabel={`${days}-day streak${lit ? ', secured today' : resting ? ', rest day' : ''}`}
      className={`flex-row items-center gap-2 rounded-2xl py-2 pl-2.5 pr-3.5 ${wash}`}>
      <Icon name={resting ? 'moon' : 'flame'} size={22} color={iconColor} />
      <View>
        <View className="flex-row items-baseline gap-1">
          <AnimatedNumber variant="numeral" tone={tone} value={days} duration={400} className="font-inter-bold text-[15px] leading-[18px]" />
          <Text variant="numeral" tone={tone} className="font-inter-bold text-[15px] leading-[18px]">
            {days === 1 ? 'day' : 'days'}
          </Text>
        </View>
        <Text variant="caption" tone={tone} className="leading-[14px] opacity-75">
          {resting ? 'rest day' : 'streak'}
        </Text>
      </View>
    </View>
  );
}
