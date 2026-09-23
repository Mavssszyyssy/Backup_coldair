# AEROPULSE Proposed Architecture Verification

**Verification date:** September 22, 2026  
**Verified branch:** `main-martyn`  
**Source:** Proposed architecture and terminology supplied for repository verification  
**Scope:** Web client, Expo mobile client, backend role enforcement, routes, mounted UI, and relevant automated contracts

## Verification Result

The proposed outline is **partially correct**, but it cannot be adopted as the current implementation architecture without corrections.

The most important repository-established differences are:

1. TOTP is **not implemented for all authenticated roles**. Customer TOTP is enforced. Admin and Superadmin are challenged only if TOTP is already enabled. Technician TOTP setup is explicitly blocked and Technician login deliberately bypasses TOTP.
2. `manager` and `owner` remain separate values in the live User role enum and have separate web routes. They are not merely labels that have been fully replaced.
3. Customer Service Booking is mobile-only. The web application explicitly prevents service and warranty submission.
4. Admin and Superadmin both have Operational Reports.
5. Technician has no operational web workspace, but can use the shared web sign-in and reach public web pages before being directed to the mobile-only notice.
6. A Security tab/container is still present in Customer web settings, and Security sections are present in mobile/profile interfaces. Security has not been completely collapsed.
7. Several proposed actions have dedicated screens and therefore meet the supplied definition of submodules.

## Automated Verification

Targeted tests executed during this verification:

- Web: 3 test files, 13 tests passed.
- Mobile: 7 test suites, 22 tests passed.
- Total: **35 tests passed**.

The mobile tests emitted Expo Router child-route warnings caused by isolated test rendering, but all selected suites completed successfully.

---

## Terminology and Role Assertions

Item: Application definition
Status: Confirmed
Notes: The repository contains two deployable client surfaces: `front/` for web and `bork5/caact-mobile/` for Expo mobile.

Item: Role definition limited to Visitor, Customer, Technician, Admin, and Superadmin
Status: Corrected
Notes: Visitor is unauthenticated rather than a stored role. The User model also contains separate `manager` and `owner` enum values.

Item: Visitor access limited to catalogue, registration, sign-in, and recovery
Status: Corrected
Notes: Visitor can also access public Home, FAQ, Terms, and Privacy pages. Visitor cannot access protected authenticated features.

Item: Customer uses mobile and web
Status: Confirmed
Notes: Customer layouts and routes exist on both clients.

Item: Technician uses mobile only and has no web workspace
Status: Corrected
Notes: Technician has no operational web workspace, but web sign-in accepts the role and redirects to `/technician-mobile`. Public Home, Shop, and FAQ routes are also reachable.

Item: Admin is branch-scoped and web-only
Status: Confirmed
Notes: Admin operational routes are web-only and backend data is scoped using the active or assigned branch.

Item: Superadmin is company-scoped and web-only
Status: Confirmed
Notes: Superadmin has company-wide web routes and no functional mobile workspace.

Item: Authentication is a sibling module
Status: Confirmed
Notes: Authentication is implemented through parallel top-level routes and does not wrap the other functional modules.

Item: TOTP required for every authenticated role
Status: Corrected
Notes: Customer TOTP is enforced. Admin and Superadmin receive a TOTP challenge only when their account already has TOTP enabled. Technician TOTP is explicitly unavailable and bypassed during login.

Item: Owner is only a legacy name for Superadmin
Status: Corrected
Notes: `owner` is still a distinct User enum value with `/owner/amp` routing and company-wide AMP handling.

Item: Manager is only a legacy name for Admin
Status: Corrected
Notes: `manager` is still a distinct User enum value with `/manager/amp` routing.

---

# Mobile Application Verification

## Authentication

Item: Registration as a submodule — Customer
Status: Confirmed
Notes: Mobile has a multi-step customer sign-up flow under the authentication route group.

Item: Sign-in as a submodule — Customer and Technician
Status: Confirmed
Notes: Both roles authenticate through the shared mobile sign-in flow. Technician authentication does not use TOTP.

