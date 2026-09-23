# AEROPULSE Architecture and Implementation Audit

**Audit date:** September 22, 2026  
**Audited branch:** `main-martyn`  
**Scope:** Web application, Expo mobile application, backend routes, role guards, mounted screens, and confirmed unexposed API/database capabilities.

## Executive Summary

The documented architecture is **partially correct**. Most core AEROPULSE workflows are implemented, but the document does not fully match the current system.

The principal discrepancies are:

- Technician accounts correctly have no TOTP, so Technician Authenticator Recovery and Authenticator Change do not exist.
- Customer service booking is implemented in mobile only, despite being documented for web.
- Several documented submodules are embedded drawers, modals, tabs, or dashboard sections rather than dedicated screens.
- Unit Identification, Visit Attempt, and individual Work Note operations have their own routes and should not be classified as simple actions.
- Admin Operational Reports exist even though the document assigns them only to Superadmin.
- Admin cannot add Technician accounts, although the document assigns this action to Admin and Superadmin.
- Customer and Technician notification screens do not expose archive/restore.
- Some mounted backend capabilities have no reachable user interface.
- The implementation contains undocumented legacy `manager` and `owner` roles.

The architecture document should be corrected before it is used as the authoritative system diagram.

## Verification Method

The audit inspected:

- Web routes and role guards in `front/src/App.js`.
- Mobile Expo routes under `bork5/caact-mobile/app/`.
- Web and mobile screen components.
- Backend route mounting and role permissions.
- Database models, controllers, and API routes.
- Imports and screen usage for suspected unreachable capabilities.

The following targeted automated checks were also run successfully:

- Web: 2 test files, 6 tests passed.
- Mobile: 4 test suites, 15 tests passed.
- Total: **21 tests passed**.

No application code was changed during this audit.

---

## Q1. Does the implementation include every documented module, submodule, and action?

**Answer: No.** Most core workflows exist, but several nodes are absent, renamed, embedded, or assigned to different actors.

### Mobile Application

| Documented node | Status | Current implementation and recommended resolution |
|---|---|---|
| Authentication | Present | Dedicated authentication routes exist. |
| Registration — Customer | Present | Multi-step customer registration is implemented. |
| Sign-in — Customer, Technician | Present | Both roles are supported. |
| Password Reset — Customer, Technician | Present | Recovery-factor flow supports both account types. |
| Authenticator Recovery — Customer | Present | Customer authenticator reset/recovery screen exists. |
| Authenticator Recovery — Technician | Absent | Technicians do not use TOTP. Remove Technician from this documented node. |
| E-commerce | Present | Implemented inside the customer-only mobile layout. |
| Shop Catalogue | Present | Browse, search, filter, product details, and add-to-cart exist. |
| Cart | Present | Implemented as a modal inside Shop, not a dedicated screen. Reclassify it as an embedded Shop panel/action or create a dedicated screen. |
| Checkout | Present | Address selection, COD/manual payment, and PayMongo/online payment exist. |
| Order Fulfillment | Present | Customer-only order workflow is implemented. |
| My Orders | Present | List, inline details, payment retry, and cancellation request exist. |
| Field Service | Present | Customer and Technician have separate role-protected flows. |
| My AC Units | Present | The unit list is embedded in Customer Home and is not a standalone screen. Create a dedicated screen or document it as a Customer Home section. |
| AC Unit Details | Present | Warranty, service history, AMP information, and maintenance panels exist. |
| Service Booking | Present | Implemented in the mobile Customer Service Request screen. |
| My Work Orders | Present | Technician task list is implemented. |
| Work Order Details | Present | Technician Work Order Information screen is implemented. |
| GPS Check-in | Present | Inline action inside Work Order Details. |
| Unit Identification | Present | Has its own AMP registration/QR/manual-serial screen. Promote it from action to submodule. |
| Visit Attempt | Present | Has its own screen. Promote it from action to submodule. |
| Work Report | Present | Implemented through Complete Service and Complete Installation screens. |
| Work Proof | Present | Photo capture is included in the completion workflow. |
| Work Notes | Present | List and details are implemented, with separate add, edit, delete, and QR-generation screens. |
| Notifications — View/Read | Present | Customer and Technician notification screens mark opened items as read. |
| Notifications — Archive | Absent | Mobile notification screens do not expose archive or restore. Add the controls or remove the action from mobile documentation. |
| Customer Support — Customer | Present | Dedicated Customer Contact Support screen. |
| Customer Support — Technician | Absent | No Technician support-message screen exists. Remove Technician or implement the screen. |
| Account Management | Present | Both role layouts include account/profile functions. |
| Profile — Customer, Technician | Present | View and edit are implemented. |
| Delivery Addresses | Present | Customer can add, edit, and delete addresses. |
| Password Change — Technician | Present | Implemented inside Technician Profile. |
| Password Change — Customer | Absent | Customer Account has no password-change operation. Implement it or remove it from the mobile architecture. |
| Authenticator Change — Customer | Renamed | Authenticator reset exists as a recovery/OOBE route, not inside Account Management. Move it into Account or document its actual location. |
| Authenticator Change — Technician | Absent | This conflicts with the implemented no-TOTP Technician policy. Remove Technician from the node. |

