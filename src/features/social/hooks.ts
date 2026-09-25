import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { haptics } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { socialApi } from '@/services/social';
import { usersApi } from '@/services/users';
import type { FeedItem, FeedPage, FollowState, Inbox, Profile, ReactionType, SocialUser } from '@/types/api';

/** The viewer's circle feed, or one person's activity when `userId` is given. */
export function useFeed(userId?: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.feed(userId),
    queryFn: ({ pageParam }) => socialApi.feed({ cursor: pageParam, userId }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

export function useLeaderboard() {
  return useQuery({ queryKey: queryKeys.leaderboard, queryFn: socialApi.leaderboard });
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.profile(username),
    queryFn: () => usersApi.profile(username),
    enabled: username.length > 0,
  });
}

export function useProfileAchievements(username: string) {
  return useQuery({
    queryKey: queryKeys.profileAchievements(username),
    queryFn: () => usersApi.achievements(username),
    enabled: username.length > 0,
  });
}

export function useConnections(username: string, direction: 'followers' | 'following') {
  return useQuery({
    queryKey: queryKeys.connections(username, direction),
    queryFn: () => usersApi.connections(username, direction),
    enabled: username.length > 0,
  });
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.userSearch(q),
    queryFn: () => usersApi.search(q),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });
}

/** Follow requests and challenge invites waiting on the user; drives the Friends tab badge. */
export function useInbox() {
  return useQuery({ queryKey: queryKeys.inbox, queryFn: usersApi.inbox, refetchInterval: 60_000 });
}

export function useFollowRequests() {
  return useQuery({ queryKey: queryKeys.followRequests, queryFn: socialApi.requests });
}

/** Every cached list of people shows the same follow state for a user. */
function patchFollowState(queryClient: ReturnType<typeof useQueryClient>, userId: string, followState: FollowState) {
  const patch = (user: SocialUser) =>
    user.id === userId ? { ...user, followState, isFollowing: followState === 'following' } : user;
  queryClient.setQueriesData<SocialUser[]>({ queryKey: ['user-search'] }, (old) => old?.map(patch));
  queryClient.setQueriesData<SocialUser[]>({ queryKey: ['connections'] }, (old) => old?.map(patch));
}

export function useFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, follow }: { userId: string; username: string; follow: boolean }) =>
      follow ? (await socialApi.follow(userId)).followState : (await socialApi.unfollow(userId), 'none' as const),
    onMutate: ({ userId, username, follow }) => {
      haptics.tap();
      const previous = queryClient.getQueryData<Profile>(queryKeys.profile(username));
      // Optimistically "following"; a private account corrects it to "requested" on success.
      const next: FollowState = follow ? (previous?.user.isPrivate ? 'requested' : 'following') : 'none';
      queryClient.setQueryData<Profile>(queryKeys.profile(username), (old) =>
        old
          ? {
              ...old,
              followState: next,
              stats: {
                ...old.stats,
                followers: old.stats.followers + (next === 'following' ? 1 : 0) - (old.followState === 'following' ? 1 : 0),
              },
            }
          : old,
      );
      patchFollowState(queryClient, userId, next);
      return { previous };
    },
    onSuccess: (followState, { userId, username }) => {
      if (followState === 'following') haptics.success();
      queryClient.setQueryData<Profile>(queryKeys.profile(username), (old) => (old ? { ...old, followState } : old));
      patchFollowState(queryClient, userId, followState);
    },
    onError: (_error, { username }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.profile(username), context.previous);
    },
    onSettled: (_data, _error, { username }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(username) });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard });
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

/** Accept or decline a follow request; the row leaves the list immediately. */
export function useRespondToRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, accept }: { userId: string; accept: boolean }) =>
      accept ? socialApi.acceptRequest(userId) : socialApi.declineRequest(userId),
    onMutate: ({ userId, accept }) => {
      if (accept) haptics.success();
      else haptics.tap();
      queryClient.setQueryData<{ user: SocialUser }[]>(queryKeys.followRequests, (old) =>
        old?.filter((request) => request.user.id !== userId),
      );
      queryClient.setQueryData<Inbox>(queryKeys.inbox, (old) =>
        old ? { ...old, followRequests: Math.max(0, old.followRequests - 1) } : old,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.followRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useRemoveFollower() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => socialApi.removeFollower(userId),
    onMutate: (userId) => {
      haptics.tap();
      queryClient.setQueriesData<SocialUser[]>(
        { predicate: (query) => query.queryKey[0] === 'connections' && query.queryKey[2] === 'followers' },
        (old) => old?.filter((user) => user.id !== userId),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

function patchFeedItem(
  queryClient: ReturnType<typeof useQueryClient>,
  activityId: string,
  update: (item: FeedItem) => FeedItem,
) {
  queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['feed'] }, (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === activityId ? update(item) : item)),
          })),
        }
      : old,
  );
}

/** Moves the viewer's reaction on an item from one type (or none) to another. */
function withReaction(item: FeedItem, type: ReactionType | null): FeedItem {
  const counts = new Map(item.reactions.map((entry) => [entry.type, entry.count]));
  if (item.myReaction) counts.set(item.myReaction, (counts.get(item.myReaction) ?? 1) - 1);
  if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
  const reactions = [...counts]
    .filter(([, count]) => count > 0)
    .map(([reaction, count]) => ({ type: reaction, count }))
    .sort((a, b) => b.count - a.count);
  return {
    ...item,
    myReaction: type,
    reactions,
    reactionCount: item.reactionCount + (type ? 1 : 0) - (item.myReaction ? 1 : 0),
  };
}

/** Optimistic reactions: the row updates on tap and rolls back if the request fails. */
export function useReact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, type }: { activityId: string; type: ReactionType | null; previous: ReactionType | null }) =>
      type ? socialApi.react(activityId, type) : socialApi.unreact(activityId),
    onMutate: ({ activityId, type }) => {
      haptics.tap();
      patchFeedItem(queryClient, activityId, (item) => withReaction(item, type));
    },
    onError: (_error, { activityId, previous }) =>
      patchFeedItem(queryClient, activityId, (item) => withReaction(item, previous)),
    onSettled: (_data, _error, { activityId }) =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.reactions(activityId) }),
  });
}

export function useReactions(activityId: string | null) {
  return useQuery({
    queryKey: queryKeys.reactions(activityId ?? ''),
    queryFn: () => socialApi.reactions(activityId ?? ''),
    enabled: Boolean(activityId),
  });
}

/** Hide one of your own items from everyone else (or bring it back). */
export function useHideActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, hidden }: { activityId: string; hidden: boolean }) => socialApi.setHidden(activityId, hidden),
    onMutate: ({ activityId, hidden }) => {
      haptics.tap();
      patchFeedItem(queryClient, activityId, (item) => ({ ...item, hidden }));
    },
    onError: (_error, { activityId, hidden }) => patchFeedItem(queryClient, activityId, (item) => ({ ...item, hidden: !hidden })),
  });
}
