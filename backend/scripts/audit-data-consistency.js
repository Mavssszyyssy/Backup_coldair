/* eslint-disable no-console */
// Read-only production/QA integrity audit. This script never writes data and
// reports only aggregate counts plus non-personal operational identifiers.
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const connectDb = require("../src/config/db");
const User = require("../src/models/User");
const Order = require("../src/models/Order");
const Task = require("../src/models/Task");
const Unit = require("../src/models/Unit");
const Product = require("../src/models/Product");
const ServiceRequest = require("../src/models/ServiceRequest");
const { PROTECTED_DEMO_STAFF } = require("../src/domain/demoStaffPolicy");

const normalized = (value) => String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
const uniqueNonEmpty = (values) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
const duplicateKeys = (rows, field) => {
  const counts = new Map();
  rows.forEach((row) => {
    const key = String(row[field] || "").trim().toLowerCase();
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
};

const main = async () => {
  await connectDb();
  const [users, orders, tasks, units, products, serviceRequests] = await Promise.all([
    User.find({ isDeleted: { $ne: true }, accountStatus: { $ne: "deleted" } }).select("alias email phone role assignedBranch activeBranch").lean(),
    Order.find({}).select("orderCode workflowStatus deliveryStatus stockReservationStatus items customer assignedTechnician").limit(5000).lean(),
    Task.find({}).select("taskCode status completedAt orderId requestId customerId payload assignedTechnicianId").limit(5000).lean(),
    Unit.find({ status: { $ne: "retired" } }).select("serialNumber qrUnitId customer productId capacityHp status warranty serviceBranch").limit(5000).lean(),
    Product.find({}).select("sku name stock branchStock serialUnits image specs").limit(2000).lean(),
    ServiceRequest.find({}).select("requestCode status linkedTaskId payload customerId unitId").limit(5000).lean(),
  ]);

  const activeStaff = users.filter((user) => user.role !== "customer");
  const protectedAliases = new Set(PROTECTED_DEMO_STAFF.map(([alias]) => alias));
  const activeAliases = new Set(activeStaff.map((user) => String(user.alias || "").toLowerCase()));
  const taskById = new Map(tasks.map((task) => [String(task._id), task]));
  const orderIds = new Set(orders.map((order) => String(order._id)));
  const userIds = new Set(users.map((user) => String(user._id)));
  const productIds = new Set(products.map((product) => String(product._id)));

  const completeOrderMismatch = orders.filter((order) => normalized(order.workflowStatus) === "complete" && (
    normalized(order.deliveryStatus) !== "completed" || normalized(order.stockReservationStatus) !== "consumed"
  ));
  const cancelledOrderMismatch = orders.filter((order) => normalized(order.workflowStatus) === "cancelled" && normalized(order.stockReservationStatus) !== "released");
  const dispatchedWithoutSerial = orders.filter((order) => ["to-install", "complete"].includes(normalized(order.workflowStatus)) &&
    (order.items || []).some((item) => Number(item.quantity || 0) > uniqueNonEmpty(item.serialNumbers || []).length));
  const terminalTaskMismatch = tasks.filter((task) => normalized(task.status) === "completed" ? !task.completedAt : Boolean(task.completedAt));
  const orphanTaskOrders = tasks.filter((task) => {
    const orderId = String(task.orderId || task.payload?.orderId || "").trim();
    return orderId && mongoose.isValidObjectId(orderId) && !orderIds.has(orderId);
  });
  const serviceRequestTaskMismatch = serviceRequests.filter((request) => {
    const taskId = String(request.linkedTaskId || request.payload?.linkedTaskId || "").trim();
    if (!taskId || !mongoose.isValidObjectId(taskId)) return false;
    const task = taskById.get(taskId);
    if (!task) return true;
    return normalized(request.status) === "completed" && normalized(task.status) !== "completed";
  });
  const unownedUnits = units.filter((unit) => unit.customer && !userIds.has(String(unit.customer)));
  const missingProductUnits = units.filter((unit) => unit.productId && !productIds.has(String(unit.productId)));
  const missingCapacityUnits = units.filter((unit) => !(Number(unit.capacityHp) > 0));
  const negativeInventory = products.filter((product) => Number(product.stock || 0) < 0 ||
    Object.values(product.branchStock || {}).some((value) => Number(value || 0) < 0));

  const result = {
    generatedAt: new Date().toISOString(),
    counts: {
      activeUsers: users.length,
      activeStaff: activeStaff.length,
      orders: orders.length,
      tasks: tasks.length,
      installedUnits: units.length,
      products: products.length,
      serviceRequests: serviceRequests.length,
    },
    staffBaseline: {
      missingSeededAliases: [...protectedAliases].filter((alias) => !activeAliases.has(alias)),
      extraStaffAliases: activeStaff.map((user) => String(user.alias || "(no alias)")).filter((alias) => !protectedAliases.has(alias.toLowerCase())),
    },
    duplicateIdentities: {
      aliases: duplicateKeys(users, "alias"),
      emails: duplicateKeys(users, "email"),
      phones: duplicateKeys(users, "phone"),
    },
    integrity: {
      completeOrderStateMismatch: { count: completeOrderMismatch.length, samples: completeOrderMismatch.slice(0, 10).map((order) => order.orderCode) },
      cancelledOrderReservationMismatch: { count: cancelledOrderMismatch.length, samples: cancelledOrderMismatch.slice(0, 10).map((order) => order.orderCode) },
      dispatchedWithoutEnoughSerials: { count: dispatchedWithoutSerial.length, samples: dispatchedWithoutSerial.slice(0, 10).map((order) => order.orderCode) },
      terminalTaskTimestampMismatch: { count: terminalTaskMismatch.length, samples: terminalTaskMismatch.slice(0, 10).map((task) => task.taskCode) },
      orphanTaskOrders: { count: orphanTaskOrders.length, samples: orphanTaskOrders.slice(0, 10).map((task) => task.taskCode) },
      serviceRequestTaskMismatch: { count: serviceRequestTaskMismatch.length, samples: serviceRequestTaskMismatch.slice(0, 10).map((request) => request.requestCode || String(request._id)) },
      unownedInstalledUnits: { count: unownedUnits.length, samples: unownedUnits.slice(0, 10).map((unit) => unit.serialNumber) },
      missingProductUnits: { count: missingProductUnits.length, samples: missingProductUnits.slice(0, 10).map((unit) => unit.serialNumber) },
      missingCapacityUnits: { count: missingCapacityUnits.length, samples: missingCapacityUnits.slice(0, 10).map((unit) => unit.serialNumber) },
      negativeInventory: { count: negativeInventory.length, samples: negativeInventory.slice(0, 10).map((product) => product.sku) },
    },
  };
  console.log(JSON.stringify(result, null, 2));
};

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
