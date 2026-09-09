# Receipt, mobile notifications and service-note UX batch

## Implemented

- Web and mobile show the receipt identifier once, retaining the separate order reference.
- Customer home/menu and technician Alerts navigation display red unread counts. Refresh occurs on focus, foreground, periodic polling and successful read-state changes. Failed refresh retains the last confirmed badge count; failed read requests do not clear it.
- Technician notes use hours and parts selectors with Other support, preserve custom existing parts, and use three entry/review pages. Saved notes show three per page.
- Verified unit identity and registration are separate pages. Unit history sections and their records are paginated. Customer service visits show one request per page, with paginated timelines and service history.
- Optional actual labor and parts costs are saved per note, aggregated by the API, preserved on reads and recalculated on edits/deletions. These are not customer invoices or the service payment amount. Missing amounts display Not recorded, not zero. Reassignment clears costs with the outgoing technician's report.
- Removed the service-note form's outer dismiss-on-tap handler after the browser walkthrough exposed unexpected form dismissal when focusing an input.

## Evidence and verification

- Read-only inspection of the screenshot work order TSK-1788948226027 found no labor/parts cost values. Its note had 3 hours and parts text `Nons`. No historical amounts, wording or live records were backfilled.
- 159 mobile tests, 156 backend tests and 103 web tests passed. Receipt tests verify one receipt identifier; mobile tests cover badge changes/failure/account isolation, cost round trips and dropdown/pagination state.
- Web production build and Expo web export succeeded. Existing web bundle-size warning remains.
- Isolated API at localhost:5002 explicitly confirmed database `coldair_logic_20260908_e2e` before fixture writes. No live database writes, emails, OpenAI calls or real payments.
- At 390 x 844, technician preview displayed the red unread badge; service report showed PHP 250 = 200 labor + 50 parts. Seven QA notes were reachable in three pages, with Next disabled on the last page.
- Browser form walkthrough selected 2.5 hours and no parts, entered 125 labor / 0 parts, selected written report choices, reviewed and saved. API readback verified eight notes and updated totals of 325 labor + 50 parts = 375.
- Native phone keyboard/camera behavior was not verified by a physical device. The Expo web preview does not implement native Alert callbacks, so save persistence was independently verified through the API.

## Release status

Prepared for release; production deployment is verified separately against the committed release. No APK build. QA fixture retained in the isolated database only.

## Checkout image follow-up

- Replaced the empty checkout icon placeholder with the cart product image, with an accessible fallback for missing or failed images.
- Four focused checkout tests passed, including source changes after an image failure; the web production build succeeded.
