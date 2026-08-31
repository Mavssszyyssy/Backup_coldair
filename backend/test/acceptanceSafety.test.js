const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("destructive QA utilities require a separately named isolated database", () => {
  const acceptance = fs.readFileSync(path.join(__dirname, "..", "scripts", "acceptance-e2e.js"), "utf8");
  const reset = fs.readFileSync(path.join(__dirname, "..", "maintenance_reset_users.js"), "utf8");
  assert.match(acceptance, /ACCEPTANCE_EXPECTED_DATABASE/);
  assert.match(acceptance, /databaseName/);
  assert.match(acceptance, /cannot run against a production backend/);
  assert.match(reset, /RESET_ISOLATED_QA/);
  assert.match(reset, /\(_qa\|_e2e\)/);
});
