/* eslint-disable no-console */
// Destructive-by-design acceptance journey for an isolated QA database only.
// It creates its own customer, technician, product, order, unit, requests, and
// support ticket. Never point this script at the production backend.
const path = require("path");
const jwt = require("jsonwebtoken");
const { formatDateKeyInTimeZone } = require("../src/utils/dateTime");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const baseUrl = process.env.ACCEPTANCE_API_BASE || "http://127.0.0.1:5002/api";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/?$/i.test(baseUrl)) {
  throw new Error("Acceptance tests are restricted to a localhost API.");
}

const runId = String(Date.now()).slice(-8);
const customerEmail = `acceptance.${runId}@example.test`;
const customerPassword = "QaFlow1!";
const loginName = `qa${runId.slice(-4)}`;
const address = {
  label: "QA delivery address",
  type: "home",
  name: "Acceptance Customer",
  phone: `0917${runId.slice(-7)}`,
  region: "NCR",
  province: "Metro Manila",
  city: "Quezon City",
  barangay: "Bago Bantay",
  street: "Unit 1, Acceptance Street",
  postalCode: "1105",
  isDefault: true,
};

const stepResults = [];
const record = (name, detail = "passed") => {
  stepResults.push({ name, detail });
  console.log(`PASS  ${name}${detail === "passed" ? "" : ` — ${detail}`}`);
};

