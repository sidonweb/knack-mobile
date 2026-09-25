import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import type { TaskPriority } from '@/types/api';

type Props = { onAdd: (title: string, priority: TaskPriority) => void };

const CYCLE: TaskPriority[] = ['NONE', 'MEDIUM', 'HIGH', 'LOW'];
const LABEL: Record<TaskPriority, string> = { NONE: 'Normal', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
const CHIP: Record<TaskPriority, string> = {
  NONE: 'bg-raised',
  LOW: 'bg-steel/15',
  MEDIUM: 'bg-amber/15',
  HIGH: 'bg-ember/15',
};

/**
 * Inline composer: type, hit return, keep typing. Planning should feel like a list, not a
 * form. The flag cycles the importance of the next task, which sets its scoring weight.
 */
export function AddTask({ onAdd }: Props) {
  const { color } = useTheme();
  const input = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NONE');
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, priority);
    setTitle('');
    setPriority('NONE');
  };

  const cycle = () => {
    haptics.tap();
    setPriority((current) => CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]!);
  };

  const active = focused || title.length > 0;

  return (
    <View className={`mx-3 mb-3 mt-1 flex-row items-center gap-3 rounded-2xl border pl-2.5 pr-3 ${active ? 'border-hairline bg-surface' : 'border-transparent bg-raised'}`}>
      <Pressable
        onPress={() => input.current?.focus()}
        className="h-7 w-7 items-center justify-center rounded-full bg-fg/[0.07]"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Icon name="add" size={18} color={active ? 'fg' : 'muted'} />
      </Pressable>
      <TextInput
        ref={input}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder="Add a task"
        placeholderTextColor={color('subtle')}
        selectionColor={color('ember')}
        maxLength={200}
        accessibilityLabel="New task"
        className="h-12 flex-1 font-inter text-[15px] text-fg"
      />
      {active ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
          <Pressable
            onPress={cycle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Priority: ${LABEL[priority]}`}
            className={`flex-row justify-center items-center gap-1 rounded-full px-2.5 py-1 ${CHIP[priority]}`}>
            <Icon name={priority === 'NONE' ? 'flag-outline' : 'flag'} size={12} color={priority === 'HIGH' ? 'ember' : priority === 'MEDIUM' ? 'amber' : priority === 'LOW' ? 'steel' : 'muted'} />
            <Text variant="footnote" tone="muted">
              {LABEL[priority]}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
