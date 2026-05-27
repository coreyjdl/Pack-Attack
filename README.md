# Pack Attack

Cross-platform synced packing list app for ADV and overland trips.

## Monorepo Layout
- apps/mobile: Expo React Native Android app
- apps/desktop: Electron + React desktop app
- packages/shared: Shared data model and reusable logic
- docs: Product and feature notes

## Prerequisites
- Node.js 20+
- npm 10+
- Android Studio (for emulator/device testing)

## Install
From repository root:

```bash
npm install
```

## Run The Apps

### Desktop (Electron + React)
From repository root:

```bash
npm run dev:desktop
```

### Mobile (Expo)
From repository root:

```bash
npm run dev:mobile
```

## Typecheck
From repository root:

```bash
npm run typecheck
```

## Android (Capacitor Desktop Build)
If you want to package and run the desktop app in Android emulator/device via Capacitor, use the desktop workspace:

```bash
cd apps/desktop
npm run android:sync
npx cap run android --target emulator-5554
```

Replace `emulator-5554` with your connected emulator/device ID.

## Notes
- Initial scaffold focuses on data model, UI shell, and navigation flow.
- See docs/product-blueprint.md for roadmap and feature plan.

## Current Capabilities
- Supabase email/password auth and cloud sync in mobile + desktop
- Workflowy-style nested navigation including FAK drill-down
- Export raw CSV and checklist markdown (desktop)
- Print-friendly desktop view
- Extensible storage locations (left/right panniers by default, plus custom bags)

## Sync Setup
- Copy values from .env.example into your local env files.
- Run the SQL in docs/supabase-setup.md to create table + RLS policies.
