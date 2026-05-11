# Field officer journey — how API responses drive the app

This document walks through what a **field officer** does in the app and **where each backend response** (or fake-API stand-in) is used. Primary code: `src/services/api.js`, `src/services/authService.js`, `src/services/syncService.js`, `src/screens/LoginScreen.js`, `SiteVisitScreen.js`, `ViolationFormScreen.js`, `SummaryScreen.js`, `src/navigation/AuthenticatedFlow.js`.

For **fake vs real** toggling, see `docs/fake-api-and-real-api.md`. For **penalties JSON shape**, see `docs/penalties-api-response.md`.

---

## Before you start (environment)

- **Real API:** `.env` should have `USE_FAKE_API=false` (or omit it) and a correct **`API_BASE_URL`** (or rely on the legacy default in `src/config/env.js`). **Rebuild** the native app after any `.env` change (`react-native-config` reads values at build time).
- **Fake API (debug testing):** `USE_FAKE_API=true` — login, penalties, and upload are **mocked** in `api.js` (no network). Release builds use `__DEV__ === false`, so fake mode does not apply to release binaries.

---

## Step 1 — Open the app (session, no HTTP yet)

1. On launch, the app calls **`loadSession()`** (`authService.js`) and reads the Keychain.
2. If a session exists (`id`, `name`, `token` JSON), you skip login and land in the **authenticated** flow (drawer + stack: **Dashboard**, **Site visit**, etc.).
3. If there is **no** session, you see **Login**. No server call until you submit credentials.

---

## Step 2 — Sign in (first API: who you are + token)

1. You enter **username** and **password** and submit (`LoginScreen` → `login()` in `api.js`).
2. **Real:** `POST {BASE_URL}?route=auth/login` with body `{ "username", "password" }`.
3. **Expected JSON:** must include **`data.user`** and **`data.token`**. The app builds `{ ...data.user, token: data.token }` and returns that to the app (`api.js`).
4. **Errors:** non-OK HTTP or missing `user`/`token` → login fails; you see an error message on the form.
5. **Success:** that object is passed to **`saveSession()`** — Keychain stores **`id`**, **`name`**, **`token`** only (password is never stored). You then see **Dashboard**.
6. **Fake mode:** no POST; after a short delay you get a fixed demo user (`id`, `name`, `token` from `FAKE_USER` in `api.js`).

**Officer-visible effect:** **“Welcome, {name}”** and **“Officer: {name}”** on site visit use **`name`** from this step (or fake user).

---

## Step 3 — Dashboard

1. You see **Welcome** and your role line; **Initiate Site Visit** navigates to **Site visit**.
2. No additional API call on this screen alone.

**Navigation:** Swipe-from-left drawer (or menu on the bar when on root screen) includes **Dashboard**, **Site visit**, **Sign out** (see `AuthenticatedFlow.js`). Top bar may include **back** and **sign out** depending on screen (`AppHeader.js`).

---

## Step 4 — Site visit (GPS + property type → which penalty list loads next)

1. **GPS:** `SiteVisitScreen` compares the device position to a **demo target** (fixed lat/lon in code). Within **100 m** you are “On-site (GPS verified)”; otherwise “Not at site location.” **Complete Site Visit** stays disabled until GPS says on-site **and** at least one violation exists.
2. **Property type:** **Residential** / **Commercial** toggles **`siteScope`** in app state. That value is passed as **`scope`** when penalties are fetched on the violation form (`penalties/index?scope=…`).
3. **Add violation** opens **Violation form** (visit is still **not** sent to the server).

**Officer-visible effect:** you must be **on site** (per current GPS rule) and pick **residential vs commercial** before you can finish a visit; the choice affects the **next** penalties request.

---

## Step 5 — Violation form (second API: penalty schedule)

