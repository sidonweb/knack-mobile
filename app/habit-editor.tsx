import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ErrorState, LoadingState } from '@/components/empty-state';
import { FieldLabel } from '@/components/field-label';
import { Icon, safeIconName, type IconName } from '@/components/icon';
import { ModalHeader } from '@/components/modal-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useHabitActions, useHabitDetail, useHabitsForDay } from '@/features/habits/hooks';
import { useTheme } from '@/hooks/use-theme';
import { today } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { CATEGORIES } from '@/lib/categories';
import { PRIORITY_OPTIONS } from '@/lib/habits';
import { HABIT_COLORS, habitToken, type HabitColor } from '@/lib/theme';
import type { HabitFields, UpdateHabitInput } from '@/services/habits';
import { habitCategories, type Habit, type HabitCategory, type HabitFrequency, type TaskPriority } from '@/types/api';

const ICONS: IconName[] = [
  'book', 'walk', 'barbell', 'water', 'bed', 'leaf', 'musical-notes', 'code-slash',
  'language', 'nutrition', 'bicycle', 'heart', 'create', 'sunny', 'moon', 'cafe',
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FREQUENCIES = [
  { value: 'DAILY', label: 'Specific days' },
  { value: 'WEEKLY', label: 'Times a week' },
] as const;

function Stepper({ value, min, max, onChange, caption }: { value: number; min: number; max: number; onChange: (value: number) => void; caption: string }) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) haptics.tap();
    onChange(next);
  };
  return (
    <View className="flex-row items-center gap-4">
      <Pressable
        onPress={() => step(-1)}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        className={`h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface ${value <= min ? 'opacity-40' : ''}`}>
        <Icon name="remove" />
      </Pressable>
      <Text variant="title" className="w-10 text-center tabular-nums" accessibilityLiveRegion="polite">
        {value}
      </Text>
      <Pressable
        onPress={() => step(1)}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        className={`h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface ${value >= max ? 'opacity-40' : ''}`}>
        <Icon name="add" />
      </Pressable>
      <Text variant="footnote" tone="subtle" className="flex-1">
        {caption}
      </Text>
    </View>
  );
}

