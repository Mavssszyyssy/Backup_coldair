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

The backend validates service evidence and selects same-model, same-brand/type, then same-brand cleaning history. At least two valid recorded intervals are required; this is a minimum input gate, not evidence of predictive accuracy. OpenAI receives a de-identified interval histogram and the target unit's validated service dates/types. It can infer an interval different from the median. No customer names, addresses, serial numbers, warranty records, or free-form technician notes are sent.

The response must contain only an integer interval and a compatible reason code. The interval is restricted to the observed range within the existing 90–365 day engineering envelope. This is not a manufacturer-approved maintenance policy. The server computes the date from the last verified cleaning or installation, validates the result, and saves its evidence fingerprint, model, request reference and generation time.

My Units, subsequent reports, dashboard refreshes and daily reminders use the accepted saved date. New or changed timing evidence invalidates it and returns to the system calculation until a new plan is generated. Historical snapshots identify whether a plan came from AI or the system. They support review against later technician findings, not an automatic accuracy claim.

No key, insufficient history, invalid/refused output, or provider failure keeps a clearly identified system fallback (or an existing estimate whose evidence is still current). Limited history still uses the provisional 270-day interval. AI cannot erase missing evidence. Cleaning-method rules, the approximate room/HP comparison, warranty limits/approval, and actual booking remain separate.

## Required live rehearsal after deployment

1. Generate a plan for a unit with eligible comparable history. Confirm `predictionSource: openai`, visible AI-estimate label, and the same date on a fresh My Units load and exported report.
2. Check the backend and OpenAI dashboard for the actual model request and usage. Do not infer success from the presence of an API key.
3. Test insufficient-history and provider-unavailable cases. They must remain useful and must not be labeled a new AI prediction.
4. Complete a documented cleaning using test data. Confirm the old estimate is invalidated and the next generation uses updated history.
5. Check branch isolation: Cavite Admin cannot access Bulacan records; an Admin with no valid branch is blocked; Superadmin can view both.
6. Confirm warranty approval still requires authorized staff and never changes merely by generating an AI plan.

Mocked-provider tests validate software behavior, not real model quality. Review a representative set of live estimates with the service team before presenting prediction reliability as established.
