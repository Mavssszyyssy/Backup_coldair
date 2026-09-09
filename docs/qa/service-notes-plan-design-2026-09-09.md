# Mobile service notes and saved-plan display

## Verified findings

- Read-only production audit of the pictured TCL unit found four stored plan snapshots. Three September 8 snapshots had the same due date, service, and basis; their calculation timestamps differed. The September 9 snapshot had a different due date. The pager was advancing through separate records that looked identical, not fetching the same index.
- The September 9 18:10:27 service note contains 3 hours but no laborCost or partsCost. Its parent task also has neither amount. The two earlier repair/maintenance task records inspected likewise have no saved expense amounts. No historical amounts, service notes, or plans were changed.
- The detail page used one padded InfoCard for every field inside another padded Card, creating excessive vertical spacing. It also lacked a loading/rejection state.

## Changes

- Compact note details grouped into visit information, work performed, and internal costs. Condition and hours appear in small summary tiles; one missing-expense explanation replaces repeated missing-cost fields.
- Six always-visible history buttons replaced with a collapsed section chooser. Existing AC unit, registration, maintenance, repair, current-plan and past-plan access remains available.
- Consecutive identical past plans grouped for display with assessment count and date range. Original records remain unchanged. Changes in due date, service or explanation retain separate pages, including a return to an older plan after an intervening change.
- Past plan date highlighted. Current plan stays separate; historical values are not replaced with current recommendations.
- Detail loading now requires online task data and reports fetch failures instead of showing blank record fields. Edit/delete controls remain restricted to an existing note on an in-progress task.
- Currency formatting extracted without changing output, so cost components do not import the full ecommerce service.

## Verification

- Full mobile suite: 43 suites / 168 tests passed before final visual-only accents. Targeted tests rerun after styling.
- Existing form and storage tests cover actual costs/hours through save, reload, edit and delete; zero remains distinct from absent amounts. Customer payment is not substituted for internal expenses.
- New tests cover grouped duplicate snapshots, changed plans, next/previous content changes, missing-cost detail rendering, and recorded zero.
- Actual React Native components bundled into a local 414px-wide browser fixture. Note spacing/text wrap and past-plan next-page contents inspected visually. This is not a physical iOS device test.
- No deployment, production write, or API-key changes in this batch.

## Customer AC Unit Details follow-up

- Confirmed nested Request timeline and Service visits pagers in customer/units/[id].jsx. Moved the visit pager above the selected request; replaced timeline pagination with the latest three events and incremental "Show earlier updates". Switching requests resets the activity expansion.
- Kept completed technician reports (findings/work performed) distinct from request activity (status/scheduling). Completed reports are now collapsed initially and retain their own record navigation only when opened.
- Replaced three long summary rows with compact count tiles. Booking, cancellation, payment details and GPS arrival logic are unchanged.
- Added interaction tests covering all older timeline entries, request switching, a single visit pager, and collapsed report access. Updated the existing source-contract test for the new count tiles and extracted timeline component.
- Mobile web export succeeded; actual extracted components inspected in a 414px-wide local browser fixture. No physical-device check or deployment performed.
