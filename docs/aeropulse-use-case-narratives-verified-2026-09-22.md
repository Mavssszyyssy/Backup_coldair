# AEROPULSE Use Case Narrative Completion

**Verification date:** September 22, 2026  
**Verified branch:** `main-martyn`  
**Basis:** Mounted web routes, Expo mobile routes, backend permissions, active user interfaces, domain rules, and targeted automated tests.

## Verification Notes

- The Actor rows preserve the role assignments supplied in the revised inventory.
- A description identifies any requested actor or flow that the current system does not support.
- `None` is used for Successful Completion only when the requested use case is not implemented.
- The current implementation does not enforce TOTP for every role. Customer TOTP is implemented, Admin and Superadmin use TOTP only when enabled, and Technician TOTP is explicitly unavailable.
- Customer service and warranty requests are mobile-only. The web Service page provides guidance but does not submit a booking.
- Customer mobile password change is absent. Technician mobile password change is implemented.
- Authenticated authenticator change is absent from mobile and web account settings. Customer authenticator setup and recovery exist as onboarding and recovery flows.

## Targeted Verification Results

- Web: 12 test files passed, containing 67 tests covering role routing, mobile-only service boundaries, system gaps, commerce, order actions, payment outcomes, service request handling, technician administration, scheduling, reports, AMP presentation, and Superadmin inventory.
- Mobile: 11 test suites passed, containing 46 tests covering authentication and recovery, customer orders and service requests, installation QR handling, unattended visits, technician password changes, notification synchronization, weak-signal reconciliation, unit images, and work-order sorting.
- Backend: 67 tests passed, covering account security, email-only authentication, authenticator rules, branch stock, payment retries, catalog safety, notification archiving, operational reports, service-request transitions, task transitions, technician passwords, and visit attempts.
- Total targeted result: 23 frontend and mobile suites or files passed, plus 67 backend tests, with 180 individual tests passing and no failures.

## Mobile Application

## Authentication

### Sign in

| Field | Value |
|---|---|
| Use Case Name | Sign in |
| Actor | Customer, Technician |
| Description | Allow the actor to authenticate in the mobile application and enter the workspace permitted for the account role. Customer accounts may be challenged for an authenticator code, while Technician accounts use username and password without TOTP. |
| Successful Completion | 1. Opens the Sign in screen.<br>2. Enters the account identifier and password.<br>3. Validates the credentials and account status.<br>4. Enters the authenticator code when a Customer account has TOTP enabled.<br>5. Creates the authenticated session.<br>6. Routes the actor to required onboarding or the correct role home screen. |
| Alternative | 1. Submits an invalid password or required authenticator code.<br>2. Rejects the sign-in attempt and increments the failed attempt count.<br>3. Prompts the actor to try the failed credential again when the failed attempt count is below five.<br>4. Locks the account for 15 minutes when the failed attempt count reaches five.<br>5. Stops the flow until the lockout expires. |
| Pre-condition | A Customer or Technician account exists and is active. |
| Post-condition | An authenticated mobile session exists and the actor is routed to the allowed workspace. |
| Assumption | The device can reach the AEROPULSE backend, and a Customer challenged for TOTP has access to the configured authenticator. |

### Register

| Field | Value |
|---|---|
| Use Case Name | Register |
| Actor | Customer |
| Description | Allow the actor to create a Customer account with identity, address, sign-in, legal-consent, and verified email information. |
| Successful Completion | 1. Opens the Create Account flow.<br>2. Enters personal and Philippine address information.<br>3. Enters a unique username, email, and password of 8 to 25 characters.<br>4. Accepts the required legal acknowledgments.<br>5. Requests and enters the six-digit email verification code.<br>6. Verifies the code and creates the Customer account.<br>7. Routes the Customer to sign in and complete required security setup. |
| Alternative | 1. Enters an invalid or expired email verification code.<br>2. Rejects the code and leaves the registration data unsubmitted.<br>3. Prompts the Customer to enter another code when the verification attempt count is below five.<br>4. Locks that code when the verification attempt count reaches five.<br>5. Stops the flow until the Customer requests a new code after the resend cooldown. |
| Pre-condition | The Customer is signed out and has an email address that is not already registered. |
| Post-condition | A verified Customer account is created with saved profile, address, and consent records. |
| Assumption | Email delivery is available and the Customer can access the supplied email inbox. |

### Recover account

| Field | Value |
|---|---|
| Use Case Name | Recover account |
| Actor | Customer, Technician |
| Description | Allow the actor to regain account access by resetting the password through email OTP. Customer accounts can also consume a configured single-use authenticator recovery code. |
| Successful Completion | 1. Opens Recover Account from the Sign in screen.<br>2. Selects password recovery and enters the account email or identifier.<br>3. Sends a six-digit reset code to the registered email address.<br>4. Enters the reset code and a valid new password.<br>5. Verifies and consumes the code.<br>6. Saves the new password and invalidates the temporary recovery request.<br>7. Returns the actor to Sign in. |
| Alternative | 1. Enters an invalid or expired reset code.<br>2. Rejects the reset and keeps the password unchanged.<br>3. Prompts the actor to enter another code when the verification attempt count is below five.<br>4. Locks that code when the verification attempt count reaches five.<br>5. Stops the flow until a new reset code can be requested after the resend cooldown. |
| Pre-condition | The account exists and has a recoverable email address, or a Customer has an unused recovery code. |
| Post-condition | The account password is replaced, or the Customer is placed into authenticator recovery after a recovery code is consumed. |
| Assumption | Email delivery is available for password recovery and the actor can access the registered inbox. |

## E-commerce

### Browse catalogue

| Field | Value |
|---|---|
| Use Case Name | Browse catalogue |
| Actor | Customer |
| Description | Allow the actor to review available AC products and narrow the catalogue by search, category, brand, price, and sort order. |
| Successful Completion | 1. Opens Shop from the Customer navigation.<br>2. Loads the active product catalogue and available stock.<br>3. Searches, filters, or sorts the products.<br>4. Selects a product card.<br>5. Displays product details, price, specifications, warranty text, and availability. |
| Alternative | 1. Opens Shop while the catalogue service is unavailable.<br>2. Displays a catalogue loading error and no stale purchasing confirmation.<br>3. Returns the Customer to the parent Shop screen. |
| Pre-condition | The Customer is signed in. |
| Post-condition | None. |
| Assumption | The product and branch inventory services are reachable. |

### Manage cart

| Field | Value |
|---|---|
| Use Case Name | Manage cart |
| Actor | Customer |
| Description | Allow the actor to add available products, change quantities within stock limits, remove items, and prepare the cart for checkout. |
| Successful Completion | 1. Opens a product from Shop.<br>2. Adds the product to the cart.<br>3. Opens the cart panel.<br>4. Changes an item quantity or removes an item.<br>5. Clamps each quantity to the currently available stock.<br>6. Saves the updated cart in the authenticated session.<br>7. Displays the updated item count and total. |
| Alternative | 1. Attempts to keep an item that is unavailable or exceeds active stock.<br>2. Removes or reduces the invalid cart quantity.<br>3. Displays the corrected cart and stock message.<br>4. Returns the Customer to the parent Shop screen. |
| Pre-condition | The Customer is signed in and at least one active product is available. |
| Post-condition | The authenticated session contains the revised cart. |
| Assumption | Current product stock can be loaded from the selected inventory branch. |

### Checkout

