import { Text } from './text';

/** Uppercase label above a form control or group. */
export function FieldLabel({ children }: { children: string }) {
  return (
    <Text variant="overline" tone="subtle" accessibilityRole="header">
      {children}
    </Text>
  );
}
