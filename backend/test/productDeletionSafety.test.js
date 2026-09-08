const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../src/models/Product");
const models = [require("../src/models/Order"), require("../src/models/Unit"), require("../src/models/ReorderRequest"), require("../src/models/RestockOrder"), require("../src/models/InventoryChangeRequest")];
const { deleteProduct } = require("../src/controllers/productController");
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("every historical product reference prevents removal, including completed or retired records", async (t) => {
  const product = new Product({ name: "Linked AC", sku: "LINK-1", stock: 0 });
  t.mock.method(Product, "findById", async () => product);
  const save = t.mock.method(product, "save", async () => product);
  const remove = t.mock.method(product, "deleteOne", async () => {});
  const lookups = models.map((model) => t.mock.method(model, "exists", async () => null));
  for (let index = 0; index < models.length; index++) {
    lookups.forEach((lookup, i) => lookup.mock.mockImplementation(async () => i === index ? { _id: "reference" } : null));
    const res = response();
    await deleteProduct({ authUser: { role: "superadmin" }, params: { productId: String(product._id) } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, "PRODUCT_HAS_HISTORY");
  }
  assert.equal(save.mock.callCount(), 0);
  assert.equal(remove.mock.callCount(), 0);
});

test("serial history and branch stock cannot be discarded; empty unused products are archived, never hard-deleted", async (t) => {
  const product = new Product({ name: "Unused AC", sku: "UNUSED-1", stock: 0, threshold: 2 });
  t.mock.method(Product, "findById", async () => product);
  models.forEach((model) => t.mock.method(model, "exists", async () => null));
  const save = t.mock.method(product, "save", async () => product);
  const remove = t.mock.method(product, "deleteOne", async () => {});
  const req = { authUser: { role: "superadmin" }, params: { productId: String(product._id) } };
  product.serialUnits = [{ serialNumber: "RETIRED-1", status: "retired" }];
  const serial = response(); await deleteProduct(req, serial);
  assert.equal(serial.body.code, "PRODUCT_HAS_HISTORY");
  product.serialUnits = [];
  product.branchStock = new Map([["Cavite", 1]]);
  const stock = response(); await deleteProduct(req, stock);
  assert.equal(stock.body.code, "PRODUCT_HAS_STOCK");
  assert.equal(save.mock.callCount(), 0);
  product.branchStock = new Map();
  const archived = response(); await deleteProduct(req, archived);
  assert.equal(archived.statusCode, 200);
  assert.equal(archived.body.archived, true);
  assert.equal(product.isActive, false);
  assert.equal(product.threshold, 0);
  assert.equal(save.mock.callCount(), 1);
  assert.equal(remove.mock.callCount(), 0);
});

test("only Super Admin can remove products and malformed IDs return a clear validation error", async (t) => {
  const find = t.mock.method(Product, "findById", async () => null);
  const denied = response();
  await deleteProduct({ authUser: { role: "admin" }, params: {} }, denied);
  assert.equal(denied.statusCode, 403);
  const invalid = response();
  await deleteProduct({ authUser: { role: "superadmin" }, params: { productId: "wrong" } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(find.mock.callCount(), 0);
  const missing = response();
  await deleteProduct({ authUser: { role: "superadmin" }, params: { productId: "6a95b538e98eab8b8dbfcfbd" } }, missing);
  assert.equal(missing.statusCode, 404);
});
