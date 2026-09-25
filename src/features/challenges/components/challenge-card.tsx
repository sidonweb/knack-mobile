import { Link } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/badge';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { formatMonthDay } from '@/lib/dates';
import { plural } from '@/lib/format';
import type { Challenge } from '@/types/api';

import { formatTarget, metricIcon, metricLabel } from '../hooks';

function when(challenge: Challenge) {
  if (challenge.status === 'UPCOMING') return `Starts ${formatMonthDay(challenge.startDate)}`;
  if (challenge.status === 'ENDED') return `Ended ${formatMonthDay(challenge.endDate)}`;
  return challenge.daysLeft === 0 ? 'Last day' : `${plural(challenge.daysLeft, 'day')} left`;
}

export function StatusChip({ challenge }: { challenge: Challenge }) {
  if (challenge.membership?.completedAt) return <Badge label="Completed" tint="mint" icon="checkmark" />;
  if (challenge.status === 'ACTIVE') return <Badge label="Live" tint="ember" />;
  if (challenge.status === 'UPCOMING') return <Badge label="Upcoming" tint="iris" />;
  return <Badge label="Ended" />;
}

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const membership = challenge.membership;
  const done = Boolean(membership?.completedAt);

  return (
    <Link href={{ pathname: '/challenges/[id]', params: { id: challenge.id } }} asChild>
      <PressableScale accessibilityRole="link" accessibilityLabel={challenge.title} className="gap-4 rounded-card border border-hairline bg-surface p-5">
        <View className="flex-row items-start gap-3.5">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-raised">
            <Icon name={metricIcon(challenge)} size={20} color={done ? 'mint' : 'ember'} />
          </View>
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <StatusChip challenge={challenge} />
              <Text variant="footnote" tone="subtle">
                {when(challenge)}
              </Text>
            </View>
            <Text variant="headline" numberOfLines={1}>
              {challenge.title}
            </Text>
            <Text variant="footnote" tone="subtle">
              {metricLabel(challenge)} · {formatTarget(challenge.metric, challenge.target)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Icon name="people-outline" size={14} color="subtle" />
            <Text variant="footnote" tone="subtle" className="tabular-nums">
              {challenge.memberCount}
            </Text>
          </View>
        </View>
        {membership ? (
          <View className="gap-2">
            <ProgressBar progress={membership.progress / challenge.target} color={done ? 'mint' : 'ember'} />
            <Text variant="footnote" tone={done ? 'mint' : 'muted'} className="tabular-nums">
              {done ? 'Target hit' : `${membership.progress.toLocaleString()} of ${challenge.target.toLocaleString()}`}
            </Text>
          </View>
        ) : null}
      </PressableScale>
    </Link>
  );
}