function Form({ habit }: { habit?: Habit }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const actions = useHabitActions(today());

  const [name, setName] = useState(habit?.name ?? '');
  const [icon, setIcon] = useState<IconName>(habit ? safeIconName(habit.icon, 'leaf') : 'leaf');
  const [color, setColor] = useState<HabitColor>((habit?.color as HabitColor | undefined) ?? 'iris');
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? 'GENERAL');
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? 'DAILY');
  const [days, setDays] = useState<number[]>(habit?.daysOfWeek ?? []);
  const [timesPerWeek, setTimesPerWeek] = useState(habit?.timesPerWeek ?? 3);
  const [target, setTarget] = useState(habit?.targetCount ?? 1);
  const [priority, setPriority] = useState<TaskPriority>(habit?.priority ?? 'NONE');
  const [error, setError] = useState<string>();

  const toggleDay = (day: number) => {
    haptics.tap();
    setDays((current) => {
      const all = current.length === 0 ? [1, 2, 3, 4, 5, 6, 7] : current;
      const next = all.includes(day) ? all.filter((d) => d !== day) : [...all, day].sort();
      // Empty means every day, so the last remaining day can't be switched off.
      if (next.length === 0) return current;
      return next.length === 7 ? [] : next;
    });
  };

  const save = () => {
    if (!name.trim()) {
      haptics.warning();
      setError('Give it a name');
      return;
    }
    const fields: HabitFields = {
      name: name.trim(),
      icon,
      color,
      category,
      frequency,
      daysOfWeek: frequency === 'DAILY' ? days : [],
      timesPerWeek,
      targetCount: target,
      priority,
    };
    if (!habit) {
      actions.create(fields);
    } else {
      const patch: UpdateHabitInput = {};
      for (const key of Object.keys(fields) as (keyof HabitFields)[]) {
        if (JSON.stringify(fields[key]) !== JSON.stringify(habit[key])) (patch as Record<string, unknown>)[key] = fields[key];
      }
      if (Object.keys(patch).length > 0) actions.update(habit.id, patch);
    }
    router.back();
  };

  const everyDay = days.length === 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-canvas">
      <ModalHeader title={habit ? 'Edit habit' : 'New habit'} onCancel={() => router.back()} />

      <ScrollView contentContainerClassName="gap-7 px-5 pb-6 pt-4" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <TextField
          label="Name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError(undefined);
          }}
          placeholder="Read 20 pages"
          autoFocus={!habit}
          maxLength={80}
          error={error}
        />

        <View className="gap-3">
          <FieldLabel>Icon</FieldLabel>
          <View className="flex-row flex-wrap gap-2.5">
            {ICONS.map((option) => {
              const selected = option === icon;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    if (!selected) haptics.tap();
                    setIcon(option);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={option.replace(/-/g, ' ')}
                  accessibilityState={{ selected }}
                  className={`h-12 w-12 items-center justify-center rounded-2xl border ${selected ? 'border-fg/40 bg-raised' : 'border-hairline bg-surface'}`}>
                  <Icon name={option} size={20} colorValue={selected ? theme.color(habitToken(color)) : theme.color('muted')} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-3">
          <FieldLabel>Colour</FieldLabel>
          <View className="flex-row justify-between">
            {HABIT_COLORS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  if (option !== color) haptics.tap();
                  setColor(option);
                }}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={option}
                accessibilityState={{ selected: option === color }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: theme.color(habitToken(option)),
                  borderWidth: option === color ? 3 : 0,
                  borderColor: theme.color('canvas'),
                  outlineColor: theme.color(habitToken(option)),
                  outlineWidth: option === color ? 2 : 0,
                  outlineStyle: 'solid',
                }}
              />
            ))}
          </View>
        </View>

        <View className="gap-3">
          <FieldLabel>Kind of habit</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            {habitCategories.map((option) => {
              const info = CATEGORIES[option];
              return (
                <Chip
                  key={option}
                  label={info.label}
                  icon={info.icon}
                  iconTint={info.tint}
                  selected={option === category}
                  onPress={() => setCategory(option)}
                />
              );
            })}
          </View>
          <Text variant="footnote" tone="subtle">
            Counts towards achievements and challenges like “50 reading days”.
          </Text>
        </View>

        <Animated.View layout={LinearTransition.duration(220)} className="gap-3">
          <FieldLabel>Frequency</FieldLabel>
          <SegmentedControl options={FREQUENCIES} value={frequency} onChange={setFrequency} />
          {frequency === 'DAILY' ? (
            <Animated.View key="daily" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} className="gap-3 pt-1">
              <View className="flex-row justify-between">
                {WEEKDAYS.map((letter, index) => {
                  const day = index + 1;
                  const active = everyDay || days.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => toggleDay(day)}
                      accessibilityRole="button"
                      accessibilityLabel={WEEKDAY_NAMES[index]}
                      accessibilityState={{ selected: active }}
                      className={`h-11 w-11 items-center justify-center rounded-full border ${active ? 'border-transparent bg-fg' : 'border-hairline'}`}>
                      <Text variant="callout" tone={active ? 'inverse' : 'subtle'}>
                        {letter}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text variant="footnote" tone="subtle">
                {everyDay ? 'Every day' : `${days.length} ${days.length === 1 ? 'day' : 'days'} a week · counts on those days only`}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View key="weekly" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} className="pt-1">
              <Stepper
                value={timesPerWeek}
                min={1}
                max={7}
                onChange={setTimesPerWeek}
                caption={`Any ${timesPerWeek === 1 ? 'day' : `${timesPerWeek} days`} each week. Adds to your score on days you do it.`}
              />
            </Animated.View>
          )}
        </Animated.View>

        <View className="gap-3">
          <FieldLabel>Check-ins per day</FieldLabel>
          <Stepper
            value={target}
            min={1}
            max={100}
            onChange={setTarget}
            caption={target === 1 ? 'Done once a day' : `Check in ${target} times. Partial progress earns partial credit.`}
          />
        </View>

        <View className="gap-3">
          <FieldLabel>Priority</FieldLabel>
          <SegmentedControl options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
          <Text variant="footnote" tone="subtle">
            Higher priority weighs more in your day score.
          </Text>
        </View>
      </ScrollView>

      <View className="border-t border-hairline px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Button label={habit ? 'Save changes' : 'Create habit'} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

export default function HabitEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const cached = useHabitsForDay(today()).data?.find((habit) => habit.id === id);
  const detail = useHabitDetail(cached ? '' : (id ?? ''));
  const habit = cached ?? detail.data?.habit;

  if (id && !habit) {
    return (
      <View className="flex-1 bg-canvas">
        <ModalHeader title="Edit habit" onCancel={() => router.back()} />
        {detail.isError ? (
          <ErrorState title="Couldn’t load this habit" error={detail.error} onRetry={() => void detail.refetch()} />
        ) : (
          <LoadingState />
        )}
      </View>
    );
  }
  return <Form habit={habit} />;
}
