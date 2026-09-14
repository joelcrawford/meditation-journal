# Tiger Mind (MeditationJournal)

React Native meditation journaling app. Users log before/after-sit reflections,
periodic mood check-ins scored on a donkey/tiger (reactive-vs-aware) scale,
track streaks, and view stats charts.

## Architecture

- `App.tsx` — entry point; synchronously initializes the DB, seeds MMKV
  defaults, wires notifee foreground events and notification-tap navigation.
- `src/db/` — `index.ts` opens/holds the op-sqlite handle(s) and switches
  between the real DB and a parallel test DB via an MMKV `ACTIVE_PROFILE`
  flag; `migrations.ts` is a versioned migration list; `seedProfiles.ts`
  generates fake data for dev QA personas.
- `src/repositories/` — repository pattern; each `Local*Repository.ts` wraps
  raw parameterized SQL via `getDb().executeSync(...)`. No ORM.
- `src/services/` — business logic on top of repositories, instantiated as
  singletons in `src/services/index.ts` (Session, Checkin, MeditationObject,
  Streak, plus Notification/Bell/LiveActivity native-facing services).
- `src/screens/` — one file per screen (Home, Before/Timer/After/SitComplete
  flow, CheckinModal/Result, Settings, Stats, BellPicker).
- `src/navigation/` — single `RootNavigator` (React Navigation native-stack).
- `src/components/`, `src/components/charts/` — presentational components and
  the stats charts (svg-based).
- `src/theme/index.ts` — hand-rolled design tokens (Colors, Spacing, Radius,
  Typography).
- `src/storage/mmkv.ts` — one MMKV instance for all key-value app state.
- `ios/` — native glue: custom `BellSound` and `LiveActivity` Obj-C/Swift
  modules, a Widget/Live Activity extension target.
- `scripts/` — release automation (see below). `scripts/build-ios.sh` is a
  stale leftover from an unrelated project (references Expo/EAS and a
  different app) — ignore it.

## Tests & dev workflow

- `npm test` runs jest. **Current state: `jest.config.js` is just the bare
  `@react-native/jest-preset`, with no setup file and no native-module
  mocks.** The only test is a smoke test (`__tests__/App.test.tsx`) that
  renders `<App />`, which touches op-sqlite, notifee, MMKV, and
  safe-area-context at load time — expect it to need mocks it doesn't
  currently have. If you add jest mocks/setup, wire them via
  `jest.config.js` (`setupFiles`) and don't remove them later without
  verifying the suite still passes; this area has no CI safety net (see
  below), so a broken mock silently stops catching anything.
- No CI is configured (no `.github/workflows/`) — tests only run locally.
- Dev: `npm start` (Metro), `npm run ios`, `npm run local` (Metro + iOS
  simulator "iPhone 16" concurrently), `npm run device` (kills anything on
  port 8081, resets prebuilt Pods artifacts, then runs on a physical device
  named "Bingo Bango").
- `npm run ship` runs `scripts/build-testflight.sh` — TestFlight shipping is
  owner-Mac-only (real signing identity, Apple Connect credentials via a
  gitignored `.env`, in-place Xcode project patching). Don't run or refactor
  this speculatively.

## Conventions actually used here

- TypeScript via `@react-native/typescript-config`; shared types in
  `src/types/index.ts`.
- No Redux/Zustand — local `useState`/hooks per screen, backed by the
  service singletons and MMKV for persisted state.
- Styling: plain `StyleSheet.create` + `src/theme`. No styled-components, no
  Tailwind/NativeWind.
- DB access always goes through `src/repositories/`, never raw SQL from a
  screen or service directly.
- PascalCase for components/screens/services/repositories; camelCase for
  plain utility modules.

## What NOT to touch casually

- `src/db/migrations.ts` — append-only; editing an existing migration body
  (rather than adding a new versioned entry) breaks upgrades for users with
  existing local DBs.
- The real/test DB profile-switching logic in `src/db/index.ts` — subtle,
  recently bug-fixed; must preserve both cold-start and warm-restart
  behavior.
- `scripts/build-testflight.sh` — mutates
  `ios/MeditationJournal.xcodeproj/project.pbxproj` in place and touches the
  macOS keychain; only runnable by the owner on a Mac with real certs.
- `ios/LiveActivity/`, `ios/BellSound/` — native module glue with no JS-side
  test coverage; easy to break silently.
- `.env`, `ios/_auth/*` — real Apple Connect credentials/signing certs.
  Never read, print, or commit these.

## Workflow

Before writing code, create or reference a GitHub issue with acceptance
criteria. Branch as `agent/<issue#>-<slug>`. PR body must say `Closes #N`.
Work happens on `agent/*` branches — never commit or push directly to
`main`.
