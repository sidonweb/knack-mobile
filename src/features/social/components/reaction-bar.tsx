import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { haptics } from '@/lib/haptics';
import type { FeedItem, ReactionType } from '@/types/api';

import { emojiFor, REACTIONS } from '../feed';

type Props = {
  item: FeedItem;
  onReact: (type: ReactionType | null) => void;
  onOpenReactions: () => void;
};

/**
 * Tap to cheer (🔥), hold to pick a different reaction. The summary on the left shows what
 * people reacted with and opens the list of who.
 */
export function ReactionBar({ item, onReact, onOpenReactions }: Props) {
  const [picking, setPicking] = useState(false);

  const choose = (type: ReactionType | null) => {
    setPicking(false);
    onReact(type);
  };

  const top = item.reactions.slice(0, 3);

  return (
    <View className="min-h-[30px] flex-row items-center gap-3">
      {item.reactionCount > 0 ? (
        <Pressable
          onPress={onOpenReactions}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${item.reactionCount} reactions. Show who reacted`}
          className="flex-row items-center gap-1.5">
          <View className="flex-row">
            {top.map((reaction, index) => (
              <View
                key={reaction.type}
                style={{ marginLeft: index === 0 ? 0 : -6, zIndex: 3 - index }}
                className="h-[22px] w-[22px] items-center justify-center rounded-full border border-surface bg-raised">
                <Text className="text-[12px] leading-[15px]">{emojiFor(reaction.type)}</Text>
              </View>
            ))}
          </View>
          <Text variant="footnote" tone="muted" className="tabular-nums">
            {item.reactionCount}
          </Text>
        </Pressable>
      ) : null}

      <View className="flex-1" />

      {picking ? (
        <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)} className="flex-row items-center gap-1 rounded-full border border-hairline bg-raised px-1.5 py-1">
          {REACTIONS.map((reaction, index) => {
            const mine = item.myReaction === reaction.type;
            return (
              <Animated.View key={reaction.type} entering={FadeIn.delay(index * 40).duration(220)}>
                <Pressable
                  onPress={() => choose(mine ? null : reaction.type)}
                  accessibilityLabel={mine ? `Remove ${reaction.label}` : reaction.label}
                  className={`h-9 w-9 items-center justify-center rounded-full ${mine ? 'bg-ember/15' : ''}`}>
                  <Text className="text-[20px] leading-[24px]">{reaction.emoji}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
          <Pressable onPress={() => setPicking(false)} hitSlop={6} accessibilityLabel="Close reactions" className="h-9 w-7 items-center justify-center">
            <Icon name="close" size={16} color="subtle" />
          </Pressable>
        </Animated.View>
      ) : item.isMine ? null : (
        <Pressable
          onPress={() => choose(item.myReaction ? null : 'FIRE')}
          onLongPress={() => {
            haptics.impact();
            setPicking(true);
          }}
          delayLongPress={280}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ selected: item.myReaction !== null }}
          accessibilityLabel={item.myReaction ? 'Remove reaction' : 'Cheer'}
          accessibilityHint="Hold to choose a reaction"
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${item.myReaction ? 'bg-ember/[0.12]' : 'bg-fg/[0.04]'}`}>
          <View>
            {item.myReaction ? (
              <Text className="text-[15px] leading-[18px]">{emojiFor(item.myReaction)}</Text>
            ) : (
              <Icon name="flame-outline" size={16} color="muted" />
            )}
          </View>
          <Text variant="footnote" tone={item.myReaction ? 'ember' : 'muted'} className="font-inter-medium">
            {item.myReaction ? 'Cheered' : 'Cheer'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
