# DFPS Site Visit App

React Native app for DFPS field officers to:

- log in
- verify on-site presence via GPS
- record violations
- queue visits offline
- sync pending visits when online

## Tech Stack

- React Native `0.82`
- React Navigation (stack + drawer)
- AsyncStorage queue + NetInfo sync watcher
- React Query for penalties cache
- Jest + React Native Testing Library

## Prerequisites

- Node.js 20+
- Android Studio + SDK (Android workflow)
- Java 17 (recommended for modern RN/Gradle toolchain)

## Environment Setup

Create a `.env` file in project root:

```env
API_BASE_URL=http://your-host/dfps-site/public/index.php
USE_FAKE_API=false
SENTRY_DSN=
```

Use `.env.example` as template.

## Run in Development

```sh
npm start
```

In a second terminal:

```sh
npm run android
```

## APK Commands

- `npm run apk:debug` - build debug APK
- `npm run apk:debug:clean` - clean + rebuild debug APK
- `npm run apk:debug:fresh` - clean + rebuild debug with fresh JS bundle
- `npm run apk:install` - install debug APK via ADB
- `npm run apk` - one-click clean debug build + install
- `npm run apk:release` - build release APK

Detailed signing/build notes: `docs/android-apk-and-signing.md`.

## Fake API vs Real API

- `USE_FAKE_API=true` (in dev) uses mocked login/penalties/upload
- `USE_FAKE_API=false` uses real backend and requires `API_BASE_URL`

More details: `docs/fake-api-and-real-api.md`.

## Deep Linking

Navigation deep links are enabled with:

- `dfps://login`
- `dfps://dashboard`
- `dfps://visit`
- `dfps://violation/new`
- `dfps://visit/summary`

and equivalent `https://dfps-site-visit.app/...` paths.

## Testing

Run tests:

```sh
npm test
```

Current suites include:

- app bootstrap/login render
- storage queue behavior
- summary screen behavior
- site visit add + complete behavior

## Project Docs

- `docs/claude.md` - issue tracker + roadmap
- `docs/android-apk-and-signing.md` - APK and signing guide
- `docs/fake-api-and-real-api.md` - API mode switching guide
- `docs/field-officer-api-flow.md` - runtime API flow for field officer use
