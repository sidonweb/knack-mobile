import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import type { Task, TaskPriority } from '@/types/api';

import { CheckCircle } from './check-circle';

const PRIORITY_DOT: Record<TaskPriority, string> = {
  NONE: '',
  LOW: 'bg-steel',
  MEDIUM: 'bg-amber',
  HIGH: 'bg-ember',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  NONE: '',
  LOW: 'Low priority',
  MEDIUM: 'Medium priority',
  HIGH: 'High priority',
};

type Props = { task: Task; xp: number; onToggle: () => void; onOpen: () => void; onMore: () => void };

/**
 * The check is its own large target; the title opens the task; ⋮ opens quick actions.
 * A completed task stays where it is, struck through, with the XP it earned.
 */
export function TaskRow({ task, xp, onToggle, onOpen, onMore }: Props) {
  return (
    <View className="min-h-14 flex-row items-center">
      <Pressable
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={task.title}
        className="py-3 pr-3.5">
        <CheckCircle checked={task.completed} />
      </Pressable>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityHint="Opens the task. Long press and drag to reorder."
        className="flex-1 flex-row items-center gap-3 py-3 active:opacity-60">
        <View className="flex-1 gap-0.5">
          <Text
            variant="body"
            tone={task.completed ? 'subtle' : 'default'}
            className={task.completed ? 'line-through' : ''}
            numberOfLines={2}>
            {task.title}
          </Text>
          {task.completed ? (
            xp > 0 ? (
              <Text variant="caption" tone="subtle" className="tabular-nums">
                +{xp} XP
              </Text>
            ) : null
          ) : task.notes ? (
            <Text variant="caption" tone="subtle" numberOfLines={1}>
              {task.notes}
            </Text>
          ) : null}
        </View>
        {task.priority !== 'NONE' && !task.completed ? (
          <View accessibilityLabel={PRIORITY_LABEL[task.priority]} className={`h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
        ) : null}
      </Pressable>
      <Pressable
        onPress={onMore}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={`More actions for ${task.title}`}
        className="-mr-2 h-10 w-8 items-center justify-center active:opacity-50">
        <Icon name="ellipsis-vertical" size={16} color="subtle" />
      </Pressable>
    </View>
  );
}
