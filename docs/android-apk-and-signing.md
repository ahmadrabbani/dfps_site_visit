# Android APK builds and signing

## One-command builds (npm)

| Command | Gradle task (default) | Typical output |
|--------|------------------------|----------------|
| `npm run apk:debug` | `assembleDebug` | `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run apk:debug:clean` | `:app:clean` then `assembleDebug` | Same path (forces fresh JS bundle + outputs) |
| `npm run apk:debug:fresh` | `clean` + `assembleDebug -PbundleInDebug=true` | Forces debug build to include a freshly bundled JS payload |
| `npm run apk:install` | — (ADB) | Installs existing `app-debug.apk` on a connected device/emulator (`adb install -r …`) |
| `npm run apk:debug:install` | `assembleDebug` + ADB | Build debug APK, then install |
| `npm run apk:debug:clean:install` | `clean` + `assembleDebug` + ADB | Clean rebuild, then install |
| `npm run apk` | *(same as above)* | **Shortcut** for `apk:debug:clean:install` |
| `npm run apk:release` | `assembleRelease` | `android/app/build/outputs/apk/release/app-release.apk` |

These run `react-native build-android` with the appropriate variant so they work on Windows and macOS without calling `gradlew.bat` / `./gradlew` manually.

**Important:** A bare `npx react-native build-android` (no `--tasks`) uses the CLI default **`bundleDebug`**, which writes an **`.aab`** under `android/app/build/outputs/bundle/debug/`, **not** an APK — so `outputs/apk/debug/` stays empty. The `apk:debug` / `apk:debug:clean` scripts pass **`--tasks assembleDebug`** so you get **`app-debug.apk`**.

If a debug APK still appears stale, use `npm run apk:debug:fresh` to force `bundleInDebug=true` during assemble.

**Note:** Do not use `--tasks clean,assembleDebug` in a single CLI call; the Android CLI only prefixes the first task with `app:`, which breaks the second task. The `apk:debug:clean` script runs **clean** and **assembleDebug** as two separate commands.

### Debug APK still shows old UI / old code?

Gradle can skip rebundling when it thinks nothing changed, so `app-debug.apk` may still contain an **older JavaScript bundle**.

1. **Clean rebuild:** `npm run apk:debug:clean`
2. **Install the APK you just built:** check the **Modified** time on `android/app/build/outputs/apk/debug/app-debug.apk` — avoid copying an older file from Downloads or another folder.
3. **Replace the install on the device:** `npm run apk:install` (same as `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`). Requires **`adb devices`** to show a device. Or uninstall first:  
   `adb uninstall com.ahmadrabbani1.dfpssitevisit`  
   then install again.
4. **APK vs Metro:** `npm run android` loads JS from Metro (live updates). A **standalone** debug APK embeds JS at **build** time — code changes require **rebuilding** the APK.

If Metro cache misbehaves during dev: `npx react-native start --reset-cache`.

## Release signing (upload / Play Store key)

Release builds use **real upload signing** only when `android/keystore.properties` exists.

1. Copy `android/keystore.properties.example` to `android/keystore.properties` (this file is gitignored).
2. Put your keystore under something like `android/keystores/` (gitignored) and set `storeFile` relative to the **`android/`** directory.
3. Fill in `storePassword`, `keyAlias`, and `keyPassword`.

If `keystore.properties` is **missing**, the release variant still builds but is signed with the **debug** keystore (fine for local smoke tests, **not** for Play Store submission).

See `android/app/build.gradle` for the `signingConfigs.release` / `buildTypes.release` wiring.

## Gradle verification

A dry run of the release graph without `keystore.properties` completed successfully (`BUILD SUCCESSFUL`): the project configures correctly and falls back to debug signing for release when no upload config is present.

To dry-run locally:

```bash
cd android
gradlew.bat :app:assembleRelease --dry-run
```

## Google Play (AAB)

For store uploads you normally ship an **App Bundle** (`.aab`), not only an APK. You can add a script such as:

`react-native build-android --tasks bundleRelease`

Output path: `android/app/build/outputs/bundle/release/app-release.aab` (after a full `bundleRelease` build).

## Clean builds

After native dependency or signing changes:

```bash
cd android
gradlew.bat clean
```

Then run `npm run apk:debug` or `npm run apk:release` from the repo root.

## Quick test checklist (after a fresh debug APK)

1. Enable **USB debugging** on the phone; connect USB (or use an emulator). Confirm `adb devices` lists it.
2. From the repo root, either:
   - **Build + install in one go:** `npm run apk` or `npm run apk:debug:clean:install` (or `npm run apk:debug:install` without clean), **or**
   - **Build then install:** `npm run apk:debug:clean` then `npm run apk:install`.
3. (Equivalent manual install: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.)
4. Open the app; confirm **login**, **drawer**, **site visit** (and test GPS if `USE_FAKE_API=true` in dev), **violations**, **summary**, **pending uploads** / sync as you expect.
5. For day-to-day coding without reinstalling APK each time: terminal A `npm start`, terminal B `npm run android` (device loads JS from Metro).
