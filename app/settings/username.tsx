import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { ErrorState, LoadingState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useMe, useUpdateMe } from '@/features/profile/hooks';
import { formatMonthDay, toDay } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { ApiError, errorMessage } from '@/services/api/errors';
import type { Me } from '@/types/api';

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, '3–20 lowercase letters, numbers or _');

function UsernameForm({ user }: { user: Me }) {
  const update = useUpdateMe();
  const [username, setUsername] = useState(user.username);
  const [error, setError] = useState<string>();
  const lockedUntil = user.usernameChangeAvailableAt ? formatMonthDay(toDay(new Date(user.usernameChangeAvailableAt))) : null;
  const unchanged = username.trim().toLowerCase() === user.username;

  const save = () => {
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      haptics.warning();
      return;
    }
    Alert.alert(`Change to @${parsed.data}?`, 'You won’t be able to change it again for 14 days.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change',
        onPress: () =>
          update.mutate(
            { username: parsed.data },
            {
              onSuccess: () => router.back(),
              onError: (caught) => {
                setError((caught instanceof ApiError ? caught.fieldErrors.username?.[0] : undefined) ?? errorMessage(caught));
                haptics.warning();
              },
            },
          ),
      },
    ]);
  };

  return (
    <>
      <TextField
        label="Username"
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          setError(undefined);
        }}
        editable={!lockedUntil}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        maxLength={20}
        returnKeyType="done"
        onSubmitEditing={save}
        icon="at"
        hint="3–20 lowercase letters, numbers or _"
        error={error}
      />
      <Text variant="footnote" tone="subtle" className="px-1">
        {lockedUntil
          ? `You changed your username recently. You can change it again on ${lockedUntil}.`
          : 'Friends find you by your username. You can change it once every 14 days.'}
      </Text>
      {lockedUntil ? null : <Button label="Save username" onPress={save} loading={update.isPending} disabled={unchanged} />}
    </>
  );
}

export default function UsernameScreen() {
  const me = useMe();
  return (
    <Screen topInset={false}>
      {me.data ? (
        <UsernameForm user={me.data} />
      ) : me.isError ? (
        <ErrorState title="Couldn’t load your account" error={me.error} onRetry={() => void me.refetch()} />
      ) : (
        <LoadingState />
      )}
    </Screen>
  );
}
