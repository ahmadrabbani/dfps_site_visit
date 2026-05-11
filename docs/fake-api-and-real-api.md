# Fake API vs real API (testing then production)

`USE_FAKE_API` is read from **`.env`** via **`react-native-config`** in `src/config/env.js`.

- **`USE_FAKE_API=true`** — only when **`__DEV__` is true** (debug builds). Skips network for **login**, **penalties** (`fetchViolationTypes`), and **upload** (`pushSiteVisit`); uses mocks in `src/services/api.js`.
- **Release builds** — `__DEV__` is false, so **`USE_FAKE_API` is always treated as off** even if left in `.env`. Safe for store builds if you forget to flip the flag.

---

## Use fake API while developing

1. In the **project root**, copy the template if you do not have a local env file yet:
   ```bash
   copy .env.example .env
   ```
   (macOS/Linux: `cp .env.example .env`)

2. Edit **`.env`**:
   ```env
   USE_FAKE_API=true
   ```
   You can leave **`API_BASE_URL`** empty during pure fake mode; the real URL is ignored for mocked calls anyway.

3. **Rebuild the native app** so Android/iOS pick up `.env` changes (**react-native-config** embeds values at build time):
   ```bash
   npm run android
   ```
   or `npm run apk:debug:clean` if you only install the APK.

4. In **debug**, the login screen shows a **test mode** hint when fake API is on (`LoginScreen` checks `USE_FAKE_API`).

---

## Switch back to the real API after tests

1. Edit **`.env`**:
   ```env
   USE_FAKE_API=false
   ```
   Or **delete** the `USE_FAKE_API` line (same as false per `.env.example`).

2. Set **`API_BASE_URL`** to your real PHP front controller (no trailing slash), e.g.:
   ```env
   API_BASE_URL=https://your-server.example/dfps-site/public/index.php
   ```
   This is required for real-API mode.

3. **Rebuild** the native app again after changing `.env`:
   ```bash
   npm run android
   ```
   or your usual APK flow.

4. Confirm **`USE_FAKE_API`** is not `true` in any **release** pipeline `.env` you use for CI/CD (defense in depth; release already ignores it via `__DEV__`).

---

## Quick reference

| Goal | `.env` |
|------|--------|
| Fake login / penalties / upload (dev only) | `USE_FAKE_API=true` |
| Real backend | `USE_FAKE_API=false` + `API_BASE_URL=...` (or rely on code default) |

**Files:** `src/config/env.js`, `src/services/api.js`, `.env.example`.
