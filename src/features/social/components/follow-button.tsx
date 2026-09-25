import { Alert } from 'react-native';

import { Button } from '@/components/button';
import type { FollowState, PublicUser } from '@/types/api';

import { useFollow } from '../hooks';

type Props = {
  user: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'isPrivate'>;
  followState: FollowState;
  size?: 'md' | 'sm';
  className?: string;
};

/**
 * Follow, request (private accounts), or undo. Unfollowing someone private asks first,
 * because getting back in means asking again.
 */
export function FollowButton({ user, followState, size = 'md', className }: Props) {
  const follow = useFollow();
  const run = (next: boolean) => follow.mutate({ userId: user.id, username: user.username, follow: next });

  if (followState === 'following') {
    return (
      <Button
        size={size}
        variant="secondary"
        icon={size === 'md' ? 'checkmark' : undefined}
        label="Following"
        className={className}
        onPress={() =>
          user.isPrivate
            ? Alert.alert(`Unfollow ${user.displayName}?`, 'Their account is private, so you’d need to request again.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Unfollow', style: 'destructive', onPress: () => run(false) },
              ])
            : run(false)
        }
      />
    );
  }
  if (followState === 'requested') {
    return (
      <Button
        size={size}
        variant="secondary"
        icon={size === 'md' ? 'time-outline' : undefined}
        label="Requested"
        className={className}
        onPress={() => run(false)}
      />
    );
  }
  return (
    <Button
      size={size}
      icon={size === 'md' ? (user.isPrivate ? 'lock-closed-outline' : 'person-add-outline') : undefined}
      label={user.isPrivate ? 'Request to follow' : 'Follow'}
      className={className}
      onPress={() => run(true)}
    />
  );
}