1. On open (and when **`scope`** changes or you tap **Retry** after an error), the screen calls **`fetchViolationTypes(scope)`** (`api.js`).
2. **Real:** `GET {BASE_URL}?route=penalties/index&scope=residential` (or `commercial`).
3. **Response:** JSON with **`data`** = array of types; each type has **`categories`** (see `docs/penalties-api-response.md`). The app uses **`payload.data || []`**.
4. **Loading:** spinner + “Loading penalty table…”
5. **Error:** message + **Retry** (refetch).
6. **Success:**
   - **Violation types** list = each item’s **`name`** / **`id`**.
   - Selecting a type shows **`categories`**: **`name`**, **`penaltyRate`**, **`tokenFee`** (or “—” if `tokenFee` is null).
   - **`isFixedAmount`** on the **selected category** controls **Save**:
     - **`false`** → **area** is required (or computed via length × width + **Calculate area**).
     - **`true`** → area is **not** required for that category.
7. **Save** builds a violation object (`violationTypeId`, `violationCategoryId`, labels, dimensions, area, notes, etc.) and returns to the site visit screen; violations accumulate in local state — **still not uploaded**.

**Fake mode:** no GET; small mock list from `getFakePenaltyTypes(scope)` in `api.js`.

---

## Step 6 — Complete site visit (local queue only)

1. **Complete Site Visit** builds a **visit** object: `localId`, **`siteId`** (currently fixed **`1`** in navigation code), **`officerId`** / **`authToken`** from the **login** session, start/end times, coordinates, **`scope`**, and the **`violations`** array.
2. **`addPendingVisit(visit)`** writes to **AsyncStorage** (`storage.js`).
3. You navigate to **Summary** to review the visit. **No `sitevisit/store` call yet.**

---

## Step 7 — Summary

1. You see visit details from navigation **params** (violations count, scope, etc.).
2. **Back to Dashboard** resets the stack to **Dashboard**.

---

## Step 8 — Upload to server (third API; automatic when online)

1. **`syncService.js`** subscribes to **NetInfo**. When the device is **connected**, it runs **`syncPending()`**: loads pending visits from AsyncStorage and, for each, calls **`pushSiteVisit(visit)`**.
2. **Real:** `POST {BASE_URL}?route=sitevisit/store` with JSON including **`authToken`** and **`siteVisit`** (site, officer, times, scope, coordinates, violations with type/category ids, labels, dimensions, area, notes, optional photo) — see `api.js`.
3. **Success:** visit removed from the pending list (`markVisitUploaded`).
4. **Failure:** visit stays queued; sync retries on a later online event. User feedback: **Toast** on Android on full success; **Alert** in other cases / partial failures (`syncService.js`).

**Fake mode:** no POST; mock success so the queue can still clear during testing.

---

## Step 9 — Sign out / next session

1. **Sign out** clears the Keychain session and returns to **Login**.
2. Next successful login repeats **Step 2** and obtains a **new token** from the server (or fake user).

---

## Quick reference — API vs UI

| Officer moment | API route (real) | What the response drives |
|----------------|------------------|---------------------------|
| After submitting login | `auth/login` | **Display name**, **officer id**, **token** for session + uploads |
| Opening / changing scope on violation form | `penalties/index?scope=…` | **Types and categories** you can pick; **rates** in table; **area required or not** (`isFixedAmount`) |
| After visit saved locally, when device is online | `sitevisit/store` | Whether server **accepted** the visit; **pending queue** clears on success |

---

## Current limitations (good to know in the field)

- **`siteId`** is still hardcoded to **`1`** in `AuthenticatedFlow.js` — not yet chosen from a sites API.
- **`isSelectable`**, **`displayOrder`**, **`autoAddToChallan`** from penalties JSON are **not** used by the RN UI yet (optional server fields).
- **`PendingUploadsScreen`** exists in the codebase but may not be linked in the navigator in your branch; uploads are still driven by **sync** when online regardless.

---

## Related docs

- `docs/penalties-api-response.md` — field definitions for `penalties/index`
- `docs/fake-api-and-real-api.md` — `.env` switching
- `docs/android-apk-and-signing.md` — building installable APKs
