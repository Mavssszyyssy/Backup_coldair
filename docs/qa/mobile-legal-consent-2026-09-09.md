# Mobile registration Terms & Privacy

## Scope

- Added App, Service and Warranty Terms plus separate Privacy Notice acknowledgment to mobile signup step 3 before email verification.
- Reader opens as an in-app modal with logo, revision date, numbered headings, paragraphs and bullets. Close, Return to signup and Android modal back return to the same form. Opening/closing a document never checks consent automatically.
- Existing web policy text (September 4, 2026) bundled verbatim as an offline mobile JSON snapshot. This is reuse of existing policies, not a new legal review or assertion of compliance. A backend parity test detects web/mobile content drift.
- Four checkboxes default unchecked. Sending signup OTP and completing registration both require all acknowledgments. Unchecking after OTP entry blocks completion. OTP/form/checkbox state survives viewing the reader.
- Mobile API transmits legalConsent. Public registration validates strict true values for all four policies plus the current version. Accepted version and server timestamp are stored with the new customer. No IP, password or verification code is stored in the consent record.
- Existing web checkboxes now transmit their actual values to the same server validation. Existing accounts/staff provisioning/login are not changed; no retroactive acceptance records are invented.

## Verification

- Mobile: 45 suites / 172 tests passed, including missing acceptance, revocation, all-document viewing and no automatic acceptance.
- Backend: 171 tests passed, including OTP bypass rejection, stale version/string truthiness rejection, successful persistence with server timestamp, and policy text parity.
- Web: 6 legal tests passed (policy content and existing checkbox validation).
- Web production build and mobile Expo web export succeeded. Final mobile legal/signup tests rerun after reader-width styling and OTP preservation assertions.
- Local browser fixture uses actual mobile components at 390px width; observed all documents and Close navigation. No production registration or email was sent. Physical-device confirmation remains a user rehearsal.

## Release note

Ship backend enforcement together with the updated web and mobile clients. Older mobile signup bundles do not send acceptance and will be refused; users must reload the updated Expo bundle before new registration. Existing sign-ins are unaffected. No deploy or live database mutation performed for this change.

## Updating policies

Update the web source and bundled mobile snapshot together, increment legalConsent version in backend/mobile/web, and run the parity and signup tests. Renewed acceptance for existing users is a separate workflow, not silently implied by this registration record.