| Field | Value |
|---|---|
| Use Case Name | Checkout |
| Actor | Customer |
| Description | Allow the actor to validate stock and delivery information, select cash on delivery, GCash, or card payment, and place an order. |
| Successful Completion | 1. Opens Checkout with a non-empty cart.<br>2. Reviews the current items, quantities, prices, and assigned branch.<br>3. Confirms a complete serviceable delivery address.<br>4. Selects cash on delivery, GCash, or card payment.<br>5. Revalidates the latest catalogue stock and totals.<br>6. Creates the order using an idempotency key.<br>7. Opens PayMongo for online payment or confirms the cash on delivery order.<br>8. Displays the order confirmation after the server records the result. |
| Alternative | 1. Fails or cancels a GCash payment before PayMongo confirms it.<br>2. Keeps the order unpaid and preserves it in My Orders.<br>3. Offers Pay Again when the total GCash payment attempt count is below three.<br>4. Blocks further GCash attempts when the total attempt count reaches three.<br>5. Stops the payment flow while leaving the saved order available for review. |
| Pre-condition | The Customer is signed in, the cart is non-empty, and a valid address is inside a configured service area. |
| Post-condition | An order is created, with payment marked according to confirmed provider or cash on delivery state. |
| Assumption | Branch stock, address coverage, and PayMongo are available when online payment is selected. |

## Order Fulfillment

### View orders

| Field | Value |
|---|---|
| Use Case Name | View orders |
| Actor | Customer |
| Description | Allow the actor to review current and historical orders with payment, delivery, installation, cancellation, and receipt information. |
| Successful Completion | 1. Opens My Orders.<br>2. Loads the Customer's orders from the server.<br>3. Displays each order with amount, status, and progress.<br>4. Selects an order.<br>5. Expands the order details and timeline.<br>6. Displays payment, delivery, technician, schedule, and receipt information when present. |
| Alternative | 1. Selects an order that is no longer accessible to the Customer.<br>2. Rejects the order detail request and shows an access or loading error.<br>3. Returns the Customer to the parent My Orders screen. |
| Pre-condition | The Customer is signed in. |
| Post-condition | None. |
| Assumption | The order service is reachable. |

### Manage order

| Field | Value |
|---|---|
| Use Case Name | Manage order |
| Actor | Customer |
| Description | Allow the actor to request cancellation before dispatch, retry an eligible unpaid online payment, reorder items, or open a saved receipt. |
| Successful Completion | 1. Opens an order in My Orders.<br>2. Reviews the actions allowed by the current workflow and payment status.<br>3. Selects cancellation, payment, reorder, or receipt.<br>4. Validates that the selected action is still allowed.<br>5. Saves the cancellation request, opens secure payment, adds prior items to the cart, or opens the receipt.<br>6. Refreshes the order to show the resulting state. |
| Alternative | 1. Starts Pay Again for an unpaid GCash order whose payment has failed.<br>2. Keeps the order unpaid and records the failed attempt.<br>3. Offers another Pay Again action when the total attempt count is below three.<br>4. Blocks payment when the total attempt count reaches three.<br>5. Stops the payment flow and leaves the Customer on the order details. |
| Pre-condition | The Customer is signed in and owns the selected order. |
| Post-condition | The selected eligible order action is recorded, or prior items are restored to the cart. |
| Assumption | PayMongo is available when the Customer chooses an online payment action. |

## Field Service

### View my units

| Field | Value |
|---|---|
| Use Case Name | View my units |
| Actor | Customer |
| Description | Allow the actor to review registered AC units and open warranty, service history, AMP recommendation, and care information for a selected unit. |
| Successful Completion | 1. Opens the Customer Home unit section.<br>2. Loads AC units registered to the Customer.<br>3. Searches or sorts the unit list.<br>4. Selects a unit.<br>5. Displays the unit overview, service records, warranty information, and care guide.<br>6. Displays the suggested servicing date as a recommendation rather than a booking. |
| Alternative | 1. Selects a unit that is not registered to the Customer account.<br>2. Blocks access and displays AC unit unavailable.<br>3. Returns the Customer to the parent Home screen. |
| Pre-condition | The Customer is signed in. |
| Post-condition | None. |
| Assumption | Registered unit and maintenance history services are reachable. |

### Book service

| Field | Value |
|---|---|
| Use Case Name | Book service |
| Actor | Customer |
| Description | Allow the actor to submit a maintenance request for an exact registered AC unit or submit a warranty claim when active coverage permits it. |
| Successful Completion | 1. Opens Service Request from a registered unit or the Services navigation.<br>2. Selects the exact AC unit when the screen was not opened from that unit.<br>3. Selects cleaning or service, or selects warranty support.<br>4. Enters the concern and a preferred date for a standard service request.<br>5. Validates the unit, duplicate-request state, coverage, address, and contact number.<br>6. Creates the service request or warranty claim.<br>7. Displays submission confirmation and waits for staff assignment and scheduling. |
| Alternative | 1. Attempts to submit for a unit with an active request or active warranty claim.<br>2. Blocks the duplicate submission and displays the current request state.<br>3. Returns the Customer to the parent Service Request screen. |
| Pre-condition | The Customer is signed in and owns at least one registered AC unit. |
| Post-condition | A service request or warranty claim is saved and linked to the exact registered unit. |
| Assumption | The service catalogue, unit registry, address coverage, and backend are available. |

### View work orders

| Field | Value |
|---|---|
| Use Case Name | View work orders |
| Actor | Technician |
| Description | Allow the actor to review assigned work orders, filter them by schedule and status, and find the latest active or completed work. |
| Successful Completion | 1. Opens My Work Orders.<br>2. Loads work orders assigned to the Technician.<br>3. Sorts the collection with recent relevant work first.<br>4. Applies Today, Upcoming, All Dates, status, type, or search filters.<br>5. Displays the matching work-order cards.<br>6. Selects a work order to open its details. |
| Alternative | 1. Selects a work order that is no longer assigned or accessible.<br>2. Rejects the detail request and refreshes the assignment list.<br>3. Returns the Technician to the parent My Work Orders screen. |
| Pre-condition | The Technician is signed in and has completed required first-login setup. |
| Post-condition | None. |
| Assumption | The task service is reachable for the latest assignment state. |

### Check in

| Field | Value |
|---|---|
| Use Case Name | Check in |
| Actor | Technician |
| Description | Allow the actor to record GPS arrival for an active assigned visit before service or installation work continues. |
| Successful Completion | 1. Opens an active Work Order Details screen.<br>2. Selects Check in at the service address.<br>3. Requests the device location with the required permission.<br>4. Captures the current GPS coordinates and arrival time.<br>5. Saves the check-in against the work order.<br>6. Displays the next service or installation action. |
| Alternative | 1. Denies location permission or fails to obtain valid coordinates.<br>2. Leaves the work order without a saved check-in and displays an arrival error.<br>3. Returns the Technician to the parent Work Order Details screen. |
| Pre-condition | The Technician is assigned as the primary technician and the work order is active. |
| Post-condition | The work order contains a GPS check-in and arrival timestamp. |
| Assumption | Device location services are enabled and the backend can receive the check-in. |

### Identify unit

| Field | Value |
|---|---|
| Use Case Name | Identify unit |
| Actor | Technician |
| Description | Allow the actor to verify an installation unit by scanning its assigned inventory QR code or manually entering its assigned serial number. |
| Successful Completion | 1. Opens Verify Assigned AC Unit from the installation work order.<br>2. Chooses QR scan or manual serial entry.<br>3. Scans the label or enters the printed serial number.<br>4. Validates the serial against the latest assigned work-order inventory.<br>5. Records the room size for the verified unit.<br>6. Saves the AMP registration and verification source.<br>7. Displays progress toward all assigned units being verified. |
| Alternative | 1. Scans or enters a serial number that is not assigned to the work order.<br>2. Rejects the unit and displays Wrong AC unit.<br>3. Returns the Technician to the earlier identification step for a different assigned QR or serial. |
| Pre-condition | The Technician has checked in to an installation work order with assigned inventory serials. |
| Post-condition | The assigned serial is verified and its AMP registration and room information are saved. |
| Assumption | Camera permission is available for scanning, or the printed serial is readable for manual entry. |

