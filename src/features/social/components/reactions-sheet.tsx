import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ErrorState } from '@/components/empty-state';
import { Sheet } from '@/components/sheet';
import { SkeletonRows } from '@/components/skeleton';
import { Text } from '@/components/text';
import { timeAgo } from '@/lib/dates';

import { emojiFor } from '../feed';
import { useReactions } from '../hooks';

/** Who reacted to an item, and with what. */
export function ReactionsSheet({ activityId, onClose }: { activityId: string | null; onClose: () => void }) {
  const reactions = useReactions(activityId);

  return (
    <Sheet visible={activityId !== null} onClose={onClose} title="Reactions">
      {reactions.isLoading ? <SkeletonRows count={3} avatar /> : null}
      {reactions.isError ? <ErrorState compact error={reactions.error} onRetry={() => void reactions.refetch()} /> : null}
      <ScrollView contentContainerClassName="px-5 pb-2">
        {reactions.data?.map((entry) => (
          <Pressable
            key={entry.user.id}
            onPress={() => {
              onClose();
              router.push({ pathname: '/users/[username]', params: { username: entry.user.username } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`${entry.user.displayName} reacted ${entry.type.toLowerCase()}`}
            className="min-h-14 flex-row items-center gap-3 py-2 active:opacity-60">
            <Avatar name={entry.user.displayName} url={entry.user.avatarUrl} size={40} />
            <View className="flex-1">
              <Text variant="callout" numberOfLines={1}>
                {entry.user.displayName}
              </Text>
              <Text variant="footnote" tone="subtle">
                @{entry.user.username} · {timeAgo(entry.createdAt)}
              </Text>
            </View>
            <Text className="text-[22px] leading-[26px]">{emojiFor(entry.type)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Sheet>
  );
}
