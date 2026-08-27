const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCustomerTaskScopeQuery } = require("../src/controllers/taskController");

test("customer task visibility is limited to the signed-in customer", () => {
  const query = buildCustomerTaskScopeQuery({
    _id: "customer-123",
    email: "Customer@example.com",
  });

  assert.deepEqual(query.$or.slice(0, 3), [
    { customerId: "customer-123" },
    { "payload.customerId": "customer-123" },
    { "payload.userId": "customer-123" },
  ]);
  assert.equal(query.$or[3].customerEmail.test("customer@example.com"), true);
  assert.equal(query.$or[4]["payload.customerEmail"].test("CUSTOMER@EXAMPLE.COM"), true);
});

test("customer task visibility fails closed without an account identity", () => {
  assert.deepEqual(buildCustomerTaskScopeQuery({}), {
    _id: { $exists: false },
  });
});
