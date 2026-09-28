import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { haptics } from '@/lib/haptics';
import { errorMessage } from '@/services/api/errors';
import { GoogleSignInError, googleSignInAvailable } from '@/services/auth';
import { useAuth } from '@/store/auth';

/** "or" divider plus the Google button, shared by sign-in and sign-up. Signing in creates the account if needed. */
export function GoogleSignIn() {
  const signInWithGoogle = useAuth((state) => state.signInWithGoogle);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setError(undefined);
    setSubmitting(true);
    try {
      // On success the auth layout navigates away and this unmounts.
      if (await signInWithGoogle()) return;
    } catch (caught) {
      setError(caught instanceof GoogleSignInError ? caught.message : errorMessage(caught));
      haptics.warning();
    }
    setSubmitting(false);
  };

  if (!googleSignInAvailable) return null;

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-3" accessible={false}>
        <View className="h-px flex-1 bg-hairline" />
        <Text variant="footnote" tone="muted">
          or
        </Text>
        <View className="h-px flex-1 bg-hairline" />
      </View>
      <Button label="Continue with Google" icon="logo-google" variant="secondary" onPress={submit} loading={submitting} />
      {error ? (
        <Text variant="footnote" tone="rose" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
