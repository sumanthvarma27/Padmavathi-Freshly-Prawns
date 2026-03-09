# Maintenance Strategy (Low-Ops Model)

Goal: keep shed operations stable with minimal ongoing engineering effort.

## Operating Principles
1. Keep business rules in DB/API layer, not only UI.
2. Keep tablet workflow simple and repetitive.
3. Prefer controlled releases over emergency hotfixes.
4. Treat data reconciliation as a first-class process.

## Recommended Ownership Model
- **Technical Owner**: release control, bug triage, DB migration approvals.
- **Operations Owner**: shed onboarding, SOP compliance, pilot feedback consolidation.
- **Accounting Owner**: export/report validation and reconciliation sign-off.

## Change Management
- Use monthly release windows for non-critical updates.
- Use hotfix process only for production blockers.
- Freeze master-data schema changes during active pilot windows.

## Environment Strategy
- Separate **staging** and **production** Supabase projects.
- Validate all rate/reporting changes in staging first.
- Promote only tested migrations to production.

## Observability Baseline
- Enable Supabase logs monitoring.
- Track key metrics weekly:
  - failed login count
  - failed insert count
  - sync failures (once offline queue is added)
  - report reconciliation mismatch count

## Backup & Recovery
- Daily automated DB backups.
- Monthly restore drill to non-production environment.
- Written restore runbook with owner names.

## Support SLA Suggestion
- P0 (operations blocked): response < 1 hour
- P1 (major workflow impaired): same day
- P2 (report/export mismatch): next business day

## Escalation Matrix
| Severity | Trigger | First Owner | Escalate To | Target Response |
|---|---|---|---|---|
| P0 | Shed cannot continue operations | Operations Owner | Technical Owner + Admin/Owner | < 1 hour |
| P1 | Partial workflow break or repeated failures | Technical Owner | Admin/Owner | Same day |
| P2 | Report/export mismatch without blocking operations | Accounting Owner | Technical Owner | Next business day |

## Release Gate (Staging -> Production)
1. Functional smoke tests passed for role routing + core inserts.
2. Reconciliation check passed on sample day data.
3. One pilot shed dry-run passed without blocker.
4. Rollback path identified before production rollout.

## Risk Register (Current)
- Offline support not yet complete -> high operational risk during poor network.
- Stock lot lifecycle currently UI-session driven -> medium data-control risk.
- Member-weight persistence depends on schema state -> medium reporting risk.

## Recommended Next Product Hardening
1. Persist stock lot lifecycle in DB (`open/close` + balance).
2. Make member-weight split table mandatory and validated.
3. Add correction + audit trail workflow.
4. Add offline queue + retry sync with visible status.
