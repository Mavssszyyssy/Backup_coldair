# Online checkout return correction

## Confirmed causes

- Web confirmation always rendered an Order Success header and green checkmark, including unpaid orders.
- Mobile navigated to confirmation immediately after opening an external checkout URL. Its fallback copy claimed payment was confirmed even when an order was unavailable or cash on delivery.
- Both screens only requested provider verification for a success callback. A cancelled callback could also override an already-paid order in the UI.

## Changes

- Web external checkout launch saves an unpaid-return confirmation URL in browser history. Browser Back, including a back/forward-cache restoration, returns to verification of the saved order.
- Initial mobile checkout and payment retries open the saved order's payment confirmation screen with return context. The screen checks the provider and checks again whenever the app becomes active.
- A verified unpaid return/cancellation displays **Transaction Failed**. A provider-confirmed payment always takes precedence over the navigation hint.
- Success callback parameters alone do not establish payment. Unconfirmed success callbacks remain pending.
- Verification failures display **Unable to confirm payment**, with a manual status-check action, not a false success or an instruction to immediately pay again.
- COD says the order was received and payment will be collected on delivery.
- Back navigation does not write a failed payment status, cancel an order, release stock, or claim a customer was not charged. Existing server verification/webhook logic remains authoritative.

## Verification

- Web: 23 shared outcome/history tests and 4 rendered confirmation-screen tests.
- Mobile: 5 rendered-screen tests covering unpaid return, foreground re-verification, delayed payment, cancelled callback after payment, unavailable verification with recovery, misleading success callbacks, and COD.
- Full regression reruns passed: **177 mobile tests / 46 suites**, **133 web tests / 36 suites**. Initial concurrent runs timed out; sequential reruns passed without altering application logic or increasing test timeouts.
- Web production build passed (existing large-chunk advisory only).
- The initial iOS bytecode export was blocked by Windows denying execution of the Hermes compiler. This is not a successful native build or physical-device test.
- iOS JavaScript-only export passed for all 1,428 modules using the diagnostic `--no-bytecode` option; release app configuration was not changed and no APK was built.
- Test payment responses are controlled fixtures; no live payment, refund, account, or order mutation was performed.
- Physical iOS/Android browser handoff and real provider checkout should be rehearsed after deployment using the test-payment environment. Automated AppState/browser-history tests are not a physical-device rehearsal.
