import { View } from 'react-native';

import { useSync } from '@/store/sync';

import { Icon } from './icon';
import { Text } from './text';

/** Quiet indicator that appears only when the device is offline or has unsynced changes. */
export function SyncBadge() {
  const online = useSync((state) => state.online);
  const pending = useSync((state) => state.pending);
  if (online && pending === 0) return null;

  const label = !online ? (pending > 0 ? `Offline · ${pending} pending` : 'Offline') : `Syncing ${pending}`;
  return (
    <View className="flex-row items-center gap-1.5 self-start rounded-full border border-hairline bg-surface px-3 py-1.5">
      <Icon name={online ? 'sync' : 'cloud-offline-outline'} size={13} color="subtle" />
      <Text variant="footnote" tone="muted">
        {label}
      </Text>
    </View>
  );
}
