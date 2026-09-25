import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

/**
 * NativeWind only styles components it knows about. Reanimated's animated primitives
 * aren't among them, so without this `className` on an `Animated.View` is silently
 * dropped. Import once, before any screen renders.
 */
cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });
cssInterop(Animated.ScrollView, { className: 'style', contentContainerClassName: 'contentContainerStyle' });