### Record visit attempt

| Field | Value |
|---|---|
| Use Case Name | Record visit attempt |
| Actor | Technician |
| Description | Allow the actor to close an unattended or failed installation attempt with an outcome, note, GPS-linked photo proof, and Admin follow-up state. |
| Successful Completion | 1. Opens Visit Attempt after a saved GPS check-in.<br>2. Selects the unattended or failed-installation outcome.<br>3. Enters a visit note.<br>4. Captures one proof photo.<br>5. Submits the attempt with the original check-in timestamp.<br>6. Places the work order on hold and marks it for Admin follow-up.<br>7. Returns the Technician to Work Order Details. |
| Alternative | 1. Submits without an outcome, note, proof photo, or valid saved check-in.<br>2. Blocks the submission and explains the missing requirement.<br>3. Returns the Technician to the earlier Visit Attempt form for completion. |
| Pre-condition | The Technician is the primary assignee, the work order is in progress, and GPS check-in is saved. |
| Post-condition | A visit-attempt record is saved, the task is on hold, and operational users and the Customer receive the appropriate update. |
| Assumption | The camera, location evidence, and backend are available. |

### Submit work report

| Field | Value |
|---|---|
| Use Case Name | Submit work report |
| Actor | Technician |
| Description | Allow the actor to complete a service or installation work order with required findings, costs, payment state, verified-unit data, and photo proof. |
| Successful Completion | 1. Opens Complete Service Visit or Complete Installation from the active work order.<br>2. Enters the required service findings and completed work, or confirms all assigned installation units are verified.<br>3. Captures the required after-service or installed-unit photo.<br>4. Saves service costs and confirms required customer payment when applicable.<br>5. Confirms final completion.<br>6. Saves the proof and marks the work order completed.<br>7. Synchronizes the linked order or service request, warranty, service history, and AMP record.<br>8. Returns the Technician to My Work Orders. |
| Alternative | 1. Submits without a required check-in, report field, unit verification, payment confirmation, or proof photo.<br>2. Blocks completion and identifies the missing requirement.<br>3. Returns the Technician to the earlier completion form for correction. |
| Pre-condition | The Technician is the primary assignee and the work order is active with all preceding workflow requirements satisfied. |
| Post-condition | The work order and all linked operational records are completed and synchronized. |
| Assumption | Photo capture, payment confirmation services, and all linked backend records are available. |

### Manage notes

| Field | Value |
|---|---|
| Use Case Name | Manage notes |
| Actor | Technician |
| Description | Allow the actor to view AC history and create, update, or delete structured service notes while the assigned work order is in progress. |
| Successful Completion | 1. Opens Service Notes from an active work order.<br>2. Reviews saved visit notes or linked AC unit history.<br>3. Selects Add, Edit, or Delete for a service note.<br>4. Enters or revises condition, findings, completed work, status, labor, parts, costs, and optional notes.<br>5. Validates that the work order remains in progress.<br>6. Saves the note change to the task service logs.<br>7. Returns the Technician to the updated Service Notes list. |
| Alternative | 1. Attempts to change a note after the work order is no longer in progress.<br>2. Blocks the mutation and preserves the existing service history.<br>3. Returns the Technician to the parent Service Notes screen. |
| Pre-condition | The Technician is assigned to the selected work order and the task and note are accessible. |
| Post-condition | The task service-log collection reflects the saved create, update, or delete operation. |
| Assumption | The task remains online and unchanged while the note is submitted. |

## Communications

### View notifications

| Field | Value |
|---|---|
| Use Case Name | View notifications |
| Actor | Customer, Technician |
| Description | Allow the actor to review role-specific operational updates, mark an opened item as read, and follow its saved destination route. Mobile archive and restore controls are not implemented. |
| Successful Completion | 1. Opens Notifications or Alerts.<br>2. Loads notifications for the authenticated account.<br>3. Displays unread and read updates in newest-first order.<br>4. Selects a notification.<br>5. Marks the notification as read on the server and in the local list.<br>6. Opens the validated Customer or Technician destination when one is present. |
| Alternative | 1. Selects a notification whose destination record is no longer accessible.<br>2. Marks the notification read but blocks the invalid destination.<br>3. Returns the actor to the parent Notifications screen. |
| Pre-condition | The actor is signed in. |
| Post-condition | The opened notification is saved as read. |
| Assumption | Notification and destination services are reachable. |

### Contact support

| Field | Value |
|---|---|
| Use Case Name | Contact support |
| Actor | Customer |
| Description | Allow the actor to send a categorized, tracked support message to the responsible Admin and make it visible to Superadmin. |
| Successful Completion | 1. Opens Contact Support.<br>2. Selects a support category.<br>3. Enters a subject and a message of sufficient length.<br>4. Submits the message.<br>5. Validates the authenticated Customer and message fields.<br>6. Saves and routes the message to operational staff.<br>7. Displays a confirmation to the Customer. |
| Alternative | 1. Submits a blank subject, a message shorter than ten characters, or an expired session.<br>2. Blocks the request and displays the relevant validation or sign-in error.<br>3. Returns the Customer to the earlier Contact Support form for correction. |
| Pre-condition | The Customer is signed in. |
| Post-condition | A tracked support message is saved for Admin and Superadmin review. |
| Assumption | The contact-message service is reachable. |

## Account Management

### Manage profile

| Field | Value |
|---|---|
| Use Case Name | Manage profile |
| Actor | Customer, Technician |
| Description | Allow the actor to review and update the editable identity and contact fields permitted for the account role. |
| Successful Completion | 1. Opens Account or Profile.<br>2. Selects Edit account details.<br>3. Updates the permitted name, username, or phone fields.<br>4. Validates the values and role restrictions.<br>5. Saves the profile update.<br>6. Refreshes the authenticated account state.<br>7. Displays the revised profile. |
| Alternative | 1. Enters an invalid phone number, name, or unavailable username.<br>2. Rejects the update and preserves the existing profile.<br>3. Returns the actor to the earlier profile editor for correction. |
| Pre-condition | The actor is signed in. |
| Post-condition | The permitted profile fields are updated for the authenticated account. |
| Assumption | The profile service is reachable. |

### Manage addresses

| Field | Value |
|---|---|
| Use Case Name | Manage addresses |
| Actor | Customer |
| Description | Allow the actor to add, edit, delete, and select a default Philippine delivery address used for checkout and service routing. |
| Successful Completion | 1. Opens Account and the Delivery Addresses section.<br>2. Selects an existing address or Add delivery address.<br>3. Enters recipient, phone, region, province, city, barangay, street, and postal code.<br>4. Chooses whether the address is the default.<br>5. Validates the address and postal rules.<br>6. Saves the address and refreshes branch assignment.<br>7. Displays the updated address list. |
| Alternative | 1. Submits an incomplete or invalid address.<br>2. Rejects the mutation and identifies the invalid fields.<br>3. Returns the Customer to the earlier address editor for correction. |
| Pre-condition | The Customer is signed in. |
| Post-condition | The saved address collection and default address state are updated. |
| Assumption | Philippine address reference data and branch coverage services are reachable. |

### Change password

