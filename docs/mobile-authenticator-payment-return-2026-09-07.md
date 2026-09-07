# Mobile authenticator and payment return

## Changes

- Customer setup, technician setup and authenticator reset now share a selectable setup key and explicit Copy setup key button. Instructions explain manual entry with Time based codes. Copy failure is visible; absent/regenerating keys cannot be copied through the button. Verification still requires the generated six-digit authenticator code.
- Added Expo SDK-compatible `expo-clipboard` 57.0.1. Existing installed builds need a rebuild to include this native module; no APK was built in this batch.
- Mobile checkout and retry already request the mobile return target. Both success and cancellation use the backend HTTPS bridge and the configured `coldair://customer/order-confirmation/:id` app route.
- Removed the bridge's forced 2.4-second website redirect. The website is now an explicit fallback link, with a persistent Open Cold Air App button.
- The backend's default Helmet policy blocked the existing inline redirect script. This response now uses a random nonce for its script and styles, with a route-specific restrictive Content Security Policy. Other routes retain their existing policy. The bridge is not cached.
- App payment confirmation still retrieves the owned order and verifies PayMongo status through the backend. A redirect does not mark payment paid.

## Verification and limits

- Full mobile suite: 55 tests passed.
- Full backend suite: 97 tests passed, including success/cancel bridge URLs, matching registered app scheme, nonce policy and unchanged website return.
- Expo web production export passed. Clipboard tests mock the native clipboard; payment-return tests exercise the handler and URL builders without an actual PayMongo transaction.
- Installed Android APK/browser handoff, real device clipboard and Expo Go device behavior were not physically tested. Custom `coldair://` links are for an installed build, not Expo Go's `exp://` development links.
- No push, deployment, APK build, live payment or account/security data changes in this batch.

References: [Expo Clipboard](https://docs.expo.dev/versions/latest/sdk/clipboard/), [Expo app deep links](https://docs.expo.dev/linking/into-your-app/), [PayMongo checkout redirects](https://docs.paymongo.com/reference/checkout-session-resource).
