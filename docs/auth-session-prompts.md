# Auth Session Prompts (Copy-Paste For AI)

## How to Use

- Run prompts in order.
- Ask AI to finish one prompt completely before moving to the next.
- After each prompt, run and verify app behavior.
- Keep changes minimal and focused only on requested files.

---

## Prompt 1: Create Auth Service Skeleton

```text
You are working in a React Native app.

Create `src/services/authService.js` with the following exported functions:
- saveSession(session)
- getSession()
- clearSession()
- isAccessTokenExpired(session)
- refreshSession()

Requirements:
- Use `react-native-keychain` for sensitive data (`accessToken`, `refreshToken`).
- Use AsyncStorage (or existing storage utility) only for non-sensitive user profile metadata.
- Add safe try/catch handling and return null on missing/corrupt session.
- Do not change app screens yet; only add this service and any minimal helper constants.

After coding, explain what each function does.
```

---

## Prompt 2: Wire Login Success To Persistent Session

```text
Update login flow to persist session once login succeeds.

Context:
- `src/screens/LoginScreen.js` performs login call and invokes `onLogin(user)`.
- `src/services/api.js` login currently returns user + token shape.

Tasks:
- Normalize login response into a session object with:
  - accessToken
  - refreshToken (if backend provides; otherwise keep placeholder handling documented)
  - user profile object (id/name/role if present)
- Call `saveSession(session)` from authService after successful login.
- Keep UI behavior intact (loading, errors, button state).
- Avoid storing plaintext password.

Only update relevant login/auth files.
Provide a short summary of changed files and why.
```

---

## Prompt 3: App Startup Bootstrap (Auto Login)

```text
Implement auth bootstrap on app launch in `src/App.js`.

Tasks:
- Add startup loading state.
- On mount:
  1. call getSession()
  2. if no session -> show login
  3. if session exists and token valid -> set user and navigate dashboard
  4. if token expired -> call refreshSession()
  5. on refresh success -> set user and continue
  6. on refresh failure -> clearSession() and show login
- Keep existing screen navigation logic as intact as possible.

Constraints:
- Minimal intrusive changes.
- No new UI library dependencies.
- Add brief inline comments only where logic is non-obvious.

Return a concise test checklist for this bootstrap flow.
```

---

## Prompt 4: Centralize Auth Header In API Layer

```text
Refactor API calls in `src/services/api.js` to use centralized auth header injection.

Tasks:
- Add helper to fetch current access token from authService.
- For protected endpoints, send `Authorization: Bearer <token>`.
- Preserve existing request/response parsing behavior where possible.

Constraints:
- Keep API function signatures stable unless necessary.
- Avoid touching unrelated business logic.

Show which endpoints are now protected and how token is attached.
```

---

## Prompt 5: Handle 401 With Refresh + Single Retry

```text
Enhance API layer to handle expired tokens gracefully.

Tasks:
- On HTTP 401 from protected request:
  1. attempt refreshSession() once
  2. retry original request once with new token
  3. if still unauthorized, clear session and trigger logout path
- Prevent infinite retry loops.
- Keep logic reusable through shared request helper.

Deliverables:
- Updated api/auth service code
- brief explanation of retry guard
- note on how logout is triggered from this failure path
```

---

## Prompt 6: Add Explicit Logout Flow

```text
Implement a proper logout flow in the app.

Tasks:
- Add a logout action from authenticated area (or existing dashboard action point).
- On logout:
  - optionally call backend logout/revoke endpoint (if available)
  - clearSession() locally
  - reset auth state and navigate to login screen
- Ensure no stale user token remains in memory/state.

Constraints:
- Keep UI changes minimal.
- Do not break existing navigation flow.

Provide manual steps to verify logout security behavior.
```

---

## Prompt 7: Integrate Existing Visit Upload With Central Session

```text
Update visit upload/auth usage to read token from centralized auth/session source.

Current context:
- Some flows pass token through user object in component state.

Tasks:
- Replace scattered token access with authService/API-level token retrieval.
- Keep visit payload behavior compatible with backend contract.
- Remove duplicated token plumbing in UI components where possible.

Return a before/after summary of token flow across files.
```

---

## Prompt 8: Add Edge-Case Handling

```text
Improve resilience for auth/session edge cases.

Handle:
- corrupt session data in storage
- offline startup with expired token
- refresh token revoked
- unexpected refresh API response shape

Tasks:
- add defensive checks and fallback behavior
- avoid app crash or infinite loading
- ensure user is redirected to login when recovery is impossible

Also include short user-facing error messaging guidance.
```

---

## Prompt 9: Security Pass

```text
Do a security hardening pass on auth-related code.

Tasks:
- remove/sanitize logs containing credentials or token data
- ensure plaintext passwords are never persisted
- verify secure storage used for sensitive values only
- confirm auth endpoints use HTTPS base URL in production config

Output:
- list of files checked
- list of fixes made
- residual risks (if any)
```

---

## Prompt 10: Test Plan + Final Cleanup

```text
Create and execute a practical auth session test plan, then do final cleanup.

Test scenarios:
1. First login -> app restart -> still logged in
2. Access token expiry -> refresh works automatically
3. Refresh token invalid -> forced login
4. Manual logout -> restart -> login required
5. Offline behavior with valid vs expired token

Tasks:
- document expected vs actual for each scenario
- fix small issues discovered
- keep code style consistent with project

Return:
- final changed file list
- known limitations
- next recommended backend/API improvements
```

---

## Optional Mega Prompt (Single Shot)

```text
Implement secure persistent login/session management for this React Native app using `react-native-keychain` for tokens.

Required outcomes:
- login persists across app restarts
- startup bootstrap restores session
- protected APIs send Bearer token
- 401 triggers one refresh + one retry
- logout clears session completely
- no plaintext password/token leak in logs or plain storage

Use existing project structure and minimize intrusive refactors.
After implementation, provide:
1) changed file list
2) architecture summary
3) manual test checklist
4) known limitations if refresh endpoint contract is incomplete
```

