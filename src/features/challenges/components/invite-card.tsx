import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { formatMonthDay } from '@/lib/dates';
import { errorMessage } from '@/services/api/errors';
import type { ChallengeInvite } from '@/types/api';

import { formatTarget, metricIcon, metricLabel, useDeclineInvite, useJoinChallenge } from '../hooks';

/** An invitation with the two decisions it asks for. */
export function InviteCard({ invite, index }: { invite: ChallengeInvite; index: number }) {
  const join = useJoinChallenge();
  const decline = useDeclineInvite();
  const { challenge, inviter } = invite;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(220)}
      exiting={FadeOut.duration(180)}
      layout={LinearTransition.duration(220)}
      className="gap-4 rounded-card border border-ember/30 bg-ember/[0.06] p-5">
      <Pressable
        onPress={() => router.push({ pathname: '/challenges/[id]', params: { id: challenge.id } })}
        className="flex-row items-center gap-3">
        <View className="relative">
          <Avatar name={inviter.displayName} url={inviter.avatarUrl} size={40} />
          <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-ember">
            <Icon name={metricIcon(challenge)} size={11} colorValue="#fff" />
          </View>
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="footnote" tone="muted">
            <Text variant="footnote" className="font-inter-semibold">
              {inviter.displayName}
            </Text>{' '}
            invited you
          </Text>
          <Text variant="headline" numberOfLines={1}>
            {challenge.title}
          </Text>
          <Text variant="footnote" tone="subtle">
            {metricLabel(challenge)} · {formatTarget(challenge.metric, challenge.target)} · {formatMonthDay(challenge.startDate)}–
            {formatMonthDay(challenge.endDate)}
          </Text>
        </View>
      </Pressable>
      <View className="flex-row gap-2">
        <Button
          label="Not now"
          variant="secondary"
          size="sm"
          className="flex-1"
          onPress={() => decline.mutate(challenge.id)}
        />
        <Button
          label="I’m in"
          size="sm"
          icon="flag"
          className="flex-1"
          loading={join.isPending}
          onPress={() =>
            join.mutate(challenge.id, {
              onSuccess: () => router.push({ pathname: '/challenges/[id]', params: { id: challenge.id } }),
              onError: (error) => Alert.alert('Couldn’t join', errorMessage(error)),
            })
          }
        />
      </View>
    </Animated.View>
  );
}
