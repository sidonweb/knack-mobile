# Knack — mobile

The Knack app. Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router · NativeWind 4 · Zustand · TanStack Query · Zod · expo-sqlite.

This project is fully independent of the backend. It talks to the Knack API only over REST.

## Quick start

```bash
npm install
npm start          # then press i / a, or scan the QR code with Expo Go
```

Start the API first (see the backend README). In development the app calls port 4000 on the machine running Metro, so it works from simulators, emulators and physical devices on the same network with no configuration. For other environments, set `EXPO_PUBLIC_API_URL` (see `.env.example`).

Demo accounts, created by the backend seed with two months of history: `alex`, `sam` and `jordan` (private), all with password `password123`.

| Script | What it does |
| --- | --- |
| `start` · `ios` · `android` · `web` | Dev server |
| `typecheck` | `tsc --noEmit` |
| `lint` | `expo lint` |
| `doctor` | `expo-doctor` dependency and config checks |

Builds and releases go through EAS (`npx eas-cli build`). `ios/` and `android/` are generated; don't commit hand edits to them.

## Layout

```
app/                     Expo Router routes (every file is a screen)
├── (auth)/              sign-in, sign-up
├── (tabs)/              today, habits, friends, profile
├── challenges/          list (+ invites), [id], new (templates), invite
├── settings/            profile, photo, privacy
├── users/[username].tsx other people's profiles (+ their activity)
├── achievements.tsx     milestone ladders (`?username=` for someone else's)
├── connections.tsx      followers / following / follow requests
├── task/[id].tsx        task editor (form sheet)
├── habit/[id].tsx       habit detail: streaks, completion, 12-week heatmap
├── habit-editor.tsx     create / edit a habit (modal; `?id=` edits)
└── day-complete.tsx     the end-of-day moment (full-screen modal)
src/
├── components/   design-system primitives: Text, Button, Card, ProgressRing…
├── features/     domain hooks + components: today, habits, social, profile, challenges, sync
├── hooks/        shared hooks (useTheme)
├── services/     REST client, session/token custody, per-resource APIs, offline outbox
├── store/        Zustand: auth status, sync status, celebration queue
├── lib/          theme tokens, query client, SQLite, dates, config
└── types/        Zod schemas + types for every API response
```

## State and data

- **Server state** lives in TanStack Query. The cache is persisted to SQLite through `expo-sqlite/kv-store`, so the app opens instantly on cached data and works offline.
- **Client state** lives in Zustand, and only for things the server doesn't own: whether you're signed in, whether you're online, and which celebrations are queued.
- **Responses are validated.** Every response is parsed with Zod (`src/types/api.ts`), so contract drift fails loudly at the boundary.
- **Auth.** The access token is held in memory; the refresh token is in the OS keychain (`expo-secure-store`). Refreshes are single-flight, because the server treats refresh-token reuse as theft. A network failure never signs you out; only a 401 from the server does.

### The Today screen

Today is the product. It shows a greeting, the date, the live streak, the day's weighted score ring (with a tick at the streak threshold), what's left, habits as tap-to-check tiles, and the plan:

- **Tasks:** quick add with a priority flag, tap the circle to complete, tap the row to edit (title, notes, priority, day), long-press to drag into order. Deleting offers Undo.
- **Score:** computed locally with the server's formula and weights (`src/lib/scoring.ts`), so it moves on tap and offline. The server's value replaces it once writes sync.
- **Streak:** crossing the threshold lights the streak up immediately (`useStreakDisplay`), before any round trip.
- **End of day:** finishing everything opens **Day Complete** on its own. "Finish the day" opens it any time. It shows the score, the streak (and offers a rest day when the streak is at risk), and can carry unfinished tasks to the top of tomorrow. Carried-over tasks still count against the day they left, so deferring never raises a score.

### Profile: proof of consistency

`ProfileView` (`src/features/profile/components/`) renders both your Profile tab and other people's profiles from one `GET /users/:username` response:

