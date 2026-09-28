import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, type TextInput } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { GoogleSignIn } from '@/features/auth/components/google-sign-in';
import { haptics } from '@/lib/haptics';
import { ApiError, errorMessage } from '@/services/api/errors';
import { useAuth } from '@/store/auth';

const schema = z.object({
  displayName: z.string().trim().min(1, 'What should we call you?').max(50),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, '3–20 lowercase letters, numbers or _'),
  email: z.email('Enter a valid email').trim().toLowerCase(),
  password: z.string().min(8, 'At least 8 characters'),
});

type Form = z.input<typeof schema>;
type Errors = Partial<Record<keyof Form | 'form', string>>;

export default function SignUpScreen() {
  const signUp = useAuth((state) => state.signUp);
  const [form, setForm] = useState<Form>({ displayName: '', username: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const username = useRef<TextInput>(null);
  const email = useRef<TextInput>(null);
  const password = useRef<TextInput>(null);

  const field = (key: keyof Form) => ({
    value: form[key],
    onChangeText: (value: string) => setForm((current) => ({ ...current, [key]: value })),
    error: errors[key],
  });

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages?.[0]])));
      haptics.warning();
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await signUp(parsed.data);
    } catch (error) {
      // Surface server-side field errors (e.g. "Username is taken") next to the field.
      if (error instanceof ApiError && error.status === 409) {
        setErrors(error.message.toLowerCase().includes('email') ? { email: error.message } : { username: error.message });
      } else {
        setErrors({ form: errorMessage(error) });
      }
      haptics.warning();
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Make every day count"
      subtitle="Plan it, finish it, keep the streak alive."
      footer={
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="link" className="min-h-11 items-center justify-center">
            <Text variant="callout" tone="muted">
              Already have an account? <Text variant="callout">Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      }>
      <TextField label="Name" autoComplete="name" textContentType="name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => username.current?.focus()} {...field('displayName')} />
      <TextField
        ref={username}
        label="Username"
        hint="3–20 lowercase letters, numbers or _"
        returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => email.current?.focus()}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        {...field('username')}
      />
      <TextField
        ref={email}
        label="Email"
        returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => password.current?.focus()}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        {...field('email')}
      />
      <TextField
        ref={password}
        label="Password"
        hint="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        {...field('password')}
      />
      {errors.form ? (
        <Text variant="footnote" tone="rose" accessibilityLiveRegion="polite">
          {errors.form}
        </Text>
      ) : null}
      <Button label="Create account" onPress={submit} loading={submitting} className="mt-2" />
      <GoogleSignIn />
    </AuthShell>
  );
}
