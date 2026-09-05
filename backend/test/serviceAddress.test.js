const test = require("node:test");
const assert = require("node:assert/strict");
const { formatServiceAddress } = require("../src/domain/serviceAddress");

test("service work orders retain the street, barangay, city, province and ZIP snapshot", () => {
  assert.equal(formatServiceAddress("Unit 1, Acceptance Street", { barangay: "Bago Bantay", city: "Quezon City", province: "Metro Manila", postalCode: "1105" }), "Unit 1, Acceptance Street, Bago Bantay, Quezon City, Metro Manila, 1105");
});
test("already complete service addresses do not repeat their location components", () => {
  assert.equal(formatServiceAddress("Unit 1, Bago Bantay, Quezon City, Metro Manila", { barangay: "bago bantay", city: "Quezon City", province: "Metro Manila" }), "Unit 1, Bago Bantay, Quezon City, Metro Manila");
});