| Field | Value |
|---|---|
| Use Case Name | Change password |
| Actor | Customer, Technician |
| Description | Enable the actor to replace a password from authenticated mobile settings where implemented. Technician can use this flow, while the requested Customer mobile account-settings flow is absent and Customer password recovery remains available instead. |
| Successful Completion | 1. Opens Technician Profile.<br>2. Selects Change Password.<br>3. Enters the current password and a different new password of 8 to 25 characters.<br>4. Confirms the new password.<br>5. Validates the current credential and password policy.<br>6. Saves the new Technician password.<br>7. Displays password changed confirmation. |
| Alternative | 1. Opens Customer Account expecting an authenticated password-change control.<br>2. Provides no Customer mobile password-change action and leaves the password unchanged.<br>3. Returns the Customer to the parent Account screen. |
| Pre-condition | The Technician is signed in and knows the current password. Customer must use account recovery because the mobile Customer change flow is absent. |
| Post-condition | The Technician password is replaced. No Customer password is changed through mobile account settings. |
| Assumption | The user service is reachable. |

### Change authenticator

| Field | Value |
|---|---|
| Use Case Name | Change authenticator |
| Actor | Customer, Technician |
| Description | Enable the actor to replace an existing authenticator from account settings. This requested use case is not implemented: Customer setup and recovery exist outside Account Management, and Technician authenticator use is explicitly blocked. |
| Successful Completion | None. |
| Alternative | 1. Opens mobile Account or Profile expecting an authenticator-change control.<br>2. Provides no authenticated change action and leaves the existing security state unchanged.<br>3. Returns the actor to the parent Account or Profile screen. |
| Pre-condition | None. |
| Post-condition | None. |
| Assumption | None. |

## Web Application

## Authentication

### Sign in

| Field | Value |
|---|---|
| Use Case Name | Sign in |
| Actor | Visitor, Customer, Admin, Superadmin |
| Description | Allow the actor to authenticate through the shared web sign-in and enter the home route permitted for the account role. Visitor describes the signed-out person who initiates the flow rather than a stored account role. |
| Successful Completion | 1. Opens the Sign in page.<br>2. Enters the account email or identifier and password.<br>3. Validates the credentials and active account state.<br>4. Enters an authenticator code when the account has TOTP enabled.<br>5. Creates the authenticated web session.<br>6. Routes the Customer, Admin, or Superadmin to the correct role home page. |
| Alternative | 1. Submits an invalid password or required authenticator code.<br>2. Rejects the sign-in attempt and increments the failed attempt count.<br>3. Prompts the actor to try the failed credential again when the failed attempt count is below five.<br>4. Locks the account for 15 minutes when the failed attempt count reaches five.<br>5. Stops the flow until the lockout expires. |
| Pre-condition | The actor is signed out, and a Customer, Admin, or Superadmin account exists for successful authentication. |
| Post-condition | An authenticated web session exists and the account is routed to its permitted workspace. |
| Assumption | The backend is reachable and an account challenged for TOTP has access to its configured authenticator. |

### Register

| Field | Value |
|---|---|
| Use Case Name | Register |
| Actor | Visitor, Customer |
| Description | Allow the actor to create a Customer account through the public multi-step registration flow with verified email, profile, address, password, and legal consent. |
| Successful Completion | 1. Opens Register from the public site or Sign in page.<br>2. Enters email and requests an email verification code.<br>3. Enters the six-digit code and verifies the email.<br>4. Enters profile, username, address, and password information.<br>5. Accepts the required legal acknowledgments.<br>6. Validates the completed registration.<br>7. Creates the Customer account and routes the new Customer to required security setup or sign in. |
| Alternative | 1. Enters an invalid or expired email verification code.<br>2. Rejects the code and leaves the registration incomplete.<br>3. Prompts the actor to enter another code when the verification attempt count is below five.<br>4. Locks that code when the verification attempt count reaches five.<br>5. Stops the flow until a new code can be requested after the resend cooldown. |
| Pre-condition | The actor is signed out and the supplied email is not already registered. |
| Post-condition | A verified Customer account is created with saved registration and consent data. |
| Assumption | Email delivery is available and the actor can access the supplied inbox. |

### Recover account

| Field | Value |
|---|---|
| Use Case Name | Recover account |
| Actor | Visitor, Customer, Admin, Superadmin |
| Description | Allow the actor to request an email reset code and replace the password for an existing account. The web application does not expose authenticator recovery or replacement. |
| Successful Completion | 1. Opens Forgot Password from Sign in.<br>2. Enters the account email or identifier.<br>3. Sends a six-digit reset code to the registered email address.<br>4. Enters the code and a new password of 8 to 25 characters.<br>5. Verifies and consumes the reset code.<br>6. Saves the new password.<br>7. Returns the actor to Sign in. |
| Alternative | 1. Enters an invalid or expired reset code.<br>2. Rejects the reset and keeps the current password.<br>3. Prompts the actor to enter another code when the verification attempt count is below five.<br>4. Locks that code when the verification attempt count reaches five.<br>5. Stops the flow until a new reset code can be requested after the resend cooldown. |
| Pre-condition | The account exists and has a recoverable email address. |
| Post-condition | The account password is replaced and the temporary reset request is consumed. |
| Assumption | Email delivery is available and the actor can access the registered inbox. |

## E-commerce

### Browse catalogue

| Field | Value |
|---|---|
| Use Case Name | Browse catalogue |
| Actor | Visitor, Customer |
| Description | Allow the actor to browse the public AC catalogue and narrow products by search, type, brand, price, horsepower, and sort order. |
| Successful Completion | 1. Opens Shop from the public or Customer navigation.<br>2. Loads active public products and availability.<br>3. Searches, filters, or sorts the catalogue.<br>4. Selects a product card.<br>5. Displays its image, model, price, specifications, warranty text, and stock state. |
| Alternative | 1. Opens Shop while the catalogue service is unavailable.<br>2. Displays a catalogue loading error without presenting a successful purchase action.<br>3. Returns the actor to the parent Shop screen. |
| Pre-condition | None. |
| Post-condition | None. |
| Assumption | The public product service is reachable. |

### Manage cart

| Field | Value |
|---|---|
| Use Case Name | Manage cart |
| Actor | Customer |
| Description | Allow the actor to add available products, adjust quantities within stock limits, remove products, and preserve the cart in the authenticated session. |
| Successful Completion | 1. Opens a product in Shop.<br>2. Adds the product to the cart.<br>3. Opens the cart drawer.<br>4. Changes a quantity or removes an item.<br>5. Clamps quantities to available stock.<br>6. Synchronizes the cart with the authenticated server session.<br>7. Displays the revised item count and total. |
| Alternative | 1. Attempts to keep a product that is unavailable or exceeds active stock.<br>2. Removes or reduces the invalid quantity and displays a stock message.<br>3. Returns the Customer to the parent Shop screen with the corrected cart. |
| Pre-condition | The Customer is signed in and an active product is available. |
| Post-condition | The authenticated session contains the revised cart. |
| Assumption | Current product stock can be loaded. |

### Checkout

