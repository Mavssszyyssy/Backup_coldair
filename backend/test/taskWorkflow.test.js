const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getTaskMutationBlocker,
  hasCustomerPresentArrival,
  installationArrivalBlocker,
  isOrderInstallationTask,
  normalizeTaskStatus,
  parseTaskStatus,
} = require("../src/domain/taskWorkflow");

test("task statuses normalize known display values and reject unknown API values", () => {
  assert.equal(parseTaskStatus("In Progress"), "in-progress");
  assert.equal(parseTaskStatus("on_hold"), "on-hold");
  assert.equal(parseTaskStatus("made-up-status"), null);
  assert.equal(normalizeTaskStatus("made-up-status"), "pending");
});

test("completed and cancelled work orders are terminal", () => {
  assert.match(getTaskMutationBlocker("completed"), /locked/i);
  assert.match(getTaskMutationBlocker("cancelled"), /new work order/i);
  assert.equal(getTaskMutationBlocker("in-progress"), "");
  assert.equal(getTaskMutationBlocker("on-hold"), "");
});

test("installation cannot start until customer presence matches the current GPS arrival", () => {
  const checkedInAt = "2026-09-11T01:00:00.000Z";
  const task = {
    payload: {
      orderId: "order-1",
      checkIn: { checkedInAt, latitude: 14.5, longitude: 120.9 },
    },
  };
  assert.equal(isOrderInstallationTask(task), true);
  assert.equal(hasCustomerPresentArrival(task), false);
  assert.match(installationArrivalBlocker(task), /customer is present/i);

  task.payload.arrivalValidation = { customerPresent: true, checkedInAt };
  assert.equal(hasCustomerPresentArrival(task), true);
  assert.equal(installationArrivalBlocker(task), "");

  task.payload.checkIn.checkedInAt = "2026-09-11T02:00:00.000Z";
  assert.equal(hasCustomerPresentArrival(task), false);
  assert.match(installationArrivalBlocker(task), /Failed to Install/i);
});

test("service visits are not subjected to installation customer-presence validation", () => {
  const task = { payload: { requestId: "request-1", checkIn: { checkedInAt: "2026-09-11T01:00:00.000Z", latitude: 14.5, longitude: 120.9 } } };
  assert.equal(isOrderInstallationTask(task), false);
  assert.equal(installationArrivalBlocker(task), "");
});
