# Login, tracking, alerts, address loading and signup GPS — 7 September 2026

## Confirmed findings and changes

- Dispatch activates a technician task as `in-progress`. Tracking incorrectly inferred travel, arrival and installation from this activation alone. Arrival now requires a valid, dated GPS check-in; activation does not generate an installation timestamp. Both task update endpoints reject arrival/installation without existing check-in evidence. Legacy inferred arrival/installation events are hidden when the linked task lacks that evidence. No historical database milestones were deleted.
- All six seeded live branch admins had `inApp`, `orderUpdates` and `serviceUpdates` set to false. The explicitly invoked `backend/scripts/restore-branch-admin-alerts.js --apply` restored exactly these three preferences for `admin.bulacan`, `admin.cavite`, `admin.laguna`, `admin.bataan`, `admin.pangasinan` and `admin.ilocos`. Read-back verified the changes. Email, SMS, push, system/promotional preferences and other accounts were not changed. Previous values for these three fields were false. This restores future alerts; suppressed historical events were not fabricated or backfilled.
- Checkout's stock callback depended on the state it wrote, repeatedly retriggering its fetch effect. Removed the feedback dependency. Address selection no longer causes its address-loading callback to be recreated. Background shop polling no longer activates the global loading banner.
- Signup GPS previously silently swallowed lookup errors and could discard successful coordinates for non-OK HTTP responses. Coordinate capture now survives unavailable lookup configuration/provider failures, communicates permission/timeout errors, and maps provider labels only to unambiguous supported dropdown values. Automatic address lookup still requires the configured LocationIQ key; without it, GPS coordinates are captured and customers are explicitly directed to confirm their address manually. No new location provider or key was configured.
- Removed the visible “Each opens in a new tab” sentence. Legal document links and consent validation are unchanged.

## Technician login: evidence and limits

Read-only inspection confirmed `tech.cavite.lebron` is a technician with first login still required and onboarding incomplete. No password, authenticator or onboarding flags were changed.

Native-router/component tests exercise the actual login, user/cart providers, role guard and technician setup form with mocked authentication. They pass. The exact physical-iPhone maximum-update-depth crash was not reproduced, so it is not certified resolved. Removed the second login redirect competing with the authenticated layout, normalized index-route aliases, and stabilized cart actions. Technician sessions no longer load/persist customer carts; customer switches cannot write the previous customer's cart under the incoming account's storage key.

## Verification

- Backend automated suite: 94 passed; targeted tracking/task checks rerun after the final API guards.
- Website suite: 58 passed, plus 2 additional GPS component checks passed (60 total across these runs).
- Mobile suite: 49 passed, plus 3 additional cart regression checks passed (52 total across these runs).
- Website production build passed (existing password-strength chunk-size warning).
- Expo web production export passed; no APK built.
- Extended isolated API acceptance journey: 36 checkpoints passed, including a new branch-admin order alert, dispatch staying Dispatched, check-in advancing customer tracking to Arrived, installation, receipts, maintenance, warranty, notifications, test-payment cancellation, support and AMP with AI disabled.
- The first extended journey stopped because the newly added assertion called a staff-only endpoint with a customer token. The test was corrected to `/orders/me/:id`; application permissions were not weakened. The full rerun passed.

Acceptance fixtures were created only in `coldair_logic_20260905_e2e` through localhost port 5002. Email and OpenAI were disabled there. GPS/photo evidence is synthetic QA data, not evidence of a physical visit. No production customer/order/unit cleanup occurred.

## Handoff

Code remains local and uncommitted; this request did not include push/deployment. Only the targeted live admin preference repair is already applied. Physical-phone retesting of the reported login crash and real GPS permission/address capture remains required. AI remains untouched.
