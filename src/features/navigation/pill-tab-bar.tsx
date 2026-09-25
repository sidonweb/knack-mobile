import type { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

import { PILL_HEIGHT, pillBottom } from './tab-bar-inset';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ITEM_HEIGHT = 48;
const LAYOUT = LinearTransition.duration(220);

/** Hide while typing on Android, where the resized window would push the bar above the keyboard. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * A floating pill for the tab bar. The active tab expands into an inverted capsule with its
 * label; the others are just their icons. Badges come from each screen's `tabBarBadge`.
 */
export function PillTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { color, scheme } = useTheme();
  const keyboard = useKeyboardVisible();
  if (keyboard) return null;

  return (
    <View
      style={{ pointerEvents: 'box-none', position: 'absolute', left: 0, right: 0, bottom: pillBottom(insets.bottom), alignItems: 'center' }}>
      <Animated.View
        layout={LAYOUT}
        accessibilityRole="tablist"
        className="flex-row items-center gap-1 rounded-full border border-hairline bg-surface px-1.5"
        style={{
          height: PILL_HEIGHT,
          boxShadow: scheme === 'dark' ? '0px 10px 30px rgba(0,0,0,0.5)' : '0px 10px 30px rgba(0,0,0,0.12)',
        }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const badge = options.tabBarBadge;
          const tint = focused ? color('canvas') : color('subtle');

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptics.tap();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${label}, ${badge} waiting` : label}
              hitSlop={{ top: 6, bottom: 6 }}>
              <Animated.View
                layout={LAYOUT}
                className={`flex-row items-center justify-center gap-2 rounded-full ${focused ? 'bg-fg pl-4 pr-5' : 'px-4'}`}
                style={{ height: ITEM_HEIGHT, minWidth: ITEM_HEIGHT + 8 }}>
                <View>
                  {options.tabBarIcon?.({ focused, color: tint, size: 22 })}
                  {badge !== undefined ? (
                    <View
                      className="absolute -right-2 -top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1"
                      style={{ borderWidth: 2, borderColor: focused ? color('fg') : color('surface') }}>
                      <Text className="font-inter-semibold text-[9px] leading-[11px] text-white" maxFontSizeMultiplier={1.2}>
                        {badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {focused ? (
                  <Animated.View entering={FadeIn.duration(180).delay(60)} exiting={FadeOut.duration(80)}>
                    <Text variant="callout" tone="inverse" className="font-inter-semibold" numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {label}
                    </Text>
                  </Animated.View>
                ) : null}
              </Animated.View>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}
