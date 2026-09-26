import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's base pressable surface: dims slightly while held. A plain `Pressable`, so NativeWind
 * styles its `className` natively. (An animated pressable registered with NativeWind drops both
 * its classes and its animated styles, which left buttons without backgrounds.)
 */
export function PressableScale({ children, className = '', style, ...props }: Props) {
  return (
    <Pressable {...props} className={`${className} active:opacity-75`} style={style}>
      {children}
    </Pressable>
  );
}