Item: Password Reset as a submodule under Sign-in — Customer and Technician
Status: Corrected
Notes: Password recovery supports both roles, but it is implemented as a sibling route flow under Authentication and is navigated to from Sign-in rather than being a nested Sign-in screen.

Item: Authenticator Recovery as a submodule under Sign-in — Customer and Technician
Status: Corrected
Notes: Customer authenticator recovery exists. Technician authenticator recovery does not exist because the backend explicitly rejects Technician authenticator setup and recovery. The Customer recovery route is a sibling/recovery flow, not a nested Sign-in route.

## E-commerce

Item: Shop Catalogue as a submodule — Customer
Status: Confirmed
Notes: Dedicated Customer Shop screen exists.

Item: Browse products
Status: Confirmed
Notes: Product catalogue cards and lists are rendered from the catalogue response.

Item: Search products
Status: Confirmed
Notes: Shop search state and filtering are implemented.

Item: Filter products
Status: Confirmed
Notes: Product category and catalogue filters are implemented.

Item: View product details
Status: Confirmed
Notes: Product detail presentation is available inside the Shop interface.

Item: Cart as a submodule — Customer
Status: Confirmed
Notes: Cart is a stateful modal/container inside Shop rather than a dedicated route. This satisfies the supplied container-based submodule definition.

Item: Add item to cart
Status: Confirmed
Notes: Implemented through the shared Cart context.

Item: Update item quantity
Status: Confirmed
Notes: Cart quantity controls are implemented.

Item: Remove item from cart
Status: Confirmed
Notes: Cart removal is implemented.

Item: Checkout as a submodule — Customer
Status: Confirmed
Notes: Dedicated Customer Checkout screen exists.

Item: Select delivery address
Status: Confirmed
Notes: Checkout resolves and validates the selected/default saved delivery address.

Item: Select payment method
Status: Confirmed
Notes: Mobile Checkout exposes online/card and COD choices.

Item: Complete automatic payment
Status: Confirmed
Notes: Online payment uses the PayMongo checkout and payment-return workflow.

Item: Complete manual payment
Status: Confirmed
Notes: Cash on delivery is implemented as the manual payment path.

## Order Fulfillment

Item: My Orders as a submodule — Customer
Status: Confirmed
Notes: Dedicated Customer Orders screen exists.

Item: Order Details as a submodule — Customer
Status: Confirmed
Notes: Mobile uses a stateful expanded-order container and fetches a dedicated order record. It is not a separate route, but the supplied definition permits a stateful container to be a submodule.

Item: Retry payment — Customer
Status: Confirmed
Notes: Pending PayMongo payments can be retried subject to the configured attempt rules.

Item: Request cancellation — Customer
Status: Confirmed
Notes: Customer cancellation request is submitted to the dedicated order endpoint.

## Field Service

Item: My AC Units as a submodule — Customer
Status: Confirmed
Notes: Registered units are held and displayed in a named Customer Home container. It is not a separate list route.

Item: AC Unit Details as a submodule — Customer
Status: Confirmed
Notes: Dedicated `/customer/units/[id]` screen exists.

Item: Service Booking as a submodule — Customer
Status: Confirmed
Notes: Dedicated Customer Service Request screen exists and accepts a selected registered unit.

Item: Select service type
Status: Confirmed
Notes: Service/cleaning/warranty request type selection is implemented.

Item: Select schedule
Status: Confirmed
Notes: Customer appointment date and available schedule selection are implemented.

Item: Submit booking
Status: Confirmed
Notes: Mobile submits service requests and warranty claims to their respective APIs.

Item: My Work Orders as a submodule — Technician
Status: Confirmed
Notes: Dedicated Technician Work Orders list exists.

Item: Work Order Details as a submodule — Technician
Status: Confirmed
Notes: Dedicated Technician task information route exists.

Item: GPS Check-in as an action
Status: Confirmed
Notes: It runs within Work Order Details and has no separate route.

Item: Unit Identification as an action
Status: Corrected
Notes: Unit Identification has its own `/amp-registration` route with QR and manual serial entry. Under the supplied definition it is a submodule, not an action.

