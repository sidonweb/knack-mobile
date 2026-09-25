import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { SkeletonRows } from '@/components/skeleton';
import { Text } from '@/components/text';
import { useInvitable, useInvite } from '@/features/challenges/hooks';
import { haptics } from '@/lib/haptics';
import { errorMessage } from '@/services/api/errors';

const STATE_TEXT = { member: 'In the challenge', invited: 'Invited' } as const;

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const people = useInvitable(id);
  const invite = useInvite(id);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (userId: string) => {
    haptics.tap();
    setSelected((current) => (current.includes(userId) ? current.filter((other) => other !== userId) : [...current, userId]));
  };

  const send = () =>
    invite.mutate(selected, {
      onSuccess: ({ invited }) => {
        setSelected([]);
        if (invited > 0) router.back();
      },
      onError: (error) => Alert.alert('Couldn’t send invites', errorMessage(error)),
    });

  const list = people.data ?? [];

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="gap-1 px-5 pb-6 pt-4">
        <Text variant="footnote" tone="muted" className="pb-3">
          Invite people you follow or who follow you. They’ll see it on their Friends tab.
        </Text>
        {people.isLoading ? <SkeletonRows count={4} avatar inset={false} /> : null}
        {!people.isLoading && list.length === 0 ? (
          <EmptyState icon="people-outline" title="No one to invite yet" message="Follow friends from the Friends tab, then bring them in." />
        ) : null}
        {list.map(({ user, state }, index) => {
          const available = state === 'available';
          const isSelected = selected.includes(user.id);
          return (
            <Animated.View key={user.id} entering={FadeInDown.delay(index * 35).duration(220)}>
              <Pressable
                disabled={!available}
                onPress={() => toggle(user.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected, disabled: !available }}
                accessibilityLabel={available ? user.displayName : `${user.displayName}, ${STATE_TEXT[state]}`}
                className={`min-h-14 flex-row items-center gap-3 py-2 ${available ? 'active:opacity-60' : 'opacity-50'}`}>
                <Avatar name={user.displayName} url={user.avatarUrl} size={42} />
                <View className="flex-1">
                  <Text variant="callout" numberOfLines={1}>
                    {user.displayName}
                  </Text>
                  <Text variant="footnote" tone="subtle">
                    {available ? `@${user.username}` : STATE_TEXT[state]}
                  </Text>
                </View>
                {available ? (
                  <View className={`h-7 w-7 items-center justify-center rounded-full border ${isSelected ? 'border-transparent bg-fg' : 'border-subtle/50'}`}>
                    {isSelected ? (
                      <Animated.View entering={FadeIn.duration(220)}>
                        <Icon name="checkmark" size={15} color="canvas" />
                      </Animated.View>
                    ) : null}
                  </View>
                ) : (
                  <Icon name={state === 'member' ? 'flag' : 'time-outline'} size={16} color="subtle" />
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
      <View className="px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          label={selected.length > 0 ? `Send ${selected.length} ${selected.length === 1 ? 'invite' : 'invites'}` : 'Select people'}
          icon="paper-plane-outline"
          disabled={selected.length === 0}
          loading={invite.isPending}
          onPress={send}
        />
      </View>
    </View>
  );
}
