import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/**
 * A bottom sheet for short, dismissable content (who reacted, quick pickers). The backdrop
 * fades while the panel slides, so the page behind never moves. Tap outside or swipe the
 * system back gesture to close. Full editors use a native formSheet route instead.
 */
export function Sheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {visible ? (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
            <Pressable
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(220)}
            exiting={SlideOutDown.duration(200)}
            accessibilityViewIsModal
            className="absolute bottom-0 left-0 right-0 max-h-[70%] rounded-t-[28px] border-t border-hairline bg-surface"
            style={{ paddingBottom: insets.bottom + 12 }}>
            <View className="items-center pb-1 pt-2.5">
              <View className="h-[5px] w-9 rounded-full bg-fg/15" />
            </View>
            {title ? (
              <Text variant="headline" className="px-5 pb-2 pt-2" accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {children}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}
