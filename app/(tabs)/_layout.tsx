import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { PillTabBar } from '@/features/navigation/pill-tab-bar';
import { PILL_HEIGHT, pillBottom, TabBarInsetContext } from '@/features/navigation/tab-bar-inset';
import { useInbox } from '@/features/social/hooks';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'today', title: 'Today', icon: 'sunny-outline', iconActive: 'sunny' },
  { name: 'habits', title: 'Habits', icon: 'repeat-outline', iconActive: 'repeat' },
  { name: 'friends', title: 'Friends', icon: 'people-outline', iconActive: 'people' },
  { name: 'profile', title: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const inbox = useInbox().data;
  const waiting = (inbox?.followRequests ?? 0) + (inbox?.challengeInvites ?? 0);
  // The bar floats over content, so scrolling screens pad for it (plus breathing room).
  const clearance = PILL_HEIGHT + pillBottom(insets.bottom) + 24;

  return (
    <TabBarInsetContext.Provider value={clearance}>
      <Tabs tabBar={(props) => <PillTabBar {...props} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ focused, color }) => <Icon name={focused ? tab.iconActive : tab.icon} size={21} colorValue={color} />,
              // Follow requests and challenge invites waiting on the user.
              tabBarBadge: tab.name === 'friends' && waiting > 0 ? (waiting > 9 ? '9+' : waiting) : undefined,
            }}
          />
        ))}
      </Tabs>
    </TabBarInsetContext.Provider>
  );
}
