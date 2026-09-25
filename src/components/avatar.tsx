import { Image } from 'expo-image';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { API_URL } from '@/lib/config';
import type { ColorToken } from '@/lib/theme';

import { Text } from './text';

type Props = {
  name: string;
  url?: string | null;
  size?: number;
  /** A thin accent ring, e.g. for the profile hero. */
  ring?: ColorToken;
};

/** Uploaded avatars come back as API-relative paths (`/avatars/:id?v=…`). */
export function avatarUri(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_URL}${url}`;
}

export function Avatar({ name, url, size = 40, ring }: Props) {
  const { color } = useTheme();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const inner = url ? (
    <Image
      source={{ uri: avatarUri(url) }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      transition={200}
      accessibilityLabel={name}
    />
  ) : (
    <View
      className="items-center justify-center border border-hairline bg-raised"
      style={{ width: size, height: size, borderRadius: size / 2 }}>
      <Text className="font-inter-semibold text-muted" style={{ fontSize: size * 0.36 }}>
        {initials}
      </Text>
    </View>
  );

  if (!ring) return inner;
  return (
    <View style={{ padding: 3, borderRadius: size, borderWidth: 2, borderColor: color(ring) }}>{inner}</View>
  );
}
