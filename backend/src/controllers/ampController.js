const mongoose = require("mongoose");
const Unit = require("../models/Unit");
const Product = require("../models/Product");
const ServiceHistory = require("../models/ServiceHistory");
const Task = require("../models/Task");
const { calculateMaintenanceRecommendation } = require("../domain/ampMaintenanceService");
const { callStructuredAmpAnalysis, validateAmpInsight } = require("../services/openAiAmpService");
const { getManagerServicePipeline, getOwnerServiceForecast, UNASSIGNED_BRANCH } = require("../domain/ampDashboardService");
const { assessServiceEvidence, serviceLabel, serviceTypeFor } = require("../domain/serviceEvidence");
const { effectiveWarrantyStatus, getWarrantyRecommendation } = require("../domain/warrantyService");
const { notifyMaintenanceForUnit } = require("../services/ampDailyMonitorService");
const { BRANCHES } = require("../domain/branchRouting");
const { formatDateKeyInTimeZone } = require("../utils/dateTime");

const INTERNAL_AMP_ROLES = new Set(["technician", "manager", "owner", "admin", "superadmin"]);
const displayService = serviceLabel;

const resolveManagerPipelineScope = ({ role, requestedBranch = "", activeBranch = "" }) => {
  const canViewAllBranches = role === "superadmin" || role === "owner";
  if (!canViewAllBranches) {
    const branch = String(activeBranch || "").trim();
    if (!BRANCHES.includes(branch)) {
      const error = new Error("This account does not have a valid branch assignment.");
      error.status = 403;
      throw error;
    }
    return { branch, includeAllBranches: false };
  }

  const branch = String(requestedBranch || "").trim();
  if (branch && !BRANCHES.includes(branch) && branch !== UNASSIGNED_BRANCH) {
    const error = new Error("Select a valid operating branch.");
    error.status = 400;
    throw error;
  }
  return { branch, includeAllBranches: true };
};

const serviceHistoryItem = (service) => ({
  id: String(service._id || service.id || ""),
  date: service.serviceDate,
  serviceType: serviceTypeFor(service),
  findings: service.findings || service.technicianInputs?.notes || "",
  actionTaken: service.actionTaken || (service.serviceActions || []).join(", "),
  partsUsed: Array.isArray(service.partsUsed) ? service.partsUsed : [],
  evidence: assessServiceEvidence(service),
});

const serializeCustomerUnit = (unit, history = [], recommendation = null, product = null) => {
  const json = unit.toJSON ? unit.toJSON() : unit;
  const productJson = product?.toJSON ? product.toJSON() : product || {};
  const productId = String(json.productId || productJson.id || productJson._id || "");
  const catalogImage = String(productJson.image || "").trim();
  const warranty = { ...(json.warranty || {}), status: effectiveWarrantyStatus(json.warranty || {}) };
  const bestServicedBy = recommendation ? recommendation.bestServicedBy : json.amp?.bestServicedBy || json.amp?.nextIdealServiceDate || "";
  const recommendedService = recommendation ? recommendation.recommendedService : json.amp?.recommendedService || "";
  return {
    id: json.id || String(json._id || ""), userId: String(json.customer || ""),
    productId,
    unitName: [json.brand, json.modelName].filter(Boolean).join(" ") || "Installed AC Unit",
    brand: json.brand || productJson.brand || "", model: json.modelName || productJson.name || "",
    productSku: productJson.sku || "", category: json.category || productJson.category || "",
    imageUrl: catalogImage || (productId ? `/api/products/${encodeURIComponent(productId)}/image` : ""),
    capacityHp: Number(json.capacityHp || 0), roomSizeSqm: json.roomSizeSqm || null,
    serialNumber: json.serialNumber || "", qrCode: json.qrCode || "", qrUnitId: json.qrUnitId || "",
    serviceBranch: json.serviceBranch || "",
    status: json.status === "on_hold" ? "On Hold" : json.status === "retired" ? "Retired" : (recommendation ? recommendation.overdue : json.status === "service_due") ? "Service Due" : "Active",
    installationDate: json.installation?.installedAt ? formatDateKeyInTimeZone(json.installation.installedAt) : "",
    placementArea: json.installation?.addressLine || "",
    installationEnvironment: [json.installation?.city, json.installation?.province].filter(Boolean).join(", "),
    bestServicedBy, recommendedService, recommendedServiceLabel: displayService(recommendedService),
    lastServiceDate: recommendation ? recommendation.lastServiceDate : json.amp?.lastServiceDate || null,
    lastCleaningDate: recommendation ? recommendation.lastCleaningDate : json.amp?.lastCleaningDate || null,
    recommendationBasis: recommendation?.recommendationBasis || json.amp?.recommendationBasis || "",
    historicalBasis: recommendation?.historicalBasis || null,
    capacityAssessment: recommendation?.capacityAssessment || json.amp?.capacityAssessment || null,
    dataQuality: recommendation?.dataQuality || json.amp?.dataQuality || null,
    overdue: Boolean(recommendation?.overdue), amp: { ...json.amp, ...(recommendation || {}), nextIdealServiceDate: bestServicedBy },
    warranty: { ...warranty, claims: Array.isArray(warranty.claims) ? warranty.claims : [], serviceRecords: Array.isArray(warranty.serviceRecords) ? warranty.serviceRecords : [], timeline: Array.isArray(warranty.timeline) ? warranty.timeline : [] },
    warrantyStatus: warranty.status || "pending_activation", warrantyExpirationDate: warranty.expirationDate || "",
    warrantyRecommendation: getWarrantyRecommendation(warranty), serviceHistory: history.map((service) => ({ ...serviceHistoryItem(service), evidence: assessServiceEvidence(service, { installedAt: json.installation?.installedAt }) })),
    createdAt: json.createdAt, updatedAt: json.updatedAt,
  };
};

