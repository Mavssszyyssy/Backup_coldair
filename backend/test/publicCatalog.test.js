const test = require("node:test");
const assert = require("node:assert/strict");
const { toPublicProduct } = require("../src/controllers/productController");

const product = {
  _id: "product-1",
  name: "Inverter Split Type",
  sku: "AC-100",
  brand: "Cold Air",
  category: "split",
  description: "Efficient cooling",
  specs: "1.0HP",
  features: ["Inverter"],
  image: "https://example.invalid/ac.jpg",
  price: 20000,
  stock: 5,
  branchStock: new Map([["Cavite", 2], ["Bulacan", 3]]),
  serialUnits: [{ serialNumber: "PRIVATE-SERIAL", qrUnitId: "PRIVATE-QR" }],
};

test("public catalog exposes only ecommerce-safe product fields", () => {
  const result = toPublicProduct(product);
  assert.equal(result.stock, 5);
  assert.equal(result.stockScope, "all_branches");
  assert.equal("serialUnits" in result, false);
  assert.equal("branchStock" in result, false);
  assert.equal("qrCode" in result, false);
});

test("branch-scoped catalog reports only the selected branch quantity", () => {
  const result = toPublicProduct(product, "Cavite");
  assert.equal(result.stock, 2);
  assert.equal(result.totalStock, 5);
  assert.equal(result.inventoryBranch, "Cavite");
});
