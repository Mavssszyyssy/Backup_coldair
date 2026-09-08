const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../src/models/Product");
const { listLowStockProducts } = require("../src/controllers/productController");

test("low-stock results exclude archived and acceptance inventory without hiding real shortages", async (t) => {
  const rows = [
    { name: "LG Inverter", sku: "LG-1", stock: 0, threshold: 2 },
    { name: "Archived AC", sku: "AC-OLD", isActive: false, stock: 0, threshold: 1 },
    { name: "Acceptance AC 123", sku: "QA-123", brand: "AeroPulse QA", stock: 0, threshold: 1 },
    { name: "Carrier Inverter", sku: "CAR-1", stock: 5, threshold: 2 },
  ];
  let query;
  t.mock.method(Product, "find", (filter) => {
    query = filter;
    return { sort: async () => rows.map((row) => new Product(row)) };
  });
  const res = { headers: {}, set(key, value) { this.headers[key] = value; }, json(body) { this.body = body; } };
  await listLowStockProducts({ authUser: { role: "superadmin" } }, res);
  assert.deepEqual(query.isActive, { $ne: false });
  assert.deepEqual(res.body.products.map((p) => p.sku), ["LG-1"]);
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("branch admin shortages use that branch's quantity, not total inventory", async (t) => {
  t.mock.method(Product, "find", () => ({ sort: async () => [
    new Product({ name: "LG Inverter", sku: "LG-1", stock: 10, threshold: 2, branchStock: { Cavite: 1, Bulacan: 9 } }),
  ] }));
  const res = { set() {}, json(body) { this.body = body; } };
  await listLowStockProducts({ authUser: { role: "admin" }, activeBranch: "Cavite" }, res);
  assert.equal(res.body.products.length, 1);
  assert.equal(res.body.products[0].stock, 1);
});
