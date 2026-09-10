# Technician unattended visit and layout update

## Confirmed behavior

- Technician first records GPS arrival, then selects **No one available → Close visit / request reschedule** from Work Order Details → Overview.
- Both choices require an explicit outcome, short visit note, and camera proof photo.
- Close means close this attempt only. The customer order/service request is not cancelled, paid, completed, or counted as completed maintenance.
- The task is placed on hold. The old arrival is retained with the attempt, not reused for payment or service completion.
- Branch Admin and Superadmin receive a notification. The customer receives a visit update.
- In Services → Customer Orders or Service Requests, **Visit follow-up** shows the note, proof photo and arrival map.
- Admin contacts the customer, chooses a next-visit date and dropdown time, and selects **Confirm next visit**.
- The technician receives the schedule update and must record a fresh GPS arrival. Existing payment and warranty records remain unchanged.

## Mobile layout changes

- Service-note entry uses a full-screen, safe-area layout rather than a transparent modal.
- Review groups visit details, findings/work, and recorded expenses in readable cards.
- Draft save failures retain the form and show an error.
- Maintenance proof shows only the after-service photo. Historical before-photo data is not deleted.
- Unattended-visit proof is identified separately from completed-work proof.

## Verification and limits

- Backend unit/controller fixtures cover proof validation, permissions, arrival identity, duplicate retries, service and delivery synchronization, cancelled-task protection, and next-visit reset.
- Mobile component tests cover explicit outcome submission and blocking submission without arrival; existing service-note and cash-collection tests also run.
- Admin tests cover proof display and date/time confirmation.
- Web production build passed. Updated mobile screen source parses successfully.
- Native iOS export reached bundling but Hermes bytecode execution was denied by local permissions. Visual preview execution was also blocked; no physical-phone visual or camera/GPS end-to-end rehearsal is claimed.
- No production records were changed. No push, deployment or APK build was performed for this batch.

## Remaining physical rehearsal before release

1. Use a designated test service request, then repeat with a test delivery work order.
2. Confirm no-show submission is blocked before arrival and without a note/photo.
3. Check in, capture entrance proof, and test Close visit; verify Admin/customer alerts and no service/payment completion.
4. Have Admin confirm a new date/time. Verify technician notification, updated schedule, and fresh arrival requirement.
5. Repeat with Request reschedule, including retry after a interrupted submission.
6. Check service-note review and proof screens on the target phone with keyboard open/closed and larger text enabled.
