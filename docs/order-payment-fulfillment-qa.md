# Order, Payment, And Fulfillment QA Checklist

Run this after restarting the backend on `localhost:5000` and the frontend on `localhost:3000`. Keep the LocalTunnel window running if PayMongo webhook testing is needed.

## Setup

- Backend `.env` has the current PayMongo keys, `PAYMONGO_MODE`, webhook secret, and public backend URL.
- PayMongo dashboard webhook URL points to `<public backend URL>/api/orders/paymongo/webhook`.
- Frontend and mobile are using the same backend base URL.
- Admin, customer, and technician test accounts can log in.
- Inventory has at least one available serial unit for the item being ordered.

## Customer COD Order

- Place a COD order from web checkout.
- Confirm admin orders show the new order as `TO PAY` or the configured COD processing state.
- Approve/process the order in admin.
- Confirm the order moves through delivery/install states without PayMongo blocking.
- Cancel a COD order before dispatch and confirm inventory serials return to available.

## Customer PayMongo Order

- Place a PayMongo order from web or mobile using GCash/Card.
- Confirm the customer is redirected to PayMongo checkout.
- Complete payment, then return to merchant.
- Confirm the order is no longer stuck on `Waiting PayMongo`.
- If the webhook is delayed, use admin `Verify PayMongo` and confirm it updates the order.
- Open the receipt from web and mobile and confirm the PDF/e-receipt total matches item subtotal, VAT, and delivery fee unless the order is the one-peso test item.

## One-Peso Test Item

- Place the one-peso test item order.
- Confirm VAT and delivery fee are voided.
- Confirm PayMongo amount is exactly PHP 1.00.
- Confirm the receipt also shows PHP 1.00 total.

## Admin Fulfillment

- Assign a technician, delivery date, install date, and time slot.
- Confirm `Repair Task` creates or refreshes the linked technician task if it is missing.
- Confirm the technician app receives the task with customer address, ordered item, serial number, and QR details.
- Confirm admin cannot complete the order before the technician task is completed with AMP registration and proof.
- Confirm the admin error states exactly what is missing: task, QR registration, task completion, or proof.

## Technician Flow

- Start the assigned order task in the technician mobile app.
- Register every assigned unit QR in the AMP flow.
- Try completing before all QR labels are registered and confirm the mobile app shows the backend reason.
- Submit proof and customer sign-off.
- Complete the task.
- Confirm the linked order becomes `COMPLETE`.
- Confirm serial units move to `sold`.

## Customer Installed Units

- After technician completion, open web My Units.
- Confirm the installed unit appears from `/amp/customer/units`.
- Open customer mobile Home/My Units and confirm the same installed unit appears.
- Confirm no demo unit appears for a customer without installed or manually added units.

## Cancellation And Refund Review

- Create a paid PayMongo order.
- Request cancellation from customer web or mobile before dispatch.
- Approve cancellation in admin.
- Confirm the order is cancelled, inventory is restored, and refund review is required.
- Mark refund as reviewed, then completed.
- Confirm customer notifications are customer-only and admin operational notifications remain admin-only.

## Recovery Checks

- Use `Repair Task` on an active fulfillment order and confirm the existing task is refreshed rather than duplicated.
- Use `Sync Units` after a completed technician task and confirm installed customer units are created or refreshed.
- Use `Verify PayMongo` on a PayMongo order and confirm it reports paid, failed, expired, or cancelled accurately.

## Safety Checks

- Refresh admin orders after every action and confirm status labels match backend state.
- Restart backend and frontend, then reload admin/customer/technician screens.
- Confirm no order can be completed without a completed linked technician task and proof.
- Confirm cancelled or refunded orders are excluded from sales totals.
- Confirm inventory stock and serial status do not double-count after cancellation or recovery.
