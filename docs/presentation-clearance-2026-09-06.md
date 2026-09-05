# Presentation clearance follow-up — 6 September 2026

## Decision

The confirmed defects below have been fixed and tested locally. This is **not a zero-defect certification or approval to enable OpenAI**. The preceding batch was deployed at commit `56193494`. The user has approved publishing this follow-up batch; deployment completion and live smoke-check results are recorded separately in the task after publishing.

The user confirmed that warranty coverage should follow the shop advertising: **1 year for parts and 5 years for the compressor**. That confirms warranty coverage, not the maintenance interval or room-sizing formula.

## Reproduced findings and fixes

### First-time technician setup

The actual Expo browser walkthrough showed that saving a new technician's profile marked setup complete before authenticator verification. Reload returned to the profile form, and a direct dashboard link bypassed the unfinished setup.

- Saving the password/profile now keeps onboarding unfinished until authenticator verification.
- Reload resumes the authenticator step.
- Both the navigation guard and API block work-order access while setup is incomplete.
- Existing onboarded seeded technicians are not reset or forced through a new enrollment.

### Authenticator recovery

The release UI hid the setup key behind development-only output, and recovery did not revoke the previous signed-in session. Code consumption was also a non-atomic read/write.

- Customer and technician recovery share a release-visible QR/manual-key screen with retry, validation, and account-switch actions.
- Recovery codes are consumed atomically; simultaneous reuse allows one success only.
- Recovery and authenticator replacement increment the account session version. Old sessions are rejected, including when another server instance has cached the profile.
- Password login during recovery remains restricted until the replacement authenticator is verified.
- Login challenge tokens cannot act as signed-in access tokens.
- Successful recovery navigation no longer depends on an alert-dialog callback.

### Warranty coverage and approval

- New installation activations store separate 12-month parts and 60-month compressor end dates, with calendar-month handling for leap days.
- Customer web/mobile and technician details explain component-specific coverage. Five years is not presented as coverage for all parts or labor.
- Admins must choose an actively covered component before approving claims under this policy. The API independently rejects expired parts coverage even when compressor coverage remains active.
- Pending, invalid, or void component records do not imply active coverage.
- Cancelling the admin decision-note prompt cancels the action instead of submitting it.
- Already-activated warranty contracts and their dates are not silently rewritten. Legacy records without separate component terms explicitly require branch confirmation.
- Warranty repair completion remains separate from cleaning and does not reset the last-cleaning date.

## Verification evidence

| Verification | Result |
| --- | --- |
| Backend automated tests | 84 passed |
| Website automated tests | 44 passed |
| Mobile automated tests | 40 passed |
| Isolated account-security acceptance | 12 checkpoints passed |
| Isolated commerce/service/AMP acceptance | 35 checkpoints passed |
| Website production build and import validation | Passed |
| Expo web production export | Passed; no APK built |

The 168 automated tests include behavior tests and existing source-level safeguards. Counts are not evidence that every possible condition has been exercised.

The final 35-checkpoint journey covers order placement, COD stock/dispatch, technician assignment and arrival visibility, installation and receipts, new component-specific warranty activation, maintenance evidence/history, warranty approval and repair, notifications, customer support, test payment cancellation, and AMP reports/pipeline/forecast with AI disabled.

The actual Expo browser UI was exercised at a 414 × 896 viewport:

1. Fresh technician signs in, changes the initial password, and reaches authenticator setup.
2. Before verification, server onboarding remains unfinished; reload resumes setup; direct dashboard navigation returns to setup.
3. Entering a real generated QA authenticator code completes setup and opens the dashboard.
4. Signing out, signing in, and using a recovery code opens the replacement QR/key screen.
5. The old session returns 401, the recovery session cannot access tasks (403), and a reused code returns 400.
6. Verifying the replacement authenticator opens the dashboard and survives reload.
7. A separate QA customer performs the actual recovery UI flow, verifies the replacement authenticator, and remains on Home after reload.
8. No browser page errors were recorded in the final walkthrough.

An earlier overlapping test run reached the existing authentication rate limit. The final browser run was performed separately after restarting only the isolated QA service. Production protections were not weakened. The mobile export encountered an old local Metro cache serialization warning, rebuilt its index automatically, and completed successfully. The existing large password-strength bundle warning remains on the website build.

## Isolation and data preservation

- All newly created accounts, orders, units, claims, and service records belong to the explicitly guarded `coldair_logic_20260905_e2e` database through localhost port 5002.
- No live database cleanup or account removal occurred. Intentional live test records and seeded accounts remain intact.
- OpenAI and outgoing email are disabled in the QA service. Registration verification for these synthetic QA accounts is supplied by the test harness; this does not prove actual OTP email delivery.
- PayMongo checks use test checkout/cancellation, not real settlement.
- GPS/photo proof in the automated API journey is explicitly synthetic QA evidence, not a real technician visit.

## Still required before final presentation clearance

1. **Physical-device rehearsal:** iPhone/Android keyboard and address selector positioning, real GPS permissions/check-in, camera/QR installation proof, and notification delivery. Browser preview and component tests do not establish native behavior.
2. **Presentation account rehearsal:** real OTP delivery and password-reset email using the intended presentation accounts and configured email service. No outbound email was sent in this isolated run.
3. **Business inputs:** the existing 270-day maintenance fallback and 14 m²/HP sizing approximation remain disclosed as provisional/approximate. Shop warranty advertising does not confirm these values.
4. **Legacy evidence:** do not describe boilerplate historical service notes as completed cleaning evidence; existing component-specific warranty terms need branch confirmation where absent. No historical findings or coverage dates have been invented.
5. **Deployment verification:** review, commit, push, deploy this follow-up batch, then smoke-test the deployed version before the presentation. The prior deployed batch does not contain these newer fixes.
6. **Export/device limits:** native Save as PDF output has not been visually certified. No APK was built at the user's request.

Live OpenAI access, cost, output quality, and real-world prediction accuracy remain outside this completed check. Keep AI disabled until the user approves that separate phase.

## Repeatable local checks

Start the QA backend with `node scripts/start-logic-qa.js` from `backend`. Set `ACCEPTANCE_EXPECTED_DATABASE=coldair_logic_20260905_e2e`, then run `node scripts/acceptance-security.js` and `node scripts/acceptance-e2e.js`. Use a separate rate-limit window for bulk acceptance and browser rehearsals; do not aim these scripts at production.

The local browser replay is `.runtime/presentation-security-walkthrough.cjs` (ignored QA helper). It uses the Expo preview on port 8092, creates fresh QA accounts, keeps their secrets in memory, and closes its own browser when finished.
