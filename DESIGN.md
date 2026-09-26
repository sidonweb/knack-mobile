# Knack design system

Premium, minimal, confident, slightly gamified. Colour and motion are rewards, not decoration.

## Tokens — `src/lib/theme.ts`

| Token | Use |
| --- | --- |
| `canvas` / `surface` / `raised` | Page, cards, inset fills (controls, tiles inside cards) |
| `hairline` | Card edges and dividers. Never thicker than 1px |
| `fg` / `muted` / `subtle` | Text hierarchy. All three pass WCAG AA on canvas in both themes |
| `ember` | Streaks and the score only |
| `iris` | XP and levels |
| `mint` | Done, perfect, completed |
| `sky`, `amber`, `rose`, `steel` | Habit colours, rest days, destructive, low priority |

Appearance: System / Light / Dark in Settings (`src/store/appearance.ts`). Always read colours through `useTheme()` or Tailwind tokens, never `useColorScheme()` directly.

**Animated styles:** anything driven by `useAnimatedStyle` must render in `AnimatedView` (`src/components/animated-view.tsx`), never `Animated.View`. The NativeWind-registered `Animated.View` silently drops animated styles. Use `Animated.View` only for `entering`/`exiting` with classes.

`motion` in `theme.ts` holds the timing vocabulary. No springs, bounces or overshoot anywhere: everything uses short ease-out timings. Reanimated honours Reduce Motion; `Confetti`, `AnimatedNumber`, `Skeleton` and `UnlockOverlay` also check it themselves.

## Type — `<Text variant>`

`hero` (the day score) · `display` (screen titles) · `title` · `headline` · `body` · `callout` · `footnote` · `caption` · `overline` (section labels) · `numeral` / `stat` (tabular figures). Don't hand-roll `text-[Npx]`; add a variant instead.

## Layout

Tabs use a floating pill bar (`features/navigation/pill-tab-bar.tsx`); `<Screen>` pads for it automatically. Screens use `<Screen>`: 20pt gutters, 24pt between sections, keyboard avoidance, pull to refresh. Corners: 20 for cards (`rounded-card`), 16 for inputs and inner tiles, full for buttons, chips and badges. A screen should rarely need more than three cards. Group rows inside one card with `<Divider />` rather than stacking cards.

## Components — `src/components`

- **Actions:** `Button` (primary / secondary / ghost / danger; md 52pt, sm 40pt), `IconButton` (44pt target, label required), `Chip`, `SegmentedControl`
- **Containers:** `Card`, `Divider`, `ListRow`, `StatGrid`, `Sheet` (bottom sheet), `ModalHeader` (Cancel · Title · Save)
- **Status:** `Badge`, `CountBadge`, `ProgressRing`, `ProgressBar`, `AnimatedNumber`, `SyncBadge`
- **States:** `EmptyState`, `LoadingState`, `ErrorState` (with retry), `Skeleton` / `SkeletonRows`
- **Forms:** `TextField` (label, hint, error, icon), `FieldLabel`
- **Moments:** `CelebrationHost` (capsules for small wins, `UnlockOverlay` for big ones), `Confetti`, `Medal`, `ToastHost`

Every screen handles loading, empty and error explicitly. Never show bare "Loading…" text.

## Haptics — `src/lib/haptics.ts`

`tap` selection · `light` checking something off · `impact` pick up / destructive · `success` a marked moment (streak secured, unlock) · `warning` validation · `celebrate` perfect day and full-screen reveals. Don't use `success` for routine toggles.

## Moments, by weight

1. Check a task or habit: the checkbox fills, a faint ring fades off it, a light haptic, the score counts up.
2. Streak secured (crossing the threshold by tapping): the pill turns ember, a capsule appears, a success haptic.
3. Perfect day: the ring turns mint, a faint burst ring, the celebrate haptic, then Day Complete with confetti.
4. XP: a capsule, with rapid gains merged.
5. Achievement, level, streak milestone, perfect week, challenge: the full-screen reveal with a medal.
