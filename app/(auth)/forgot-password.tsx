import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, type TextInput } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { haptics } from '@/lib/haptics';
import { ApiError, errorMessage } from '@/services/api/errors';
import { requestPasswordReset } from '@/services/auth';
import { useAuth } from '@/store/auth';

const emailSchema = z.email('Enter a valid email').trim().toLowerCase();

const resetSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  password: z.string().min(8, 'At least 8 characters'),
});

type Errors = Partial<Record<'email' | 'code' | 'password' | 'form', string>>;

/** Two steps on one screen: ask for the email, then take the emailed code and a new password. */
export default function ForgotPasswordScreen() {
  const resetPassword = useAuth((state) => state.resetPassword);
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email?.includes('@') ? params.email : '');
  const [sentTo, setSentTo] = useState<string>();
  const [form, setForm] = useState({ code: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const password = useRef<TextInput>(null);

  const fail = (next: Errors) => {
    setErrors(next);
    haptics.warning();
    setSubmitting(false);
  };

  const sendCode = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return fail({ email: parsed.error.issues[0]?.message });
    setErrors({});
    setSubmitting(true);
    try {
      await requestPasswordReset(parsed.data);
      setSentTo(parsed.data);
      setSubmitting(false);
    } catch (error) {
      fail({ form: errorMessage(error) });
    }
  };

  const resend = async () => {
    if (!sentTo) return;
    setResent(true);
    await requestPasswordReset(sentTo).catch(() => setResent(false));
  };

  const submit = async () => {
    const parsed = resetSchema.safeParse(form);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      return fail({ code: fields.code?.[0], password: fields.password?.[0] });
    }
    if (!sentTo) return;
    setErrors({});
    setSubmitting(true);
    try {
      // Signs in on success; the auth layout then leaves this stack.
      await resetPassword({ email: sentTo, ...parsed.data });
    } catch (error) {
      const fields = error instanceof ApiError ? error.fieldErrors : {};
      fail({ code: fields.code?.[0], password: fields.password?.[0], form: fields.code || fields.password ? undefined : errorMessage(error) });
    }
  };

  const back = (
    <Pressable
      accessibilityRole="link"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
      className="min-h-11 items-center justify-center">
      <Text variant="callout" tone="muted">
        Remembered it? <Text variant="callout">Sign in</Text>
      </Text>
    </Pressable>
  );

  const formError = errors.form ? (
    <Text variant="footnote" tone="rose" accessibilityLiveRegion="polite">
      {errors.form}
    </Text>
  ) : null;

  if (!sentTo) {
    return (
      <AuthShell title="Reset password" subtitle="We’ll email you a 6-digit code." footer={back}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={sendCode}
          error={errors.email}
        />
        {formError}
        <Button label="Send code" onPress={sendCode} loading={submitting} className="mt-2" />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Check your email" subtitle={`If ${sentTo} has an account, a code is on its way. It expires in 15 minutes.`} footer={back}>
      <TextField
        label="Code"
        value={form.code}
        onChangeText={(code) => setForm((current) => ({ ...current, code: code.replace(/\D/g, '') }))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => password.current?.focus()}
        error={errors.code}
      />
      <TextField
        ref={password}
        label="New password"
        value={form.password}
        onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        hint="At least 8 characters"
        error={errors.password}
      />
      {formError}
      <Button label="Reset password" onPress={submit} loading={submitting} className="mt-2" />
      <Pressable
        accessibilityRole="button"
        onPress={resend}
        disabled={resent}
        className="min-h-11 items-center justify-center">
        <Text variant="callout" tone="muted">
          {resent ? 'Code sent again' : 'Didn’t get it? Send again'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setSentTo(undefined);
          setForm({ code: '', password: '' });
          setErrors({});
          setResent(false);
        }}
        className="min-h-11 items-center justify-center">
        <Text variant="callout" tone="muted">
          Use a different email
        </Text>
      </Pressable>
    </AuthShell>
  );
}
