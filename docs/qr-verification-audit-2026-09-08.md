# Installation QR verification audit — September 8, 2026

## Confirmed incident

Read-only database inspection matched the screenshot label's permanent QR identity
to work order `TSK-1788878175095` and order `ORD-1788878138448-TWCFL1`.
Both orders and the assigned inventory unit agree on the Cavite branch and serial.
There is no evidence that this incident reassigned stock to another branch.

The stored inventory label uses `QR_UNIT:<permanent ID>|PRODUCT:...|SKU:...|MODEL:...`
without a `SERIAL` tag. The installation screen previously compared the parsed
permanent QR ID directly to its list of assigned serial numbers. These are different
identifiers, so a correctly assigned label was incorrectly rejected. Earlier parser
tests included a SERIAL tag and did not exercise this producer format.

## Changes

- Resolve the existing label through the authenticated inventory lookup before
  comparing its current serial with the work-order assignment.
- Prefer permanent QR identity over an embedded serial tag, including old labels
  whose temporary serial may have been replaced.
- Refresh the assigned work order from the server for every scan; do not verify
  against an offline cached assignment.
- Preserve rejection of unassigned units and already-registered units.
- Distinguish lookup/network failure from a confirmed assignment mismatch and
  allow retry. Keep existing server registration, GPS, and room-size validation.
- Do not regenerate labels, reassign inventory, or change live order records.

## Verification

Automated tests cover the current QR producer format (without SERIAL), old serial
and website labels, JSON QR identity, conflicting QR/serial tag precedence,
authorization/lookup errors, offline assignment refresh, wrong-unit rejection,
changed assignments, repeat registration, and room-size submission using the
canonical assigned serial. Screen fixtures cover all six configured branches.
These are automated component/service tests, not a physical-phone camera rehearsal.

## Separate legacy data finding — reconciled with approval

A read-only audit found 13 non-terminal order-linked tasks / 13 assigned serials.
Eight matched their order/inventory assignments. Five are linked to orders already
marked cancelled with released stock, but the tasks themselves are non-terminal:

| Work order | Cancelled order |
| --- | --- |
| TSK-1779812233093 | ORD-1779812193914 |
| TSK-1779841224431 | ORD-1779841181995 |
| TSK-1780573136131 | ORD-1780573102294 |
| TSK-1780640683047 | ORD-1780640602291 |
| TSK-1785238128822 | ORD-1785236750214 |

Two referenced inventory units are now sold and assigned elsewhere; three were
not found by their old serial. After explicit user approval, the five tasks were
changed from `on-hold` to `cancelled`. Original task snapshots were retained in the
same database's `maintenance_reconciliations` collection under batch
`cancelled-order-tasks-2026-09-08`. Their task history/proof/details, parent orders,
and associated inventory were compared before/after and remained unchanged.
No accounts, orders, products, or history were deleted.

Post-reconciliation read-only audit: eight active order-linked tasks and eight
serials checked; no order/task/inventory assignment or permanent-QR mismatches.
The active records covered Bataan, Ilocos, and Cavite; this is not proof of physical
phone operation in every branch.

The source of the stale tasks was confirmed in the cancellation action: it set
linked work to `on-hold`. The action now sets non-terminal work to `cancelled`
without reopening completed/cancelled records. Recovery actions cannot revive
cancelled orders or reassign their released stock; completed orders cannot
recreate technician work. These code changes require deployment separately from
the approved live data reconciliation.

## Additional branch-flow defects found and fixed

- Repeated checkout without a client retry key collided with the compound unique
  customer/idempotency-key index on a null key. Keyless orders now receive distinct
  server-generated identities. Explicit client retry keys retain their existing
  replay behavior; no index or historical order migration was performed.
- When the delivery branch differs from the stock source, order notifications now
  reach admins of both involved branches, respecting preferences and notifying
  Superadmin once. Technician assignment remains tied to the fulfillment branch.

## Final isolated regression results

All test transactions used `coldair_logic_20260908_e2e`, not the live database.
Email and OpenAI calls were disabled; payment-provider checks used test mode.

- Backend: 150 tests passed.
- Web: 94 tests passed across 30 files.
- Mobile: 134 tests passed across 32 suites.
- Broader acceptance flow: 43 checkpoints passed, including keyed checkout retries,
  maintenance, warranty, AMP's non-AI fallback, test payments, and contact support.
- Branch-order flow: 14 checkpoints passed. The same customer ordered through
  Bulacan, Cavite, Laguna, Bataan, Pangasinan, and Ilocos. Each branch exercised
  checkout, admin alert, dispatch, inventory QR lookup, assigned technician,
  simulated GPS check-in, COD collection, installation, My Units/warranty, and a
  separate cancellation/recovery-lock scenario.
- Additional nearby-stock case: a Bulacan delivery used Cavite stock. Both admins
  received alerts, a Bulacan technician was rejected, a Cavite technician was
  assigned, and the stored QR resolved correctly. This special case was tested
  through dispatch/QR verification, not through final installation.

These results total 378 automated tests, plus the two API acceptance runs. They
do not replace a physical-phone camera/GPS rehearsal and do not establish that
every unrelated system function is defect-free. Code changes remain local and
have not been pushed or deployed in this batch; only the explicitly approved
five-task reconciliation has been applied to live data.