| Field | Value |
|---|---|
| Use Case Name | Checkout |
| Actor | Customer |
| Description | Allow the actor to validate stock and address coverage, choose cash on delivery, GCash, or credit-card payment, and place an order. |
| Successful Completion | 1. Opens Checkout with a non-empty cart.<br>2. Selects or creates a complete delivery address.<br>3. Resolves the responsible inventory branch.<br>4. Selects cash on delivery, GCash, or credit-card payment.<br>5. Revalidates current stock, prices, and totals.<br>6. Creates the order with an idempotency key.<br>7. Opens PayMongo for online payment or confirms the cash on delivery order.<br>8. Displays the server-backed order confirmation. |
| Alternative | 1. Fails or cancels a GCash payment before PayMongo confirms it.<br>2. Keeps the order unpaid and available in My Orders.<br>3. Offers Pay Again when the total GCash payment attempt count is below three.<br>4. Blocks further GCash attempts when the total attempt count reaches three.<br>5. Stops the payment flow without marking the order paid. |
| Pre-condition | The Customer is signed in, the cart is non-empty, and a valid address is inside a configured service area. |
| Post-condition | An order is created with payment state based on confirmed provider or cash on delivery status. |
| Assumption | Product stock, branch coverage, and PayMongo are available when required. |

### Manage listings

| Field | Value |
|---|---|
| Use Case Name | Manage listings |
| Actor | Superadmin |
| Description | Allow the actor to create a shop product with starting branch stock and generated inventory serial records. The mounted web interface does not expose product edit, deactivate, or delete actions. |
| Successful Completion | 1. Opens Inventory Management and Shop Catalog.<br>2. Enters the product name, SKU, brand, category, specification, price, and stock alert level.<br>3. Selects a branch and a positive starting-stock quantity.<br>4. Enters an optional image URL when one is available.<br>5. Validates the product and stock fields.<br>6. Creates the product and one serial record per starting unit.<br>7. Displays the created listing and generated serials. |
| Alternative | 1. Submits missing product identity fields, duplicate identifiers, or invalid price or stock values.<br>2. Rejects product creation and displays the validation error.<br>3. Returns the Superadmin to the earlier Shop Catalog form for correction. |
| Pre-condition | The Superadmin is signed in. |
| Post-condition | A product listing, branch stock, and corresponding unit serial records are created. |
| Assumption | The product and inventory services are reachable. |

## Inventory Management

### View stock

| Field | Value |
|---|---|
| Use Case Name | View stock |
| Actor | Admin, Superadmin |
| Description | Allow the actor to inspect paginated branch inventory and identify available, low-stock, and out-of-stock products. |
| Successful Completion | 1. Opens Inventory Management.<br>2. Selects Inventory or Stock.<br>3. Loads products and stock for the permitted branch scope.<br>4. Selects a branch when the role permits company-wide selection.<br>5. Searches or filters by stock state.<br>6. Displays product, SKU, branch quantity, threshold, and serial summary.<br>7. Uses pagination to review additional records. |
| Alternative | 1. Loads a branch inventory that the account is not permitted to access.<br>2. Rejects the request or confines the results to the allowed branch.<br>3. Returns the actor to the parent Inventory Management screen. |
| Pre-condition | The Admin or Superadmin is signed in. |
| Post-condition | None. |
| Assumption | Product and branch-stock services are reachable. |

### Request restock

| Field | Value |
|---|---|
| Use Case Name | Request restock |
| Actor | Admin |
| Description | Allow the actor to submit a branch reorder request for a product and track its approval state. |
| Successful Completion | 1. Opens Inventory Management and Reorder Management.<br>2. Reviews current branch products and existing requests.<br>3. Selects a product and enters the requested quantity and reason.<br>4. Submits the reorder request.<br>5. Validates the branch, product, quantity, and duplicate-request state.<br>6. Saves the request with Submitted status.<br>7. Displays the request in the Admin's reorder list. |
| Alternative | 1. Submits an invalid quantity, missing product, or duplicate active request.<br>2. Rejects the request and leaves inventory unchanged.<br>3. Returns the Admin to the earlier Reorder Management form for correction. |
| Pre-condition | The Admin is signed in and assigned to a branch. |
| Post-condition | A submitted reorder request is saved for Superadmin review. |
| Assumption | Product and reorder services are reachable. |

### Approve restock

| Field | Value |
|---|---|
| Use Case Name | Approve restock |
| Actor | Superadmin |
| Description | Allow the actor to review company reorder requests and update a submitted request to an approved or rejected state. |
| Successful Completion | 1. Opens Inventory Management and Reorder Approvals.<br>2. Loads submitted reorder requests across branches.<br>3. Filters the queue and selects a request.<br>4. Reviews the branch, product, quantity, reason, and request history.<br>5. Approves or rejects the request.<br>6. Updates the saved request status.<br>7. Refreshes the queue with the decision. |
| Alternative | 1. Selects a request that another operation has already processed.<br>2. Rejects the stale status update and displays the current state.<br>3. Returns the Superadmin to the parent Reorder Approvals screen. |
| Pre-condition | The Superadmin is signed in and at least one reorder request exists. |
| Post-condition | The selected reorder request contains the Superadmin decision. |
| Assumption | The reorder service is reachable. |

### Manage unit registry

| Field | Value |
|---|---|
| Use Case Name | Manage unit registry |
| Actor | Admin, Superadmin |
| Description | Allow the actor to search and review product serial and QR unit records. Superadmin can update a manufacturer serial, while Admin has view-only registry access and no print action is implemented. |
| Successful Completion | 1. Opens Serial or QR Registry from Inventory Management.<br>2. Loads serial-unit records within the permitted branch scope.<br>3. Searches or filters the registry by product, serial, QR identifier, branch, or status.<br>4. Selects a serial-unit record.<br>5. Displays its product, inventory serial, QR Unit ID, manufacturer serial, branch, and status.<br>6. Lets Superadmin enter and save a manufacturer serial when an update is required.<br>7. Refreshes the registry with the saved value. |
| Alternative | 1. Attempts an update as Admin or submits an invalid or conflicting manufacturer serial as Superadmin.<br>2. Blocks the update and preserves the current registry record.<br>3. Returns the actor to the parent Serial or QR Registry screen. |
| Pre-condition | The Admin or Superadmin is signed in and serial records exist. |
| Post-condition | The registry remains unchanged for view-only access or contains the Superadmin's valid manufacturer-serial update. |
| Assumption | Product serial records and registry services are reachable. |

## Order Fulfillment

### View orders

| Field | Value |
|---|---|
| Use Case Name | View orders |
| Actor | Customer |
| Description | Allow the actor to review and filter personal orders and open detailed payment, fulfillment, installation, and receipt information. |
| Successful Completion | 1. Opens My Orders.<br>2. Loads the Customer's latest order records.<br>3. Filters the orders by workflow status.<br>4. Selects an order card.<br>5. Displays the order timeline and fulfillment details.<br>6. Displays payment, delivery, technician, installation, cancellation, refund, and receipt information when present. |
| Alternative | 1. Selects an order that is no longer accessible to the Customer.<br>2. Rejects the order detail request and shows an error.<br>3. Returns the Customer to the parent My Orders screen. |
| Pre-condition | The Customer is signed in. |
| Post-condition | None. |
| Assumption | The order service is reachable. |

### Manage order

| Field | Value |
|---|---|
| Use Case Name | Manage order |
| Actor | Customer |
| Description | Allow the actor to request cancellation, reopen eligible online payment, reorder previous items, track fulfillment, or open the order receipt. |
| Successful Completion | 1. Opens an order from My Orders.<br>2. Reviews the controls allowed by the current workflow and payment state.<br>3. Selects Track, Pay Again, Cancel, Reorder, or Receipt.<br>4. Validates ownership and action eligibility.<br>5. Saves the cancellation request, opens PayMongo, restores prior items to the cart, or opens the requested detail.<br>6. Refreshes the order or destination with the resulting state. |
| Alternative | 1. Starts Pay Again for an unpaid GCash order whose prior payment failed.<br>2. Records the failed attempt and leaves the order unpaid.<br>3. Offers another attempt when the total attempt count is below three.<br>4. Blocks payment when the total attempt count reaches three.<br>5. Stops the payment flow and returns the Customer to the order details. |
| Pre-condition | The Customer is signed in and owns the selected order. |
| Post-condition | The eligible selected order action is recorded or its destination is opened. |
| Assumption | PayMongo is available when online payment is selected. |

