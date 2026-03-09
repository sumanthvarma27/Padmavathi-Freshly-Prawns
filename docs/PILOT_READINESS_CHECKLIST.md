# Pilot Readiness Checklist (Go / No-Go)

Use this before starting live shed test runs.

## 1. Scope Lock
- [ ] Pilot sheds selected (recommended: 1-2 sheds only)
- [ ] Pilot duration defined
- [ ] Pilot users confirmed (supervisors, admin, accountant)
- [ ] Manual fallback process documented

## 2. Data & Rules Lock
- [ ] Master data finalized for pilot period (companies, sheds, batches, members, rates)
- [ ] Rate effective dates verified for pilot start date
- [ ] Processing snapshot fields validated in DB (`rate_per_kg_snapshot`, `amount_snapshot`)
- [ ] Rule agreed: no hard delete; only deactivate/void

## 3. Access & Security
- [ ] Admin/Owner web access verified
- [ ] Accountant read/export access verified
- [ ] Supervisor blocked from admin web and using tablet app only
- [ ] Active users only (`profiles.is_active = true`)

## 4. Workflow Validation
- [ ] Stock inward save works
- [ ] Stock selection for processing works
- [ ] Batch + member-wise weight entry works
- [ ] Processing save blocks when stock balance exceeded
- [ ] Close stock inward action tested

## 5. Reporting & Finance Validation
- [ ] Daily summary reconciles with sample transactions
- [ ] Payroll totals reconcile with processing snapshots
- [ ] CSV exports open correctly in accountant workflow

## 6. Reliability Baseline
- [ ] Internet quality checked at pilot sheds
- [ ] Known no-network fallback process documented
- [ ] At least one spare tablet available
- [ ] Day-end data backup/export routine defined

## 7. Support Model
- [ ] One technical owner assigned
- [ ] One operations owner assigned
- [ ] Issue reporting channel created (WhatsApp group or ticket board)
- [ ] Bug triage window fixed (e.g., same-day for blockers)

## Go / No-Go Decision
- **Go** only when all items in sections 1-5 are completed.
- Reliability/support gaps from sections 6-7 must have explicit mitigation owner.

## Pilot Success Metrics (Broad)
- [ ] Digital adoption >= target agreed by operations owner
- [ ] Data reconciliation gap within agreed tolerance
- [ ] Critical workflow failure count within target
- [ ] Accountant export acceptance confirmed

## Sign-Off
| Role | Name | Date | Status |
|---|---|---|---|
| Admin/Owner |  |  | Pending |
| Operations Owner |  |  | Pending |
| Accounting Owner |  |  | Pending |
| Technical Owner |  |  | Pending |

## Incident Capture Template (Use During Pilot)
- `Date/Time`:
- `Shed`:
- `User`:
- `Flow` (login/stock/process/export/report):
- `Issue Summary`:
- `Impact` (blocked/degraded/minor):
- `Workaround Used`:
- `Data Risk` (yes/no):
- `Owner`:
- `Resolution`:
