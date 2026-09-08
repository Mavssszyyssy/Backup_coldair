// Reversible, exact-record cleanup. Never repairs or invents technician findings.
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);
const connectDb = require("../src/config/db");
const IDS = ["6a22a1c81dc8e2f7251e19fb", "6a22a341df137bb01a33b88e"];
const UNIT_ID = "6a229fe1100611849d420de4";
const REASON = "Legacy smoke-test history references a missing AC unit; preserved outside operational service history.";

function validateRows(rows) {
  if (rows.length !== IDS.length || new Set(rows.map((row) => String(row._id))).size !== IDS.length || rows.some((row) => !IDS.includes(String(row._id)) || String(row.unit) !== UNIT_ID || row.technicianInputs?.notes !== "Smoke test completion" || row.sourceTaskId)) {
    throw new Error("Records differ from the verified orphan smoke-test records; stopped without cleanup.");
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && (process.env.ORPHAN_CLEANUP_EXPECTED_DATABASE !== "test" || process.env.ORPHAN_CLEANUP_CONFIRM !== "archive-two-verified-smoke-histories")) {
    throw new Error("Apply requires the explicit database and exact-record confirmation.");
  }
  await connectDb();
  const db = mongoose.connection.db;
  if (mongoose.connection.name !== "test") throw new Error("Unexpected database; stopped.");
  const ids = IDS.map((id) => new mongoose.Types.ObjectId(id));
  const check = async (session) => {
    const options = session ? { session } : {};
    if (await db.collection("units").countDocuments({ _id: new mongoose.Types.ObjectId(UNIT_ID) }, options)) throw new Error("The AC unit exists now; do not archive its history.");
    if (await db.collection("tasks").countDocuments({ $or: [{ unitId: UNIT_ID }, { "payload.serviceHistoryId": { $in: [...IDS, ...ids] } }] }, options)) throw new Error("A work order references this history; review it first.");
    const rows = await db.collection("servicehistories").find({ _id: { $in: ids } }, options).toArray();
    validateRows(rows);
    return rows;
  };
  const rows = await check();
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", database: mongoose.connection.name, ids: rows.map((r) => String(r._id)), reason: REASON }));
  if (!apply) return;
  // The archive write and source removal commit atomically.
  const archive = db.collection("servicehistoryarchives");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const verified = await check(session);
      for (const row of verified) {
        await archive.insertOne({ _id: row._id, originalCollection: "servicehistories", archivedAt: new Date(), reason: REASON, original: row }, { session });
        const removed = await db.collection("servicehistories").deleteOne({ _id: row._id }, { session });
        if (removed.deletedCount !== 1) throw new Error("Source record changed; transaction rolled back.");
      }
    });
  } finally { await session.endSession(); }
  const remaining = await db.collection("servicehistories").countDocuments({ _id: { $in: ids } });
  const archived = await archive.countDocuments({ _id: { $in: ids }, originalCollection: "servicehistories" });
  if (remaining !== 0 || archived !== 2) throw new Error("Archive verification failed; inspect both collections.");
  console.log(JSON.stringify({ remainingOperationalRecords: remaining, recoverableArchivedRecords: archived, restore: "Insert each archive.original back into servicehistories after reviewing the missing unit link. Originals are retained in servicehistoryarchives." }));
}

module.exports = { validateRows };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
