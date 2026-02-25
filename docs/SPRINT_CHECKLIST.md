# Sprint Checklist (Milestone-Mapped)

Use this as execution checklist for upcoming sprints.

Legend:
- `[x]` done in current repo
- `[ ]` pending

---

## Sprint 1 - Web Admin MVP Stabilization

### Setup masters
- [x] Companies CRUD + active toggle
- [x] Sheds CRUD + active toggle
- [x] Processing Types CRUD + active toggle
- [x] Count Ranges CRUD + validation + active toggle
- [x] Batches CRUD + members + QR download + active toggle

### Rates
- [x] Worker rates effective-dated insert
- [x] Overlap-safe close logic in server action
- [ ] DB constraint coverage for rate timeline conflicts

### Ops/Reports/Exports
- [x] Stock inward read/filter/export
- [x] Processing entries read/filter/export
- [x] Daily summary view report
- [x] Payroll summary by batch
- [x] Export hub (4 CSVs)

### Access control
- [x] role guards in middleware/layouts
- [x] supervisor blocked on web
- [ ] migrate Next 16 `middleware` -> `proxy`

---

## Sprint 2 - Tablet MVP Workflow

### Auth + master data
- [x] Login screen with Supabase auth
- [x] Active master dropdown loading

### Stock + processing flow
- [x] Stock inward save
- [x] Processing entry save with rate lookup
- [x] Member-wise weight entry UI
- [x] Stock-first linear workflow (create/select/process/close)
- [x] Balance guard (cannot exceed selected stock)

### QR
- [x] QR scanner modal integrated
- [ ] harden web QR behavior + fallback UX text

### Data durability
- [ ] persist stock lot open/close state in DB table (not session-only)
- [ ] enforce close/open rules in DB

---

## Sprint 3 - Data Integrity Hardening

### Schema additions
- [ ] add `processing_lots` (or equivalent)
- [ ] add `processing_entry_members` table and constraints
- [ ] add indexes for reporting and lot balance queries

### Integrity rules
- [ ] transactional insert that validates stock balance atomically
- [ ] validate sum(member weights) == processing entry weight
- [ ] disallow processing on closed lot

### Audit
- [ ] add edit/void audit trail table
- [ ] admin correction UI with reason capture

---

## Sprint 4 - Offline & Sync (Tablet)

- [ ] local queue for stock + processing writes
- [ ] sync retry with status indicators
- [ ] conflict handling strategy documented and implemented
- [ ] recovery tests for intermittent network

---

## Sprint 5 - Finance Expansion

- [ ] payroll by member report
- [ ] company rates module (phase 2)
- [ ] invoice generation pipeline
- [ ] accountant export packs by date range templates

---

## Quality Gates (every sprint)

### Functional checks
- [ ] rate lookup correctness for effective dates
- [ ] snapshot persistence correctness
- [ ] daily summary totals reconcile with transactions

### Security checks
- [ ] supervisor denied `/admin/*`
- [ ] accountant write restrictions enforced
- [ ] admin/owner full access verified

### Regression checks
- [ ] web lint/build passes
- [ ] tablet web simulation flow passes
- [ ] key role routing smoke tests pass
