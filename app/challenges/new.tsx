import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { FieldLabel } from '@/components/field-label';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import {
  METRICS,
  TEMPLATES,
  metricIcon,
  useCreateChallenge,
  useMyConnections,
  type ChallengeTemplate,
} from '@/features/challenges/hooks';
import { CATEGORIES } from '@/lib/categories';
import { addDays, formatMonthDay, isoWeekday, today } from '@/lib/dates';
import { firstName } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { ApiError, errorMessage } from '@/services/api/errors';
import { challengeMetrics, habitCategories, type ChallengeMetric, type HabitCategory } from '@/types/api';

const DURATIONS = [7, 14, 21, 30, 60, 90] as const;
const DEFAULT_TARGET: Record<ChallengeMetric, (days: number) => number> = {
  CATEGORY_DAYS: (days) => days,
  ACTIVE_DAYS: (days) => days,
  QUALIFYING_DAYS: (days) => days,
  PERFECT_DAYS: (days) => Math.max(1, Math.round(days * 0.7)),
  TASKS_COMPLETED: (days) => days * 4,
  HABIT_CHECKINS: (days) => days * 2,
  XP: (days) => days * 60,
};

type Start = 'today' | 'tomorrow' | 'monday';

function startDay(start: Start) {
  const now = today();
  if (start === 'today') return now;
  if (start === 'tomorrow') return addDays(now, 1);
  return addDays(now, 8 - isoWeekday(now));
}

function TemplateCard({ template, selected, onPress }: { template: ChallengeTemplate; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`w-[168px] gap-3 rounded-card border p-4 ${selected ? 'border-ember/50 bg-ember/[0.07]' : 'border-hairline bg-surface'}`}>
      <View className="flex-row items-center justify-between">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-raised">
          <Icon name={metricIcon({ metric: template.metric, habitCategory: template.habitCategory ?? null })} size={17} color="ember" />
        </View>
        {selected ? (
          <Animated.View entering={FadeIn.duration(220)}>
            <Icon name="checkmark-circle" size={20} color="ember" />
          </Animated.View>
        ) : null}
      </View>
      <View className="gap-1">
        <Text variant="callout" numberOfLines={1}>
          {template.title}
        </Text>
        <Text variant="footnote" tone="subtle" numberOfLines={2}>
          {template.description}
        </Text>
      </View>
    </PressableScale>
  );
}

