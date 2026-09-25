import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { haptics } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { progressApi } from '@/services/progress';
import { usersApi } from '@/services/users';
import type { Me } from '@/types/api';

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: usersApi.me });
}

export function useStreaks() {
  return useQuery({ queryKey: queryKeys.streaks, queryFn: progressApi.streaks });
}

export function useAchievements() {
  return useQuery({ queryKey: queryKeys.achievements, queryFn: progressApi.achievements });
}

/** Saving the profile also refreshes how it looks to others (and to you on the Profile tab). */
function useMeMutation<TInput>(mutationFn: (input: TInput) => Promise<Me>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.username) });
    },
  });
}

export const useUpdateMe = () => useMeMutation(usersApi.updateMe);

const AVATAR_SIZE = 512;

/**
 * Picks a square photo, shrinks it to 512px JPEG on the device and uploads it. Resolves to
 * null when the user cancels or declines photo access.
 */
async function pickAndUploadAvatar(): Promise<Me | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Allow photo access in Settings to choose a profile photo.');

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.min(asset.width, asset.height) > AVATAR_SIZE) {
    context.resize(asset.width <= asset.height ? { width: AVATAR_SIZE } : { height: AVATAR_SIZE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error('Could not read that photo.');
  return usersApi.setAvatar(saved.base64);
}

export function useAvatar() {
  const queryClient = useQueryClient();
  const onSuccess = (user: Me | null) => {
    if (!user) return;
    haptics.success();
    queryClient.setQueryData(queryKeys.me, user);
    void queryClient.invalidateQueries({ queryKey: ['profile'] });
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
  };
  return {
    upload: useMutation({ mutationFn: pickAndUploadAvatar, onSuccess }),
    remove: useMutation({ mutationFn: usersApi.removeAvatar, onSuccess }),
  };
}