Item: Visit Attempt as an action
Status: Corrected
Notes: Visit Attempt has its own `/visit-attempt` route. It is a submodule.

Item: Work Report as a submodule
Status: Confirmed
Notes: Complete Service and Complete Installation screens hold the report and completion state.

Item: Work Proof as an action
Status: Confirmed
Notes: Photo proof is captured as a step inside the completion screen.

Item: Work Notes as a submodule
Status: Confirmed
Notes: Work Notes has list and detail routes.

Item: Add note as an action
Status: Corrected
Notes: Add Note has its own `/unit/log/insert` route and is therefore a submodule.

Item: Edit note as an action
Status: Corrected
Notes: Edit Note has its own `/unit/log/update` route and is therefore a submodule.

Item: Delete note as an action
Status: Corrected
Notes: Delete Note has its own `/unit/log/delete` route and is therefore a submodule.

## Communications

Item: Notifications as a submodule — Customer and Technician
Status: Confirmed
Notes: Both roles have dedicated notification screens.

Item: View notifications
Status: Confirmed
Notes: Notification lists are loaded from the backend.

Item: Mark as read
Status: Confirmed
Notes: Opening a notification writes the read state remotely before local state is updated.

Item: Archive notification
Status: Not implemented
Notes: Neither mobile notification screen exposes archive or restore.

Item: Customer Support as a submodule — Customer
Status: Confirmed
Notes: Dedicated Customer Contact Support screen exists.

Item: Submit support message
Status: Confirmed
Notes: Customer support messages are submitted to the contact-message API.

## Account Management

Item: Profile as a submodule — Customer and Technician
Status: Confirmed
Notes: Customer Account and Technician Profile containers exist.

Item: View profile
Status: Confirmed
Notes: Both roles display their current account information.

Item: Edit profile
Status: Confirmed
Notes: Both roles can update permitted profile fields.

Item: Delivery Addresses as a submodule — Customer
Status: Confirmed
Notes: Customer Account includes a stateful delivery-address container.

Item: Add address
Status: Confirmed
Notes: Implemented.

Item: Edit address
Status: Confirmed
Notes: Implemented.

Item: Delete address
Status: Confirmed
Notes: Implemented with confirmation.

Item: Password Change as a submodule — Customer and Technician
Status: Corrected
Notes: Technician Password Change exists inside Technician Profile. Customer mobile Account does not expose a password-change operation.

Item: Update password
Status: Corrected
Notes: Implemented for Technician, not for Customer mobile.

Item: Authenticator Change as a submodule — Customer and Technician
Status: Corrected
Notes: Customer authenticator reset exists only through the recovery/OOBE route. Technician authenticator change is intentionally unavailable.

Item: Reset authenticator
Status: Corrected
Notes: Implemented for Customer recovery only, not for Technician and not as an ordinary Account screen operation.

---

# Web Application Verification

## Authentication

Item: Registration as a submodule — Visitor and Customer
Status: Confirmed
Notes: Public registration creates a Customer account. Visitor is the pre-authentication actor, while Customer is the resulting role.

Item: Sign-in as a submodule — Visitor, Customer, Admin, and Superadmin
Status: Corrected
Notes: The shared web sign-in also accepts Technician, Manager, and Owner accounts and routes them according to role. Technician is sent to the mobile-only notice.

Item: Password Reset as a submodule under Sign-in
Status: Corrected
Notes: Public `/forgot-password` and `/reset-password/:token` routes are siblings of Sign-in under Authentication, although Sign-in links to them. The flow is not restricted to the four listed stored roles and can also recover Technician credentials.

Item: Authenticator Recovery as a submodule under Sign-in
Status: Not implemented
Notes: The web client has Customer initial authenticator setup but no web authenticator recovery/reset screen for Customer, Admin, or Superadmin.

## E-commerce

Item: Shop Catalogue as a submodule — Visitor and Customer
Status: Corrected
Notes: The route is public and also remains renderable for authenticated Technician, Admin, and Superadmin accounts because `HomeRoute` does not limit roles.