export default function NewChallengeScreen() {
  const insets = useSafeAreaInsets();
  const create = useCreateChallenge();
  const connections = useMyConnections();

  const [template, setTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState<ChallengeMetric>('CATEGORY_DAYS');
  const [category, setCategory] = useState<HabitCategory>('WORKOUT');
  const [duration, setDuration] = useState<number>(30);
  const [target, setTarget] = useState('30');
  const [start, setStart] = useState<Start>('today');
  const [visibility, setVisibility] = useState<'FRIENDS' | 'PUBLIC'>('FRIENDS');
  const [invitees, setInvitees] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ title?: string; target?: string; form?: string }>({});

  const startDate = startDay(start);
  const endDate = addDays(startDate, duration - 1);
  const daily = METRICS[metric].daily;

  const applyTemplate = (next: ChallengeTemplate) => {
    haptics.tap();
    setTemplate(next.key);
    setTitle(next.title);
    setDescription(next.description);
    setMetric(next.metric);
    if (next.habitCategory) setCategory(next.habitCategory);
    setDuration(next.duration);
    setTarget(String(next.target));
    setErrors({});
  };

  const changeMetric = (next: ChallengeMetric) => {
    setTemplate(null);
    setMetric(next);
    setTarget(String(DEFAULT_TARGET[next](duration)));
  };

  const changeDuration = (next: number) => {
    // A day-based target of "every day", or one that no longer fits, follows the new length.
    if (daily) {
      const current = Number.parseInt(target, 10);
      if (!Number.isFinite(current) || current >= duration || current > next) setTarget(String(next));
    }
    setDuration(next);
  };

  const toggleInvitee = (id: string) => {
    haptics.tap();
    setInvitees((current) => (current.includes(id) ? current.filter((other) => other !== id) : [...current, id]));
  };

  const submit = () => {
    const targetValue = Number.parseInt(target, 10);
    const next: typeof errors = {};
    if (title.trim().length < 3) next.title = 'At least 3 characters';
    if (!Number.isFinite(targetValue) || targetValue < 1) next.target = 'Enter a number above 0';
    else if (daily && targetValue > duration) next.target = `At most ${duration} in ${duration} days`;
    setErrors(next);
    if (Object.keys(next).length > 0) {
      haptics.warning();
      return;
    }

    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        metric,
        habitCategory: metric === 'CATEGORY_DAYS' ? category : null,
        target: targetValue,
        startDate,
        endDate,
        visibility,
        inviteUserIds: invitees,
      },
      {
        onSuccess: (detail) => {
          router.back();
          router.push({ pathname: '/challenges/[id]', params: { id: detail.challenge.id } });
        },
        onError: (error) =>
          setErrors({
            form: error instanceof ApiError && error.status === 400 ? (error.message ?? 'Check the details and try again') : errorMessage(error),
          }),
      },
    );
  };

  const people = connections.data ?? [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="gap-7 pb-6 pt-6" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View className="gap-3">
          <View className="px-5">
            <FieldLabel>Start from a classic</FieldLabel>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
            {TEMPLATES.map((option) => (
              <TemplateCard key={option.key} template={option} selected={template === option.key} onPress={() => applyTemplate(option)} />
            ))}
          </ScrollView>
        </View>

        <View className="gap-7 px-5">
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="30 Day Workout" maxLength={80} error={errors.title} />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What counts, and why you’re doing it"
            maxLength={500}
            multiline
            textAlignVertical="top"
          />

          <Animated.View layout={LinearTransition.duration(220)} className="gap-3">
            <FieldLabel>Measure</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {challengeMetrics.map((option) => (
                <Chip key={option} label={METRICS[option].label} icon={METRICS[option].icon} selected={metric === option} onPress={() => changeMetric(option)} />
              ))}
            </View>
            <Text variant="footnote" tone="subtle">
              {METRICS[metric].explain}
            </Text>
            {metric === 'CATEGORY_DAYS' ? (
              <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} className="gap-2 pt-1">
                <FieldLabel>Kind of habit</FieldLabel>
                <View className="flex-row flex-wrap gap-2">
                  {habitCategories
                    .filter((option) => option !== 'GENERAL')
                    .map((option) => (
                      <Chip
                        key={option}
                        label={CATEGORIES[option].label}
                        icon={CATEGORIES[option].icon}
                        selected={category === option}
                        onPress={() => {
                          setTemplate(null);
                          setCategory(option);
                        }}
                      />
                    ))}
                </View>
                <Text variant="footnote" tone="subtle">
                  Any habit you’ve marked as {CATEGORIES[category].label.toLowerCase()} counts, whatever it’s called.
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>

          <View className="gap-3">
            <FieldLabel>Duration</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {DURATIONS.map((option) => (
                <Chip key={option} label={`${option} days`} selected={duration === option} onPress={() => changeDuration(option)} />
              ))}
            </View>
          </View>

          <TextField
            label={daily ? `Target · days out of ${duration}` : `Target · ${METRICS[metric].unit}`}
            value={target}
            onChangeText={(value) => setTarget(value.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.target}
          />

          <View className="gap-3">
            <FieldLabel>Starts</FieldLabel>
            <SegmentedControl
              options={[
                { value: 'today', label: 'Today' },
                { value: 'tomorrow', label: 'Tomorrow' },
                { value: 'monday', label: 'Next Monday' },
              ]}
              value={start}
              onChange={setStart}
            />
            <Text variant="footnote" tone="subtle">
              {formatMonthDay(startDate)} – {formatMonthDay(endDate)}. Days already logged inside the window count.
            </Text>
          </View>

          <View className="gap-3">
            <FieldLabel>Who can join</FieldLabel>
            <SegmentedControl
              options={[
                { value: 'FRIENDS', label: 'Followers & invited' },
                { value: 'PUBLIC', label: 'Anyone' },
              ]}
              value={visibility}
              onChange={setVisibility}
            />
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <FieldLabel>Invite friends</FieldLabel>
              {invitees.length > 0 ? (
                <Text variant="footnote" tone="ember">
                  {invitees.length} selected
                </Text>
              ) : null}
            </View>
            {people.length === 0 ? (
              <Text variant="footnote" tone="subtle">
                Follow people (or get followed) to invite them. You can also invite later from the challenge.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
                {people.map((person) => {
                  const selected = invitees.includes(person.id);
                  return (
                    <Pressable
                      key={person.id}
                      onPress={() => toggleInvitee(person.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Invite ${person.displayName}`}
                      className="w-16 items-center gap-1.5">
                      <View>
                        <Avatar name={person.displayName} url={person.avatarUrl} size={52} ring={selected ? 'ember' : undefined} />
                        {selected ? (
                          <Animated.View entering={FadeIn.duration(220)} className="absolute -right-0.5 -top-0.5 h-5 w-5 items-center justify-center rounded-full bg-ember">
                            <Icon name="checkmark" size={12} color="canvas" />
                          </Animated.View>
                        ) : null}
                      </View>
                      <Text variant="caption" tone={selected ? 'default' : 'muted'} numberOfLines={1}>
                        {firstName(person.displayName)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {errors.form ? (
            <Text variant="footnote" tone="rose" accessibilityLiveRegion="polite">
              {errors.form}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View className="border-t border-hairline px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Button
          label={invitees.length > 0 ? `Start & invite ${invitees.length}` : 'Start challenge'}
          icon="flag"
          onPress={submit}
          loading={create.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