### View customer orders

| Field | Value |
|---|---|
| Use Case Name | View customer orders |
| Actor | Admin, Superadmin |
| Description | Allow the actor to review paginated Customer orders, payment and delivery state, assigned technicians, installation progress, cancellation requests, and refund-review records. |
| Successful Completion | 1. Opens Services and Customer Orders.<br>2. Loads orders and linked work orders within the permitted branch scope.<br>3. Filters all orders, refund reviews, or cancellation requests.<br>4. Uses pagination to select the required page.<br>5. Selects or expands an order card.<br>6. Displays items, serials, payment, delivery, schedule, technician, proof, and recovery state. |
| Alternative | 1. Selects an order outside the Admin's branch scope or an order that no longer exists.<br>2. Rejects the inaccessible record and refreshes the visible order queue.<br>3. Returns the actor to the parent Customer Orders screen. |
| Pre-condition | The Admin or Superadmin is signed in. |
| Post-condition | None. |
| Assumption | Order and linked-task services are reachable. |

### Manage customer order

| Field | Value |
|---|---|
| Use Case Name | Manage customer order |
| Actor | Admin, Superadmin |
| Description | Allow the actor to process an order through payment review, fulfillment, dispatch, technician assignment, installation, cancellation, refund review, and supported recovery actions. |
| Successful Completion | 1. Opens an eligible order in Customer Orders.<br>2. Reviews its payment, stock, delivery, cancellation, and linked-task state.<br>3. Selects the next allowed workflow action.<br>4. Enters the required technician, date, time slot, or cancellation reason.<br>5. Validates branch stock, payment, schedule conflicts, and current status.<br>6. Updates the order and creates or synchronizes the linked work order when required.<br>7. Refreshes the order card and operational notifications. |
| Alternative | 1. Submits an action from a stale status or without required assignment or schedule data.<br>2. Rejects the mutation and preserves the current order state.<br>3. Returns the actor to the earlier order-management controls for correction. |
| Pre-condition | The Admin or Superadmin is signed in and can access the selected order. |
| Post-condition | The order and any affected work-order, inventory, receipt, or refund state are synchronized. |
| Assumption | Order, inventory, task, payment-verification, and notification services are reachable. |

## Field Service

### View my units

| Field | Value |
|---|---|
| Use Case Name | View my units |
| Actor | Customer |
| Description | Allow the actor to review registered AC units and open unit-specific warranty, service-history, AMP, and care information. |
| Successful Completion | 1. Opens My AC Units.<br>2. Loads units registered to the Customer account.<br>3. Searches, filters, or sorts the unit list.<br>4. Selects a unit.<br>5. Opens the unit-details modal.<br>6. Displays overview, history, warranty, suggested servicing date, explanation, and care guidance. |
| Alternative | 1. Selects a unit that is no longer registered to the Customer.<br>2. Rejects the inaccessible unit and displays an availability error.<br>3. Returns the Customer to the parent My AC Units screen. |
| Pre-condition | The Customer is signed in. |
| Post-condition | None. |
| Assumption | Unit, warranty, service-history, and AMP services are reachable. |

### Book service

| Field | Value |
|---|---|
| Use Case Name | Book service |
| Actor | Customer |
| Description | Enable the actor to submit a maintenance request or warranty claim from the web application. This requested use case is not implemented because web Services explicitly directs Customers to the mobile application for submission. |
| Successful Completion | None. |
| Alternative | 1. Attempts to start service booking from the web Services page.<br>2. Displays mobile-only guidance and does not create a service request or warranty claim.<br>3. Returns the Customer to the parent Services screen. |
| Pre-condition | None. |
| Post-condition | None. |
| Assumption | None. |

### Manage service requests

| Field | Value |
|---|---|
| Use Case Name | Manage service requests |
| Actor | Admin, Superadmin |
| Description | Allow the actor to review service and warranty queues, set service quotes, schedule visits, assign eligible technicians, cancel requests, and monitor linked work-order completion. |
| Successful Completion | 1. Opens Services and Service Requests.<br>2. Searches or filters the request queue.<br>3. Selects a request and reviews Customer, unit, concern, branch, payment, and history details.<br>4. Sets a service quote when required.<br>5. Selects an eligible technician, appointment date, and conflict-free time slot.<br>6. Saves the assignment and creates or updates the linked work order.<br>7. Notifies the Customer and Technician of the saved schedule.<br>8. Displays synchronized request and work-order status. |
| Alternative | 1. Assigns a conflicting technician, an invalid schedule, or a warranty technician without a defined Service Quota.<br>2. Blocks the assignment and displays the precise eligibility or scheduling error.<br>3. Returns the actor to the earlier assignment controls for correction. |
| Pre-condition | The Admin or Superadmin is signed in and can access the request's branch. |
| Post-condition | The request contains the saved quote or assignment and is synchronized with its linked work order. |
| Assumption | Request, user, schedule, task, and notification services are reachable. |

### Manage technicians

| Field | Value |
|---|---|
| Use Case Name | Manage technicians |
| Actor | Admin, Superadmin |
| Description | Allow the actor to review Technician accounts, assignments, status, branch, Service Quota, GPS check-in, and current work. Superadmin can add Technician accounts, while Admin does not have staff-creation permission. |
| Successful Completion | 1. Opens Services and Technicians.<br>2. Loads Technician accounts and assigned work orders.<br>3. Searches or filters the Technician list.<br>4. Selects a Technician or open work order.<br>5. Reviews account status, branch, Service Quota, schedule, and check-in state.<br>6. Updates permitted Technician details or task assignment.<br>7. Lets Superadmin create a Technician with a temporary login when needed.<br>8. Refreshes the list with the saved result. |
| Alternative | 1. Attempts to create a Technician as Admin or submits invalid credentials, branch, or conflicting assignment data.<br>2. Blocks the unauthorized or invalid mutation and preserves current records.<br>3. Returns the actor to the parent Technicians screen. |
| Pre-condition | The Admin or Superadmin is signed in. |
| Post-condition | Permitted Technician or assignment data is updated, or a Superadmin-created Technician account is saved. |
| Assumption | User and task services are reachable. |

### View schedule

| Field | Value |
|---|---|
| Use Case Name | View schedule |
| Actor | Admin, Superadmin |
| Description | Allow the actor to review daily field work and update eligible dates, time slots, primary technicians, support teams, and operational notes without creating duplicate tasks. |
| Successful Completion | 1. Opens Services and Daily Schedule.<br>2. Selects a date and permitted branch scope.<br>3. Loads scheduled work orders and Technician availability.<br>4. Reviews time, Customer, location, payment, team, scope, notes, and status.<br>5. Selects an eligible work order for editing.<br>6. Updates permitted schedule and team fields.<br>7. Validates schedule conflicts and locked service assignments.<br>8. Saves the same work order and refreshes the daily view. |
| Alternative | 1. Selects a primary or support Technician with an overlapping job.<br>2. Blocks the schedule update and identifies the unavailable Technician.<br>3. Returns the actor to the earlier schedule editor for correction. |
| Pre-condition | The Admin or Superadmin is signed in and scheduled tasks exist or can be created through Technician Management. |
| Post-condition | The selected work order contains the updated conflict-free schedule and team data. |
| Assumption | Task and Technician availability services are reachable. |

