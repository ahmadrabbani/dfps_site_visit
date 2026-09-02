# Ceiling Implementation

Checklist for adding **Ceiling Investigation (CI)** to the React Native app. The live housing portal already has this module. The app currently only implements **Completion Certificate (CC)** site visit.

Use this file to verify URLs, field names, and code touch-points before coding.

---

## Current state

| Surface | Ceiling Investigation |
|---|---|
| Live portal (`lda.gop.pk/housingSurveyCommercial` or test host) | Already exists (menu-driven from DB) |
| Local `housingportal/` copy in this repo | **Not present** — no `add_*ceiling*` / `conf_add_ci*` PHP files found |
| React Native app | **Present** — dashboard + Ceiling Investigation screen; Scheme/Phase/Block/Plot from `plot_bank.php`; save is local only |

App CC flow today:

**Dashboard → SiteVisitScreen → local queue (`storage.ts`) → `pushSiteVisit()` → `forward_cc_survey.php`**

Cases: `fetchCaseList()` → `cc_application_list.php`  
Violations: `fetchViolationTypes()` → `cc_violation_list.php`

Do **not** replace CC. CI is a second flow.

**Plot cascade (done):** Ceiling Investigation loads Scheme → Phase → Block → Plot from `PLOT_BANK_URL` (`plot_bank.php`, same as portal `survey_data_v3.php`: `t=1..4`, scheme/phase/block double-base64). Activity is still the local list. Visits are **not** posted to a Ceiling `conf_add_*` API yet.

---

## Form code audit (local `housingportal/`)

Checked the local PHP copy instead of a live Network save. **There is still no Ceiling Investigation page in this folder.** Menus are loaded from MySQL (`tbllinks.link_file` in `index_admin.php`). No file named `*ceiling*` exists. Searching the PHP tree for `ceiling` only hits PDF symbol HTML.

Do **not** POST Ceiling app data to CC (`conf_add_cc_form.php` / `forward_cc_survey.php`).

### What exists (and what it is)

| File | POST URL | What it actually is |
|---|---|---|
| `add_survey_form_v3.php` | `conf_add_survey_form_v3.php` | Current **Perform Survey** (Illegal Commercial / Building Control / Estate / DMP / TEPA / Facade / Destitute via `category_id` 1–7). Same plot cascade as the app. **No Activity field.** |
| `add_survey.php` | `conf_add_survey.php` | Older **Control Area Survey** (road, property no, land use). |
| `add_housing_survey_form.php` | `conf_add_housing_survey_form.php` | Housing survey (scheme/block/plot + area/ground status). |
| `add_completion_certificate_survey.php` | `conf_add_cc_form.php` | **CC only** — leave this alone. |
| `conf_add_survey - Copy.php` | (stale copy, not wired from a live `add_*.php` in this tree) | Old **`tbl_survey`** save with `action_type` — this is the only save handler that matches the app’s FIR / demolition / sealing Activity list. |

`add_survey_form_v3.php` still has leftover JS for `#action_type` → `get_general_value.php?typ=getActionHtml`, but the HTML form has **no** `action_type` select. Activity UI lives in `get_general_value.php` (`getActionHtml`) and labels in `SurveyTypeAttachment` (`class/cls_functions.php`). Values 1–10 match `src/constants/ceilingInvestigation.ts`.

### Current Perform Survey POST (`conf_add_survey_form_v3.php`)

Multipart `FormData` from `#PerformSurvey`:

| Field | Required? | Notes |
|---|---|---|
| `category_id` | yes | Hidden; must be 1–7. Rejects empty or `>7`. |
| `scheme_id` | yes | Scheme **name** from plot bank (or `O` + `scheme_name`) |
| `phase_id` | yes unless scheme is `O` | Or `O` + `phase` |
| `block_id` | yes unless phase is `O` | Or `O` + `block_mauza` |
| `plot_id` | yes unless block is `O` | Plot **id**; `O` + `plot_number` for new |
| `road_id` | yes only if `category_id==4` (DMP) | `O` + `road_name` |
| `size_id` | no (server does not require except commented DMP) | Area category |
| `ground_status_id` | no | |
| `land_use_id` | no | |
| `survey_notice_section` | if category has notice rows | |
| `owner_occupant` / `setback` | if notice `21` | |
| `site_position` | remarks | Maps to app Final Remarks |
| `imgInp` | usually yes | Single property pic; max ~5.5MB |
| `user_lat` / `user_lng` | GPS currently **not** enforced | |
| `property_lat` / `property_lng` | map pin; falls back to user lat/lng | |