Item: Browse products
Status: Confirmed
Notes: Public product listing exists.

Item: Search products
Status: Confirmed
Notes: Search state is implemented.

Item: Filter products
Status: Confirmed
Notes: Category, brand, price, and sorting controls are implemented.

Item: View product details
Status: Confirmed
Notes: Product details are displayed within the Shop interface.

Item: Cart as a submodule — Customer
Status: Corrected
Notes: Cart is a stateful drawer/container. Add-to-cart checks only authentication, so authenticated non-Customer roles can invoke it from the public Shop even though Checkout is Customer-only.

Item: Add item to cart
Status: Confirmed
Notes: Implemented for any authenticated account currently able to render Shop.

Item: Update item quantity
Status: Confirmed
Notes: Implemented in the Cart drawer and Checkout summary.

Item: Remove item from cart
Status: Confirmed
Notes: Implemented.

Item: Checkout as a submodule — Customer
Status: Confirmed
Notes: Web route and order-creation API are Customer-only.

Item: Select delivery address
Status: Confirmed
Notes: Saved/default address selection and validation are implemented.

Item: Select payment method
Status: Confirmed
Notes: COD and online PayMongo methods are implemented.

Item: Complete automatic payment
Status: Confirmed
Notes: PayMongo checkout and return verification are implemented.

Item: Complete manual payment
Status: Confirmed
Notes: COD is implemented as the manual payment method.

Item: Catalogue Management as a submodule — Superadmin
Status: Corrected
Notes: The interface is named **Shop Catalog** and is mounted as a tab under Superadmin Inventory Management, not E-commerce.

Item: Product Listing as a submodule — Superadmin
Status: Corrected
Notes: The mounted Shop Catalog interface is primarily a create-product form. There is no mounted full listing CRUD interface.

Item: Create listing
Status: Confirmed
Notes: Superadmin can create a product and its starting branch stock.

Item: Edit listing
Status: Not implemented
Notes: The backend update endpoint exists, but no mounted UI exposes it.

Item: Deactivate listing
Status: Not implemented
Notes: No deactivate UI exists. The backend exposes product deletion instead.

## Inventory Management

Item: Stock Monitoring as a submodule — Admin and Superadmin
Status: Confirmed
Notes: Called **Inventory / Stock** for Admin and **Inventory Checker** for Superadmin.

Item: View stock levels
Status: Confirmed
Notes: Branch stock and out-of-stock records are displayed.

Item: Filter stock
Status: Confirmed
Notes: Search, branch, and stock-status filtering are implemented according to role scope.

Item: Restock Request as a submodule — Admin
Status: Confirmed
Notes: Mounted UI calls it **Reorder Management**. Backend `POST /api/reorders` is Admin-only.

Item: Submit restock request
Status: Confirmed
Notes: Admin can create a reorder request.

Item: Restock Approval as a submodule — Superadmin
Status: Confirmed
Notes: Mounted UI calls it **Reorder Approvals**. Backend status updates are Superadmin-only.

Item: Approve request
Status: Confirmed
Notes: Implemented through Superadmin reorder status updates.

Item: Reject request
Status: Confirmed
Notes: Implemented through Superadmin reorder status updates.

Item: AC Unit Registry as a submodule — Admin and Superadmin
Status: Corrected
Notes: Called **Serial / QR Management** or **Serial / QR Registry**. Admin receives branch-scoped read access; Superadmin has broader filtering and serial-update permission.

Item: Register serial
Status: Not implemented
Notes: Serial/QR units are generated indirectly through product and stock operations. There is no direct register-serial UI action.

Item: Update serial
Status: Corrected
Notes: Only Superadmin can replace a temporary serial with a manufacturer serial. Admin cannot perform this action.

Item: Print QR code
Status: Not implemented
Notes: QR codes are displayed, but no print/download action was found.

## Order Fulfillment

Item: My Orders as a submodule — Customer
Status: Confirmed
Notes: Dedicated Customer web route exists.

Item: Order Details as a submodule — Customer
Status: Confirmed
Notes: Implemented as a stateful modal/detail container rather than a separate route, which satisfies the supplied container-based definition.

