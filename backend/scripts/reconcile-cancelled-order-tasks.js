/* eslint-disable no-console */
// Explicitly approved September 8 reconciliation. Defaults to read-only.
// Never restores/releases stock, changes orders, or edits service history.
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDb = require('../src/config/db');
const Task = require('../src/models/Task');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const targets = new Map([
  ['TSK-1779812233093', 'ORD-1779812193914'],
  ['TSK-1779841224431', 'ORD-1779841181995'],
  ['TSK-1780573136131', 'ORD-1780573102294'],
  ['TSK-1780640683047', 'ORD-1780640602291'],
  ['TSK-1785238128822', 'ORD-1785236750214'],
]);
const batchId = 'cancelled-order-tasks-2026-09-08';
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const preservedTask = task => {
  const value = JSON.parse(JSON.stringify(task));
  delete value.status; delete value.updatedAt;
  for (const key of ['status', 'updatedAt', 'cancelledByOrder']) delete value.payload[key];
  return value;
};

async function main() {
  await connectDb();
  const tasks = await Task.find({ taskCode: { $in: [...targets.keys()] } }).sort({ taskCode: 1 }).lean();
  assert.equal(tasks.length, 5, 'All five approved tasks must exist');
  const orders = await Order.find({ orderCode: { $in: [...targets.values()] } }).sort({ orderCode: 1 }).lean();
  assert.equal(orders.length, 5, 'All five approved parent orders must exist');
  for (const task of tasks) {
    const order = orders.find(o => o.orderCode === targets.get(task.taskCode));
    assert.equal(String(task.payload?.orderId), String(order._id), 'Parent order link changed');
    assert.equal(order.workflowStatus, 'cancelled', 'Parent order must remain cancelled');
    assert.equal(order.stockReservationStatus, 'released', 'Stock must already be released');
    assert.notEqual(task.status, 'completed', 'Never rewrite completed work');
  }
  const serials = tasks.flatMap(t => [...(t.payload.serialNumbers || []), ...(t.payload.items || []).flatMap(i => i.serialNumbers || [])]);
  const inventoryQuery = { 'serialUnits.serialNumber': { $in: serials } };
  const beforeInventory = await Product.find(inventoryQuery).sort({ _id: 1 }).lean();
  const changes = tasks.filter(t => t.status !== 'cancelled');
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', changes: changes.map(t => ({ taskCode: t.taskCode, from: t.status, to: 'cancelled' })) }));
  if (!process.argv.includes('--apply')) return;

  const backups = mongoose.connection.collection('maintenance_reconciliations');
  for (const task of changes) {
    // Recovery snapshot stays inside the same database; never log personal data.
    await backups.updateOne({ _id: `${batchId}:${task.taskCode}` }, { $setOnInsert: {
      batchId, taskCode: task.taskCode, savedAt: new Date(), originalTask: task,
      reason: 'User-approved reconciliation of active task linked to cancelled order; stock and history preserved',
    } }, { upsert: true });
    const now = new Date();
    const result = await Task.collection.updateOne({ _id: task._id, status: task.status, updatedAt: task.updatedAt, 'payload.orderId': task.payload.orderId }, {
      $set: { status: 'cancelled', updatedAt: now, 'payload.status': 'cancelled', 'payload.cancelledByOrder': true, 'payload.updatedAt': now.toISOString() },
    });
    assert.equal(result.modifiedCount, 1, 'Task changed concurrently; stop and re-inspect');
    console.log(`Reconciled ${task.taskCode}`);
  }
  const after = await Task.find({ taskCode: { $in: [...targets.keys()] } }).sort({ taskCode: 1 }).lean();
  for (const task of after) {
    assert.equal(task.status, 'cancelled');
    assert.deepEqual(preservedTask(task), preservedTask(tasks.find(t => t.taskCode === task.taskCode)), 'Task history/proof/details must remain unchanged');
  }
  assert.equal(digest(await Order.find({ orderCode: { $in: [...targets.values()] } }).sort({ orderCode: 1 }).lean()), digest(orders), 'Parent orders changed during reconciliation; review concurrent activity');
  assert.equal(digest(await Product.find(inventoryQuery).sort({ _id: 1 }).lean()), digest(beforeInventory), 'Inventory changed during reconciliation; review concurrent activity');
  console.log('Verified: all five tasks cancelled; task history/proof, parent orders, and associated inventory unchanged. Recovery snapshots retained in maintenance_reconciliations.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
