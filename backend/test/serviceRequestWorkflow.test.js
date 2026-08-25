const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeServiceRequestStatus,
  canTransitionServiceRequest,
  canCustomerCancelServiceRequest,
} = require("../src/domain/serviceRequestWorkflow");

test("normalizes supported service request statuses and rejects unknown values", () => {
  assert.equal(normalizeServiceRequestStatus("in progress"), "In Progress");
  assert.equal(normalizeServiceRequestStatus("COMPLETED"), "Completed");
  assert.equal(normalizeServiceRequestStatus("made-up"), null);
});

test("allows forward workflow transitions and idempotent retries", () => {
  assert.equal(canTransitionServiceRequest("Submitted", "Reviewed"), true);
  assert.equal(canTransitionServiceRequest("Reviewed", "In Progress"), true);
  assert.equal(canTransitionServiceRequest("In Progress", "Completed"), true);
  assert.equal(canTransitionServiceRequest("Assigned", "Assigned"), true);
});

test("prevents reopening terminal service requests", () => {
  assert.equal(canTransitionServiceRequest("Completed", "In Progress"), false);
  assert.equal(canTransitionServiceRequest("Cancelled", "Submitted"), false);
});

test("customers can cancel only before work is active", () => {
  assert.equal(canCustomerCancelServiceRequest("Assigned"), true);
  assert.equal(canCustomerCancelServiceRequest("In Progress"), false);
  assert.equal(canCustomerCancelServiceRequest("Completed"), false);
});