const loadAccessibleUnit = async (req) => {
  const unit = await Unit.findById(req.params.unitId);
  if (!unit) { const error = new Error("Unit not found"); error.status = 404; throw error; }
  if (!INTERNAL_AMP_ROLES.has(req.authUser.role) && String(unit.customer || "") !== String(req.authUser._id || "")) {
    const error = new Error("Forbidden"); error.status = 403; throw error;
  }
  if (req.authUser.role !== "superadmin" && req.activeBranch && unit.serviceBranch && unit.serviceBranch !== req.activeBranch && req.authUser.role !== "customer") {
    const error = new Error("This unit belongs to another branch."); error.status = 403; throw error;
  }
  if (req.authUser.role === "technician") {
    const technicianTask = await Task.exists({
      assignedTechnicianId: String(req.authUser._id || ""),
      $or: [
        { unitId: String(unit._id) },
        { "payload.unitId": String(unit._id) },
        { "payload.serialNumbers": unit.serialNumber },
        { "payload.items.serialNumbers": unit.serialNumber },
        { "payload.items.serialUnits.serialNumber": unit.serialNumber },
      ],
    });
    if (!technicianTask) {
      const error = new Error("This AC unit is not part of one of your assigned work orders."); error.status = 403; throw error;
    }
  }
  return unit;
};

const notifyDueMaintenance = async (unit, recommendation) => {
  return notifyMaintenanceForUnit(unit, recommendation);
};

const calculateNextServiceDate = async (req, res) => {
  try {
    const unit = await loadAccessibleUnit(req);
    const persist = req.query.persist !== "false";
    const requestedAsOfDate = String(req.query.asOfDate || "").trim();
    if (requestedAsOfDate && (persist || req.authUser.role === "customer")) {
      return res.status(400).json({
        message: "Historical calculation dates are read-only and available only to authorized staff.",
      });
    }
    const recommendation = await calculateMaintenanceRecommendation(unit._id, {
      asOfDate: persist ? new Date() : requestedAsOfDate || new Date(),
      persist,
    });
    const history = await ServiceHistory.find({ unit: unit._id }).sort({ serviceDate: -1 }).limit(50).lean();
    const ai = await callStructuredAmpAnalysis({
      safetyIdentifier: String(req.authUser._id),
      recommendation,
      recordedHistory: history.filter((item) => assessServiceEvidence(item, { installedAt: unit.installation?.installedAt }).eligible).map(serviceHistoryItem),
    });
    const insight = ai.insight ? validateAmpInsight(ai.insight, recommendation) : {
      best_serviced_by: recommendation.bestServicedBy?.slice(0, 10) || "", recommended_service: recommendation.recommendedService,
      recommendation_summary: recommendation.recommendationBasis, capacity_assessment: recommendation.capacityAssessment.status,
    };
    if (persist && !["on_hold", "retired"].includes(unit.status)) await notifyDueMaintenance(unit, recommendation);
    return res.json({ provider: ai.provider, recommendation, insight, warning: ai.error || "" });
  } catch (error) {
    console.error("Failed to calculate AMP maintenance recommendation:", error.message);
    return res.status(error.status || 500).json({ message: error.message || "Unable to calculate the maintenance recommendation." });
  }
};

