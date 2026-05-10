# Auth Session Persistence Spec (For Future Code Generation)

## Goal

Enable persistent login for field officers so they do not enter credentials repeatedly.  
The app should keep users signed in across app restarts while storing sensitive data securely.

## Core Security Rules

- Do not store plaintext username/password after successful login.
- Do not store tokens in plain AsyncStorage.
- Store sensitive session data in secure storage (`react-native-keychain`).
- Keep access token short-lived; use refresh token for re-authentication.

## What To Persist

Persist once at login:

- `accessToken` (short expiry)
- `refreshToken` (longer expiry)
- minimal user profile (`id`, optional `name`, optional role)

Storage split:

- Sensitive: Keychain (`accessToken`, `refreshToken`)
- Non-sensitive cache/flags: MMKV or AsyncStorage (`user profile`, `isLoggedIn`, optional timestamps)

## App Startup Flow

1. On app launch, read stored session from Keychain.
2. If no session exists, show login screen.
3. If access token is still valid, hydrate user state and enter app.
4. If access token expired, call refresh endpoint using refresh token.
5. If refresh succeeds, replace stored tokens and continue to app.
6. If refresh fails, clear session and show login screen.

## Runtime API Behavior

- Every protected API request sends:
  - `Authorization: Bearer <accessToken>`
- On unauthorized response (e.g., 401):
  - attempt one token refresh
  - retry original request once
  - if still unauthorized, force logout

## Logout Flow

On user logout or session invalidation:

1. Clear Keychain tokens.
2. Clear local user/session cache.
3. Navigate to login screen.
4. Optionally call backend logout/revoke endpoint.

## Backend Requirements

Backend API must provide:

- `POST /auth/login` -> returns `accessToken`, `refreshToken`, and user object
- `POST /auth/refresh` -> returns new access token (and optionally new refresh token)
- `POST /auth/logout` or revoke endpoint to invalidate refresh token
- token expiry metadata (recommended) for proactive refresh handling

## Current Project Notes

- Existing code currently keeps `user` in React state only (`src/App.js`), so session is lost after restart.
- Existing login call returns user with token (`src/services/api.js`).
- Existing `react-native-keychain` dependency is already present and should be used for secure token storage.

## Suggested Module Structure For Later Implementation

- `src/services/authService.js`
  - `saveSession(session)`
  - `getSession()`
  - `refreshSession()`
  - `clearSession()`
  - `isTokenExpired(tokenOrExpiry)`
- `src/services/api.js`
  - add auth header injection helper
  - add refresh+retry handling for 401
- `src/App.js`
  - bootstrap auth on startup
  - route user to login/dashboard based on restored session

## Acceptance Criteria

- User logs in once and remains logged in across app restarts.
- App can recover from expired access token using refresh token.
- Credentials are not repeatedly requested during normal usage.
- Sensitive auth data is stored securely (Keychain), not plain storage.
- Logout reliably removes local session and requires re-login.

