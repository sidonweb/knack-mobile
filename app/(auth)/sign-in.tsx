import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, type TextInput } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { haptics } from '@/lib/haptics';
import { errorMessage } from '@/services/api/errors';
import { useAuth } from '@/store/auth';

const schema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username'),
  password: z.string().min(1, 'Enter your password'),
});

export default function SignInScreen() {
  const signIn = useAuth((state) => state.signIn);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form | 'form', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const password = useRef<TextInput>(null);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ identifier: fields.identifier?.[0], password: fields.password?.[0] });
      haptics.warning();
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await signIn(parsed.data.identifier, parsed.data.password);
    } catch (error) {
      setErrors({ form: errorMessage(error) });
      haptics.warning();
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up where you left off."
      footer={
        <Link href="/sign-up" asChild>
          <Pressable accessibilityRole="link" className="min-h-11 items-center justify-center">
            <Text variant="callout" tone="muted">
              New here? <Text variant="callout">Create an account</Text>
            </Text>
          </Pressable>
        </Link>
      }>
      <TextField
        label="Email or username"
        value={form.identifier}
        onChangeText={(identifier) => setForm((current) => ({ ...current, identifier }))}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => password.current?.focus()}
        error={errors.identifier}
      />
      <TextField
        ref={password}
        label="Password"
        value={form.password}
        onChangeText={(password) => setForm((current) => ({ ...current, password }))}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={errors.password}
      />
      {errors.form ? (
        <Text variant="footnote" tone="rose" accessibilityLiveRegion="polite">
          {errors.form}
        </Text>
      ) : null}
      <Button label="Sign in" onPress={submit} loading={submitting} className="mt-2" />
    </AuthShell>
  );
}
