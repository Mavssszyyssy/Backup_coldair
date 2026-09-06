# AMP pre-AI safeguards — 6 September 2026

## User confirmation

The user reports that the physical-phone rehearsal and presentation-account OTP rehearsal are good. These are user-confirmed results, not a new device test performed by Codex. Password-reset email delivery was not explicitly confirmed in that update.

“Provisional” means not yet confirmed by Cold Air. The existing 270-day fallback interval and approximate 14 m²/HP sizing comparison are unchanged. The previously approved 1-year parts / 5-year compressor warranty does not establish these maintenance or sizing values.

## Scope

- Background next-service reads no longer call OpenAI. They retain system recommendations, persistence, and maintenance notification behavior.
- Explicit report generation retains AI assistance. The model selects and orders up to three verified explanation points. The backend supplies the displayed sentences; arbitrary model-written claims are not rendered. This is grounded explanation selection, not autonomous diagnosis or AI-generated servicing dates.
- Unknown fact IDs, extra properties, malformed output, incomplete responses and refusals fall back to the system recommendation. Dates, cleaning methods and room-size assessments remain backend-controlled.
- AI work has a 15-second total budget inside the existing 30-second Vercel function. Default provider timeout is 10 seconds with zero retries; configuration permits at most one transient-error retry within the total budget. Timeouts are not automatically retried.
- Mobile report requests use a 30-second timeout, matching the website report POST default. Mobile timeout wording is report-specific, not installation-photo wording.
- Web/mobile AI requests do not automatically replay against fallback hosts following a network failure.
- Successful unchanged results are reused for five minutes in a bounded, per-process cache. Matching in-flight requests share a result. User, unit, evidence, recommendation, report type, model and credential changes invalidate reuse. Failures are not cached.
- Cache reuse is a warm-server optimization, not a cross-instance spending cap. Existing request rate limits remain; actual API usage and costs still require monitoring during the live test.
- Raw technician notes, names and addresses are not sent in the revised provider prompt. They remain in the application's authorized report/history views; only verified calculation points are sent for explanation selection.

## Verification and limits

Automated tests cover invalid explanations, refusal/incomplete fallback, timeout cancellation without duplicate retries, bounded rate-limit retries, cache reuse/expiry/isolation (including changed Date-valued evidence), background route dependency, and mobile delayed-report/timeout behavior.

- Backend: 91 tests passed; the 10 targeted AI tests were rerun successfully after the final cache-date handling adjustment.
- Website: 51 tests passed; import validation and production build passed.
- Mobile: 46 tests passed; Expo web production export passed. No APK was built.
- Backend syntax checks and whitespace validation passed.
- The existing website password-strength chunk size warning remains; no build errors occurred.

No production credentials, business values, customer records or account permissions were changed. No live OpenAI call, model-access check, paid usage test, push or deployment is included in this batch. This does not certify every system workflow or prediction accuracy.

Official guidance: [Structured Outputs can still contain mistakes](https://developers.openai.com/api/docs/guides/structured-outputs). The application therefore renders verified fact text instead of trusting schema-valid model prose.
