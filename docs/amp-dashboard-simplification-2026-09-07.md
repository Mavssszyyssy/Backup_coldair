# AMP dashboard simplification

## Scope

Admin and Superadmin website AMP screens only. Prediction calculations, business intervals, warranty rules, branch permissions, AI provider settings and mobile screens are unchanged. No push or deployment performed.

## What changed

- A shared three-step guide explains prediction, evidence/AI interpretation and staff follow-up. It explicitly distinguishes history-based recommendations, provisional schedules and confirmed bookings.
- Admin sees My branch maintenance, units needing follow-up, due dates, cleaning methods and a direct Review service plan link that selects the corresponding unit. A service-window filter is now available to branch admins without exposing other branches.
- Superadmin sees Branch maintenance and a 12-month maintenance plan. Upcoming branch workload and unit-plan review are prominent. Parts history, model/brand history and financial assumptions are expandable rather than competing with the maintenance purpose.
- Replaced ambiguous numeric dates with the existing readable service-date formatter. Missing cleaning recommendations display Not Yet Assessed rather than an invented Regular Cleaning recommendation.
- AI is called only when a report is explicitly generated. Existing report badges still distinguish actual AI-assisted explanations from system records. Clicking a unit's review link does not call AI.
- Existing palette retained; additional styling is scoped to AMP.

## Verification

- Website suite: 63 tests passed, including branch controls, failure/empty states, AI-versus-system wording, repeat selection of the correct unit, and saved-plan outcome review.
- Backend suite: 100 tests passed. New tests cover immutable saved-plan identifiers, schedule changes, pre-visit-only matching, incomplete technician records, and plans made after a service visit.
- Isolated API acceptance journey: 38 checkpoints passed. It saved a customer-visible plan before a maintenance visit, completed GPS-verified technician work with real findings, and confirmed that the Superadmin review shows the previous plan beside the documented deep-cleaning outcome. The QA database was `coldair_logic_20260905_e2e`; AI, email, and live payment were disabled.
- Production website build passed; existing password-strength chunk-size warning remains.
- No live authenticated browser walkthrough performed in this batch. Component tests use mocked data; live AI generation was not enabled or tested.

## Reliability loop implemented

Generating a Next service plan now saves an append-only server snapshot of the date, cleaning method, historical basis, comparable sample count, interval and excluded-record count. For Admin and Superadmin reports, the saved plan is compared only with a later, completed and sufficiently documented cleaning. The review shows the actual service date, findings and work performed. It deliberately does not calculate or display an unvalidated AI accuracy score.

Plans are captured from the existing deterministic model/brand history calculation. An OpenAI explanation remains optional and cannot rewrite the saved plan or technician outcome.