Item: Retry payment — Customer
Status: Confirmed
Notes: Pending PayMongo checkout can be retried.

Item: Request cancellation — Customer
Status: Confirmed
Notes: Dedicated customer cancellation-request endpoint is used.

Item: Customer Orders as a submodule — Admin and Superadmin
Status: Confirmed
Notes: Shared order operations are mounted inside both Services workspaces.

Item: View order list
Status: Confirmed
Notes: Paginated order list and filters exist.

Item: Dispatch order
Status: Confirmed
Notes: Dispatch/process flow creates or synchronizes the Technician work order.

Item: Cancel order
Status: Confirmed
Notes: Admin and Superadmin can cancel eligible orders.

## Field Service

Item: My AC Units as a submodule — Customer
Status: Confirmed
Notes: Dedicated `/myunit` route exists.

Item: AC Unit Details as a submodule — Customer
Status: Confirmed
Notes: Implemented as a stateful unit-details modal/container.

Item: Service Booking as a submodule — Customer
Status: Not implemented
Notes: Web code and tests explicitly state that maintenance, cleaning, repair, and warranty requests must be submitted in mobile.

Item: Select service type on web
Status: Not implemented
Notes: No web booking form exists.

Item: Select schedule on web
Status: Not implemented
Notes: No web booking form exists.

Item: Submit booking on web
Status: Not implemented
Notes: The web Services page does not call service-request or warranty-submission APIs.

Item: Service Requests as a submodule — Admin and Superadmin
Status: Confirmed
Notes: Shared service queue exists in both operational workspaces.

Item: View requests
Status: Confirmed
Notes: Search, status, Technician filtering, details, and request status are displayed.

Item: Assign technician
Status: Confirmed
Notes: Assignment is supported and creates/synchronizes Technician work.

Item: Technicians as a submodule — Admin and Superadmin
Status: Confirmed
Notes: Shared Technician Management interface exists.

Item: View technician list
Status: Confirmed
Notes: Both roles can list Technicians within permitted scope.

Item: Add technician
Status: Corrected
Notes: Only Superadmin can create Technician staff accounts. The UI and `POST /api/users/staff` both enforce this.

Item: Edit technician
Status: Confirmed
Notes: Admin and Superadmin can update permitted Technician records; Superadmin additionally controls branch assignment.

Item: Daily Schedule as a submodule — Admin and Superadmin
Status: Corrected
Notes: Daily Schedule is a sibling tab of Technicians inside Services, not a child inside the Technicians submodule.

Item: Select date
Status: Confirmed
Notes: Date selection is implemented.

Item: View assignments
Status: Confirmed
Notes: Scheduled order and service tasks are displayed.

Item: Customer Messages as a submodule — Admin and Superadmin
Status: Confirmed
Notes: Shared message-management tab exists.

Item: View messages
Status: Confirmed
Notes: Implemented.

Item: Reply to message
Status: Confirmed
Notes: Implemented.

Item: Resolve message
Status: Confirmed
Notes: Implemented through message-status update.

## Analytics

Item: AMP Planning as a submodule — Admin and Superadmin
Status: Confirmed
Notes: Admin receives branch scope; Superadmin receives company-wide scope.

Item: Branch Maintenance as a submodule — Admin and Superadmin
Status: Corrected
Notes: UI names are **AMP · My branch maintenance** for Admin and **AMP · Maintenance across branches** for Superadmin.

Item: View maintenance priorities
Status: Confirmed
Notes: Follow-up priority and recommendation sections are displayed.

Item: View suggested dates
Status: Confirmed
Notes: Suggested service dates and scheduling windows are displayed.

Item: 12-Month Workload Plan as a submodule — Superadmin
Status: Confirmed
Notes: Dedicated `/owner/amp` route is allowed for Superadmin and legacy Owner. Admin is excluded.

Item: View projected workload
Status: Confirmed
Notes: Monthly suggested services and branch workload projections are displayed.

Item: Operational Reports as a submodule — Superadmin
Status: Corrected
Notes: Operational Reports are implemented for both Admin and Superadmin under **Analytics & Reports**.

