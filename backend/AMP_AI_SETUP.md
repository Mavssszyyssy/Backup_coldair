# AMP maintenance AI setup and limits

Configure these in the **aeropulse-backend** Vercel project, not in web or Expo public environment variables:

- `OPENAI_API_KEY`: your private API key.
- `OPENAI_MODEL`: `gpt-5.6-terra` (the current code default).
- `OPENAI_REASONING_EFFORT`: `none` (the current bounded-latency default).
- `OPENAI_TIMEOUT_MS`: `10000`.
- `OPENAI_MAX_RETRIES`: `0` to avoid automatically repeating failed paid requests.
- `OPENAI_MAX_OUTPUT_TOKENS`: `600`.

Redeploy the backend after changing Vercel environment variables. A key alone does not deploy uncommitted code. Never put the key in `VITE_*` or `EXPO_PUBLIC_*` variables or commit it.

## What starts an AI prediction

Generate **Next service plan** on customer mobile/web or the Admin/Superadmin AMP report area. The `/ai/maintenance-recommendation` endpoint also supports the same prediction flow. Normal page loads and daily reminders do not make paid AI calls.

The backend validates service evidence and first measures the target AC unit's own cleaning-to-cleaning gaps. Three verified cleanings produce two intervals, which is the minimum for a unit-specific pattern. If the unit has fewer than two intervals, the system checks same-model, same-brand/type, then same-brand history. It uses the rounded arithmetic average, matching the visible interval list in the report. This minimum input gate does not by itself prove predictive accuracy.

OpenAI receives a de-identified interval histogram, the target unit's validated service dates/types, and structured counts derived from the saved technician findings and service requests (for example filter dirt, coil dirt, deep cleaning and refrigerant context). Customer names, addresses, serial numbers, warranty records, and free-form technician notes are not sent. Regular and deep cleaning records can create cleaning intervals. Repair and refrigerant records are never converted into cleaning dates.

The response must contain only an integer interval and a compatible reason code. The allowed interval is an explicit list: the calculated arithmetic average, plus a shorter interval that actually occurred in the verified history only when filter/coil dirt evidence supports more frequent cleaning. OpenAI cannot invent another day count. The server computes the date from the last verified cleaning (or installation when no cleaning exists), validates the result, and saves its evidence fingerprint, model, request reference and generation time.

My Units, subsequent reports, dashboard refreshes and daily reminders use the accepted saved date. New or changed timing evidence invalidates it and returns to the system calculation until a new plan is generated. Historical snapshots identify whether a plan came from AI or the system. They support review against later technician findings, not an automatic accuracy claim.

No key, insufficient history, invalid/refused output, or provider failure keeps a clearly identified system fallback (or an existing estimate whose evidence is still current). When neither the unit nor comparable units have two verified cleaning intervals, the fallback is exactly 6 months (180 days). AI cannot erase missing evidence. Cleaning-method rules, the approximate room/HP comparison, warranty limits/approval, and actual booking remain separate.

## Required live rehearsal after deployment

1. Generate a plan for a unit with eligible comparable history. Confirm `predictionSource: openai`, visible AI-estimate label, and the same date on a fresh My Units load and exported report.
2. Check the backend and OpenAI dashboard for the actual model request and usage. Do not infer success from the presence of an API key.
3. Test insufficient-history and provider-unavailable cases. They must remain useful and must not be labeled a new AI prediction.
4. Complete a documented cleaning using test data. Confirm the old estimate is invalidated and the next generation uses updated history.
5. Check branch isolation: Cavite Admin cannot access Bulacan records; an Admin with no valid branch is blocked; Superadmin can view both.
6. Confirm warranty approval still requires authorized staff and never changes merely by generating an AI plan.

Mocked-provider tests validate software behavior, not real model quality. Review a representative set of live estimates with the service team before presenting prediction reliability as established.
