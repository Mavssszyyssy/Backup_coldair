# Technician account setup audit — September 8, 2026

## Scope and evidence

Inspected Superadmin technician creation, mobile first-time setup and profile editing, API account validation, sign-in, and downstream work access. The user's exact entered phone format was not supplied. These are reproduced code/test defects, not a claim to have reproduced their physical iPhone session.

## Confirmed and corrected

- Technician setup/profile imposed a native 12-character input cap. International `+639XXXXXXXXX` requires 13 characters before formatting. Removed that cap; added accepted-format guidance and a keyboard Done action. Component tests assert the cap is absent; actual iOS keyboard behavior still needs device verification.
- The shared mobile input sanitizer truncated digits, including turning overlong invalid numbers into a different valid-looking number. It now preserves input and rejects invalid lengths instead of silently changing the number. Customer profile/address inputs using the same helper also no longer truncate pasted formatting.
- Mobile accepted the 10-digit `9XXXXXXXXX` format while account-update validation on the server rejected it. Setup, profile, and sign-in now normalize supported local/international formats consistently to `09XXXXXXXXX`. Letters and unsupported country codes are not silently converted into valid identities. Customer signup keeps its phone field optional but rejects an invalid supplied value.
- A direct setup request could omit the phone and still complete technician onboarding. First-time completion now requires a valid submitted or previously saved contact number. Existing completed technician accounts do not acquire a new onboarding requirement.
- Duplicate account/phone writes could return a generic server error when a unique-index race occurred after the pre-check. User-account write handlers now return a safe conflict message. Unexpected errors still propagate normally. Tests cover race error handling; the database journey also verifies that an ordinary duplicate-phone rejection leaves the initial password and pending setup intact.
- The technician profile did not catch a thrown connection error during contact saving. It now reports the failure, retains the input, and permits retry.
- The web creation form stripped a trailing period during typing, preventing normal entry of an example such as `j.delacruz`. It now preserves typing and previews the normalized credentials. Added matching minimum login-name validation and a synchronous duplicate-submit guard. Closing the form is disabled during creation.

## Verification

Before fixes: backend regression tests reproduced the missing-contact bypass and rejection of the mobile-supported 10-digit format. Mobile regression tests reproduced silent digit truncation and found the native input cap on the rendered setup component.

After fixes:

- Backend suite: **143 passed**.
- Mobile suite: **98 passed**, including first-login routing, formatted phone submission, password validation, account/cart state, interrupted setup recovery, and contact-edit retries.
- Web suite: **85 passed**, including the rendered staff creation form. A new test initially used an exact label query that also contained helper text; its selector was corrected, and the complete suite passed.
- Web production build: passed. Existing large password-strength chunk warning remains.
- Focused local API journey: **9 checkpoints passed** for owner-created technicians, duplicate creation, first-login restrictions, contact validation, international-format setup, supported phone sign-in forms, staff roster/work access, duplicate phone rejection, and subsequent password change.
- Broader local API acceptance journey: **43 checkpoints passed**, including assignments, COD dispatch, GPS arrival, receipt/installed-unit synchronization, maintenance, warranty, alerts, and AMP fallback/report access.

Both API journeys used `http://127.0.0.1:5002/api` and verified the separate `coldair_logic_20260908_e2e` database before writing. Synthetic fixtures remain in that QA database only. No presentation accounts were reset or removed. OpenAI and email delivery were disabled in the QA server; the payment checkpoint used PayMongo test mode. The final optional-signup-phone guard was covered by backend regression tests after those API journeys.

## Limits and handoff

- Mobile tests use the React Native test renderer, not an actual phone. The specific reported phone input and device session remain unconfirmed.
- This is evidence for the tested technician flow and listed integration checkpoints, not a guarantee that every production scenario is bug-free.
- No push, deployment, APK build, or live OpenAI activation was performed in this batch. Device retesting requires the updated mobile bundle and corresponding backend changes.

## Follow-up: retired technician website

At the user's explicit request, removed the 20 tracked files for the old technician web dashboard, tasks/status controls, QR registration, profile, auth stubs, layout, and styles. These files remain recoverable from Git history. Admin/Superadmin technician creation, roster management, and assignment tools are separate and were retained, as were all mobile technician screens and backend operational endpoints.

Old `/tech/*` bookmarks now lead only to a non-operational mobile-app notice. Both website login and role-based redirects use the same mobile-notice destination, and a sign-out action returns to website login without a redirect loop. No app-store/download URL was invented.

Admin order QR codes now carry the existing inventory payload directly instead of generating a technician website URL. The mobile scanner's compatibility tests cover both the current tag payload and previously printed website-link payloads. Existing notification compatibility redirects remain intact.

The production web build passed, and its assets no longer contain the retired technician screen chunks. The existing large password-strength chunk warning remains. No deployment or account/data deletion was performed for this removal.
