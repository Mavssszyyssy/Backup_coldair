const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getTaskMutationBlocker,
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
