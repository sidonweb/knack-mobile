import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState, ErrorState } from '@/components/empty-state';
import type { IconName } from '@/components/icon';
import { SkeletonRows } from '@/components/skeleton';
import type { FeedItem as FeedItemType } from '@/types/api';

import { groupFeed } from '../feed';
import { useFeed, useHideActivity, useReact } from '../hooks';
import { FeedItem } from './feed-item';
import { ReactionsSheet } from './reactions-sheet';

type Props = {
  /** One person's activity; omit for the viewer's circle. */
  userId?: string;
  enabled?: boolean;
  empty: { icon: IconName; title: string; message?: string };
};

export function FeedList({ userId, enabled = true, empty }: Props) {
  const feed = useFeed(userId, { enabled });
  const react = useReact();
  const hide = useHideActivity();
  const [reactionsFor, setReactionsFor] = useState<string | null>(null);

  const entries = groupFeed(feed.data?.pages.flatMap((page) => page.items) ?? []);

  const onReact = (item: FeedItemType, type: FeedItemType['myReaction']) =>
    react.mutate({ activityId: item.id, type, previous: item.myReaction });

  return (
    <View>
      {feed.isLoading && enabled ? <SkeletonRows count={3} avatar inset={false} /> : null}
      {feed.isError && entries.length === 0 ? (
        <ErrorState compact title="Couldn’t load activity" error={feed.error} onRetry={() => void feed.refetch()} />
      ) : null}
      {entries.length === 0 && !feed.isLoading && !feed.isError && enabled ? <EmptyState {...empty} /> : null}
      {entries.map((entry, index) => {
        const key = entry.kind === 'achievements' ? entry.lead.id : entry.item.id;
        return (
          <View key={key} className={index > 0 ? 'border-t border-gray-200' : ''}>
            <FeedItem
              entry={entry}
              onReact={onReact}
              onOpenReactions={(item) => setReactionsFor(item.id)}
              onToggleHidden={(item) => hide.mutate({ activityId: item.id, hidden: !item.hidden })}
            />
          </View>
        );
      })}
      {feed.hasNextPage ? (
        <Button
          variant="ghost"
          size="sm"
          label="Load more"
          loading={feed.isFetchingNextPage}
          onPress={() => void feed.fetchNextPage()}
        />
      ) : null}
      <ReactionsSheet activityId={reactionsFor} onClose={() => setReactionsFor(null)} />
    </View>
  );
}
