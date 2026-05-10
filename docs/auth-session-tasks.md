# Auth Session Implementation Tasks

## Purpose

This file converts `docs/auth-session-spec.md` into executable engineering tasks.  
Use it as a build checklist for AI or developers.

## Task 1: Define Session Model

- Create a clear session shape:
  - `accessToken`
  - `refreshToken`
  - `user: { id, name?, role? }`
  - optional `expiresAt`
- Add one shared type/interface (or JSDoc typedef) used across auth and API layers.

**Done when**

- Session fields are consistent across login, storage, and API calls.

## Task 2: Build Secure Auth Storage Service

Create `src/services/authService.js` with:

- `saveSession(session)`
- `getSession()`
- `clearSession()`
- `isAccessTokenExpired(session)`
- `refreshSession()` (calls backend refresh endpoint)

Rules:

- Save `accessToken` + `refreshToken` in Keychain.
- Save non-sensitive metadata/profile in MMKV or AsyncStorage.
- Never store plaintext password after login success.

**Done when**

- Session survives app restart.
- Tokens are not present in plain AsyncStorage values.

## Task 3: Upgrade Login Flow

In login flow (`src/screens/LoginScreen.js` and auth handlers):

- On successful login:
  - normalize response into session object
  - call `saveSession(session)`
  - hydrate in-memory user state
  - navigate to dashboard
- On failed login:
  - show user-friendly error
  - do not persist partial/invalid data

**Done when**

- First login stores session once and app enters authenticated area.

## Task 4: Bootstrap Auth On App Launch

In `src/App.js`:

- Add startup bootstrap effect:
  1. load stored session with `getSession()`
  2. if none -> login screen
  3. if valid -> dashboard
  4. if expired -> attempt `refreshSession()`
  5. if refresh fails -> `clearSession()` and login screen

- Add loading/splash state while bootstrap runs.

**Done when**

- App reopens directly to dashboard for valid stored session.

## Task 5: Centralize Auth Header + Refresh Retry

In `src/services/api.js`:

- Add API helper that injects `Authorization: Bearer <accessToken>` for protected endpoints.
- Handle 401:
  - attempt one refresh
  - retry original request once
  - if still unauthorized -> clear session and force logout

**Done when**

- Expired token path recovers automatically without manual login (when refresh token is valid).

## Task 6: Add Explicit Logout

Create logout action in UI/app state:

- call backend revoke/logout endpoint (if available)
- clear local session via `clearSession()`
- reset user state and navigation to login screen

**Done when**

- Logout always requires re-login and no old token is reused.

## Task 7: Wire Existing Visit Upload To Auth Session

Current code passes `user.token` in visit payload. Update integration to:

- read token from centralized session/auth service
- avoid token access patterns scattered in screens/components

**Done when**

- Upload and other protected requests use the same centralized auth source.

## Task 8: Error Handling + Edge Cases

Handle these cases gracefully:

- network offline during refresh
- corrupted/partial stored session
- refresh token revoked/expired
- login on one device invalidates another session (if backend policy applies)

**Done when**

- User gets clear prompts and app does not get stuck in auth loop.

## Task 9: Security Hardening Checklist

- Ensure no credentials/tokens are logged in production.
- Remove any debug logs that include login request bodies.
- Keep access token TTL short; refresh token TTL moderate.
- Prefer HTTPS only for all auth endpoints.

**Done when**

- Security review confirms no sensitive data leaks in logs/storage.

## Task 10: Testing Checklist

Manual test scenarios:

1. Fresh install -> login -> close app -> reopen -> still logged in.
2. Force access token expiry -> app refreshes token and continues.
3. Revoke refresh token on backend -> app redirects to login.
4. Logout -> reopen app -> login required.
5. Offline launch with valid unexpired token -> app can enter and queue requests.
6. Offline launch with expired token -> app handles refresh failure clearly.

**Done when**

- All critical auth/session scenarios pass.

## Suggested Execution Order

1. Task 1 -> 2 -> 3 -> 4
2. Task 5 -> 6 -> 7
3. Task 8 -> 9 -> 10

## Notes For AI Code Generation

- Prefer minimal invasive changes to existing files.
- Add new auth logic in services rather than spreading stateful logic through UI components.
- Keep token handling centralized and reusable.
- If backend refresh endpoint is unavailable, implement fallback to forced re-login and document limitation.

