# System logic audit — 6 September 2026

## Outcome

Confirmed defects have been corrected locally. This is **not a blanket certification of zero defects or a live-AI go-ahead**. Authenticated customer and seeded-technician mobile screens have now been exercised in the browser preview. The automated workflow passes; physical-device behavior, some less-common account paths, and business/data confirmations remain open.

Baseline: `af69762b` on `main-martyn`. This audit batch has not been committed, pushed, or deployed.

## What the supplied screenshots actually show

Read-only inspection at 01:15 AM Philippine time on 6 September found:

- The displayed unit has a recorded installation date of 5 September 2026, 2 HP, and a 12 m² room.
- Its June 2, 2027 date is installation plus the existing **270-day system fallback**. There are zero usable comparable intervals. This is not an AI prediction or an established manufacturer interval.
- The only cleaning history says “AMP recommended regular cleaning for this AC unit.” and “Service completed.” It does not contain actual inspection findings or work performed.
- Recalculation with the corrected code, without saving anything, returns `lastServiceDate: null`, `lastCleaningDate: null`, and one excluded incomplete record. The provisional date remains June 2 because the recorded installation is still the fallback anchor.
- The capacity message is derived from the existing **14 m² per HP approximation**, not a measured cooling-load assessment. The output now discloses that basis.

## Confirmed fixes

| Area | Correction |
| --- | --- |
| Service evidence | Recommendation text and generic completion phrases no longer qualify as cleaning evidence. New service completion requires actual findings and actions. Historical incomplete entries stay visible with warnings. |
| Service types | Installation, repair, inspection, regular cleaning, and deep cleaning retain their correct labels. Repairs and installations no longer reset the last-cleaning date. |
| Historical cohorts | Same-model/brand intervals use eligible dated records, including the unit's own history. Duplicate cleaning days, future records, and pre-installation records cannot create misleading intervals. Equal-HP units of different categories are not described as the same type. |
| Dates and status | Philippine installation time is converted explicitly, and the customer-visible installation day is preserved. Missing dates remain missing. Recalculation does not reactivate held/retired units. Due-today is not overdue. |
| Report honesty | Missing dates/service methods are no longer filled with invented defaults. Provisional scheduling, room-size approximation, and incomplete evidence are disclosed. A suggestion is not described as a booked appointment. |
| Report display/export | Price-less service history no longer crashes or invents a zero fee. Web/PDF content includes findings and actions. Changing the selected unit clears the old report/export. Customers are no longer printed as branch representatives. |
| Completion synchronization | Installation synchronization uses one implementation. Service completion links history to its work order and is idempotent on retries. Warranty repair closes its claim without resetting cleaning dates or inventing parts used. |
| Technician history | Assigned warranty/maintenance units can be opened through the work-order unit ID, while unrelated unit histories remain forbidden. Actual findings, actions, and replacement parts reach the technician history. |
| Request permissions | Customer booking cannot supply completion status, technician assignment, another owner, GPS proof, or history links. Customer cancellation cannot alter operational fields. Starting a request requires a technician; completion requires its completed work order. |
| Assignment | Direct work assignments validate active technician/branch, use the stored technician name, and notify the technician/admins. Reassignment clears the previous technician's check-in/report proof. Order assignment rejects a technician from the wrong fulfillment branch. |
| Notifications | Service-request and technician routes remain role-appropriate. Service/repair completion reaches the branch admin and customer. Held/retired units do not receive new maintenance reminders. |
| AMP dashboards | Current recommendations are refreshed for pipeline/forecast views. Orphan/incomplete service records are excluded from aggregate evidence. Missing methods are not counted as regular-cleaning demand. Forecast revenue remains an explicitly labeled scenario, not booked revenue. |
| Mobile security navigation | An unfinished authenticator setup now has a working “I have a different account” action and Back behavior that signs out. It does not bypass authenticator verification. |
| Customer setup persistence | The mobile walkthrough reproduced a return to setup after reload. Customer completion is now stored server-side only after authenticator verification, uses a narrow update that does not rewrite addresses, and surfaces save failures instead of navigating as though they succeeded. Reloading the actual customer screen now stays on Home. |
| Current versus historical arrival | A newly assigned request previously displayed an older completed visit's check-in as the current arrival. Current requests now use only their own active work-order proof; earlier arrivals are explicitly historical. The new request now correctly shows that its technician has not checked in. |
| Technician loading crash | Opening maintenance work crashed while the task was still null (`requestId`). Shared task helpers now handle loading/missing tasks and null serial items. The same work order was reopened successfully in the mobile UI. |
| Unit history versus work-order notes | The notes screen previously fetched only the current task's notes while promising earlier AC visits. It now separates editable current notes from read-only unit installation, maintenance, and repair history, using the authorized task-scoped history endpoint. Loading failures are not displayed as empty history. |
| Service address | Mobile requests sent the street separately from their locality, and assigned tasks lost the locality. The backend now retains the request's full address snapshot, including ZIP when supplied, without repeating already-present address components or substituting a newer customer address. |
| Mobile wording | Removed the duplicate maintenance recommendation panel. Non-claim cleaning records are no longer labelled warranty service. The preview no longer implies that a displayed filename is a generated mobile PDF; it provides the website export instructions. Technician cost entries are labelled as entries, not a customer invoice. |

