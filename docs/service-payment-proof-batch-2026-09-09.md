# Service payment, proof, AMP identity, and checkout batch

## Confirmed requirements

- Admin sets a missing service quote. The assigned technician confirms cash collection only after verified GPS check-in.
- Maintenance and warranty repair completion require a written findings/work-performed report and one after-service photo. A before-service photo is optional.
- Existing completed visits are not rewritten or reopened. Missing historical payment information is displayed as not recorded, never assumed paid.

## Implemented scope

- Admin and Superadmin AMP unit selectors include customer name, model, available horsepower, and serial number. Missing names are explicitly identified as not recorded.
- Reorder submission, approval, and rejection notify the responsible branch administrators and Superadmin. Alert links open each role's reorder tab. Duplicate approval cannot add stock twice.
- Service requests expose a computed payment summary to customers and staff. Technician work-order details read the latest linked service request, not an old pricing snapshot.
- Dedicated quote and collection endpoints enforce role, branch, assignment, active visit, GPS arrival, exact current amount/quote, and collection retry safeguards. Invalid or missing prices are not treated as free. An explicit zero quote represents a free visit.
- Approved warranty visits display no cash due. Paid and closed visits cannot be repriced.
- Completion checks enforce payment readiness, written report, and after-service proof. Technician completion submits the after-condition rather than labeling it as the before-condition. Photos remain available to Admin through work-order details.
- Receipts use the existing Cold Air logo and actual selected payment method instead of the payment processor. GCash, card, COD, and existing Maya support are preserved. Unspecified historical online methods are not guessed.
- Checkout/order-summary processor branding is removed. New payment-upon-installation orders are rejected; historical order labels remain supported.

## Verification

- Backend tests: 154 passing.
- Web tests: 103 passing across 33 test files.
- Mobile tests: 142 passing across 33 suites.
- Isolated API acceptance journey: 48 passing checkpoints, including cross-role and cross-branch rejection, invalid quotes, collection before arrival, incorrect amounts, retry protection, missing-photo rejection, paid maintenance completion, covered warranty completion, report identity, reorder alerts, and removed payment method.
- Web production build passed. Expo mobile web export passed; no APK was built.
- Receipt component tests verify logo rendering and GCash/card labels even when the stored provider is PayMongo.
- Mobile completion component test uses a mocked camera to verify that written findings alone cannot complete a visit and that the captured after-photo is included in submission.

## Environment and limits

- Acceptance tests used the isolated `coldair_logic_20260908_e2e` database and the payment provider's test mode. Production records were not changed. OpenAI and email delivery were disabled for this rehearsal.
- Automated camera tests and a web export do not substitute for physical-phone camera/permission/upload testing. That final device rehearsal remains required after loading the updated app.
- The web build reports a non-blocking large-bundle warning; this batch does not claim to resolve all performance or unrelated system issues.
- Changes are local and have not been pushed or deployed as part of this batch.

## Follow-up: service-note dropdowns

- Add/Update Service Note and Complete Service Visit now share expandable multi-select dropdowns for findings and work performed. Only one dropdown is expanded at a time.
- New findings/actions start blank. Options depend on Regular Cleaning, Deep Cleaning, Repair, or Inspection; unsupported note types offer Other rather than inventing cleaning work.
- Other reveals a text field and requires details. Existing custom notes remain editable under Other; saved drafts retain their report and service method.
- Additional notes are optional, including on completion. Selected sentences preserve the existing findings/resolution format and are sent as individual service actions for downstream history and AMP.
- Changing cleaning method asks before clearing findings/actions; the after-photo and additional notes remain. Completion still requires the photo, substantive report, and applicable payment collection.
- Related fixes: opening completion preserves a recorded Deep Cleaning method; failed service-note saves show an error without clearing entries.
- Follow-up verification: 152 mobile tests across 35 suites passed, including dropdown toggle/Other validation, service-specific choices, draft/edit persistence, report payload, service-method change confirmation, and report-plus-photo completion. Expo web export passed. No physical-phone rehearsal, push, deployment, or APK build was performed for this follow-up.