Item: Business Intelligence as an action
Status: Corrected
Notes: Business Intelligence is a stateful report tab and therefore a submodule under the supplied definition.

Item: Sales Report as an action
Status: Corrected
Notes: Sales Report is a stateful report tab and therefore a submodule.

Item: Inventory Report as an action
Status: Corrected
Notes: Inventory Report is a stateful report tab and therefore a submodule.

Item: Services Report as an action
Status: Not implemented
Notes: There is no separate Services Report tab. Service data is embedded under Business Intelligence.

Item: Export report
Status: Confirmed
Notes: Excel and PDF export are implemented as actions.

Item: Technician Performance report
Status: Corrected
Notes: A separate Technician Performance report tab exists but is missing from the proposed outline.

## Administration

Item: Branch Dashboard as a submodule — Admin
Status: Confirmed
Notes: `/admin/dashboard` is Admin-only and uses branch-scoped backend data.

Item: View branch sales
Status: Confirmed
Notes: Paid revenue and sales trends are displayed.

Item: View branch inventory
Status: Confirmed
Notes: Stock and inventory summaries are displayed.

Item: View branch technician output
Status: Confirmed
Notes: Technician completion output is displayed.

Item: Company Dashboard as a submodule — Superadmin
Status: Confirmed
Notes: `/superadmin/dashboard` is Superadmin-only.

Item: View company sales
Status: Confirmed
Notes: Global paid revenue and sales trends are displayed.

Item: View branch performance
Status: Confirmed
Notes: Company-wide branch performance is displayed.

Item: View technician performance
Status: Confirmed
Notes: Company-wide Technician output is displayed.

Item: Branch Management as a submodule — Superadmin
Status: Confirmed
Notes: Superadmin Branch Management exists.

Item: Add branch
Status: Not implemented
Notes: Branches come from a fixed configured list; there is no create-branch operation.

Item: Edit branch
Status: Not implemented
Notes: Branch records cannot be renamed or edited. The current screen edits service coverage for an existing configured branch.

Item: Assign admin
Status: Confirmed
Notes: Superadmin can assign or reassign an Admin to a configured branch.

## Communications

Item: Notifications as a submodule — Customer, Admin, and Superadmin
Status: Confirmed
Notes: Customer uses a drawer; Admin and Superadmin use notification panels. Each is a stateful container.

Item: View notifications
Status: Confirmed
Notes: Implemented for all three roles.

Item: Mark as read
Status: Confirmed
Notes: Individual and bulk read operations are implemented where exposed.

Item: Archive notification
Status: Corrected
Notes: Admin and Superadmin can archive and restore. Customer web notifications do not expose archive.

Item: Customer Support as a submodule — Customer
Status: Confirmed
Notes: Dedicated `/contact` route exists.

Item: Submit support message
Status: Confirmed
Notes: Customer contact messages are submitted to the backend.

## Account Management

Item: Profile as a submodule — Customer, Admin, and Superadmin
Status: Confirmed
Notes: Role-specific profile interfaces exist.

Item: View profile
Status: Confirmed
Notes: Implemented for each listed role.

Item: Edit profile
Status: Confirmed
Notes: Implemented for permitted profile fields.

Item: Delivery Addresses as a submodule — Customer
Status: Confirmed
Notes: Customer Settings includes a stateful address-management tab/container.

Item: Add address
Status: Confirmed
Notes: Implemented.

Item: Edit address
Status: Confirmed
Notes: Implemented.

Item: Delete address
Status: Confirmed
Notes: Implemented.

Item: Password Change as a submodule — Customer, Admin, and Superadmin
Status: Confirmed
Notes: Customer requests a secure password-change link; Admin and Superadmin update the password directly from their profile interfaces.

Item: Update password
Status: Confirmed
Notes: Implemented through the role-appropriate flow.

Item: Authenticator Change as a submodule — Customer, Admin, and Superadmin
Status: Not implemented
Notes: Customer initial setup exists, but no normal authenticated change/reset control is exposed. Admin and Superadmin also have no authenticator-change interface.