## Verification performed

### Automated checks

- Backend: **78 passing tests**.
- Website: **43 passing tests**.
- Mobile: **36 passing tests**, including actual component tests for account switching, persisted setup/error handling, separate technician history, recommendation wording, and keyboard dismissal when selecting an address. Total across backend/web/mobile: **157 passing tests**.
- Website production build: passed. Existing password-strength bundle size warning remains; it is not a build failure.
- Website import validation: passed.
- Expo web production export: passed after the mobile changes. No APK was built.

Some existing tests inspect source-level safeguards; the new evidence/date/report tests exercise behavior. Counts must not be interpreted as proof that every possible runtime condition has been tested.

### Isolated end-to-end operations

The final acceptance run passed **34 checkpoints** against `coldair_logic_20260905_e2e`, using a localhost API. The script refuses production or a mismatched database. OpenAI and outbound email were disabled. Payment checkout used a checked test-mode key. A prior rerun was interrupted by a connection failure while the QA server's file watcher was restarting it; the final run completed against a stable non-watching process. A prior mobile test run also exceeded its 5-second startup timeout; the complete suite passed with a 20-second allowance while the previews were running.

Coverage included registration, password and ZIP validation, actual authenticator enrollment/two-step login endpoints, role restrictions, direct task assignment/reassignment, inventory/horsepower/serial data, COD stock preservation and dispatch deduction, duplicate-checkout prevention, technician GPS check-in visibility, installation/QR registration, receipt address/horsepower, automatic warranty activation, duplicate-completion protection, room-size recommendations, service booking/cancellation, forged payload rejection, required GPS/findings, cleaning history, approved warranty repair, parts/history synchronization, admin notifications, test checkout cancellation and stock rollback, customer support/reply, AMP report data, branch pipeline, and owner-forecast access restrictions.

The acceptance script creates test records; it does not remove them. Test-mode payment checkout creation/cancellation is **not** proof of a live paid transaction or real bank settlement.

### Browser walkthrough

Verified through the actual website UI:

- Branch-admin login and dashboard.
- Order, warranty, service completion, and check-in notifications.
- Clicking a check-in notification opens the technician workspace; recorded time, coordinates, accuracy, and map link are visible.
- AMP pipeline, component-use counts, and report generation.
- Generated report correctly separates installation, deep cleaning, and repair with actual findings/actions and provisional scheduling text.

Verified through the Expo web preview:

