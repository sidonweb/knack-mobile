import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  /** Quiet guidance under the field, replaced by the error when there is one. */
  hint?: string;
  icon?: IconName;
  className?: string;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, icon, className = '', onFocus, onBlur, multiline, ...props },
  ref,
) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View className={`gap-2 ${className}`}>
      {label ? (
        <Text variant="overline" tone="subtle">
          {label}
        </Text>
      ) : null}
      <View
        className={`flex-row rounded-2xl border bg-surface ${multiline ? 'items-start' : 'h-[52px] items-center'} ${
          error ? 'border-rose' : focused ? 'border-fg/35' : 'border-hairline'
        }`}>
        {icon ? (
          <View className={`pl-4 ${multiline ? 'pt-4' : ''}`}>
            <Icon name={icon} size={17} color={focused ? 'muted' : 'subtle'} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={color('subtle')}
          selectionColor={color('ember')}
          cursorColor={color('ember')}
          accessibilityLabel={props.accessibilityLabel ?? label ?? props.placeholder}
          accessibilityHint={error}
          multiline={multiline}
          maxFontSizeMultiplier={1.6}
          className={`flex-1 px-4 font-inter text-[16px] text-fg ${multiline ? 'min-h-[96px] py-3.5 leading-[22px]' : 'h-full'} ${icon ? 'pl-3' : ''}`}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
      </View>
      {error ? (
        <Text variant="footnote" tone="rose" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" tone="subtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
