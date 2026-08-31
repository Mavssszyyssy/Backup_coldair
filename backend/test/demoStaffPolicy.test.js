const test = require("node:test");
const assert = require("node:assert/strict");
const { PROTECTED_DEMO_STAFF, isProtectedDemoStaff } = require("../src/domain/demoStaffPolicy");
const { demoUsers } = require("../src/seed/seedDemoUsers");

test("demo baseline contains exactly six branch admins, one technician, and one superadmin", () => {
  assert.equal(demoUsers.filter((user) => user.role === "admin").length, 6);
  assert.equal(demoUsers.filter((user) => user.role === "technician").length, 1);
  assert.equal(demoUsers.filter((user) => user.role === "superadmin").length, 1);
  assert.equal(PROTECTED_DEMO_STAFF.length, 8);
  assert.equal(demoUsers.some((user) => user.alias === "admin.main"), false);
});

test("seeded staff remain protected even if their display alias changes", () => {
  assert.equal(isProtectedDemoStaff({ alias: "admin.cavite" }), true);
  assert.equal(isProtectedDemoStaff({ alias: "renamed", email: "tech@example.com" }), true);
  assert.equal(isProtectedDemoStaff({ alias: "tech.bulacan.temporary" }), false);
});
