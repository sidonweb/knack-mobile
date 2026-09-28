import Constants from 'expo-constants';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { CountBadge } from '@/components/badge';
import { Card, Divider } from '@/components/card';
import { ErrorState, LoadingState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Screen, SectionHeader } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useAvatar, useMe, useUpdateMe } from '@/features/profile/hooks';
import { useInbox } from '@/features/social/hooks';
import { useTheme } from '@/hooks/use-theme';
import { API_URL } from '@/lib/config';
import { haptics } from '@/lib/haptics';
import { ApiError, errorMessage } from '@/services/api/errors';
import { useAppearance } from '@/store/appearance';
import { useAuth } from '@/store/auth';
import type { Me } from '@/types/api';

function AvatarPicker({ user }: { user: Me }) {
  const { color } = useTheme();
  const { upload, remove } = useAvatar();
  const busy = upload.isPending || remove.isPending;
  const onError = (error: unknown) => Alert.alert('Couldn’t update your photo', errorMessage(error));

  const choose = () => {
    if (!user.avatarUrl) {
      upload.mutate(undefined, { onError });
      return;
    }
    Alert.alert('Profile photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose a new photo', onPress: () => upload.mutate(undefined, { onError }) },
      { text: 'Remove photo', style: 'destructive', onPress: () => remove.mutate(undefined, { onError }) },
    ]);
  };

  return (
    <View className="items-center gap-3 pt-4">
      <Pressable onPress={choose} disabled={busy} accessibilityRole="button" accessibilityLabel="Change profile photo">
        <Avatar name={user.displayName} url={user.avatarUrl} size={96} />
        <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-canvas bg-fg">
          {busy ? <ActivityIndicator size="small" color={color('canvas')} /> : <Icon name="camera" size={15} color="canvas" />}
        </View>
      </Pressable>
      <Pressable onPress={choose} disabled={busy} hitSlop={8}>
        <Text variant="callout" tone="muted">
          {user.avatarUrl ? 'Change photo' : 'Add a photo'}
        </Text>
      </Pressable>
    </View>
  );
}

function ToggleRow({ title, caption, value, onChange }: { title: string; caption: string; value: boolean; onChange: (value: boolean) => void }) {
  const { color } = useTheme();
  return (
    <View className="min-h-14 flex-row items-center gap-4 py-3.5">
      <View className="flex-1 gap-0.5">
        <Text variant="body" className="font-inter-medium">
          {title}
        </Text>
        <Text variant="footnote" tone="subtle">
          {caption}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          haptics.tap();
          onChange(next);
        }}
        trackColor={{ true: color('mint'), false: color('hairline') }}
        accessibilityLabel={title}
      />
    </View>
  );
}

