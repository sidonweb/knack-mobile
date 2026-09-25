import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { EmptyState, LoadingState } from '@/components/empty-state';
import { FieldLabel } from '@/components/field-label';
import { ModalHeader } from '@/components/modal-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Text } from '@/components/text';
import { CheckCircle } from '@/features/today/components/check-circle';
import { useTaskActions, useTasks } from '@/features/today/hooks';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDayShort, relativeDayName, today, weekStart, type Day } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { PRIORITY_OPTIONS } from '@/lib/habits';
import type { UpdateTaskInput } from '@/services/tasks';
import type { Task, TaskPriority } from '@/types/api';

function dateOptions(current: Day): { value: Day; label: string }[] {
  const now = today();
  const options = [
    { value: now, label: 'Today' },
    { value: addDays(now, 1), label: 'Tomorrow' },
    { value: addDays(weekStart(now), 7), label: 'Next week' },
  ];
  if (!options.some((option) => option.value === current)) {
    options.unshift({ value: current, label: relativeDayName(current) });
  }
  return options;
}

function Editor({ task }: { task: Task }) {
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const actions = useTaskActions(task.date);

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [date, setDate] = useState<Day>(task.date);

  const save = () => {
    const patch: UpdateTaskInput = {};
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) patch.title = trimmed;
    const nextNotes = notes.trim() || null;
    if (nextNotes !== task.notes) patch.notes = nextNotes;
    if (priority !== task.priority) patch.priority = priority;
    if (date !== task.date) patch.date = date;
    if (Object.keys(patch).length > 0) {
      haptics.tap();
      actions.update(task, patch);
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-canvas">
      <ModalHeader title="Task" onCancel={() => router.back()} action={{ label: 'Save', onPress: save, disabled: !title.trim() }} />

      <ScrollView contentContainerClassName="gap-7 px-5 pb-6 pt-4" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View className="flex-row items-start gap-3.5">
          <Pressable
            onPress={() => actions.toggle(task)}
            hitSlop={12}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.completed }}
            accessibilityLabel={task.completed ? 'Completed' : 'Mark complete'}
            className="pt-0.5">
            <CheckCircle checked={task.completed} size={26} />
          </Pressable>
          <View className="flex-1 gap-2">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task"
              placeholderTextColor={color('subtle')}
              selectionColor={color('ember')}
              maxLength={200}
              multiline
              submitBehavior="blurAndSubmit"
              returnKeyType="done"
              accessibilityLabel="Title"
              className="font-inter-semibold text-[20px] leading-[26px] text-fg"
            />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes"
              placeholderTextColor={color('subtle')}
              selectionColor={color('ember')}
              maxLength={2000}
              multiline
              accessibilityLabel="Notes"
              className="min-h-[60px] font-inter text-[15px] leading-[21px] text-muted"
            />
          </View>
        </View>

        <View className="gap-3">
          <FieldLabel>Priority</FieldLabel>
          <SegmentedControl options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
          <Text variant="footnote" tone="subtle">
            Higher priority weighs more in your day score.
          </Text>
        </View>

        <View className="gap-3">
          <FieldLabel>When</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            {dateOptions(task.date).map((option) => (
              <Chip key={option.value} label={option.label} selected={option.value === date} onPress={() => setDate(option.value)} />
            ))}
          </View>
          <Text variant="footnote" tone="subtle">
            {formatDayShort(date)}
          </Text>
        </View>
      </ScrollView>

      <View className="px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Button
          label="Delete task"
          icon="trash-outline"
          variant="danger"
          onPress={() => {
            actions.remove(task);
            router.back();
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

export default function TaskScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date: string }>();
  const tasks = useTasks(date ?? today());
  const task = tasks.data?.find((candidate) => candidate.id === id);

  if (!task) {
    return (
      <View className="flex-1 justify-center bg-canvas">
        {tasks.isLoading ? (
          <LoadingState />
        ) : (
          <EmptyState
            icon="checkmark-done-outline"
            title="This task is gone"
            message="It was deleted or moved to another day."
            action={<Button label="Close" variant="secondary" size="sm" onPress={() => router.back()} />}
          />
        )}
      </View>
    );
  }
  return <Editor task={task} />;
}
