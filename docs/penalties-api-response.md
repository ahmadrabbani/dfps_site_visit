# Penalties API response (`penalties/index`)

The violation form loads **`fetchViolationTypes(scope)`** (`src/services/api.js`), which expects JSON shaped like:

```json
{
  "data": [ /* array of penalty types */ ]
}
```

The app uses **`payload.data || []`** as the list of types (`penaltyTypes` in `ViolationFormScreen`).

---

## Request URL (real API)

Base URL from `getApiBaseUrl()` (`src/config/env.js` — `API_BASE_URL` in `.env`), then:

```http
GET {BASE_URL}?route=penalties/index&scope=residential
```

(or `scope=commercial`). With `USE_FAKE_API=true` in dev, no HTTP call is made; a local mock list is returned instead.

---

## Top level

| Field | Role |
|--------|------|
| **`data`** | Array of **penalty types** (each row in the “Violation type” list). |

---

## Each item in `data` (one penalty type)

| Field | Meaning |
|--------|--------|
| **`id`** | Stable id for this type. Saved on the violation as **`violationTypeId`**. |
| **`name`** | Label shown in the type list (e.g. “Mandatory Space Violation”). |
| **`scope`** | e.g. `"residential"` — should align with the **`scope`** query parameter. The API may return only rows for that scope. |
| **`isSelectable`** | Backend hint: `true` means the officer may select this type. The current RN form **does not filter** on this; all items in `data` are shown unless you add a filter. |
| **`autoAddToChallan`** | Backend business rule (e.g. auto-include on challan). **Not used** in the current form UI. |
| **`displayOrder`** | Intended sort order (1, 2, 3…). The app **does not sort** by this unless you add something like `sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))`. |
| **`categories`** | Sub-options (floor / band / “General”). User must pick one category for **`handleSave`** validation (unless you change that logic). |

---

## Each item in `categories`

| Field | Meaning |
|--------|--------|
| **`id`** | Saved as **`violationCategoryId`**. |
| **`name`** | Shown in the category table; used for **`categoryLabel`** / **`floorLabel`** in the saved violation. |
| **`penaltyRate`** | Shown in the “Penalty” column (numeric). |
| **`tokenFee`** | Optional; if missing or `null`, the UI shows **“—”** in the token fee column. |
| **`isFixedAmount`** | Drives **validation** in `ViolationFormScreen`: if **`false`**, the user must enter **area** (or calculate from length × width) before Save. If **`true`**, area is **not** required for that category. |

---

## Example payload (residential)

The following illustrates real-shaped data (abbreviated comments only in prose below — use your full JSON from the server).

- Types **1–9** mostly use **`isFixedAmount: false`** on categories → **area required** on save (unless you relax validation).
- Types **10–11** include categories with **`isFixedAmount: true`** (e.g. “Change of Side”, “Late Application Fee”) → **area optional** for those rows.

Long **`name`** values on a type are valid; they are display strings only.

---

## Mapping to the app

1. **Type list** — one selectable row per element of **`data`** using **`name`** / **`id`**.
2. **Category table** — when a type is selected, **`categories`** drives rows (**`name`**, **`penaltyRate`**, **`tokenFee`**).
3. **Save** — requires **`selectedType`** and **`selectedCategory`**; if a type has **`categories: []`**, the user cannot satisfy the current save rules (no category to pick).
4. **Unused in UI today** — `isSelectable`, `autoAddToChallan`, `displayOrder` (unless you wire them in).

---

## Related files

- `src/services/api.js` — `fetchViolationTypes`, URL and `USE_FAKE_API` branch.
- `src/config/env.js` — `getApiBaseUrl`, `USE_FAKE_API`.
- `src/screens/ViolationFormScreen.js` — loading, error/retry, table, **`isFixedAmount`** area rule.
