# API / RPC Contracts

This document describes app-side contracts currently used in the repo.

## 1) Supabase Auth

### `auth.signInWithPassword`
Used by:
- Web login (`/src/app/login/actions.ts`)
- Tablet login (`/tablet-app/src/screens/LoginScreen.tsx`)

Input:
- `email: string`
- `password: string`

Output:
- `session` on success
- `error.message` on failure

---

## 2) RPC Contracts

## `get_worker_rate(...)`
Used by:
- Tablet processing entry rate lookup (`/tablet-app/src/lib/rates.ts`)

Expected behavior:
- returns worker rate per kg for a `(processing_type, count_range, effective_at)` combination.

App compatibility handling:
- current client tries these param styles to support DB-side naming differences:
  1. `p_processing_type_id`, `p_count_range_id`, `p_effective_at`
  2. `processing_type_id`, `count_range_id`, `effective_at`
  3. `p_processing_type_id`, `p_count_range_id`
- falls back to direct table query (`worker_rates`) if RPC call shape differs.

Recommended canonical signature:
```sql
get_worker_rate(
  p_processing_type_id uuid,
  p_count_range_id uuid,
  p_effective_at timestamptz
) returns numeric
```

---

## 3) Table Write Contracts

## Stock inward insert
Used by:
- Tablet `submitStockInward`

Primary payload:
```json
{
  "entry_date": "YYYY-MM-DD",
  "shed_id": "uuid",
  "company_id": "uuid",
  "raw_weight_kg": 123.45
}
```

Compatibility fallback in code:
- retries with `inward_date` if `entry_date` column is unavailable.

## Processing entry insert
Used by:
- Tablet `submitProcessingEntry`

Payload:
```json
{
  "entry_date": "YYYY-MM-DD",
  "shed_id": "uuid",
  "company_id": "uuid",
  "batch_id": "uuid",
  "processing_type_id": "uuid",
  "count_range_id": "uuid",
  "processed_weight_kg": 100.25,
  "rate_per_kg_snapshot": 5.5,
  "amount_snapshot": 551.38
}
```

Output used by app:
- `processing_entry_id` (for optional member split write)

## Processing entry member insert (target model)
Used by:
- Tablet `saveMemberWeightsBestEffort`

Payload per row:
```json
{
  "processing_entry_id": "uuid",
  "member_id": "uuid",
  "processed_weight_kg": 12.5
}
```

Current behavior:
- best-effort write (silently ignored if table does not exist).

---

## 4) Read Contracts (Web + Tablet)

Master reads (`is_active=true`):
- `companies`
- `sheds`
- `batches`
- `batch_members`
- `processing_types`
- `count_ranges`

Operational reads:
- `stock_inward` (+ company/shed joins)
- `processing_entries` (+ batch/type/range/company/shed joins)
- `v_daily_summary`

---

## 5) Role Access Contract

Web route policy:
- `/admin/*`: `admin`, `owner`
- `/accounting/*`: `accountant`, `admin`, `owner`
- `supervisor`: redirected to `/supervisor-info`

Tablet policy:
- supervisor-centric app flow
- auth required

---

## 6) Validation / Business Rules

Implemented in app/server actions:
- count range validation: `min_count <= max_count`
- worker rate overlap handling: close older active overlap; reject same/forward-dated active conflict
- processing entry amount: `processed_weight_kg * rate_per_kg_snapshot`
- stock-first processing UI guard: cannot process beyond selected stock balance

Recommended DB-side hardening (next):
- enforce stock balance constraints transactionally in DB
- make member-weight splits mandatory and validated against total processing weight
