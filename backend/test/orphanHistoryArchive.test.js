const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRows } = require("../scripts/archive-orphan-smoke-histories");
const rows = ["6a22a1c81dc8e2f7251e19fb", "6a22a341df137bb01a33b88e"].map((_id) => ({ _id, unit: "6a229fe1100611849d420de4", technicianInputs: { notes: "Smoke test completion" } }));
test("orphan archive refuses missing, unrelated, relinked, and work-order-backed records", () => {
  assert.doesNotThrow(() => validateRows(rows));
  assert.throws(() => validateRows(rows.slice(0, 1)));
  assert.throws(() => validateRows([rows[0], rows[0]]));
  for (const change of [{ _id: "another-record" }, { unit: "another-unit" }, { technicianInputs: { notes: "Actual repair findings" } }, { sourceTaskId: "task-id" }]) {
    assert.throws(() => validateRows([{ ...rows[0], ...change }, rows[1]]));
  }
});
