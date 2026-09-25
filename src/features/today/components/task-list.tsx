import { useLayoutEffect, useRef } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { TASK_XP, TASK_XP_CAP } from '@/lib/scoring';
import type { Task } from '@/types/api';

import { TaskRow } from './task-row';

/** Height used until a row has been measured. Matches a single-line row. */
const ESTIMATED_ROW = 56;
const MOVE = { duration: 200, easing: Easing.out(Easing.cubic) };

type Shared = {
  /** The order the rows are laid out in (what React rendered). */
  base: SharedValue<string[]>;
  /** The order the rows should appear in right now, which differs from `base` only mid-drag. */
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  dragging: SharedValue<string | null>;
  dragY: SharedValue<number>;
};

function topOf(id: string, order: string[], heights: Record<string, number>) {
  'worklet';
  let y = 0;
  for (const other of order) {
    if (other === id) return y;
    y += heights[other] ?? ESTIMATED_ROW;
  }
  return y;
}

/** How far a row must move from its laid-out position to show `order`. */
function offsetOf(id: string, order: string[], base: string[], heights: Record<string, number>) {
  'worklet';
  if (!order.includes(id) || !base.includes(id)) return 0;
  return topOf(id, order, heights) - topOf(id, base, heights);
}

type RowProps = Shared & {
  task: Task;
  xp: number;
  divider: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onMore: () => void;
  onDragStart: () => void;
  onDrop: (order: string[]) => void;
};

function DraggableRow({ task, xp, divider, base, order, heights, dragging, dragY, onToggle, onOpen, onMore, onDragStart, onDrop }: RowProps) {
  const { color, scheme } = useTheme();
  // "rgb(r, g, b)" → "r, g, b", so the worklet can fade the shadow in as the row lifts.
  const shadowRgb = color(scheme === 'dark' ? 'canvas' : 'fg').slice(4, -1);
  const id = task.id;
  const offset = useSharedValue(0);
  const lifted = useSharedValue(0);

  // Rows sit in normal layout. They only shift while another row is dragged past them; once
  // the new order is rendered, `base` catches up and every offset snaps back to zero.
  useAnimatedReaction(
    () => ({ target: offsetOf(id, order.get(), base.get(), heights.get()), baseKey: base.get().join() }),
    (next, previous) => {
      if (dragging.get() === id) return;
      if (!previous || previous.baseKey !== next.baseKey) offset.set(next.target);
      else offset.set(withTiming(next.target, MOVE));
    },
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      dragY.set(0);
      dragging.set(id);
      lifted.set(withTiming(1, MOVE));
      scheduleOnRN(onDragStart);
    })
    .onUpdate((event) => {
      const rows = heights.get();
      const laidOut = base.get();
      const height = rows[id] ?? ESTIMATED_ROW;
      const home = topOf(id, laidOut, rows);
      const total = laidOut.reduce((sum, other) => sum + (rows[other] ?? ESTIMATED_ROW), 0);
      dragY.set(Math.min(Math.max(event.translationY, -home - 6), total - height - home + 6));

      // Insert where the dragged row's centre falls among the other rows.
      const centre = home + dragY.get() + height / 2;
      const others = laidOut.filter((other) => other !== id);
      let index = 0;
      let acc = 0;
      for (const other of others) {
        const h = rows[other] ?? ESTIMATED_ROW;
        if (centre > acc + h / 2) index += 1;
        acc += h;
      }
      const next = [...others.slice(0, index), id, ...others.slice(index)];
      if (next.join() !== order.get().join()) {
        order.set(next);
        scheduleOnRN(haptics.tap);
      }
    })
    .onFinalize(() => {
      if (dragging.get() !== id) return;
      const target = offsetOf(id, order.get(), base.get(), heights.get());
      lifted.set(withTiming(0, MOVE));
      dragY.set(
        withTiming(target, MOVE, () => {
          offset.set(target);
          dragging.set(null);
          // Always report the drop, even when cancelled, so the parent unlocks scrolling.
          scheduleOnRN(onDrop, order.get());
        }),
      );
    });

  const style = useAnimatedStyle(() => {
    const active = dragging.get() === id;
    return {
      zIndex: active ? 10 : 0,
      transform: [{ translateY: active ? dragY.get() : offset.get() }, { scale: 1 + lifted.get() * 0.02 }],
      boxShadow: `0px 6px 16px rgba(${shadowRgb}, ${lifted.get() * (scheme === 'dark' ? 0.6 : 0.12)})`,
    };
  });

  const measure = (event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height);
    if (heights.get()[id] !== height) heights.set({ ...heights.get(), [id]: height });
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
      <Animated.View style={style}>
        <GestureDetector gesture={pan}>
          <View onLayout={measure} className="rounded-2xl px-5" style={{ backgroundColor: color('surface') }}>
            {divider ? <View className="absolute left-5 right-5 top-0 h-px bg-hairline" /> : null}
            <TaskRow task={task} xp={xp} onToggle={onToggle} onOpen={onOpen} onMore={onMore} />
          </View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

type Props = {
  /** In the user's order. */
  tasks: Task[];
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  onMore: (task: Task) => void;
  /** New order of all the day's tasks. */
  onReorder: (ids: string[]) => void;
  /** Lets the parent lock scrolling while a row is lifted. */
  onDragChange?: (active: boolean) => void;
};

/** XP each completed task earned, mirroring the server's daily cap (first done, first paid). */
function xpByTask(tasks: Task[]) {
  const paid = tasks
    .filter((task) => task.completed)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
    .slice(0, TASK_XP_CAP);
  return new Set(paid.map((task) => task.id));
}

/** The day's tasks. Long-press any task to lift it and drag it into place. */
export function TaskList({ tasks, onToggle, onOpen, onMore, onReorder, onDragChange }: Props) {
  const ids = tasks.map((task) => task.id);
  const idsKey = ids.join();
  const earning = xpByTask(tasks);

  const base = useSharedValue(ids);
  const order = useSharedValue(ids);
  const heights = useSharedValue<Record<string, number>>({});
  const dragging = useSharedValue<string | null>(null);
  const dragY = useSharedValue(0);

  // Whenever React renders a new order (a drop landing, a task added or removed), the layout
  // is the truth again: both orders follow it and offsets reset in the same frame.
  useLayoutEffect(() => {
    const next = idsKey ? idsKey.split(',') : [];
    base.set(next);
    order.set(next);
  }, [idsKey, base, order]);

  // Releasing a drag can also land as a press on the row (notably on web), so presses are
  // ignored while a row is lifted and for a moment after it's dropped.
  const suppressPressUntil = useRef(0);
  const guarded = (action: () => void) => () => {
    if (Date.now() < suppressPressUntil.current) return;
    action();
  };

  const drop = (next: string[]) => {
    suppressPressUntil.current = Date.now() + 350;
    onDragChange?.(false);
    if (next.join() !== idsKey) onReorder(next);
  };

  const shared = { base, order, heights, dragging, dragY };

  return (
    <View>
      {tasks.map((task, index) => (
        <DraggableRow
          key={task.id}
          task={task}
          xp={earning.has(task.id) ? TASK_XP : 0}
          divider={index > 0}
          onToggle={guarded(() => onToggle(task))}
          onOpen={guarded(() => onOpen(task))}
          onMore={guarded(() => onMore(task))}
          onDragStart={() => {
            suppressPressUntil.current = Number.POSITIVE_INFINITY;
            haptics.impact();
            onDragChange?.(true);
          }}
          onDrop={drop}
          {...shared}
        />
      ))}
    </View>
  );
}