Item: Reset authenticator
Status: Not implemented
Notes: No web account-management reset workflow is mounted.

---

# Specific Questions

Q1: Authentication is a sibling module. It does not wrap the other modules.
Evidence: `front/src/App.js` defines Authentication, Customer, Admin, and Superadmin routes as parallel route entries; mobile uses parallel Expo route groups.

Q2: Sign-in is a submodule, not an action.
Evidence: `front/src/components/login/Login.js` and `bork5/caact-mobile/app/(auth)/sign-in.jsx` provide dedicated interfaces and hold authentication state.

Q3: Password Reset and Authenticator Recovery are sibling route flows under Authentication, reached from Sign-in; they are not nested route children of the Sign-in screen.
Evidence: Web routes `/login`, `/forgot-password`, and `/reset-password/:token` are parallel in `front/src/App.js`. Mobile `sign-in` and `recover` routes are siblings under `app/(auth)/`.

Q4: Order Details is a submodule/container under My Orders, not a simple action.
Evidence: Mobile `customer/orders.jsx` holds `expandedOrderId` state and loads a dedicated order record; web `MyOrders.js` holds `selectedOrder` and opens a detail/tracking modal.

Q5: AC Unit Details is a submodule under My AC Units.
Evidence: Mobile has `/customer/units/[id]`; web uses the stateful `UnitDetailsModal` from My Unit.

Q6: Work Order Details is a submodule under My Work Orders.
Evidence: Mobile has the dedicated `/technician/task/[id]/information` route.

Q7: Active Work Order is not present as a named implementation node. Its workflow steps sit directly within Work Order Details and completion routes.
Evidence: No `Active Work Order` screen, component, or route is present; `information.jsx` directly selects and executes the next action.

Q8: Security has not been fully collapsed. It remains a stateful Customer web Settings tab and named mobile/profile section, although it is not a top-level module or standalone route.
Evidence: `front/src/components/settings/Settings.js` declares the `security` tab; `bork5/caact-mobile/app/customer/settings.jsx` renders `Security & Session`; Technician Profile renders `Account Security`.

Q9: Technician has no operational web workspace, but does have limited web access to sign-in, the mobile-only notice, and public routes such as Shop, Home, and FAQ.
Evidence: `front/src/domain/webRoleHome.js` maps Technician to `/technician-mobile`; `front/src/App.js` places Shop/Home/FAQ behind role-neutral `HomeRoute`.

Q10: Visitor has no authenticated feature access.
Evidence: Protected routes use `RoleRoute`, which redirects unauthenticated users to `/login`. Visitor access is limited to public routes, including additional Home, FAQ, Terms, and Privacy pages.

Q11: Catalogue Management is Superadmin-only.
Evidence: `backend/src/routes/productRoutes.js` restricts product create/update/delete to `superadmin`; the mounted Shop Catalog tab exists only in Superadmin Inventory.

Q12: Restock Request, implemented as Reorder Management, is Admin-only for submission. Superadmin can list requests but cannot create them through the active reorder endpoint.
Evidence: `backend/src/routes/reorderRoutes.js` restricts `POST /` and `GET /mine` to `admin`.

Q13: Restock Approval, implemented as Reorder Approvals, is Superadmin-only.
Evidence: `backend/src/routes/reorderRoutes.js` restricts `PATCH /:reorderId` to `superadmin`.

Q14: The 12-Month Workload Plan is available to Superadmin among the canonical roles. Legacy Owner is also permitted by the current route.
Evidence: `front/src/App.js` allows `owner` and `superadmin` on `/owner/amp`; `OwnerAmpDashboard.js` requests a 12-month forecast.

Q15: Operational Reports are available to both Admin and Superadmin, not Superadmin-only.
Evidence: `front/src/App.js` mounts `/admin/reports` and `/superadmin/reports`; report API routes allow both roles.

Q16: Admin has the Branch Dashboard only. It does not have the Superadmin Company Dashboard.
Evidence: `/admin/dashboard` allows only `admin`; `/superadmin/dashboard` allows only `superadmin`.

