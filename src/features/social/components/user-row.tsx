import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import type { SocialUser } from '@/types/api';

import { FollowButton } from './follow-button';

type Props = {
  user: SocialUser;
  /** Replaces the follow button, e.g. with Accept / Decline. */
  action?: ReactNode;
  /** Hide the follow button (e.g. on your own row). */
  plain?: boolean;
};

export function UserRow({ user, action, plain }: Props) {
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <Link href={{ pathname: '/users/[username]', params: { username: user.username } }} asChild>
        <Pressable className="flex-1 flex-row items-center gap-3 active:opacity-70">
          <Avatar name={user.displayName} url={user.avatarUrl} size={42} />
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-1">
              <Text variant="callout" numberOfLines={1} className="flex-shrink">
                {user.displayName}
              </Text>
              {user.isPrivate ? <Icon name="lock-closed" size={11} color="subtle" /> : null}
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text variant="footnote" tone="subtle">
                @{user.username} · Lv {user.level}
              </Text>
              {user.currentStreak > 0 ? (
                <View className="flex-row items-center gap-0.5">
                  <Icon name="flame" size={11} color="ember" />
                  <Text variant="footnote" tone="subtle" className="tabular-nums">
                    {user.currentStreak}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Link>
      {action ?? (plain ? null : <FollowButton user={user} followState={user.followState} size="sm" />)}
    </View>
  );
}