- **Hero card:** avatar, level ring, the streak in big type (the flame breathes while it's alive), and three headline numbers: average daily score, tasks done, and the top habit category ("52 reading days").
- **Consistency calendar:** 26 weeks, one column per week. Days that counted are solid ember, rest days are sky, and you can tap any day for its score.
- **Proof tiles:** average score (all time and 30 days), longest streak, totals, perfect days and weeks, category days, 90%+ months and challenges, all counting up on reveal.
- **Habits:** each habit's streak, best run, and 30-day completion rate.
- **Achievements:** the best badge from each ladder, linking to `/achievements`, where each family is a milestone ladder with progress to the next rung and rarity.

Sharing uses the system share sheet with a plain-text summary. Private accounts show only the hero card to people who don't follow them.

### Social

- **Feed** (`FeedList`): your circle's closed-out days, perfect days and weeks, streak and habit-streak milestones, unlocks, level ups and challenges. A burst of unlocks from one person collapses into a single card, so catching up never floods anyone's feed. There are no comments or photos.
- **Reactions:** tap **Cheer** to send 🔥, or hold for 👏 💪 🙌. The row shows the top reactions, and tapping the count lists who reacted.
- **Privacy:** *Private account* turns follows into requests (approve them in `/connections`). *Share activity* keeps your activity out of other feeds. Each of your own feed items has a ⋯ menu to hide it.
- **Friends tab badge** counts follow requests plus challenge invites (`GET /users/me/inbox`).

### Celebrations

Server outcomes queue celebrations (`store/celebrations.ts`). XP and small habit streaks get the floating capsule. Achievements, level ups, perfect weeks, streak milestones, completed challenges and 30+ day habit streaks get the full-screen unlock reveal (`components/unlock-overlay.tsx`): the medal springs in with a light sweep, rotating rays, pulse rings and a spark burst, and the biggest moments add confetti. Reduce Motion keeps only the content. A backlog of unlocks from one write is summarised in a single reveal.

### Offline-first core loop

Tasks, habits, check-ins, task order and finishing a day never call the API directly from the UI. They go through `commit(op)`:

1. The change is applied optimistically to every cached day, using the reducers in `services/sync/rebase.ts`.
2. The op is appended to a durable SQLite **outbox** (`services/sync/outbox.ts`).
3. The outbox flushes in order whenever the device is online. Every op is idempotent server-side (client-generated UUIDs, absolute check-in counts), so replaying after a crash is safe.
4. Each server response carries an `outcome` (score, XP, streak, unlocks). It updates the caches and queues celebrations.
5. When the queue drains, the app refetches to reconcile with the server.

Refetches that land while writes are still pending are **rebased**: the pending ops are re-applied on top of the fresh data, so a sync never visibly undoes a tap. Ops that carry absolute state (check-in counts, a day's task order, finish/reopen) supersede older queued ops with the same key, which keeps the queue short after a long offline stretch. Rare or deliberate actions (archiving or restoring a habit, planning a rest day, following, reactions, challenges) are ordinary online mutations.

The persisted query cache is restored without re-validation, so `PERSIST_BUSTER` in `src/lib/query-client.ts` must be bumped whenever a cached response's shape changes.

On web, durable storage falls back to memory and `localStorage`. Web is a development convenience here, and expo-sqlite on web is still alpha.

## Design system

`src/lib/theme.ts` is the single source of colour:
- warm neutrals (`canvas`, `surface`, `raised`, `hairline`, `fg`, `muted`, `subtle`)
- one brand accent, `ember`, reserved for streaks and the score
- muted semantic colours (`iris` for XP and levels, `mint` for completion, plus `sky`, `amber`, `rose`, `steel`)

The tokens are injected as CSS variables at the root, so NativeWind classes such as `bg-surface` and `text-muted/50` follow light and dark mode automatically. `useTheme().color(token)` provides raw values for SVG and icons.

Typography is Inter, used through semantic `Text` variants (`display`, `title`, `headline`, `body`, `overline`, `numeral`). Numerals use tabular figures so counters don't jitter. Micro-interactions include a spring press scale, a checkbox that springs its fill in and sends a ring outwards, count-up numbers (`AnimatedNumber`), eased ring and bar fills, a flame that kicks when the streak grows, rows that glide into place when completed or dragged, confetti on perfect days, haptics throughout, a celebration capsule for XP, and the full-screen unlock reveal for big moments.

`className` works on Reanimated's `Animated.View`/`Text`/`ScrollView` because they're registered with NativeWind in `src/lib/nativewind-interop.ts`.
