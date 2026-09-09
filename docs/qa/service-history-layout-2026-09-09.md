# Service history layout follow-up

- Read-only production check of TSK-1788948226027 confirmed a completed visit with 3 recorded hours and no labor/parts amounts on either the task or its note. No historical amounts were invented or changed.
- Replaced three repeated empty cost cards with one explanation. Actual recorded expenses use compact rows, with a subtotal only for multiple recorded amounts. The saved customer service payment is displayed separately when available.
- Work-order detail and note screens require a current server response rather than silently using offline task data.
- Visit notes and AC history are separate tabs. Named AC history sections replace the outer numbered pager. Records are mobile-width cards, newest first, with one labeled pager and no horizontally scrolling tables.
- Current maintenance plans and prior assessment snapshots are separate. The API no longer inserts a current calculation into an empty historical assessment list.
- Verification: 163 mobile tests passed (41 suites; final run allowed 20 seconds per test after a timeout during simultaneous bundling), 156 backend tests passed, Expo web export succeeded, diff whitespace check passed.
- Browser walkthrough at 390 x 844: isolated QA API returned 325 labor + 50 parts, displayed as 375 total; all eight saved notes were accessible across three pages, with last-page Next disabled. Actual history component rendered with clearly labeled sample records: newest-first visits, named sections, current/past separation, and a single compact pager with no table overflow or large internal blank area.
- Browser preview is not a physical iPhone test. No production record mutations, payments, email or AI requests. Local changes only; no push, deployment or APK build in this follow-up.