Success JSON: `["0", "success", "Survey performed successfully"]`. Error: `["1", "err", "<message>", …]`. After insert it also GET-forwards to `http://103.8.115.199:91/test/survey/forward_survey.php` (not `forward_cc_survey.php`).

**Mismatch with the app:** v3 has no `action_type`, requires `category_id` 1–7, usually one `imgInp`, and often Road / notice section. Wiring Ceiling to this URL would send the wrong survey type.

### Stale Activity survey POST (`conf_add_survey - Copy.php` → `tbl_survey`)

| Field | Required? | Notes |
|---|---|---|
| `scheme_id` | yes | |
| `block_id` | yes | No phase in this INSERT |
| `plot_id` | yes | |
| `action_type` | yes | 1–10 (same as app Activity) |
| `reason_desealing` | if `action_type==5` | Else `FileImg` attachment required |
| `FileImg` | yes except type 5 | FIR / notice / stay copy |
| `imgInp` / `imgInp1` | optional site pics | Two files, not eight |
| `survey_date` | optional | |
| `property_lat` / `property_lng` / `user_lat` / `user_lng` | stored | |

Success: `["0", "success", "Record added successfully"]`. **This file is a copy; current `conf_add_survey.php` does not insert `tbl_survey`.** Do not call it until live Ceiling `link_file` is confirmed.

### Still needed from live portal

View source or Network on **Ceiling Investigation → Perform Survey** and record `tbllinks.link_file` + the ajax `url:`. Until that filename exists locally or is captured live, upload must not be wired.

---

## Step 1 — Capture the live contract (do this first)

Log into the live (or test) portal, open **Ceiling Investigation → Perform Survey**, then DevTools → **Network**.

Fill the form once and save. Record everything below.

### URLs to copy

| What | CC equivalent (app already uses this) | Live CI value (fill in) |
|---|---|---|
| Case list GET | `…/test/survey/cc/cc_application_list.php?u=` | |
| Violation list GET | `…/test/survey/cc/cc_violation_list.php?category=` | |
| Form save POST (web `$.ajax` `url:`) | portal `conf_add_cc_form.php` | |
| Forward / DFPS API | `forward_cc_survey.php` | |

Likely test-host pattern (confirm, do not assume):

- CC: `http://103.8.115.199:91/test/survey/cc/…`
- CI: same host with `cc` → `ci` or `ceiling`

Portal pages sit next to login, e.g. `https://lda.gop.pk/housingSurveyCommercial/…`

Also note the browser URL: `index_admin.php?chkp=…&m=…`

### POST field names

CC form / app fields today:

- `caseId`, `case_number`
- `plot_category` (`Residential` / `Commercial`)
- `is_violation` (`0` / `1`)
- `no_of_floors`
- `user_lat`, `user_lng`
- `site_position` (violation remarks) **or** `no_violation_remarks`
- `imgInp` (site sketch)
- Grid: `violation_type_id[]`, `width[]`, `length[]`, `floor[]`, `unit[]`, `remarks[]`, `violation_img[]`

**CI extra / different fields** (fill in from Network → Form Data):

| Field name | Required? | Notes |
|---|---|---|
| | | |
| | | |

If the CI form matches CC (plot category, case, violation yes/no, floors, grid, GPS, sketch), reuse `SiteVisitScreen` and `ViolationFormScreen` with a type param. If CI has extra required fields, add them only on the CI path.

### Response shape

CC save expects a JSON array like `["1", "success", "message", …]` (`parsePortalCcSubmitResponse`). Confirm CI returns the same or document the difference here:

- Status field:
- Success value:
- Message field:

---

## Step 2 — App changes

### Env / config

Add beside existing `CC_*` vars in `.env`, `.env.example`, and `src/config/env.ts`:

