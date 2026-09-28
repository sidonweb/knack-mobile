import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorState, LoadingState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useMe } from '@/features/profile/hooks';
import { haptics } from '@/lib/haptics';
import { errorMessage } from '@/services/api/errors';
import { useAuth } from '@/store/auth';
import type { Me } from '@/types/api';

const LOST = [
  'Your profile, username and photo',
  'All tasks, habits and check-ins',
  'Your XP, streaks and achievements',
  'Followers, following and challenges you created',
];

function DeleteForm({ user }: { user: Me }) {
  const deleteAccount = useAuth((state) => state.deleteAccount);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  const run = async () => {
    setDeleting(true);
    try {
      // On success the session ends and the app returns to sign-in.
      await deleteAccount(user.hasPassword ? password : undefined);
    } catch (caught) {
      setError(errorMessage(caught));
      haptics.warning();
      setDeleting(false);
    }
  };

  const confirm = () => {
    if (user.hasPassword && !password) {
      setError('Enter your password');
      haptics.warning();
      return;
    }
    setError(undefined);
    Alert.alert('Delete your account?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete forever', style: 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <>
      <View className="gap-2 pt-2">
        <Text variant="title">This is permanent</Text>
        <Text variant="body" tone="muted">
          Deleting @{user.username} removes everything right away. There’s no way to recover it.
        </Text>
      </View>
      <Card className="gap-3">
        {LOST.map((item) => (
          <View key={item} className="flex-row items-center gap-3">
            <Icon name="close-circle" size={18} color="rose" />
            <Text variant="body" className="flex-1">
              {item}
            </Text>
          </View>
        ))}
      </Card>
      {user.hasPassword ? (
        <TextField
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError(undefined);
          }}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={confirm}
          hint="Confirm it’s you"
          error={error}
        />
      ) : error ? (
        <Text variant="footnote" tone="rose" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label="Delete account" variant="danger" onPress={confirm} loading={deleting} />
    </>
  );
}

export default function DeleteAccountScreen() {
  const me = useMe();
  return (
    <Screen topInset={false}>
      {me.data ? (
        <DeleteForm user={me.data} />
      ) : me.isError ? (
        <ErrorState title="Couldn’t load your account" error={me.error} onRetry={() => void me.refetch()} />
      ) : (
        <LoadingState />
      )}
    </Screen>
  );
}
