// Read-only: inspect the evidence behind maintenance reports without changing records.
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);
const connectDb = require("../src/config/db");
const Unit = require("../src/models/Unit");
const ServiceHistory = require("../src/models/ServiceHistory");
const Task = require("../src/models/Task");
const { calculateMaintenanceRecommendation } = require("../src/domain/ampMaintenanceService");

async function main() {
  await connectDb();
  const [units, histories, tasks] = await Promise.all([
    Unit.find({}).select("serialNumber brand modelName capacityHp roomSizeSqm installation.installedAt warranty.status warranty.startDate warranty.expirationDate status amp").lean(),
    ServiceHistory.find({}).select("unit serviceDate visitType serviceType findings actionTaken serviceActions conditionRating createdAt").lean(),
    Task.find({}).select("taskCode unitId status completedAt issueType title payload.serviceHistoryId payload.serviceType payload.findings payload.resolution payload.serviceActions payload.serviceLogs").lean(),
  ]);
  const now = new Date();
  const byId = new Map(units.map((unit) => [String(unit._id), unit]));
  const historyIds = new Set(histories.map((history) => String(history._id)));
  const boilerplate = (history) => /AMP recommended|^Service completed$/i.test(`${history.findings || ""} ${history.actionTaken || ""}`.trim());
  const findings = {
    missingInstallationDates: units.filter((unit) => !unit.installation?.installedAt).map((unit) => unit.serialNumber),
    activeWarrantyWithoutDates: units.filter((unit) => unit.warranty?.status === "active" && (!unit.warranty.startDate || !unit.warranty.expirationDate)).map((unit) => unit.serialNumber),
    staleActiveWarranty: units.filter((unit) => unit.warranty?.status === "active" && new Date(unit.warranty.expirationDate) < now).map((unit) => unit.serialNumber),
    futureServiceRecords: histories.filter((history) => new Date(history.serviceDate) > now).map((history) => String(history._id)),
    serviceBeforeInstallation: histories.filter((history) => byId.get(String(history.unit))?.installation?.installedAt && new Date(history.serviceDate) < new Date(byId.get(String(history.unit)).installation.installedAt)).map((history) => String(history._id)),
    orphanServiceRecords: histories.filter((history) => !byId.has(String(history.unit))).map((history) => String(history._id)),
    completedTasksWithMissingHistory: tasks.filter((task) => task.payload?.serviceHistoryId && !historyIds.has(String(task.payload.serviceHistoryId))).map((task) => task.taskCode),
    boilerplateServiceRecords: histories.filter(boilerplate).map((history) => ({ id: String(history._id), serialNumber: byId.get(String(history.unit))?.serialNumber, serviceType: history.serviceType, visitType: history.visitType, findings: history.findings, actionTaken: history.actionTaken })),
  };
  const target = units.find((unit) => unit.serialNumber === "CAACT-HSN18IPX-MPCTE74N-93FV1W");
  const correctedRecommendation = target ? await calculateMaintenanceRecommendation(target._id, { persist: false }) : null;
  console.log(JSON.stringify({ generatedAt: now, counts: { units: units.length, histories: histories.length, tasks: tasks.length }, findings, correctedRecommendation, screenshotEvidence: target ? { unit: target, history: histories.filter((history) => String(history.unit) === String(target._id)), tasks: tasks.filter((task) => String(task.unitId) === String(target._id)) } : null }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