const listMyUnits = async (req, res) => {
  try {
    const units = await Unit.find({ customer: req.authUser._id, status: { $ne: "retired" } }).sort({ updatedAt: -1 });
    const productIds = units
      .map((unit) => String(unit.productId || ""))
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } }).select("name sku brand category image")
      : [];
    const productById = new Map(products.map((product) => [String(product._id), product]));
    const histories = units.length ? await ServiceHistory.find({ unit: { $in: units.map((unit) => unit._id) } }).sort({ serviceDate: -1 }).limit(500) : [];
    const historyByUnit = new Map();
    histories.forEach((item) => historyByUnit.set(String(item.unit), [...(historyByUnit.get(String(item.unit)) || []), item]));
    const recommendations = await Promise.all(units.map((unit) => calculateMaintenanceRecommendation(unit._id)));
    await Promise.all(units.filter((unit) => unit.status !== "on_hold").map((unit) => notifyDueMaintenance(unit, recommendations[units.indexOf(unit)]).catch(() => null)));
    return res.json({
      units: units.map((unit, index) => serializeCustomerUnit(
        unit,
        historyByUnit.get(String(unit._id)) || [],
        recommendations[index],
        productById.get(String(unit.productId || "")) || null,
      )),
    });
  } catch (error) {
    console.error("Failed to list customer AMP units:", error.message);
    return res.status(500).json({ message: "Unable to load installed AC units right now." });
  }
};

const updateRoomSize = async (req, res) => {
  try {
    const unit = await loadAccessibleUnit(req);
    const roomSizeSqm = Number(req.body?.roomSizeSqm);
    if (!Number.isFinite(roomSizeSqm) || roomSizeSqm <= 0 || roomSizeSqm > 10000) return res.status(400).json({ message: "Enter a valid room size in square meters." });
    unit.roomSizeSqm = roomSizeSqm; await unit.save();
    const recommendation = await calculateMaintenanceRecommendation(unit._id);
    const [history, product] = await Promise.all([ServiceHistory.find({ unit: unit._id }).sort({ serviceDate: -1 }), mongoose.isValidObjectId(unit.productId) ? Product.findById(unit.productId).select("name sku brand category image") : null]);
    return res.json({ message: "Room size saved.", recommendation, unit: serializeCustomerUnit(unit, history, recommendation, product) });
  } catch (error) { return res.status(error.status || 500).json({ message: error.message || "Unable to update room size." }); }
};

const completeService = async (req, res) => {
  try {
    const unit = await loadAccessibleUnit(req);
    const taskId = String(req.body?.taskId || "");
    if (!mongoose.isValidObjectId(taskId)) return res.status(409).json({ message: "Complete the service report from its assigned work order so check-in, service history, and request status stay synchronized." });
    const task = await Task.findById(taskId);
    if (!task || String(task.unitId || task.payload?.unitId || "") !== String(unit._id)) return res.status(403).json({ message: "This work order does not belong to the selected AC unit." });
    req.params.taskId = taskId;
    req.body = { ...req.body, status: "completed" };
    return require("./taskController").updateTaskStatus(req, res);
  } catch (error) {
    console.error("Failed to complete service:", error.message);
    return res.status(error.status || 500).json({ message: error.message || "Unable to complete service.", errors: error.errors || null });
  }
};

const getManagerPipeline = async (req, res) => {
  try {
    const scope = resolveManagerPipelineScope({
      role: req.authUser.role,
      requestedBranch: req.query.branch,
      activeBranch: req.activeBranch,
    });
    return res.json(await getManagerServicePipeline({ days: req.query.days, ...scope }));
  }
  catch (error) { return res.status(error.status || 500).json({ message: error.message || "Unable to load the maintenance pipeline." }); }
};
const getReportUnits = async (req, res) => {
  try {
    const branch = req.authUser.role === "superadmin" || req.authUser.role === "owner" ? "" : req.activeBranch;
    const query = { status: { $ne: "retired" } };
    if (branch) query.serviceBranch = branch;
    const units = await Unit.find(query)
      .select("brand modelName serialNumber serviceBranch status")
      .sort({ serviceBranch: 1, modelName: 1, serialNumber: 1 })
      .limit(500)
      .lean();
    return res.json({
      units: units.map((unit) => ({
        unitId: String(unit._id),
        modelName: [unit.brand, unit.modelName].filter(Boolean).join(" ") || "Installed AC Unit",
        serialNumber: unit.serialNumber || "",
        branch: unit.serviceBranch || "Unassigned",
        status: unit.status || "active",
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load AMP report units." });
  }
};
const getOwnerForecast = async (req, res) => {
  try { return res.json(await getOwnerServiceForecast({ months: req.query.months, averageRevenue: req.query.averageRevenue })); }
  catch (error) { return res.status(error.status || 500).json({ message: error.message || "Unable to load the maintenance forecast." }); }
};

module.exports = { listMyUnits, calculateNextServiceDate, updateRoomSize, completeService, getManagerPipeline, getReportUnits, getOwnerForecast, resolveManagerPipelineScope, serializeCustomerUnit };
