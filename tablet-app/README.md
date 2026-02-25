# Padmavathi Tablet App (Milestone 2 Scaffold)

## Setup
1. Copy env template:
   - `cp .env.example .env`
2. Install dependencies:
   - `npm install`
3. Run:
   - `npm start`

## Implemented
- Login (Supabase email/password)
- Stock inward form (insert into `stock_inward`)
- Processing entry form with:
  - QR scan for `batch_code`
  - batch member list with individual weights
  - automatic total weight from member weights
- stock-first workflow:
    - one-screen linear flow
    - create/select stock inward
    - enter processing rounds for selected stock
    - close selected stock inward when done
    - enforce processing <= selected stock balance
    - create multiple stock inwards and switch between them
  - dynamic active dropdowns (shed/company/batch/type/count range)
  - worker rate lookup via RPC (`get_worker_rate`) with fallback
  - snapshot write (`rate_per_kg_snapshot`, `amount_snapshot`)
  - best-effort member weight write to `processing_entry_members` (if table exists)

## Web simulation (no Android Studio)
- Run `npm run web` in this folder and open the shown local URL.
- You can test full form flow on browser.
- QR camera scan may not work on web in all browsers; use batch dropdown there.

## Notes
- Scanner uses `expo-camera`.
- This is online-first Milestone 2. Offline queue is Milestone 3.
