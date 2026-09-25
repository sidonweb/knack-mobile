import { View, type ViewProps } from 'react-native';

type Props = ViewProps & { className?: string; padded?: boolean };

/**
 * The one container: surface fill, hairline edge, 20pt corners. Use it to group, not to
 * decorate. A screen should rarely need more than three.
 */
export function Card({ className = '', padded = true, ...props }: Props) {
  return <View className={`rounded-card border border-hairline bg-surface ${padded ? 'p-5' : ''} ${className}`} {...props} />;
}

/** A hairline between rows inside a card, inset to the card's padding. */
export function Divider({ inset = true }: { inset?: boolean }) {
  return <View className={`h-px bg-hairline ${inset ? 'mx-5' : ''}`} />;
}