- `CI_APPLICATION_LIST_URL`
- `CI_VIOLATION_LIST_URL`
- `CI_SURVEY_URL` (forward API, if used)
- Portal save URL if the web form posts to `conf_add_*` (today `getCcPortalSubmitUrl()` only builds `conf_add_cc_form.php`)

Rebuild the native app after `.env` changes (`react-native-config` is bake-time).

**Note:** `pushSiteVisit()` currently POSTs to `getCcSurveyUrl()` (`forward_cc_survey.php`), not `conf_add_cc_form.php`. Match **whatever the live CI form actually posts to**.

### Data model

Add `surveyType: 'cc' | 'ci'` on:

- `CcSurveyCompletePayload` in `src/types/app.ts` (or rename to a shared survey payload)
- `PendingVisitBase` in `src/services/storage.ts` so offline queue uploads hit the right API

### Navigation / UI

| File | Change |
|---|---|
| `src/screens/DashboardScreen.tsx` | Second card: “Ceiling Investigation Site Visit” |
| `src/navigation/AuthenticatedFlow.tsx` | `navigate(SiteVisit, { surveyType: 'ci', locationPrepared: true })` |
| `src/screens/SiteVisitScreen.tsx` | Read `surveyType`; titles/copy; CI case list |
| `src/components/AppDrawerContent.tsx` | Optional second drawer item |
| `src/constants/appTourSteps.ts` | Optional tour copy |

Reuse GPS gating (`prepareSiteVisitLocation`) for CI the same as CC.

### API

| File | Change |
|---|---|
| `src/services/api.ts` | `fetchCaseList` / `fetchViolationTypes` take `surveyType` and pick CI URLs |
| `src/services/api.ts` | `pushSiteVisit`: if `visit.surveyType === 'ci'` POST to CI URL |
| `src/services/portalCcSurvey.ts` | Clone or branch if CI field names differ; reuse if they match |
| `src/services/ccSurveySubmit.ts` | Same as above for `forward_*` body |
| `src/hooks/useSubmitSiteVisitMutation.ts` | Persist `surveyType` on the pending visit |

`src/services/syncService.ts` already calls `pushSiteVisit(v)` per queued visit. If `surveyType` is on the visit, CC and CI can share one queue.

Hourly AES key (`surveyApiKey.ts`) is shared with the portal CC pages. Confirm whether CI uses the same secret and `?key=` fallback.

### Tests to extend

- `src/services/api.test.ts`
- `src/services/ccSurveySubmit.test.ts`
- `__tests__/SiteVisitScreen.test.tsx` (CI title / case fetch)

---

## Step 3 — Implementation order

1. Fill Step 1 tables from live Network (blockers if empty).
2. Add env URLs + getters.
3. Add `surveyType` on payload + pending visit.
4. Branch `fetchCaseList`, `fetchViolationTypes`, `pushSiteVisit`.
5. Dashboard second card + `SiteVisit` route param.
6. Extra CI fields only if the live form has them.
7. Manual test: login → CI visit → save offline → push → confirm row on live portal CI list.

---

## Check-off (for you)

- [ ] Live CI case-list URL recorded
- [ ] Live CI violation-list URL recorded
- [ ] Live CI save POST URL recorded
- [ ] Live CI POST field names match CC, or extras listed
- [ ] CI JSON success/error format recorded
- [ ] Same officer login works for CI cases (or CI uses a different `u=` value)
- [ ] Decide: post to portal `conf_add_*` vs direct `forward_*` (match live form)
- [ ] Confirm test vs prod hosts for CI (same split as CC login)

---

## Reference — CC files already in the app

- `src/config/env.ts` — `getLoginUrl`, `getCcApplicationListUrl`, `getViolationListUrl`, `getCcSurveyUrl`, `getCcPortalSubmitUrl`
- `src/services/api.ts` — login, case list, violation list, `pushSiteVisit`
- `src/services/portalCcSurvey.ts` — multipart matching `conf_add_cc_form.php`
- `src/services/ccSurveySubmit.ts` — multipart matching `forward_cc_survey.php`
- `src/screens/SiteVisitScreen.tsx` — CC form UI
- `src/screens/ViolationFormScreen.tsx` — violation row
- `src/hooks/useSubmitSiteVisitMutation.ts` — local save + sync
- `src/services/storage.ts` — pending / submitted visits