### Web Application

| Documented node | Status | Current implementation and recommended resolution |
|---|---|---|
| Authentication | Present | Implemented through parallel top-level routes. |
| Registration | Present | Public registration always creates a Customer account. |
| Sign-in | Present | Customer, Admin, and Superadmin are supported. Technician sign-in is also accepted before redirecting to the mobile-only notice. |
| Password Reset | Present | Public password-recovery flow exists. |
| Authenticator Recovery | Absent | Web has Customer authenticator setup, but no recovery/reset screen for Customer, Admin, or Superadmin. |
| E-commerce | Present | Public Shop and Customer checkout exist. |
| Shop Catalogue | Present | Visitor and Customer are supported, but authenticated Admin, Superadmin, and Technician accounts can also browse the route. Tighten the route guard if this is unintended. |
| Cart | Present | Implemented as a drawer/modal, not a dedicated screen. Reclassify or create a Cart screen. |
| Checkout | Present | Customer-only route and backend operation. |
| Catalogue Management | Renamed | Located under Superadmin **Inventory Management → Shop Catalog**, not E-commerce. Update the architecture location or move the UI. |
| Product Listing — Create | Present | Superadmin can create products and starting stock. |
| Product Listing — Edit | Absent | Backend edit endpoint exists, but no mounted UI exposes it. |
| Product Listing — Deactivate | Absent | No deactivate UI exists. The backend exposes deletion instead. |
| Inventory Management | Present | Separate Admin and Superadmin workspaces exist. |
| Stock Monitoring | Renamed | Called **Inventory / Stock** for Admin and **Inventory Checker** for Superadmin. |
| Restock Request | Renamed | Called **Reorder Management**. |
| Restock Approval | Renamed | Called **Reorder Approvals**. |
| AC Unit Registry | Renamed | Called **Serial / QR Management** or **Serial / QR Registry**. |
| AC Unit Registry — Register | Absent | Serial records are generated indirectly through stock/product workflows; there is no direct register operation. |
| AC Unit Registry — Update | Present | Superadmin can set the manufacturer serial. Admin cannot. Correct the actor assignment. |
| AC Unit Registry — Print | Absent | No print/download operation was found. |
| Order Fulfillment | Present | Customer and operational workspaces exist. |
| My Orders | Present | List, details, payment retry, and cancellation request exist. |
| Customer Orders | Present | Admin and Superadmin can view, dispatch/process, and cancel. |
| Field Service | Present | Customer and branch/company operational areas exist. |
| My AC Units | Present | Dedicated Customer web screen. |
| AC Unit Details | Present | Warranty, history, and AMP information are displayed. |
| Service Booking | Absent | Website code and tests explicitly declare service and warranty submission mobile-only. Remove this web node or implement the complete workflow. |
| Service Requests | Present | Admin and Superadmin queue with assignment workflow. |
| Technicians — View/Edit | Present | Shared Admin/Superadmin component. |
| Technicians — Add | Present | Superadmin only. Admin does not receive this operation. |
| Daily Schedule | Present | Dedicated Services workspace tab with date selection. |
| Customer Messages | Present | View, reply, and resolve are supported. |
| Analytics | Present | AMP and reporting workspaces exist. |
| AMP Planning | Present | Admin branch and Superadmin company-wide variants exist. |
| Branch Maintenance | Renamed | Called **AMP · My branch maintenance** or **AMP · Maintenance across branches**. |
| 12-Month Workload Plan | Present | Separate Superadmin AMP screen. |
| Operational Reports | Renamed | UI is called **Analytics & Reports** and is available to both Admin and Superadmin. Correct the documented actor assignment. |
| BI, Sales, Inventory, Export | Present | Excel and PDF export are included. |
| Services Report | Renamed | Service reporting is embedded under Business Intelligence rather than exposed as a separate tab. |
| Administration | Present | Role-specific dashboards are implemented. |
| Branch Dashboard | Present | Includes sales, inventory, technician output, and branch performance. |
| Company Dashboard | Present | Superadmin dashboard is implemented. |
| Branch Management | Present | Assigns administrators and edits branch service coverage. |
| Branch Management — Add/Edit Branch | Absent | Branches come from a fixed configured list; there is no branch-record create/edit workflow. |
| Branch Management — Assign Admin | Present | Superadmin-only. |
| Notifications — Admin/Superadmin | Present | View, mark read, archive, and restore are implemented. |
| Notifications — Customer | Present | View and mark read exist; archive is absent. |
| Customer Support | Present | Customer contact form. |
| Account Management | Present | Role-specific settings/profile screens exist. |
| Profile | Present | Customer, Admin, and Superadmin. |
| Delivery Addresses | Present | Customer settings. |
| Password Change | Present | Customer, Admin, and Superadmin web flows exist. |
| Authenticator Change | Absent | Customer initial setup exists, but there is no authenticated change/reset control. Admin and Superadmin also have none. |