/** Privacy changes apply instantly and roll back if the server says no. */
function Privacy({ user }: { user: Me }) {
  const update = useUpdateMe();
  const requests = useInbox().data?.followRequests ?? 0;
  const [draft, setDraft] = useState({ isPrivate: user.isPrivate, shareActivity: user.shareActivity });

  const change = (patch: Partial<typeof draft>) => {
    const previous = draft;
    setDraft({ ...draft, ...patch });
    update.mutate(patch, {
      onError: (error) => {
        setDraft(previous);
        Alert.alert('Couldn’t save', errorMessage(error));
      },
    });
  };

  const setPrivate = (value: boolean) => {
    if (!value && requests > 0) {
      Alert.alert('Make your account public?', `Your ${requests} pending ${requests === 1 ? 'request' : 'requests'} will be approved.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Make public', onPress: () => change({ isPrivate: false }) },
      ]);
      return;
    }
    change({ isPrivate: value });
  };

  return (
    <View className="gap-3">
      <SectionHeader title="Privacy" />
      <Card padded={false} className="px-5">
        <ToggleRow
          title="Private account"
          caption="You approve who follows you. Only followers see your calendar, habits, achievements and activity."
          value={draft.isPrivate}
          onChange={setPrivate}
        />
        <View className="h-px bg-hairline" />
        <ToggleRow
          title="Share activity"
          caption="Show your closed-out days, streaks and unlocks in friends’ feeds. Off keeps them to yourself."
          value={draft.shareActivity}
          onChange={(value) => change({ shareActivity: value })}
        />
        <View className="h-px bg-hairline" />
        <Link href={{ pathname: '/connections', params: { tab: 'requests' } }} asChild>
          <Pressable accessibilityRole="button" className="min-h-14 flex-row items-center justify-between py-3.5 active:opacity-60">
            <Text variant="body" className="font-inter-medium">
              Follow requests
            </Text>
            <View className="flex-row items-center gap-2">
              <CountBadge count={requests} />
              <Icon name="chevron-forward" size={16} color="subtle" />
            </View>
          </Pressable>
        </Link>
      </Card>
      <Text variant="footnote" tone="subtle" className="px-1">
        Your name, photo, level and streak are always visible so friends can find you. You can also hide any single item from
        your feed with its ⋯ menu.
      </Text>
    </View>
  );
}

const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

function AppearanceSection() {
  const preference = useAppearance((state) => state.preference);
  const setPreference = useAppearance((state) => state.setPreference);
  return (
    <View className="gap-3">
      <SectionHeader title="Appearance" />
      <SegmentedControl options={APPEARANCE_OPTIONS} value={preference} onChange={setPreference} />
    </View>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: Href }) {
  const content = (
    <>
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <View className="ml-4 flex-shrink flex-row items-center gap-2">
        <Text variant="body" numberOfLines={1} className="flex-shrink">
          {value}
        </Text>
        {href ? <Icon name="chevron-forward" size={16} color="subtle" /> : null}
      </View>
    </>
  );
  const className = 'min-h-14 flex-row items-center justify-between px-5 py-3';
  if (!href) {
    return (
      <View className={className} accessible accessibilityLabel={`${label}: ${value}`}>
        {content}
      </View>
    );
  }
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} className={`${className} active:opacity-60`}>
        {content}
      </Pressable>
    </Link>
  );
}

/** Keyed by the saved values, so the form resets itself whenever the profile changes. */
function ProfileForm({ user }: { user: Me }) {
  const update = useUpdateMe();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? '');
  const [errors, setErrors] = useState<{ displayName?: string; bio?: string }>({});

  const dirty = displayName.trim() !== user.displayName || bio.trim() !== (user.bio ?? '');

  const save = () => {
    if (!displayName.trim()) {
      setErrors({ displayName: 'Required' });
      return;
    }
    update.mutate(
      { displayName: displayName.trim(), bio: bio.trim() || null },
      {
        onError: (error) => {
          const fields = error instanceof ApiError ? error.fieldErrors : {};
          setErrors({ displayName: fields.displayName?.[0], bio: fields.bio?.[0] });
          if (!fields.displayName && !fields.bio) Alert.alert('Could not save', errorMessage(error));
        },
      },
    );
  };

  return (
    <View className="gap-4 pt-2">
      <SectionHeader title="Profile" />
      <TextField label="Name" value={displayName} onChangeText={setDisplayName} maxLength={50} error={errors.displayName} />
      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        maxLength={160}
        placeholder="What are you working towards?"
        error={errors.bio}
      />
      {dirty ? <Button label="Save changes" onPress={save} loading={update.isPending} /> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const me = useMe();
  const signOut = useAuth((state) => state.signOut);

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Changes that haven’t synced yet will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen topInset={false}>
      {me.data ? (
        <>
          <AvatarPicker user={me.data} />
          <ProfileForm key={`${me.data.displayName}|${me.data.bio ?? ''}`} user={me.data} />
          <Privacy user={me.data} />
          <View className="gap-3">
            <SectionHeader title="Account" />
            <Card padded={false}>
              <Row label="Username" value={`@${me.data.username}`} href="/settings/username" />
              <Divider />
              <Row label="Email" value={me.data.email} />
              <Divider />
              <Row label="Timezone" value={me.data.timezone} />
            </Card>
          </View>
        </>
      ) : me.isError ? (
        <ErrorState title="Couldn’t load your account" error={me.error} onRetry={() => void me.refetch()} />
      ) : (
        <LoadingState />
      )}

      <AppearanceSection />

      <Button label="Sign out" variant="danger" onPress={confirmSignOut} />
      {me.data ? (
        <Link href="/settings/delete-account" asChild>
          <Pressable accessibilityRole="button" className="-mt-2 min-h-11 items-center justify-center active:opacity-60">
            <Text variant="callout" tone="subtle">
              Delete account
            </Text>
          </Pressable>
        </Link>
      ) : null}

      <Text variant="caption" tone="subtle" className="text-center">
        Knack {Constants.expoConfig?.version} · {__DEV__ ? API_URL : 'production'}
      </Text>
    </Screen>
  );
}
