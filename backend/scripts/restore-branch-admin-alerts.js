// Explicit repair only: never runs during startup or reseeding.
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const branches = ['Bulacan', 'Cavite', 'Laguna', 'Bataan', 'Pangasinan', 'Ilocos'];
async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const users = mongoose.connection.collection('users');
  const targets = [];
  for (const branch of branches) {
    const matches = await users.find({ role: 'admin', alias: `admin.${branch.toLowerCase()}`, assignedBranch: branch }, { projection: { alias: 1, assignedBranch: 1, notifications: 1 } }).toArray();
    if (matches.length !== 1) throw new Error(`Expected exactly one seeded admin for ${branch}; no changes made.`);
    targets.push(matches[0]);
  }
  for (const target of targets) {
    const before = Object.fromEntries(['inApp', 'orderUpdates', 'serviceUpdates'].map((key) => [key, target.notifications?.[key]]));
    if (process.argv.includes('--apply')) {
      await users.updateOne({ _id: target._id, role: 'admin', assignedBranch: target.assignedBranch }, { $set: { 'notifications.inApp': true, 'notifications.orderUpdates': true, 'notifications.serviceUpdates': true } });
      const saved = await users.findOne({ _id: target._id }, { projection: { notifications: 1 } });
      if (!['inApp', 'orderUpdates', 'serviceUpdates'].every((key) => saved.notifications[key] === true)) throw new Error(`Verification failed for ${target.alias}`);
    }
    console.log(JSON.stringify({ account: target.alias, before, applied: process.argv.includes('--apply') }));
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