---

## Q2. Are there implementation nodes not listed in the architecture?

**Answer: Yes.** Confirmed additional nodes and workflows include:

### Mobile

- Customer Home/Dashboard.
- Customer FAQ.
- Customer AI Chat.
- Order Confirmation screen.
- Receipt screen.
- Technician Dashboard.
- Technician general QR Scanner.
- Technician Generate QR screen under Work Notes.
- Technician customer-presence confirmation.
- Technician payment/cash collection and completion workflow.
- Customer and Technician onboarding/setup screens.

### Web

- Public Home.
- Public FAQ.
- Terms and Privacy pages.
- Mobile-app information page.
- Customer Account Deletion.
- Notification-preference settings, separate from notification inboxes.
- Superadmin Operations Alerts.
- Order refund review.
- Order/task repair and synchronization recovery actions.
- AMP report generation.
- AMP cleaning trends, historical parts usage, and model analytics.

### Roles

- Legacy `manager` and `owner` roles exist in the User schema and AMP route permissions.
- Mobile has a Manager holding screen instructing those accounts to use the website.

**Recommendation:** Add legitimate nodes to the architecture and migrate or formally document the `manager` and `owner` roles.

---

## Q3. Are there naming conflicts?

**Answer: Yes.**

- **Services** names both the Admin/Superadmin operations workspace and the Customer mobile-services information page.
- **Notifications** names both notification inboxes and notification-preference settings.
- The document uses **Restock**, while the mounted workflow uses **Reorder**. Separate legacy Restock APIs also exist.
- **Shop Catalogue** and **Shop Catalog** use inconsistent spelling.
- **Operational Reports** is called **Analytics & Reports** in the UI.
- **Branch Maintenance** is called **My branch maintenance** or **Maintenance across branches**.
- Internal `ManagerAmpDashboard` and `OwnerAmpDashboard` names serve Admin and Superadmin users, preserving undocumented legacy role terms.
- **Technicians** is directly derived from a role name. **Technician Management** would distinguish the submodule from the role.