### Handle messages

| Field | Value |
|---|---|
| Use Case Name | Handle messages |
| Actor | Admin, Superadmin |
| Description | Allow the actor to search Customer support tickets, review their timeline, send a reply, and move each ticket through new, in-progress, resolved, or reopened states. |
| Successful Completion | 1. Opens Services and Customer Messages.<br>2. Loads support messages within the permitted operational scope.<br>3. Searches or filters the queue by status.<br>4. Selects a message and reviews Customer, routing, content, and timeline.<br>5. Enters a reply or selects a status action.<br>6. Saves the reply and updated status.<br>7. Refreshes the ticket and activity timeline. |
| Alternative | 1. Submits an empty reply or updates a message that is no longer accessible.<br>2. Blocks the invalid mutation and preserves the current ticket.<br>3. Returns the actor to the earlier message-detail controls for correction. |
| Pre-condition | The Admin or Superadmin is signed in and a support message exists. |
| Post-condition | The ticket contains the saved reply, status, and activity record. |
| Assumption | The contact-message service is reachable. |

## Analytics

### View maintenance

| Field | Value |
|---|---|
| Use Case Name | View maintenance |
| Actor | Admin, Superadmin |
| Description | Allow the actor to review branch or company AMP maintenance recommendations, structured AI decision support, due dates, unit context, and saved service plans. |
| Successful Completion | 1. Opens AMP Planning.<br>2. Loads maintenance units and recommendations for the permitted scope.<br>3. Filters or pages through the unit list.<br>4. Selects Review recommendation for a unit.<br>5. Displays summary sections for assessment, technician record, current issues, completed work, Customer observation, priority, actions, schedule, explanation, and operational context when available.<br>6. Expands See more for the complete recommendation.<br>7. Opens or saves the permitted service-plan review. |
| Alternative | 1. Selects a maintenance unit outside the actor's permitted branch scope.<br>2. Blocks the record and displays an access or loading error.<br>3. Returns the actor to the parent AMP Planning screen. |
| Pre-condition | The Admin or Superadmin is signed in. |
| Post-condition | None unless the actor explicitly saves a maintenance plan decision. |
| Assumption | AMP unit, service-history, and recommendation services are reachable. |

### View workload plan

| Field | Value |
|---|---|
| Use Case Name | View workload plan |
| Actor | Superadmin |
| Description | Allow the actor to review the company-wide 12-month AMP maintenance workload by branch and projected service demand. |
| Successful Completion | 1. Opens the Superadmin AMP workload plan.<br>2. Loads the 12-month maintenance forecast.<br>3. Selects the required branch, period, or workload view.<br>4. Groups planned maintenance demand by month and branch.<br>5. Displays projected unit counts and workload context.<br>6. Reviews the plan for operational scheduling decisions. |
| Alternative | 1. Requests a workload period whose AMP data cannot be loaded.<br>2. Displays a workload error without changing saved maintenance records.<br>3. Returns the Superadmin to the parent AMP Planning screen. |
| Pre-condition | The Superadmin is signed in. |
| Post-condition | None. |
| Assumption | AMP planning and historical service data are available. |

### Generate reports

| Field | Value |
|---|---|
| Use Case Name | Generate reports |
| Actor | Superadmin |
| Description | Allow the actor to generate filtered Business Intelligence, Sales, Inventory, or Technician Performance reports and export eligible results. The current implementation also grants the same reporting workspace to Admin. |
| Successful Completion | 1. Opens Analytics and Reports.<br>2. Selects Business Intelligence, Sales Report, Inventory Report, or Technician Performance.<br>3. Enters the date range and available branch or report-specific filters.<br>4. Selects Generate report.<br>5. Validates the range and filter values.<br>6. Loads and formats the operational report.<br>7. Displays the report results.<br>8. Exports to Excel or PDF when the result supports export. |
| Alternative | 1. Submits a reversed date range or unsupported filter value.<br>2. Blocks report generation and displays the validation error.<br>3. Returns the Superadmin to the earlier report filters for correction. |
| Pre-condition | The Superadmin is signed in. |
| Post-condition | The generated report is displayed, and an export file exists only when export is selected successfully. |
| Assumption | Reporting data and browser file generation are available. |

## Administration

### View dashboard

| Field | Value |
|---|---|
| Use Case Name | View dashboard |
| Actor | Admin, Superadmin |
| Description | Allow the actor to review role-scoped operational summaries, alerts, performance indicators, and navigation to management workspaces. |
| Successful Completion | 1. Opens the role home dashboard.<br>2. Loads current dashboard analytics for the permitted branch or company scope.<br>3. Displays sales, paid revenue, inventory, order, technician, and operational indicators available to the role.<br>4. Reviews charts, counts, and priority alerts.<br>5. Selects a dashboard link when deeper action is required.<br>6. Opens the corresponding protected management workspace. |
| Alternative | 1. Opens a dashboard route for a role that is not permitted to use it.<br>2. Redirects the account to its correct role home page.<br>3. Returns the actor to the authorized parent dashboard. |
| Pre-condition | The Admin or Superadmin is signed in. |
| Post-condition | None. |
| Assumption | Dashboard analytics services are reachable. |

### Manage branches

| Field | Value |
|---|---|
| Use Case Name | Manage branches |
| Actor | Superadmin |
| Description | Allow the actor to review the configured six branches, assign branch administrators, and update branch service-coverage settings. Creating or deleting branch records is not implemented. |
| Successful Completion | 1. Opens Branch Management.<br>2. Loads the configured branches, assigned administrators, and coverage data.<br>3. Selects a branch.<br>4. Selects an eligible administrator or edits service-coverage settings.<br>5. Validates the branch and assignment rules.<br>6. Saves the administrator or coverage update.<br>7. Refreshes the branch card with the new configuration. |
| Alternative | 1. Submits an invalid administrator assignment or malformed coverage configuration.<br>2. Rejects the update and preserves the current branch configuration.<br>3. Returns the Superadmin to the earlier branch editor for correction. |
| Pre-condition | The Superadmin is signed in and the configured branch list is available. |
| Post-condition | The selected branch contains the saved administrator or coverage settings. |
| Assumption | User and branch-coverage services are reachable. |

## Communications

### View notifications

| Field | Value |
|---|---|
| Use Case Name | View notifications |
| Actor | Customer, Admin, Superadmin |
| Description | Allow the actor to review account notifications, mark opened updates as read, and follow validated destinations. Admin and Superadmin can archive and restore notifications, while Customer archive controls are not exposed. |
| Successful Completion | 1. Opens the notification control.<br>2. Loads notifications for the authenticated account.<br>3. Displays unread and read updates.<br>4. Selects a notification.<br>5. Marks the item read and opens its permitted destination.<br>6. Lets Admin or Superadmin archive or restore an operational notification.<br>7. Refreshes the notification state and unread count. |
| Alternative | 1. Selects a notification whose destination is missing or not permitted for the account role.<br>2. Blocks the invalid destination while preserving the notification list.<br>3. Returns the actor to the parent notification panel. |
| Pre-condition | The Customer, Admin, or Superadmin is signed in. |
| Post-condition | Read state is saved, and Admin or Superadmin archive state is updated when that action is selected. |
| Assumption | Notification and destination services are reachable. |

### Contact support