- Customer login reaches required authenticator setup.
- The original Back/account-switch loop was reproduced and corrected.
- The new switch-account action returns to sign-in.
- An enrolled QA customer's login requires an authenticator code.

Following explicit user approval, only the isolated QA customer `acceptance.26815964`'s authenticator secret was used to generate its sign-in code. No live account secret was retrieved. Customer password and authenticator verification passed both through the normal API and the mobile UI after the local preview connection recovered.

Additional authenticated mobile browser operations completed:

- Customer security onboarding, Home, and a full reload confirming setup remains completed.
- AC Overview, Warranty, Service Visits, and both AMP report buttons; actual findings and the provisional basis were visible.
- Existing check-in time, coordinates, and accuracy were visible to the customer.
- A maintenance request was submitted from the mobile form; past dates were disabled and a duplicate open request was blocked. The unit's request page showed the branch-admin assignment.
- The newly assigned request exposed the historical-arrival defect. After the correction, the page correctly said the current technician had not checked in.
- Seeded QA `tech.main` sign-in, its dashboard, the assigned maintenance work order, AC horsepower/room size/active warranty, and earlier unit service/repair history. The null-task crash was reproduced and verified fixed.
- The work order correctly asks for service check-in rather than installation QR verification. No GPS arrival, camera image, or completed field work was fabricated through the UI. The isolated mobile-submitted task `6a9c6ae7d48cda1c1fb6b7fa` remains assigned for follow-up testing.

This is a browser preview, not an iPhone/Android device run. New-technician first-time onboarding and account-recovery paths still require their own targeted walkthrough; the technician UI checks above used the already-onboarded seeded account. Native GPS/camera and field completion were not exercised; the acceptance journey used explicit synthetic QA coordinates/proof. The website print/export button was exercised, but no inspectable print window appeared in the controlled browser. Generated PDF content is regression-tested; native Save as PDF output is not visually certified in this run.

## Live data preserved / decisions still required

The latest read-only maintenance audit found 20 units (including retired), 3 service histories, and 38 tasks:

- One service record contains only boilerplate. Actual findings cannot be recovered or invented from that text. It remains visible but excluded from prediction evidence.
- Two service-history records reference units that no longer exist. They were not deleted and cannot affect the corrected unit-based aggregates.
- No missing installation dates, active warranties lacking dates, already-expired active warranties, future service records, or linked history IDs pointing to missing histories were found by this audit.
- Historical installation/warranty timestamps written before the timezone correction were not automatically shifted. Corrections to historical times require the original verified installation record.
- Intentional test accounts, products, and live records were preserved. This run did not perform a live database cleanup.

Before an AI presentation go-ahead:

1. Complete the remaining new-technician onboarding/recovery walkthroughs and verify iPhone/Android keyboard positioning, real GPS/camera behavior, and device push delivery. The authenticated customer/seeded-technician preview above and synthetic QA coordinates cannot prove those device behaviors.
2. Confirm the company's maintenance fallback and sizing policy. The existing 270-day interval and 14 m²/HP approximation are now disclosed, not silently replaced with guessed policies.
3. Confirm warranty coverage defaults against the client's intended policy. The existing default remains 60 months with compressor/parts/labor coverage; this audit did not establish manufacturer-specific terms.
4. Review the incomplete legacy service entry; do not present it as real historical cleaning evidence. Test data is not evidence of real-world prediction accuracy.
5. Review/commit/deploy this batch, then smoke-test the deployed version. Live OpenAI model access, cost, output quality, and API calls remain unverified and disabled in the QA run.

## Reproduction

Read-only live audit: `node scripts/audit-maintenance-records.js` from `backend`. It disables automatic model/index creation and does not persist the recommendation.

Isolated workflow: start `node scripts/start-logic-qa.js`, then run `scripts/acceptance-e2e.js` with `ACCEPTANCE_EXPECTED_DATABASE=coldair_logic_20260905_e2e`. Do not point acceptance operations at the production backend.
