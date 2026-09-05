/* eslint-disable no-console */
// Destructive-by-design acceptance journey for an isolated QA database only.
// It creates its own customer, technician, product, order, unit, requests, and
// support ticket. Never point this script at the production backend.
const path = require("path");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const { formatDateKeyInTimeZone } = require("../src/utils/dateTime");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const baseUrl = process.env.ACCEPTANCE_API_BASE || "http://127.0.0.1:5002/api";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/?$/i.test(baseUrl)) {
  throw new Error("Acceptance tests are restricted to a localhost API.");
}
const expectedDatabase = String(process.env.ACCEPTANCE_EXPECTED_DATABASE || "").trim();
if (!/(_qa|_e2e)$/i.test(expectedDatabase)) {
  throw new Error("Set ACCEPTANCE_EXPECTED_DATABASE to an isolated database name ending in _qa or _e2e.");
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
  if (health.data.environment === "production") {
    throw new Error("Acceptance tests cannot run against a production backend.");
  }
  if (String(health.data.databaseName || "") !== expectedDatabase) {
    throw new Error(`Acceptance database mismatch. Expected ${expectedDatabase}, but the local backend reported ${health.data.databaseName || "no isolated database"}.`);
  }
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
  // Exercise the real authenticator endpoints for this isolated test account.
  // No authenticator secrets, recovery codes, or access tokens are logged.
  await request("/users/profile", { token: customerToken, method: "PATCH", expected: [409], body: { customer_onboarded_at: new Date().toISOString() } });
  const setup = await request("/security/totp/setup", { token: customerToken, method: "POST", body: {} });
  await request("/security/totp/verify", { token: customerToken, method: "POST", body: { code: speakeasy.totp({ secret: setup.data.secret, encoding: "base32" }) } });
  const authChallenge = await request("/auth/login", { method: "POST", body: { identifier: registrationBody.alias, password: customerPassword } });
  if (authChallenge.data.token || !authChallenge.data.challengeToken) throw new Error("Password-only login bypassed the enabled authenticator.");
  await request("/auth/login/totp", { method: "POST", body: { challengeToken: authChallenge.data.challengeToken, code: speakeasy.totp({ secret: setup.data.secret, encoding: "base32" }) } });
  record("Authenticator setup and subsequent two-step login");
  const setupCompleted = await request("/users/profile", { token: customerToken, method: "PATCH", body: { customer_onboarded_at: new Date().toISOString() } });
  const reloadedCustomer = await request("/users/profile", { token: customerToken });
  if (!setupCompleted.data.user?.customerOnboardedAt || setupCompleted.data.user.customerOnboardedAt !== reloadedCustomer.data.user?.customerOnboardedAt) throw new Error("Customer setup completion did not persist across profile reload.");
  if (JSON.stringify(reloadedCustomer.data.user.addresses) !== JSON.stringify(customer.addresses)) throw new Error("Completing security setup unexpectedly changed customer addresses.");
  record("Customer onboarding persists after verified setup without changing saved addresses");
  const genericTech = await login(staff.data.loginIdentifier, staff.data.tempPassword);
  const genericBody = { title: "Inspect cooling controller", customerId: customer.id, customerName: "Acceptance Customer", address: address.street, branch: "Bulacan", assignedTechnicianId: technician.id || technician._id, status: "in-progress" };
  await request("/tasks", { token: superadmin.token, method: "POST", expected: [400], body: { ...genericBody, assignedTechnicianId: superadmin.user.id } });
  await request("/tasks", { token: superadmin.token, method: "POST", expected: [409], body: { ...genericBody, branch: "Cavite" } });
  const genericWork = await request("/tasks", { token: superadmin.token, method: "POST", expected: [201], body: genericBody });
  const genericId = genericWork.data.task.id;
  await request(`/tasks/${genericId}/check-in`, { token: genericTech.token, method: "PATCH", body: { coordinates: { latitude: 14.65, longitude: 121.02, accuracy: 8 } } });
  const seededTech = await login("tech.main", "tech.123");
  const reassignedWork = await request(`/tasks/${genericId}`, { token: superadmin.token, method: "PATCH", body: { assignedTechnicianId: seededTech.user.id } });
  if (reassignedWork.data.task.payload?.checkIn?.checkedInAt) throw new Error("Reassignment retained the previous technician's GPS check-in.");
  await request(`/tasks/${genericId}`, { token: genericTech.token, expected: [404] });
  const assignedNotices = await request("/notifications/me", { token: seededTech.token });
  if (!assignedNotices.data.notifications.some((notice) => notice.targetId === genericId && notice.title === "Work order assigned")) throw new Error("Direct work assignment did not notify the incoming technician.");
  await request(`/tasks/${genericId}`, { token: superadmin.token, method: "PATCH", body: { status: "cancelled" } });
  record("Direct work assignments validate staff/branch, notify technicians, and clear stale arrival proof on reassignment");

  await request("/users/addresses", {
    token: customerToken,
    method: "POST",
    expected: [400],
    body: { ...address, label: "Invalid QA address", postalCode: "4102", isDefault: false },
  });
  record("ZIP code rejection when it does not match the selected city");

  await request("/users", { token: customerToken, expected: [403] });
  record("Customer role cannot access staff records");

  const productResult = await request("/products", {
    token: superadmin.token,
    method: "POST",
    expected: [201],
    body: {
      name: `Cooling Unit ${runId}`,
      sku: `CA-${runId}`,
      brand: "Cold Air",
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
  if (order.items?.[0]?.model !== `CA-${runId}` || Number(order.items?.[0]?.horsepower) !== 2.5) {
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
      installationTime: "00:00",
      roomSizeSqm: 30,
      conditionRating: "excellent",
      notes: "Acceptance installation registration",
    },
  });
  record("Technician AMP unit registration");

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
  if (unit.installationDate !== formatDateKeyInTimeZone(new Date())) throw new Error("My Units shifted the local installation date to the previous day.");
  if (unit.lastCleaningDate || !unit.serviceHistory?.some((history) => history.serviceType === "installation")) throw new Error("Installation was incorrectly recorded as cleaning or its history is missing.");
  record("Customer My Unit synchronization and automatic warranty activation");

  await request(`/tasks/${taskId}/status`, { token: technicianSession.token, method: "PATCH", body: { status: "completed" } });
  const replayedUnits = await request("/amp/customer/units", { token: customerToken });
  if (replayedUnits.data.units.find((item) => item.id === unitId).serviceHistory.length !== unit.serviceHistory.length) throw new Error("Installation completion retry duplicated service history.");
  record("Installation completion retry preserves a single history record");

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
  const cancelledService = await request(`/service-requests/${serviceRequest.data.request.id || serviceRequest.data.request._id}/status`, {
    token: customerToken,
    method: "PATCH",
    body: { status: "Cancelled", assignedTechnicianId: superadmin.user.id, serviceHistoryId: "forged", checkIn: { latitude: 1, longitude: 1 } },
  });
  if (cancelledService.data.request.assignedTechnicianId || cancelledService.data.request.payload?.serviceHistoryId || cancelledService.data.request.payload?.checkIn) throw new Error("Customer cancellation altered restricted operational fields.");
  record("Mobile-only service request creation and customer cancellation");

  const maintenanceBody = { serviceId: "maintenance", unitId, address: address.street, city: address.city, barangay: address.barangay, province: address.province, postalCode: address.postalCode, issueDescription: "Airflow is weak and the filter needs an inspection.", preferredDate: formatDateKeyInTimeZone(new Date(Date.now() + 86400000)) };
  const serviceVisit = await request("/service-requests/me", {
    token: customerToken, method: "POST", expected: [201],
    body: { ...maintenanceBody, status: "Completed", assignedTechnicianId: technician.id || technician._id, customerId: superadmin.user.id, checkIn: { latitude: 1, longitude: 1, checkedInAt: new Date().toISOString() }, serviceHistoryId: "spoofed", timeline: [{ title: "Service completed" }] },
  });
  const serviceRequestId = serviceVisit.data.request.id;
  if (serviceVisit.data.request.status !== "Submitted" || serviceVisit.data.request.assignedTechnicianId || serviceVisit.data.request.payload?.checkIn || serviceVisit.data.request.customerId !== String(customer.id)) throw new Error("Customer-supplied fields forged operational state.");
  record("Service booking rejects forged completion, assignment, ownership, and GPS fields");
  await request("/service-requests/me", { token: customerToken, method: "POST", expected: [409], body: maintenanceBody });
  await request(`/service-requests/${serviceRequestId}/status`, { token: superadmin.token, method: "PATCH", expected: [400], body: { status: "In Progress" } });
  const assignedVisit = await request(`/service-requests/${serviceRequestId}/status`, { token: superadmin.token, method: "PATCH", body: { status: "Assigned", assignedTechnicianId: technician.id || technician._id } });
  const serviceTaskId = assignedVisit.data.request.linkedTaskId;
  if (!serviceTaskId) throw new Error("Assigned maintenance request has no work order.");
  const visitDetails = await request(`/tasks/${serviceTaskId}`, { token: technicianSession.token });
  for (const part of [address.street, address.barangay, address.city, address.province, address.postalCode]) {
    if (!visitDetails.data.task.address.includes(part)) throw new Error("A service-address component was lost in the technician work order.");
  }
  record("Full service address and ZIP reach the assigned technician work order");
  const performed = { status: "completed", serviceType: "deep_cleaning", conditionRating: "fair", findings: "The evaporator coil has heavy dust buildup and restricted airflow.", serviceActions: ["Removed and cleaned the indoor unit", "Flushed the drain and tested cooling"], partsUsed: [] };
  await request(`/tasks/${serviceTaskId}/status`, { token: technicianSession.token, method: "PATCH", body: performed, expected: [409] });
  await request(`/amp/units/${unitId}/complete-service`, { token: technicianSession.token, method: "POST", body: performed, expected: [409] });
  await request(`/tasks/${serviceTaskId}/check-in`, { token: technicianSession.token, method: "PATCH", expected: [400], body: { coordinates: { latitude: null, longitude: null } } });
  await request(`/tasks/${serviceTaskId}/check-in`, { token: technicianSession.token, method: "PATCH", body: { coordinates: { latitude: 14.65, longitude: 121.02, accuracy: 8 } } });
  await request(`/tasks/${serviceTaskId}/status`, { token: technicianSession.token, method: "PATCH", expected: [400], body: { status: "completed", serviceType: "regular_cleaning", conditionRating: "good", findings: "AMP recommended regular cleaning for this AC unit.", serviceActions: ["Service completed"] } });
  await request(`/tasks/${serviceTaskId}/status`, { token: technicianSession.token, method: "PATCH", body: performed });
  const serviceUnits = await request("/amp/customer/units", { token: customerToken });
  const servicedUnit = serviceUnits.data.units.find((item) => item.id === unitId);
  const recordedVisit = servicedUnit.serviceHistory.find((history) => history.serviceType === "deep_cleaning");
  if (!recordedVisit || recordedVisit.findings !== performed.findings || !servicedUnit.lastCleaningDate) throw new Error("Actual technician findings or performed cleaning type did not reach My Units.");
  const serviceRequests = await request("/service-requests/me", { token: customerToken });
  if (serviceRequests.data.requests.find((item) => item.id === serviceRequestId)?.status !== "Completed") throw new Error("Maintenance request did not close with its technician task.");
  await request(`/tasks/${serviceTaskId}/status`, { token: technicianSession.token, method: "PATCH", body: performed });
  const retryUnits = await request("/amp/customer/units", { token: customerToken });
  if (retryUnits.data.units.find((item) => item.id === unitId).serviceHistory.length !== servicedUnit.serviceHistory.length) throw new Error("Maintenance retry duplicated history.");
  record("Maintenance journey enforces GPS and real report, synchronizes history, and tolerates retries");
  const maintenanceReport = await request("/ai/amp-report", { token: customerToken, method: "POST", body: { unitId, reportType: "maintenance_summary" } });
  if (!maintenanceReport.data.report.serviceHistory.some((history) => history.serviceLabel === "Deep cleaning" && history.findings === performed.findings) || !maintenanceReport.data.report.serviceHistory.some((history) => history.serviceLabel === "Installation")) throw new Error("AMP report mislabels service records.");
  if (maintenanceReport.data.provider !== "system-fallback") throw new Error("QA unexpectedly enabled a live AI provider.");
  record("AMP summary preserves installation and actual cleaning details with AI disabled");

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
  const approvedClaim = warranty.data.warranty.claims.find((claim) => claim.claimId === claimId);
  const warrantyAssignment = await request(`/service-requests/${approvedClaim.serviceRequestId}/status`, { token: superadmin.token, method: "PATCH", body: { status: "Assigned", assignedTechnicianId: technician.id || technician._id } });
  const warrantyTaskId = warrantyAssignment.data.request.linkedTaskId;
  await request(`/tasks/${warrantyTaskId}/check-in`, { token: technicianSession.token, method: "PATCH", body: { coordinates: { latitude: 14.65, longitude: 121.02, accuracy: 8 } } });
  await request(`/tasks/${warrantyTaskId}/status`, { token: technicianSession.token, method: "PATCH", body: { status: "completed", serviceType: "repair", conditionRating: "good", findings: "Control board was not responding during the cooling test.", resolution: "Replaced the control board and verified normal operation.", partsUsed: ["Control board"] } });
  const repairedUnits = await request("/amp/customer/units", { token: customerToken });
  const repairedUnit = repairedUnits.data.units.find((item) => item.id === unitId);
  if (repairedUnit.lastCleaningDate !== servicedUnit.lastCleaningDate || !repairedUnit.serviceHistory.some((item) => item.serviceType === "repair")) throw new Error("Warranty repair incorrectly reset the cleaning date.");
  if (repairedUnit.warranty.claims.find((claim) => claim.claimId === claimId)?.status !== "service_completed") throw new Error("Warranty claim did not close with its technician service.");
  const repairedHistory = await request(`/tasks/unit-history/${encodeURIComponent(serialNumber)}?taskId=${warrantyTaskId}`, { token: technicianSession.token });
  if (!repairedHistory.data.repairHistory?.some((entry) => String(entry.partsUsed).includes("Control board"))) throw new Error("Technician repair history lost the actual parts used.");
  await request(`/tasks/unit-history/NOT-ASSIGNED?taskId=${warrantyTaskId}`, { token: technicianSession.token, expected: [403] });
  const adminNotifications = await request("/notifications/me", { token: (await login("admin.bulacan", "admin123")).token });
  if (!adminNotifications.data.notifications.some((notification) => /technician|service/i.test(notification.type))) throw new Error("Branch admin received no service or technician notifications.");
  record("Warranty repair closes the claim, keeps cleaning dates intact, and reaches branch notifications");

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
  await request("/amp/manager/pipeline", { token: customerToken, expected: [403] });
  await request("/amp/owner/forecast", { token: (await login("admin.bulacan", "admin123")).token, expected: [403] });
  await request("/amp/manager/pipeline", { token: superadmin.token });
  const forecast = await request("/amp/owner/forecast", { token: superadmin.token });
  if (!forecast.data.revenueDisclaimer && !forecast.data.forecast?.revenueDisclaimer) throw new Error("AMP forecast is missing its scenario-revenue disclaimer.");
  record("AMP pipeline and owner forecast enforce role access and disclose estimates");

  console.log(`\nAcceptance journey complete: ${stepResults.length} verified checkpoints.`);
  console.log(`Isolated QA walkthrough customer: ${registrationBody.alias}`);
  console.log(`Isolated QA walkthrough technician: ${technician.alias}`);
};

main().catch((error) => {
  console.error(`FAIL  ${error.message}`);
  process.exitCode = 1;
});