| Field | Value |
|---|---|
| Use Case Name | Contact support |
| Actor | Customer |
| Description | Allow the actor to send a categorized support message that is routed to the responsible Admin and visible to Superadmin. |
| Successful Completion | 1. Opens Contact Support.<br>2. Selects a message category.<br>3. Enters a subject and detailed message.<br>4. Submits the support request.<br>5. Validates the authenticated Customer and message fields.<br>6. Saves the support ticket and routes it to operational staff.<br>7. Displays the ticket confirmation. |
| Alternative | 1. Submits missing or invalid message fields.<br>2. Rejects the request and identifies the validation problem.<br>3. Returns the Customer to the earlier Contact Support form for correction. |
| Pre-condition | The Customer is signed in. |
| Post-condition | A support ticket is saved for Admin and Superadmin handling. |
| Assumption | The contact-message service is reachable. |

## Account Management

### Manage profile

| Field | Value |
|---|---|
| Use Case Name | Manage profile |
| Actor | Customer, Admin, Superadmin |
| Description | Allow the actor to review and update the profile and contact fields exposed for the authenticated role. |
| Successful Completion | 1. Opens Settings or Profile.<br>2. Selects the profile editing control.<br>3. Updates the fields permitted for the role.<br>4. Submits the profile changes.<br>5. Validates names, contact values, usernames, and role restrictions.<br>6. Saves the profile.<br>7. Refreshes the authenticated user display with the revised values. |
| Alternative | 1. Enters invalid profile data or an unavailable username.<br>2. Rejects the update and preserves the existing profile.<br>3. Returns the actor to the earlier profile editor for correction. |
| Pre-condition | The Customer, Admin, or Superadmin is signed in. |
| Post-condition | The permitted profile fields are updated. |
| Assumption | The user-profile service is reachable. |

### Manage addresses

| Field | Value |
|---|---|
| Use Case Name | Manage addresses |
| Actor | Customer |
| Description | Allow the actor to add, edit, delete, and set a default Philippine delivery address for checkout and operational branch routing. |
| Successful Completion | 1. Opens Settings and My Addresses.<br>2. Selects an existing address or Add address.<br>3. Enters recipient, phone, region, province, city, barangay, street, and postal code.<br>4. Chooses whether the address is the default.<br>5. Validates the address and postal rules.<br>6. Saves the address collection.<br>7. Refreshes the default address and assigned branch context. |
| Alternative | 1. Submits missing or invalid address information.<br>2. Rejects the mutation and identifies the invalid fields.<br>3. Returns the Customer to the earlier address editor for correction. |
| Pre-condition | The Customer is signed in. |
| Post-condition | The saved address collection and default-address state are updated. |
| Assumption | Philippine address reference data and branch coverage services are reachable. |

### Change password

| Field | Value |
|---|---|
| Use Case Name | Change password |
| Actor | Customer, Admin, Superadmin |
| Description | Allow the actor to replace the current password from the role's authenticated account or profile settings. |
| Successful Completion | 1. Opens the account Security or Profile section.<br>2. Selects Change Password.<br>3. Enters the current password.<br>4. Enters and confirms a different new password of 8 to 25 characters.<br>5. Validates the current credential and password policy.<br>6. Saves the new password and updates session security state.<br>7. Displays password-changed confirmation. |
| Alternative | 1. Submits an incorrect current password or a new password that violates policy or does not match confirmation.<br>2. Rejects the change and preserves the current password.<br>3. Returns the actor to the earlier Change Password form for correction. |
| Pre-condition | The Customer, Admin, or Superadmin is signed in and knows the current password. |
| Post-condition | The account password is replaced and subsequent sign-in requires the new password. |
| Assumption | The user-security service is reachable. |

### Change authenticator

| Field | Value |
|---|---|
| Use Case Name | Change authenticator |
| Actor | Customer, Admin, Superadmin |
| Description | Enable the actor to replace an existing authenticator from authenticated web account settings. This requested use case is not implemented; only Customer initial setup is mounted, with no authenticated replacement screen for these roles. |
| Successful Completion | None. |
| Alternative | 1. Opens authenticated Settings or Profile expecting an authenticator-change control.<br>2. Provides no replacement action and leaves the authenticator state unchanged.<br>3. Returns the actor to the parent Settings or Profile screen. |
| Pre-condition | None. |
| Post-condition | None. |
| Assumption | None. |

## Implementation Corrections Identified

1. Replace the claim that every account uses TOTP with the live role-specific behavior, or implement the universal policy before documenting it as current.
2. Remove web Book service from the implemented use-case set unless a complete web submission workflow is added.
3. Remove Customer from mobile Change password or add the missing authenticated Customer password-change interface.
4. Remove Technician from authenticator setup and change use cases because the backend explicitly blocks Technician TOTP.
5. Add Admin to Generate reports in the actor matrix because Admin and Superadmin share the reporting APIs and mounted report workspaces.
6. Document Manage listings as create-only until edit and deactivate controls are exposed.
7. Document Manage unit registry as Admin view access and Superadmin manufacturer-serial update access until broader mutations and printing are implemented.
8. Keep service-request submission mobile-only and keep AMP Suggested Servicing Date separate from booking.

## Primary Evidence

- `front/src/App.js`
- `front/src/components/login/Login.js`
- `front/src/components/register/Register.js`
- `front/src/components/recover/ForgotPassword.js`
- `front/src/components/recover/ResetPassword.js`
- `front/src/components/shop/Shop.js`
- `front/src/components/checkout/Checkout.js`
- `front/src/components/orders/MyOrders.js`
- `front/src/components/ADMIN/Inventory/AdminInventory.js`
- `front/src/components/ADMIN/SerialQr/AdminSerialQr.js`
- `front/src/components/ADMIN/Orders/AdminOrders.js`
- `front/src/components/ADMIN/Maintenance/RequestDetails.js`
- `front/src/components/ADMIN/Technicians/AdminTechnician.js`
- `front/src/components/ADMIN/Technicians/DailyWorkSchedule.js`
- `front/src/components/ADMIN/ContactMessages/AdminContactMessages.js`
- `front/src/components/ADMIN/Reports/AdminReports.js`
- `front/src/components/AMP/ManagerAmpDashboard.js`
- `front/src/components/AMP/OwnerAmpDashboard.js`
- `front/src/components/SUPERADMIN/Dashboard/SuperAdminBranches.js`
- `front/src/components/SUPERADMIN/Dashboard/SuperAdminCatalog.js`
- `front/src/components/settings/Settings.js`
- `bork5/caact-mobile/app/(auth)/sign-in.jsx`
- `bork5/caact-mobile/app/(auth)/sign-up/step/2.jsx`
- `bork5/caact-mobile/app/(auth)/recover/factor/1.jsx`
- `bork5/caact-mobile/app/customer/checkout.jsx`
- `bork5/caact-mobile/app/customer/orders.jsx`
- `bork5/caact-mobile/app/customer/services.jsx`
- `bork5/caact-mobile/app/customer/settings.jsx`
- `bork5/caact-mobile/app/technician/tasks.jsx`
- `bork5/caact-mobile/app/technician/task/[id]/information.jsx`
- `bork5/caact-mobile/app/technician/task/[id]/amp-registration.jsx`
- `bork5/caact-mobile/app/technician/task/[id]/visit-attempt.jsx`
- `bork5/caact-mobile/app/technician/task/[id]/complete-service.jsx`
- `backend/src/controllers/authController.js`
- `backend/src/routes/securityRoutes.js`
- `backend/src/routes/orderRoutes.js`
- `backend/src/routes/productRoutes.js`
- `backend/src/routes/reorderRoutes.js`
- `backend/src/routes/serviceRequestRoutes.js`
- `backend/src/routes/taskRoutes.js`
- `backend/src/routes/userRoutes.js`