const request = async (pathName, { token, method = "GET", body, headers = {}, expected = [200] } = {}) => {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${pathName} returned ${response.status}: ${data.message || JSON.stringify(data)}`);
  }
  return { status: response.status, data };
};

const login = async (identifier, password) => {
  const { data } = await request("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
  if (!data.token || !data.user) throw new Error(`Login did not return a session for ${identifier}.`);
  return data;
};

const findProduct = async (token, productId) => {
  const { data } = await request("/products", { token });
  const product = (data.products || []).find((item) => String(item.id || item._id) === String(productId));
  if (!product) throw new Error("Acceptance product disappeared from inventory.");
  return product;
};

const main = async () => {
  const health = await request("/health");
  if (health.data.status !== "ok") throw new Error("Local acceptance backend is not healthy.");
  record("Backend health and routing");

  const superadmin = await login("superadmin.main", "admin123");
  record("Seeded Super Admin authentication");

  const staff = await request("/users/staff", {
    token: superadmin.token,
    method: "POST",
    expected: [201],
    body: {
      name_first: "Acceptance",
      name_last: "Technician",
      role: "technician",
      branch: "Bulacan",
      loginName,
    },
  });
  const technician = staff.data.user;
  if (staff.data.loginIdentifier !== `tech.bulacan.${loginName}` || staff.data.tempPassword !== `bulacan.${loginName}`) {
    throw new Error("Technician credentials did not follow the required branch naming format.");
  }
  record("Super Admin technician creation and generated credentials");

  const verificationToken = jwt.sign(
    { purpose: "registration_verification", email: customerEmail, phone: "" },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "5m" },
  );
  const registrationBody = {
    name_first: "Acceptance",
    name_last: "Customer",
    alias: `acceptance.${runId}`,
    email: customerEmail,
    phone: address.phone,
    password: customerPassword,
    municipality: address.city,
    submunicipality: address.barangay,
    contact_method: "email",
    locations: [{ address, coordinates: {} }],
    registrationVerificationToken: verificationToken,
  };
  await request("/auth/register", {
    method: "POST",
    expected: [400],
    body: { ...registrationBody, password: `Aa1!${"x".repeat(22)}` },
  });
  record("25-character maximum password validation");

  const registration = await request("/auth/register", {
    method: "POST",
    body: registrationBody,
  });
  const customerToken = registration.data.token;
  const customer = registration.data.user;
  if (!customerToken || customer.assignedBranch !== "Bulacan") {
    throw new Error("Customer registration did not create a Bulacan-routed account.");
  }
  record("Customer registration and address-to-branch synchronization");

  await request("/users/addresses", {
    token: customerToken,
    method: "POST",
    expected: [400],
    body: { ...address, label: "Invalid QA address", postalCode: "4102", isDefault: false },
  });
  record("Postal code rejection when it does not match the selected city");

  await request("/users", { token: customerToken, expected: [403] });
  record("Customer role cannot access staff records");

  const productResult = await request("/products", {
    token: superadmin.token,
    method: "POST",
    expected: [201],
    body: {
      name: `Acceptance AC ${runId}`,
      sku: `QA-${runId}`,
      brand: "AeroPulse QA",
      category: "split",
      specs: "2.5HP",
      price: 42000,
      threshold: 1,
      branchStock: { Bulacan: 2 },
    },
  });
  const productId = productResult.data.product.id || productResult.data.product._id;
  const initialProduct = await findProduct(superadmin.token, productId);
  const initialStock = Number(initialProduct.stock);
  if (initialStock !== 2) throw new Error(`Expected QA stock 2, received ${initialStock}.`);
  record("Super Admin inventory creation with horsepower and serial units");

  const orderResult = await request("/orders", {
    token: customerToken,
    method: "POST",
    expected: [201],
    headers: { "Idempotency-Key": `qa-order-${runId}` },
    body: {
      items: [{ productId, id: productId, name: productResult.data.product.name, quantity: 1, price: 42000 }],
      address,
      paymentMethod: "cod",
      platform: "mobile",
    },
  });
  let order = orderResult.data.order;
  const orderId = order.id || order._id;
  const placedProduct = await findProduct(superadmin.token, productId);
  if (Number(placedProduct.stock) !== initialStock || order.stockReservationStatus !== "pending") {
    throw new Error("COD stock changed before dispatch.");
  }
  if ((order.items?.[0]?.serialNumbers || []).length !== 0) {
    throw new Error("COD order received a serial before dispatch.");
  }
  if (order.items?.[0]?.model !== `QA-${runId}` || Number(order.items?.[0]?.horsepower) !== 2.5) {
    throw new Error("COD order did not preserve the exact model and horsepower for customer review.");
  }
  record("COD checkout preserves stock until dispatch");

  const replay = await request("/orders", {
    token: customerToken,
    method: "POST",
    headers: { "Idempotency-Key": `qa-order-${runId}` },
    body: { items: [{ productId, quantity: 1 }], address, paymentMethod: "cod" },
  });
  if (!replay.data.idempotentReplay || String(replay.data.order.id || replay.data.order._id) !== String(orderId)) {
    throw new Error("Order retry created a duplicate instead of replaying the original order.");
  }
  record("Checkout idempotency prevents duplicate orders");

  const approve = await request(`/orders/${orderId}/approve`, {
    token: superadmin.token,
    method: "PATCH",
    body: {
      assignedTechnicianId: technician.id || technician._id,
      assignedTechnicianName: technician.name,
      installationDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      timeSlot: "9:00 AM - 12:00 PM",
    },
  });
  order = approve.data.order;
  if (order.workflowStatus !== "to_deliver" || Number((await findProduct(superadmin.token, productId)).stock) !== initialStock) {
    throw new Error("Approval did not preserve COD stock or set the correct workflow stage.");
  }
  record("Admin approval and technician assignment");

  const dispatch = await request(`/orders/${orderId}/process`, {
    token: superadmin.token,
    method: "PATCH",
    body: {
      action: "dispatch",
      assignedTechnicianId: technician.id || technician._id,
      assignedTechnicianName: technician.name,
    },
  });
  order = dispatch.data.order;
  const serialNumber = order.items?.[0]?.serialNumbers?.[0];
  if (order.workflowStatus !== "to_install" || !serialNumber) {
    throw new Error("Dispatch did not assign an inventory serial and installation stage.");
  }
  if (Number((await findProduct(superadmin.token, productId)).stock) !== initialStock - 1) {
    throw new Error("COD stock was not deducted exactly once at dispatch.");
  }
  record("Dispatch deducts COD stock once and assigns the QR serial");

  const technicianSession = await login(staff.data.loginIdentifier, staff.data.tempPassword);
  const tasksResult = await request("/tasks", { token: technicianSession.token });
  const task = (tasksResult.data.tasks || []).find((item) =>
    String(item.payload?.orderId || item.orderId || "") === String(orderId) ||
    item.payload?.orderCode === order.orderCode,
  );
  if (!task) throw new Error("Dispatched order did not appear in the assigned technician's work list.");
  const taskId = task.id || task._id;
  record("Technician work-list synchronization");

  const checkIn = await request(`/tasks/${taskId}/check-in`, {
    token: technicianSession.token,
    method: "PATCH",
    body: { coordinates: { latitude: 14.6573, longitude: 121.0293, accuracy: 8 } },
  });
  if (!checkIn.data.checkIn?.checkedInAt) throw new Error("GPS check-in was not persisted.");
  const customerTasks = await request("/tasks", { token: customerToken });
  const visibleCustomerTask = (customerTasks.data.tasks || []).find((item) => String(item.id || item._id) === String(taskId));
  const adminTask = await request(`/tasks/${taskId}`, { token: superadmin.token });
  if (!visibleCustomerTask?.payload?.checkIn?.checkedInAt || !adminTask.data.task?.payload?.checkIn?.checkedInAt) {
    throw new Error("Technician GPS check-in was not visible to both customer and administration.");
  }
  record("Technician GPS check-in visibility for customer and administration");

  await request(`/tasks/${taskId}/amp-registration`, {
    token: technicianSession.token,
    method: "PATCH",
    body: {
      serialNumber,
      installationDate: formatDateKeyInTimeZone(new Date()),
      installationTime: "10:30",
      placementArea: "Living room",
      roomSizeSqm: 30,
      usageHoursPerDay: 8,
      filterCondition: "new",
      coilCondition: "new",
      drainageCondition: "clear",
      voltageStability: "stable",
      conditionRating: "excellent",
      notes: "Acceptance installation registration",
    },
  });
  record("Technician AMP unit registration");

  await request(`/tasks/${taskId}/status`, {
    token: technicianSession.token,
    method: "PATCH",
    body: { status: "installing" },
  });
  await request(`/tasks/${taskId}/status`, {
    token: technicianSession.token,
    method: "PATCH",
    body: {
      status: "completed",
      proof: {
        afterPhotos: [{ uri: "data:image/jpeg;base64,cWEtcHJvb2Y=", label: "Installed AC" }],
        notes: "Installation completed in acceptance test",
      },
    },
  });
  const completedOrder = await request(`/orders/me/${orderId}`, { token: customerToken });
  if (completedOrder.data.order.workflowStatus !== "complete" || completedOrder.data.order.deliveryStatus !== "completed") {
    throw new Error("Technician completion did not synchronize the customer order.");
  }
  if (completedOrder.data.order.address?.postalCode !== address.postalCode || !completedOrder.data.order.receipt?.itemsSummary?.includes("2.5 HP")) {
    throw new Error("Receipt/order details lost the delivery address or horsepower.");
  }
  record("Installation completion, order synchronization, receipt address, and horsepower");

  const completedTaskList = await request("/tasks?limit=75", { token: superadmin.token });
  const summarizedTask = (completedTaskList.data.tasks || []).find((item) => String(item.id || item._id) === String(taskId));
  if (!summarizedTask?.proof?.hasAfterPhotos || Array.isArray(summarizedTask.proof?.afterPhotos)) {
    throw new Error("Task list did not summarize proof media safely.");
  }
  if (JSON.stringify(completedTaskList.data).length > 250000) {
    throw new Error("Task list response is unexpectedly large after proof-media summarization.");
  }
  const fullTaskProof = await request(`/tasks/${taskId}`, { token: superadmin.token });
  if (!fullTaskProof.data.task?.proof?.afterPhotos?.some((photo) => photo?.uri)) {
    throw new Error("On-demand task detail did not retain proof photos.");
  }
  record("Task list stays lightweight while on-demand proof remains available");

  const unitsResult = await request("/amp/customer/units", { token: customerToken });
  const unit = (unitsResult.data.units || []).find((item) => item.serialNumber === serialNumber);
  if (!unit || unit.capacityHp !== 2.5 || unit.warrantyStatus !== "active") {
    throw new Error("Installed customer AC unit, horsepower, or warranty activation is missing.");
  }
  const unitId = unit.id;
  record("Customer My Unit synchronization and automatic warranty activation");

  await request(`/amp/units/${unitId}/room-size`, {
    token: customerToken,
    method: "PATCH",
    body: { roomSizeSqm: 35 },
  });
  const recommendation = await request(`/amp/units/${unitId}/next-service`, { token: customerToken });
  if (!recommendation.data.recommendation?.bestServicedBy) {
    throw new Error("AMP deterministic recommendation did not return a service date.");
  }
  record("Room-size update and AMP recommendation fallback");

  const catalog = await request("/service-requests/catalog", { token: customerToken });
  const service = catalog.data.offerings?.[0];
  if (!service?.id) throw new Error("Mobile service catalog is empty.");
  const serviceRequest = await request("/service-requests/me", {
    token: customerToken,
    method: "POST",
    expected: [201],
    headers: { "Idempotency-Key": `qa-service-${runId}` },
    body: {
      serviceId: service.id,
      unitId,
      unitName: unit.unitName,
      address: `${address.street}, ${address.barangay}, ${address.city}`,
      issueDescription: "Acceptance maintenance request for synchronization testing.",
      preferredDate: formatDateKeyInTimeZone(new Date(Date.now() + 3 * 86400000)),
    },
  });
  await request(`/service-requests/${serviceRequest.data.request.id || serviceRequest.data.request._id}/status`, {
    token: customerToken,
    method: "PATCH",
    body: { status: "Cancelled" },
  });
  record("Mobile-only service request creation and customer cancellation");

  const claimResult = await request(`/warranties/units/${unitId}/claims`, {
    token: customerToken,
    method: "POST",
    expected: [201],
    body: { issue: "Acceptance warranty cooling concern", notes: "Created by isolated QA flow" },
  });
  const claimId = claimResult.data.claim.claimId;
  await request(`/warranties/units/${unitId}/claims/${claimId}`, {
    token: superadmin.token,
    method: "PATCH",
    body: { status: "approved", decisionNote: "Covered by acceptance warranty" },
  });
  const warranty = await request(`/warranties/units/${unitId}`, { token: customerToken });
  if (
    warranty.data.warranty?.status !== "active" ||
    !warranty.data.warranty?.claims?.some((claim) => claim.claimId === claimId && claim.status === "approved") ||
    !/service request was created/i.test(String(warranty.data.recommendation || ""))
  ) {
    throw new Error("Approved claim did not preserve active coverage and clear customer guidance.");
  }
  record("Warranty claim submission, administration review, and customer synchronization");

  const stockBeforeOnlineCheckout = Number((await findProduct(superadmin.token, productId)).stock);
  const onlineOrderResult = await request("/orders", {
    token: customerToken,
    method: "POST",
    expected: [201],
    headers: { "Idempotency-Key": `qa-paymongo-${runId}` },
    body: {
      items: [{ productId, id: productId, name: productResult.data.product.name, quantity: 1, price: 42000 }],
      address,
      paymentMethod: "gcash",
      paymentReturnTarget: "mobile",
      platform: "mobile",
    },
  });
  const onlineOrder = onlineOrderResult.data.order;
  const onlineOrderId = onlineOrder.id || onlineOrder._id;
  const checkoutUrl = String(onlineOrderResult.data.payment?.checkoutUrl || onlineOrderResult.data.paymentUrl || "");
  if (!onlineOrderId || !/^https:\/\/(checkout\.)?paymongo\.com\//i.test(checkoutUrl)) {
    throw new Error("PayMongo test checkout did not return a hosted checkout URL.");
  }
  if (Number((await findProduct(superadmin.token, productId)).stock) !== stockBeforeOnlineCheckout - 1) {
    throw new Error("Online checkout did not reserve exactly one inventory unit.");
  }
  const cancelledOnlineOrder = await request(`/orders/me/${onlineOrderId}/cancel-request`, {
    token: customerToken,
    method: "PATCH",
    body: { reason: "Acceptance test cancelled before payment" },
  });
  if (cancelledOnlineOrder.data.order?.workflowStatus !== "cancelled") {
    throw new Error("Unpaid PayMongo checkout was not cancelled immediately.");
  }
  if (Number((await findProduct(superadmin.token, productId)).stock) !== stockBeforeOnlineCheckout) {
    throw new Error("Cancelling the unpaid PayMongo checkout did not restore inventory.");
  }
  record("PayMongo test checkout creation, inventory reservation, and cancellation rollback");

  const contact = await request("/contact-messages", {
    token: customerToken,
    method: "POST",
    expected: [201],
    headers: { "Idempotency-Key": `qa-contact-${runId}` },
    body: {
      category: "order",
      subject: "Acceptance order question",
      message: "Please confirm this acceptance order reached the correct support team.",
      source: "mobile",
    },
  });
  const ticketId = contact.data.message.id || contact.data.message._id;
  const inbox = await request("/contact-messages", { token: superadmin.token });
  if (!(inbox.data.messages || []).some((item) => String(item.id || item._id) === String(ticketId))) {
    throw new Error("Customer contact ticket did not reach the administrative inbox.");
  }
  await request(`/contact-messages/${ticketId}`, {
    token: superadmin.token,
    method: "PATCH",
    body: { status: "resolved", adminReply: "Your acceptance order was received successfully." },
  });
  const notifications = await request("/notifications/me", { token: customerToken });
  if (!(notifications.data.notifications || []).some((item) => String(item.message || "").includes("acceptance order was received"))) {
    throw new Error("Administrative contact reply did not reach customer notifications.");
  }
  record("Contact Us delivery, administration reply, and customer notification");

  const reportUnits = await request("/amp/report-units", { token: superadmin.token });
  if (!(reportUnits.data.units || []).some((item) => item.serialNumber === serialNumber)) {
    throw new Error("Installed acceptance unit is missing from AMP reporting.");
  }
  record("AMP reporting receives completed installation data");

  console.log(`\nAcceptance journey complete: ${stepResults.length} verified checkpoints.`);
};

main().catch((error) => {
  console.error(`FAIL  ${error.message}`);
  process.exitCode = 1;
});
