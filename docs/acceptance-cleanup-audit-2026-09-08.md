# Acceptance-stock cleanup and bug audit — 8 September 2026

## Scope and limits

Inspected current source, ran automated backend/web/mobile tests, and performed read-only consistency queries against the configured MongoDB database (`test`). This was not a physical-phone rehearsal or a complete live end-to-end workflow. No OpenAI calls, account changes, payment actions, Git push, or deployment were performed.

## Applied database cleanup

These four acceptance products were already inactive, with zero stock and empty branch stock. Their low-stock thresholds were still 1. Changed only `threshold` from 1 to 0 on the exact four IDs, conditional on their verified archived state. All four updates were verified. To reverse this alert-only cleanup, restore threshold 1 on these same four records.

| Product | ID |
| --- | --- |
| Acceptance AC 96149688 | 6a95b538e98eab8b8dbfcfbd |
| Acceptance AC 01577116 | 6a95ca6aa3f302ed93e039e7 |
| Acceptance AC 01655497 | 6a95cab8a3f302ed93e04883 |
| Acceptance AC 01741659 | 6a95cb0f7b23385ae0bc4cfa |

These archived products remain as historical references: seven orders (four complete, three cancelled), four active installed units, four sold serials and four retired serials. No linked reorder, restock, or inventory-change requests were found. No products, orders, units, serials, service histories, or users were deleted. Other intentionally created test inventory and accounts were untouched.

## Code correction, not yet deployed

`listLowStockProducts` previously included inactive products and non-retail test products, unlike the main catalog and inventory endpoint. It now excludes both and returns a no-store response. Regression tests cover exclusion of archived/QA products, retention of genuine retail shortages, and branch-specific quantities.

## Remaining findings

1. **Unsafe product hard deletion:** `deleteProduct` calls `deleteOne()` without checking linked orders or installed units. Do not use it to purge these historical acceptance products. A separate archive/deletion-safety revision is needed; this audit did not change that endpoint.
2. **Two orphan service histories:** `6a22a1c81dc8e2f7251e19fb` and `6a22a341df137bb01a33b88e` reference missing unit `6a229fe1100611849d420de4`. They also lack a recorded service type. Preserved pending an explicit history-cleanup decision.
3. **Incomplete cleaning evidence:** `6a9bd22fa167610027f976b5` contains an AMP recommendation and generic completion text instead of actual technician findings/actions. The existing evidence validator correctly rejects it for maintenance timing. Do not invent replacement findings.
4. **Insufficient prediction evidence:** Of five stored service histories, three fail the evidence validator and the two eligible entries are installations. There is currently no eligible cleaning history to supply historical cleaning intervals. An API key alone will not turn the provisional maintenance interval into an evidence-backed AI prediction.

The scoped integrity audit reported no issues in its order/dispatch/reservation, task linkage/timestamps, request linkage, active-unit owner/product/capacity, negative-stock, or duplicate-identity checks. All protected seeded aliases were present. Maintenance audit found no missing installation dates, active warranties without dates, stale active warranties, future service dates, pre-installation service records, or broken task-to-history references. These checks do not certify every possible workflow.

## Verification

- Backend: 133 tests passed, including two new low-stock regression tests.
- Web: 84 tests passed.
- Mobile: 78 tests passed.
- Total: 295 automated tests passed.
- `git diff --check` passed.
- Live database cleanup verified: four matching archived products, zero stock, threshold zero.

Before claiming AI predictive readiness, collect genuine technician-completed cleaning records with usable intervals, or use clearly labelled synthetic examples in a separate test database. Review the orphan records and product-deletion safeguard separately. Live provider behavior remains untested.

## Authorized follow-up on 8 September

The findings above describe the initial audit. The following changes supersede their unresolved status where noted:

- Product removal now checks all orders, installed units, serials, reorder/restock records, and inventory-change references. Referenced products return 409; products with stock cannot be removed. Empty unused products are archived, never hard-deleted, to preserve even concurrently created references. Added role, ID validation, reference, stock, and no-hard-delete tests.
- Verified the two orphan histories contain `Smoke test completion` notes, refer to a missing unit, and have no matching work orders. After user approval, moved them atomically into `servicehistoryarchives`, retaining each full original under `original`. Verified two recoverable archives and zero remaining source records. The exact-record script defaults to dry-run and requires an explicit database/confirmation for writes. No account, order, installed unit, warranty, or real service report was deleted.
- The incomplete September 5 report remains unchanged and excluded from prediction evidence. The user clarified that the reporting process needs better guidance; there are no verified findings available to reconstruct that report.
- Added optional mobile technician report quick choices for actual observations/work performed. Nothing is preselected or automatically submitted. Existing notes are preserved and editable; repeated taps cannot append duplicates. Actions are sent separately so longer multi-step quick-choice reports are not collapsed into one truncated action. Repair choices do not approve warranty coverage. Free-text reporting and optional parts-used entry remain available.
- Aligned completion and service-note validation with the backend's rejection of generic findings/actions. Unified completion service-type choices with the existing task classifier, so a maintenance description containing the word `check` no longer hides the cleaning choices.
- Updated the old acceptance script to exercise technician password-only setup and COD dispatch/GPS/cash confirmation instead of the removed technician authenticator/payment-approval steps.
- Executed the actual API journey against the isolated `coldair_logic_20260908_e2e` database with synthetic accounts and email/OpenAI disabled: **43 checkpoints passed**. Covered registration/authenticator, technician setup, COD inventory timing and collection, installation and warranty activation, maintenance check-in/report/history/retries, warranty approval/assignment/repair/cancellation, notification delivery, test PayMongo checkout cancellation, contact replies, AMP fallback/review, role restrictions, and product-deletion safety.
- This API journey uses synthetic GPS coordinates and a synthetic proof image. It is not a physical-phone GPS/camera rehearsal, live payment settlement test, or live OpenAI test. QA records were retained only in the separate QA database, not the presentation database.
- Follow-up backend tests: **137 passed**. Web tests: **84 passed**. Mobile tests: **82 passed** (28 suites), for **303 passing automated tests**. Web production build passed with the existing large password-strength chunk warning.
- Final presentation-database verification: zero orphan service histories, two recoverable smoke-history archives, all four acceptance products inactive with zero stock/alert threshold, and the incomplete real service history preserved.

Remaining before claiming evidence-backed prediction readiness: actual technician findings for the incomplete legacy report (if recoverable), sufficient genuine cleaning intervals, physical-phone verification of the quick-choice layout, and a controlled live-provider test after a key is configured. Do not fabricate service history to remove provisional wording.