**Recommendation:** Adopt one canonical name per business function and align route names, component names, labels, and diagrams.

---

## Q4. Should any actions be promoted to submodules?

**Answer: Yes.** Under the supplied rule that an action has no dedicated screen:

- **Unit Identification** should be a submodule because it has an AMP registration/QR/manual-serial screen.
- **Visit Attempt** should be a submodule because it has a dedicated screen.
- **Add Work Note** should be a submodule because it has a dedicated route.
- **Edit Work Note** should be a submodule because it has a dedicated route.
- **Delete Work Note** should be a submodule because it has a dedicated route.

An alternative is to keep these as actions but perform them inline within Work Order Details or Work Notes.

---

## Q5. Should any submodules be demoted to actions?

**Answer: Yes, unless dedicated screens are created.**

- **Cart** is a Shop modal/drawer on both platforms. Document it as an embedded Shop panel/action.
- Mobile **My AC Units** is a collection inside Customer Home. Document it as a Home section or create a dedicated screen.
- Web Customer/Admin/Superadmin **Notifications** are drawers or panels, not standalone inbox screens. Document them as header actions or create dedicated screens.
- Mobile Technician **Password Change** is an editing state inside Profile and can be documented as a Profile action.

For this audit, a full stateful tab such as Daily Schedule was treated as a screen even when it shared a parent route. Pure drawers and modals were not treated as screens.

---

## Q6. Are the actor assignments correct?

**Answer: No.** Confirmed mismatches are:

| Node | Documented actors | Current implementation | Recommended resolution |
|---|---|---|---|
| Mobile Authenticator Recovery | Customer, Technician | Customer only | Remove Technician. |
| Mobile Authenticator Change | Customer, Technician | Customer recovery route only; no Technician TOTP | Remove Technician and document Customer recovery location. |
| Mobile Customer Support | Customer, Technician | Customer only | Remove Technician or build Technician support. |
| Add Technician | Admin, Superadmin | Superadmin only | Correct the document or grant Admin permission intentionally. |
| AC Unit Registry Update | Admin, Superadmin | Superadmin only | Correct the Admin action list. |
| Operational Reports | Superadmin | Admin and Superadmin | Add Admin to the documented actors. |
| Web Shop/Cart | Visitor and Customer, with Superadmin at module level | All authenticated roles can browse; all authenticated roles can invoke add-to-cart UI | Add strict role guards or document broader access. |
| Web Technician Authentication | Not listed | Technician login is accepted, then redirected to a mobile-only notice | Document this compatibility behavior or block Technician web sign-in earlier. |
| Customer Notification Archive | Customer | Not exposed on web or mobile | Implement archive or remove the action. |
| Web Service Booking | Customer | Explicitly mobile-only | Remove from web architecture or implement it. |

---

## Q7. Is Authentication correctly a sibling module?

**Answer: Yes.**

Authentication uses parallel top-level routes. It guards access but is not modeled or implemented as the parent of Commerce, Field Service, Analytics, or Administration.

---

## Q8. Is Visitor excluded from everything except Authentication, E-commerce, and Shop Catalogue?

**Answer: No, not exactly.**

Visitors cannot enter protected Customer, Admin, or Superadmin workspaces. They can additionally reach:

- Public Home.
- FAQ.
- Terms pages.
- Privacy page.

**Recommendation:** Add a **Public Information** module or formally place these pages under an existing public module.

---

## Q9. Is Technician excluded from all other modules?

**Answer: No.**

Technician mobile functional access is restricted correctly. On web, however:

- An authenticated Technician can open the public Shop route.
- The products API permits Technician read access.
- Public Home and FAQ are reachable.
- Web sign-in accepts the Technician before redirecting to the mobile-only notice.

**Recommendation:** If strict mobile-only isolation is required, redirect Technician accounts before rendering public commerce routes and reconsider Technician access to the product-list endpoint.

---

## Q10. Is Admin excluded from Catalogue Management, Restock Approval, Branch Management, and Company Dashboard?

