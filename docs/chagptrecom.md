Stronger Recommendation

Use:

API_TIMEOUT_MS=15000
SYNC_BATCH_SIZE=10
ENABLE_DEBUG_LOGS=false

Not just URLs.

Move all runtime configuration into envs.

High Priority Issues
H1 — Photo Capture Missing

This is likely the single most important missing business feature.

Field inspection apps usually require:

evidence
audit trails
legal defensibility

Without photos:

violations become disputable
reports lose credibility
Why implementation details matter

Your recommendation:

includeBase64: true

works for MVP, but becomes problematic later.

Base64 problems

Base64:

increases image size ~33%
raises memory usage
slows sync
crashes low-memory Android devices
Better architecture

Use:

compressed image file path
upload multipart/form-data
store local URI offline

Example:

{
  photoUri: 'file:///...'
}

Then upload later.

This scales much better.

H3 — Retry Limits & Backoff

This recommendation is extremely important.

Right now:

every reconnect triggers retries
failures loop forever

That causes:

battery drain
API spam
user frustration
duplicate uploads
Why exponential backoff matters

Without backoff:

online -> fail
online -> fail
online -> fail

hundreds of times.

With backoff:

1 min
2 min
4 min
8 min

This:

protects servers
saves battery
prevents sync storms
Additional recommendation

Add:

lastRetryAt
failureReason
syncStatus

States:

pending
syncing
failed
uploaded

This massively improves debugging.

H4 — No Sync Feedback

This is bigger than UX.

Field workers need confidence.

If they don’t trust sync:

they duplicate entries
screenshot forms
keep paper backups

You lose operational efficiency.

Recommendation

Add:

sync badge
pending count
“Last synced at”
manual retry button

This transforms trust in the app.

H5 — Manual Navigation
if (screen === 'dashboard')

This works for tiny apps only.

Why this becomes dangerous

As app grows:

typo = blank screen
back handling breaks
deep linking impossible
state restoration impossible

React Navigation is not just convenience.

It solves:

navigation lifecycle
Android back button
memory handling
transitions
deep links
nested flows

Necessary for production.

Medium Priority Review
M1 — Mixed JS/TS

This is already technical debt.

The problem is not aesthetics.

The problem is:

false confidence
partial typing confusion
editors behave inconsistently
Why TypeScript matters especially here

This app has:

API payloads
sync queues
offline serialization
navigation params

These are exactly where TypeScript prevents production bugs.

M2 — Violation Type Caching

Very important for offline-first.

Right now:

form depends on API availability
offline visit can fail unexpectedly

Caching reference data is mandatory in field apps.

Better pattern

Store:

{
  data: [],
  updatedAt: timestamp
}

Then:

use cache immediately
refresh in background

This gives instant loading.

M3 — Area Calculation Re-render

Low importance currently.

Do not optimize prematurely unless:

calculation expensive
form lag observed

Correctly marked medium/low.

M5 — Edge-to-edge Android 15

This is future-proofing.

Not urgent unless targeting Android 15 deployment soon.

But eventually required.

Good recommendation.

Phase 2 — Architecture

This is the most important long-term phase.

Why React Navigation is necessary

The app currently centralizes all state in App.js.

That causes:

giant rerenders
prop drilling
tangled lifecycle logic

As soon as:

notifications
background sync
multi-step forms
tabs

get added, current architecture collapses.

Zustand Recommendation

Good choice.

Why Zustand fits:

tiny bundle
simple mental model
no Redux boilerplate
excellent for RN

Correct recommendation.

One improvement

Split stores:

authStore
visitStore
syncStore

Don’t put everything into one global store.

Photo Upload Architecture — Important Improvement

Do NOT store large base64 blobs in AsyncStorage.

AsyncStorage is not designed for large binary data.

You will eventually hit:

storage slowness
corruption risk
memory spikes
Better offline media architecture

Use:

local file path
metadata in AsyncStorage

Example:

{
  localPhotoPath,
  uploaded: false
}

Then:

upload file separately
delete local file after success

This is production-grade.

Testing Section Review

Very accurate prioritization.

Why storage tests matter first

Your app’s core value is:

capture → store offline → sync safely

If queue logic breaks:

inspectors lose work

That is the highest business risk.

So testing:

storage
retry logic
sync edge cases

first is exactly correct.

Build Hardening Review

Good practical recommendations.

Gradle memory

1024m is too low for modern RN builds.

Especially:

Hermes
React Native 0.82
CI pipelines

2048m minimum is safer.

Additional Recommendations Missing
1. Add Crash Reporting

Very important for field apps.

Use:

Firebase Crashlytics
Sentry

Otherwise production debugging becomes impossible.

2. Add Request Logging

You need visibility into:

sync failures
API latency
auth expiry

At minimum:

request ID
response code
retry count
3. Token Expiry Handling

Currently not addressed.

Need:

refresh token flow
or
forced re-login handling

Otherwise:

queued uploads fail silently after token expiry

Critical for long-lived offline sessions.

4. Background Sync

Eventually needed.

Right now sync only occurs while app active.

Field apps benefit hugely from:

periodic background upload
WiFi-only large media upload
5. Duplicate Submission Protection

Very important.

Offline retries can accidentally duplicate visits.

Need:

client-generated UUID
idempotency support server-side

This is critical.

6. Encryption for Offline Data

If inspection data is sensitive:

encrypt local queue

Especially if:

addresses
violations
citizen information

are stored locally.

Recommended Actual Priority Order

I would slightly reorder roadmap priorities:

Priority	Task
1	Remove demo token
2	Auth persistence
3	Environment config
4	Retry/backoff
5	Sync visibility
6	Photo capture
7	React Navigation
8	Zustand
9	TypeScript migration
10	UI polish

Because reliability matters more than architecture polish early.

Overall Verdict

Your roadmap is:

realistic
production-oriented
correctly prioritized
technically sound

Most important insight:

The app is no longer a prototype feature-wise.

It now needs:

operational reliability
offline resilience
sync integrity
deployment discipline

Those are the real next milestones.