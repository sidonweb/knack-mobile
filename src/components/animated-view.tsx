import { View } from 'react-native';
import Animated from 'react-native-reanimated';

/**
 * A Reanimated view for anything driven by `useAnimatedStyle`.
 *
 * `Animated.View` is registered with NativeWind (see lib/nativewind-interop.ts) so it accepts
 * `className`, but that wrapper drops Reanimated's animated styles: widths, opacities and
 * transforms silently never apply. This component isn't registered, so animated styles pass
 * straight through. It takes `style` only, never `className`.
 *
 * Rule of thumb: `Animated.View` for `entering`/`exiting` with classes, `AnimatedView` for
 * `useAnimatedStyle`.
 */
export const AnimatedView = Animated.createAnimatedComponent(View);