Q17: Superadmin has the Company Dashboard only. It does not enter the Admin Branch Dashboard route. Superadmin separately has company-wide branch-maintenance oversight in AMP.
Evidence: The strict route guards in `front/src/App.js` separate the two dashboard routes.

Q18: Technician uses the web application for sign-in, public content, and the mobile-only guidance page, but has no read-only or writable operational web workspace.
Evidence: `getRoleHomePath('technician')` returns `/technician-mobile`; `/tech/*` redirects there, while public `HomeRoute` remains role-neutral.

Q19: Customer has no Analytics or Administration workspace access. Customer AC Unit Details displays the unit's AMP output, but that is a Customer Field Service view rather than access to the Analytics module.
Evidence: All Admin, Superadmin, and AMP planning routes use role guards that exclude Customer.

Q20: Yes. Owner and Manager are present as separate roles in the codebase.
Evidence: `backend/src/models/User.js` includes `manager` and `owner` in the role enum; `front/src/domain/webRoleHome.js` maps them separately; `front/src/App.js` permits them on AMP routes.

---

## Required Corrections to the Proposed Architecture

1. Replace the universal-TOTP assertion with the actual role behavior or implement the intended TOTP policy before documenting it as current.
2. Do not state that Manager and Owner no longer exist until the enum, routes, permissions, tests, and stored accounts are migrated.
3. Model Password Reset and Authenticator Recovery as Authentication sibling flows that Sign-in links to.
4. Mark Unit Identification, Visit Attempt, and Work Note add/edit/delete as submodules because they have dedicated routes.
5. Mark Customer web Service Booking as not implemented/mobile-only.
6. Add Admin as an actor for Operational Reports.
7. Move Daily Schedule beside Technicians within Services rather than under Technicians.
8. Record that Add Technician and manufacturer-serial update are Superadmin-only.
9. Replace the standalone Services Report with Service Intelligence inside Business Intelligence, and add Technician Performance as a report submodule.
10. Preserve Security as a container where it still exists, or remove the actual tab/sections before declaring it collapsed.
11. Add the extra public pages and Technician mobile-only notice to the web architecture.
12. Decide whether authenticated non-Customer roles should continue to browse Shop and invoke Cart operations.

## Primary Evidence Files

- `front/src/App.js`
- `front/src/domain/webRoleHome.js`
- `front/src/domain/mobileOnlyServicesReadiness.test.js`
- `front/src/components/settings/Settings.js`
- `front/src/components/orders/MyOrders.js`
- `front/src/components/ADMIN/Reports/AdminReports.js`
- `front/src/components/ADMIN/Services/AdminServices.js`
- `front/src/components/ADMIN/Technicians/AdminTechnician.js`
- `front/src/components/ADMIN/Technicians/DailyWorkSchedule.js`
- `front/src/components/ADMIN/SerialQr/AdminSerialQr.js`
- `front/src/components/SUPERADMIN/Dashboard/SuperAdminInventory.js`
- `front/src/components/SUPERADMIN/Dashboard/SuperAdminBranches.js`
- `front/src/components/AMP/ManagerAmpDashboard.js`
- `front/src/components/AMP/OwnerAmpDashboard.js`
- `bork5/caact-mobile/app/(auth)/sign-in.jsx`
- `bork5/caact-mobile/app/(auth)/recover/`
- `bork5/caact-mobile/app/customer/orders.jsx`
- `bork5/caact-mobile/app/customer/settings.jsx`
- `bork5/caact-mobile/app/customer/notifications.jsx`
- `bork5/caact-mobile/app/technician/profile.jsx`
- `bork5/caact-mobile/app/technician/notifications.jsx`
- `bork5/caact-mobile/app/technician/task/[id]/information.jsx`
- `bork5/caact-mobile/services/accountSetupRoute.js`
- `backend/src/models/User.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/securityController.js`
- `backend/src/routes/securityRoutes.js`
- `backend/src/routes/reorderRoutes.js`
- `backend/src/routes/productRoutes.js`
- `backend/src/routes/reportRoutes.js`