**Answer: Yes.**

Admin is excluded from:

- Catalogue-management mutations.
- Reorder/Restock approval.
- Branch Management.
- Company Dashboard.

Product create, update, and delete backend operations are restricted to Superadmin. Admin can browse the public Shop but cannot manage the catalogue.

---

## Q11. Is Superadmin included in all shared Admin/Superadmin modules?

**Answer: Yes for the shared functionality that exists.**

Superadmin has equivalent company-wide screens for:

- Inventory.
- Customer Orders.
- Service Requests.
- Technician Management.
- Daily Schedule.
- Customer Messages.
- AMP Planning.
- Analytics and Reports.
- Notifications.
- Profile and password management.

The application uses separate `/superadmin/*` routes instead of allowing Superadmin into `/admin/*` routes. Missing actions such as authenticator change, QR printing, or product-editing UI remain missing for Superadmin as documented in Q1.

---

## Q12. Do database/API capabilities exist without an exposed application screen?

**Answer: Yes.** Confirmed cases are:

| Capability | Backend state | Application exposure |
|---|---|---|
| Attendance | Model and controller exist | No mounted API route and no UI. |
| Inventory Change Requests | Mounted API exists | Four related modal components exist but are not imported into a reachable screen. |
| Legacy Restock Orders | Mounted API exists | Related modal components exist but are not mounted; active UI uses Reorder instead. |
| Parts Requests | Technician/Admin/Superadmin API exists | Mobile service wrapper exists, but no mounted mobile or web screen imports it. |
| Recorded Parts Preparation Prediction | API and mobile client function exist | No screen calls the client function. |
| Audit Logs | `/api/reports/audit-logs` exists | Analytics & Reports has no Audit Logs tab. |
| Product Edit/Delete | Backend endpoints exist | Current Superadmin Catalog screen only creates products. |

Internal OTP and scheduled cron capabilities were not classified as missing user modules because they are supporting system processes rather than user-facing workflows.

---

## Recommended Architecture Corrections

1. Remove Technician from all TOTP-related nodes.
2. Mark Customer Service Booking as mobile-only unless a full web workflow is implemented.
3. Change Unit Identification, Visit Attempt, and Work Note CRUD operations to submodules, or redesign them as inline actions.
4. Reclassify Cart and notification drawers as embedded actions/panels.
5. Add Admin to Operational Reports.
6. Restrict Add Technician and serial-number update to Superadmin in the actor matrix.
7. Replace Restock/Reorder terminology with one canonical name.
8. Document or retire the `manager` and `owner` roles.
9. Decide whether public Shop access should remain available to Admin, Superadmin, and Technician accounts.
10. Either expose or retire the confirmed orphaned APIs and components.
11. Add the Public Information, Operations Alerts, recovery, receipt, and AMP-reporting nodes to the architecture where they are intentionally retained.

## Primary Evidence Files

- `front/src/App.js`
- `front/src/domain/mobileOnlyServicesReadiness.test.js`
- `front/src/components/ADMIN/Reports/AdminReports.js`
- `front/src/components/ADMIN/Technicians/AdminTechnician.js`
- `front/src/components/ADMIN/SerialQr/AdminSerialQr.js`
- `front/src/components/SUPERADMIN/Dashboard/SuperAdminBranches.js`
- `front/src/components/AMP/ManagerAmpDashboard.js`
- `front/src/components/AMP/OwnerAmpDashboard.js`
- `bork5/caact-mobile/app/customer/settings.jsx`
- `bork5/caact-mobile/app/customer/notifications.jsx`
- `bork5/caact-mobile/app/technician/notifications.jsx`
- `bork5/caact-mobile/app/technician/task/[id]/information.jsx`
- `backend/src/app.js`
- `backend/src/models/User.js`
- `backend/src/routes/productRoutes.js`
- `backend/src/routes/inventoryChangeRequestRoutes.js`
- `backend/src/routes/restockOrderRoutes.js`
- `backend/src/routes/partsRequestRoutes.js`
- `backend/src/routes/reportRoutes.js`

