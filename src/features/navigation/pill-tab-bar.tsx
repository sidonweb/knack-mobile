import type { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedView } from '@/components/animated-view';
import { Text } from '@/components/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

import { PILL_HEIGHT, pillBottom } from './tab-bar-inset';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ITEM_HEIGHT = 48;
/** Width of a tab showing only its icon. */
const BASE = 54;
const ICON = 21;
/** Icon's left edge inside its tab; fixed so the icon never moves as the tab widens. */
const ICON_LEFT = (BASE - ICON) / 2;
const LABEL_LEFT = ICON_LEFT + ICON + 8;
const LABEL_RIGHT = 16;
const GAP = 2;
const PAD = (PILL_HEIGHT - ITEM_HEIGHT) / 2;
/** Until a label is measured. */
const LABEL_ESTIMATE = 48;
const TIMING = { duration: 320, easing: Easing.bezier(0.3, 0, 0, 1) };

type Motion = {
  from: SharedValue<number>;
  to: SharedValue<number>;
  /** 0 → 1 as the selection travels from `from` to `to`. */
  t: SharedValue<number>;
  labels: SharedValue<number[]>;
};

/** How "selected" tab `index` is right now, 0–1. */
function amount(index: number, from: number, to: number, t: number) {
  'worklet';
  if (from === to) return index === to ? 1 : 0;
  if (index === to) return t;
  if (index === from) return 1 - t;
  return 0;
}

function tabWidth(index: number, motion: { from: number; to: number; t: number; labels: number[] }) {
  'worklet';
  const extra = LABEL_LEFT - BASE + (motion.labels[index] ?? LABEL_ESTIMATE) + LABEL_RIGHT;
  return BASE + amount(index, motion.from, motion.to, motion.t) * extra;
}

function tabLeft(index: number, motion: { from: number; to: number; t: number; labels: number[] }) {
  'worklet';
  let x = PAD;
  for (let i = 0; i < index; i++) x += tabWidth(i, motion) + GAP;
  return x;
}

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

type ItemProps = {
  index: number;
  label: string;
  badge?: string | number;
  focused: boolean;
  motion: Motion;
  renderIcon: (color: string, filled: boolean) => ReactNode;
  onMeasureLabel: (index: number, width: number) => void;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({ index, label, badge, focused, motion, renderIcon, onMeasureLabel, onPress, onLongPress }: ItemProps) {
  const { color } = useTheme();
  const selected = useDerivedValue(() => amount(index, motion.from.get(), motion.to.get(), motion.t.get()));

  const box = useAnimatedStyle(() => ({
    width: tabWidth(index, { from: motion.from.get(), to: motion.to.get(), t: motion.t.get(), labels: motion.labels.get() }),
  }));
  // The label and the light icon ride on the indicator; the quiet icon sits beneath them.
  const onIndicator = useAnimatedStyle(() => ({ opacity: selected.get() }));
  const offIndicator = useAnimatedStyle(() => ({ opacity: 1 - selected.get() }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, selected.get() * 1.6 - 0.6) }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge ? `${label}, ${badge} waiting` : label}
      hitSlop={{ top: 6, bottom: 6 }}>
      <AnimatedView style={[{ height: ITEM_HEIGHT, overflow: 'hidden' }, box]}>
        <View style={{ position: 'absolute', left: ICON_LEFT, top: (ITEM_HEIGHT - ICON) / 2, width: ICON, height: ICON }}>
          <AnimatedView style={[{ position: 'absolute' }, offIndicator]}>{renderIcon(color('subtle'), false)}</AnimatedView>
          <AnimatedView style={[{ position: 'absolute' }, onIndicator]}>{renderIcon(color('canvas'), true)}</AnimatedView>
          {badge !== undefined ? (
            <View
              className="absolute -right-2.5 -top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1"
              style={{ borderWidth: 2, borderColor: color('surface') }}>
              <Text className="font-inter-semibold text-[9px] leading-[11px] text-white" maxFontSizeMultiplier={1.2}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {/* Wide enough that the label lays out at its natural width; the tab clips it. */}
        <AnimatedView
          style={[{ position: 'absolute', left: LABEL_LEFT, top: 0, bottom: 0, width: 240, justifyContent: 'center', alignItems: 'flex-start' }, labelStyle]}>
          <Text
            variant="callout"
            tone="inverse"
            className="font-inter-semibold"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            onLayout={(event) => onMeasureLabel(index, Math.ceil(event.nativeEvent.layout.width))}>
            {label}
          </Text>
        </AnimatedView>
      </AnimatedView>
    </Pressable>
  );
}

/**
 * A floating pill for the tab bar. One dark indicator slides to the selected tab while that
 * tab widens to reveal its label and the previous one narrows. Every moving part reads the
 * same eased value, so they stay in lockstep. Badges come from each screen's `tabBarBadge`.
 */
export function PillTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { scheme, color } = useTheme();
  const keyboard = useKeyboardVisible();

  const from = useSharedValue(state.index);
  const to = useSharedValue(state.index);
  const t = useSharedValue(1);
  const labels = useSharedValue<number[]>([]);
  const motion = { from, to, t, labels };

  useEffect(() => {
    if (to.get() === state.index) return;
    // Interrupted mid-way: start from whichever tab currently looks selected.
    from.set(t.get() >= 0.5 ? to.get() : from.get());
    to.set(state.index);
    t.set(0);
    t.set(withTiming(1, TIMING));
  }, [state.index, from, to, t]);

  const onMeasureLabel = (index: number, width: number) => {
    const current = labels.get();
    if (current[index] === width) return;
    const next = [...current];
    next[index] = width;
    labels.set(next);
  };

  const indicator = useAnimatedStyle(() => {
    const m = { from: from.get(), to: to.get(), t: t.get(), labels: labels.get() };
    const left = tabLeft(m.from, m) + (tabLeft(m.to, m) - tabLeft(m.from, m)) * m.t;
    const width = tabWidth(m.from, m) + (tabWidth(m.to, m) - tabWidth(m.from, m)) * m.t;
    return { left, width };
  });

  if (keyboard) return null;

  return (
    <View
      style={{ pointerEvents: 'box-none', position: 'absolute', left: 0, right: 0, bottom: pillBottom(insets.bottom), alignItems: 'center' }}>
      <View
        accessibilityRole="tablist"
        className="flex-row items-center rounded-full border border-hairline bg-surface"
        style={{
          height: PILL_HEIGHT,
          paddingHorizontal: PAD,
          gap: GAP,
          boxShadow: scheme === 'dark' ? '0px 10px 30px rgba(0,0,0,0.5)' : '0px 10px 30px rgba(0,0,0,0.12)',
        }}>
        <AnimatedView
          style={[{ position: 'absolute', top: PAD - 1, height: ITEM_HEIGHT, borderRadius: ITEM_HEIGHT / 2, backgroundColor: color('fg') }, indicator]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;

          return (
            <TabItem
              key={route.key}
              index={index}
              label={options.title ?? route.name}
              badge={options.tabBarBadge}
              focused={focused}
              motion={motion}
              renderIcon={(tint, filled) => options.tabBarIcon?.({ focused: filled, color: tint, size: ICON })}
              onMeasureLabel={onMeasureLabel}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptics.tap();
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}
