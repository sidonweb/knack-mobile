import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';

import { Text } from './text';

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row rounded-full bg-raised p-1" accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) haptics.tap();
              onChange(option.value);
            }}
            className={`min-h-9 flex-1 items-center justify-center rounded-full px-2 ${selected ? 'bg-surface' : ''}`}
            style={selected ? { boxShadow: '0px 1px 3px rgba(0,0,0,0.08)' } : undefined}>
            <Text variant="callout" tone={selected ? 'default' : 'muted'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
