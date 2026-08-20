// services/acHealthScoreService.jsx

function parseDateSafe(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthsBetween(dateA, dateB) {
  if (!dateA || !dateB) return 0;
  const years = dateB.getFullYear() - dateA.getFullYear();
  const months = dateB.getMonth() - dateA.getMonth();
  return years * 12 + months;
}

function containsSevereKeywords(text = "") {
  const normalized = String(text || "").toLowerCase();
  const keywords = [
    "leak",
    "leaking",
    "no cooling",
    "not cooling",
    "compressor",
    "electrical",
    "refrigerant",
    "burning smell",
    "overheat",
  ];
  return keywords.some((keyword) => normalized.includes(keyword));
}

function addMonths(date, months) {
  if (!date) return null;
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((dateB.getTime() - dateA.getTime()) / msPerDay);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getPlacementProfile(unit = {}) {
  const combined = [
    unit.placementArea,
    unit.installationEnvironment,
    unit.placementType,
    unit.usageLevel,
    unit.ventilationQuality,
    unit.notes,
  ]
    .map(normalizeText)
    .join(" ");

  let risk = 0;
  const factors = [];

  const addRisk = (amount, reason) => {
    risk += amount;
    factors.push(reason);
  };

  if (combined.includes("outdoor") || combined.includes("outside")) {
    addRisk(8, "Outdoor placement increases exposure to heat, rain, and debris.");
  }
  if (combined.includes("direct sun") || combined.includes("exposed")) {
    addRisk(8, "Direct exposure can shorten component life.");
  }
  if (combined.includes("coastal") || combined.includes("salt")) {
    addRisk(10, "Coastal or salty air raises corrosion risk.");
  }
  if (combined.includes("kitchen") || combined.includes("grease")) {
    addRisk(7, "Kitchen placement can clog coils and filters faster.");
  }
  if (combined.includes("dust") || combined.includes("workshop") || combined.includes("roadside")) {
    addRisk(7, "Dusty placement increases cleaning frequency.");
  }
  if (combined.includes("poor") || combined.includes("enclosed") || combined.includes("blocked")) {
    addRisk(10, "Poor ventilation makes the unit work harder.");
  }
  if (combined.includes("heavy") || combined.includes("24/7") || combined.includes("server")) {
    addRisk(12, "Heavy usage accelerates wear.");
  } else if (combined.includes("light")) {
    risk -= 3;
  }

  return {
    risk: Math.max(0, Math.min(40, risk)),
    factors,
  };
}

export function getHealthLabel(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Warning";
  return "Critical";
}

export function getHealthColor(score) {
  if (score >= 85) return "#059669";
  if (score >= 70) return "#0284C7";
  if (score >= 50) return "#D97706";
  return "#DC2626";
}

export function buildHealthRecommendation(score, reasons = [], warrantyStatus = "") {
  if (warrantyStatus === "under_review") {
    return "Your warranty claim is being reviewed. Keep the AC accessible for the service team.";
  }
  if (warrantyStatus === "approved") {
    return "Warranty repair is approved. Keep the technician appointment to complete the covered service.";
  }
  if (score >= 85) {
    return "Unit condition looks stable. Continue regular preventive maintenance.";
  }

  if (score >= 70) {
    return "Schedule a routine inspection soon to keep the unit efficient.";
  }

  if (score >= 50) {
    return reasons.some((reason) => reason.toLowerCase().includes("open request"))
      ? "Prioritize pending service requests and inspect recurring issues."
      : "Book preventive maintenance before the condition worsens.";
  }

  return "Immediate technician assessment is recommended to avoid failure or costly repairs.";
}

export function buildAiLifecyclePrediction({
  unit,
  requests = [],
  tasks = [],
  score,
  reasons = [],
  placementProfile,
}) {
  const now = new Date();
  const installationDate = parseDateSafe(unit?.installationDate);
  const lastMaintenanceDate = parseDateSafe(unit?.lastMaintenanceDate);
  const latestServiceDate = [
    lastMaintenanceDate,
    ...requests.map((item) => parseDateSafe(item.updatedAt || item.createdAt)),
    ...tasks.map((item) =>
      parseDateSafe(item.completedAt || item.updatedAt || item.createdAt)
    ),
  ]
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const ageMonths = installationDate ? monthsBetween(installationDate, now) : 0;
  const completedTaskCount = tasks.filter(
    (task) => String(task.status || "").toLowerCase() === "completed"
  ).length;
  const warrantyRepairCount = (Array.isArray(unit?.warranty?.serviceRecords)
    ? unit.warranty.serviceRecords
    : []).filter((record) => /repair/i.test(String(record?.visitType || ""))).length;
  const severeCount =
    requests.filter((request) =>
      containsSevereKeywords(`${request.issueType} ${request.issueDescription}`)
    ).length +
    tasks.filter((task) =>
      containsSevereKeywords(`${task.title} ${task.description} ${task.completionNotes}`)
    ).length;

  const placementRisk = placementProfile?.risk || 0;
  const expectedLifeMonths = Math.max(
    72,
    144 - placementRisk - completedTaskCount * 3 - severeCount * 6 - warrantyRepairCount * 4
  );
  const remainingMonths = installationDate
    ? Math.max(0, Math.round(expectedLifeMonths - ageMonths))
    : Math.max(0, Math.round(expectedLifeMonths * (score / 100)));

  let maintenanceIntervalMonths = 6;
  if (placementRisk >= 30 || score < 55) {
    maintenanceIntervalMonths = 2;
  } else if (placementRisk >= 20 || score < 70) {
    maintenanceIntervalMonths = 3;
  } else if (placementRisk >= 10 || score < 85) {
    maintenanceIntervalMonths = 4;
  }
  if (warrantyRepairCount >= 2) {
    maintenanceIntervalMonths = Math.min(maintenanceIntervalMonths, 3);
  }

  const anchorDate = latestServiceDate || installationDate || now;
  const nextMaintenanceDate = addMonths(anchorDate, maintenanceIntervalMonths);
  const lifecycleLabel =
    remainingMonths >= 84
      ? "Long lifecycle expected"
      : remainingMonths >= 48
      ? "Healthy remaining lifecycle"
      : remainingMonths >= 24
      ? "Monitor lifecycle closely"
      : "Plan replacement budget";

  return {
    model: "Local AC lifecycle predictor",
    lifecycleLabel,
    estimatedRemainingMonths: remainingMonths,
    estimatedRemainingYears: Number((remainingMonths / 12).toFixed(1)),
    maintenanceIntervalMonths,
    nextMaintenanceDate: formatDate(nextMaintenanceDate),
    riskFactors: [...(placementProfile?.factors || []), ...reasons].slice(0, 5),
    predictionSummary:
      `Predicted ${Number((remainingMonths / 12).toFixed(1))} year(s) remaining with maintenance every ${maintenanceIntervalMonths} month(s).`,
  };
}

export function buildNextRecommendedMaintenance(health) {
  const nextDate = parseDateSafe(health?.aiPrediction?.nextMaintenanceDate);
  const today = new Date();
  const daysUntil = nextDate ? daysBetween(today, nextDate) : null;

  if (!nextDate || daysUntil === null) {
    return {
      date: "",
      label: "Not scheduled",
      urgency: "Unknown",
      color: "#6B7280",
      message: "Add installation and maintenance dates to generate a recommendation.",
      intervalMonths: health?.aiPrediction?.maintenanceIntervalMonths || null,
    };
  }

  if (daysUntil < 0) {
    return {
      date: formatDate(nextDate),
      label: `${Math.abs(daysUntil)} day(s) overdue`,
      urgency: "Overdue",
      color: "#DC2626",
      message: "Book maintenance as soon as possible to protect cooling performance.",
      intervalMonths: health?.aiPrediction?.maintenanceIntervalMonths || null,
    };
  }

  if (daysUntil <= 14) {
    return {
      date: formatDate(nextDate),
      label: `Due in ${daysUntil} day(s)`,
      urgency: "Due Soon",
      color: "#D97706",
      message: "Schedule preventive maintenance soon.",
      intervalMonths: health?.aiPrediction?.maintenanceIntervalMonths || null,
    };
  }

  return {
    date: formatDate(nextDate),
    label: `Due in ${daysUntil} day(s)`,
    urgency: "On Track",
    color: "#059669",
    message: "Your next preventive maintenance window is planned.",
    intervalMonths: health?.aiPrediction?.maintenanceIntervalMonths || null,
  };
}

export function calculateUnitHealthScore({
  unit,
  requests = [],
  tasks = [],
}) {
  const now = new Date();
  let score = 100;
  const reasons = [];

  const installationDate = parseDateSafe(unit?.installationDate);
  const placementProfile = getPlacementProfile(unit);
  const warrantyStatus = String(unit?.warrantyStatus || unit?.warranty?.status || "").toLowerCase();
  const warrantyRepairs = (Array.isArray(unit?.warranty?.serviceRecords)
    ? unit.warranty.serviceRecords
    : []).filter((record) => /repair/i.test(String(record?.visitType || "")));
  if (installationDate) {
    const ageMonths = monthsBetween(installationDate, now);

    if (ageMonths >= 120) {
      score -= 25;
      reasons.push("Unit is more than 10 years old.");
    } else if (ageMonths >= 72) {
      score -= 15;
      reasons.push("Unit is more than 6 years old.");
    } else if (ageMonths >= 36) {
      score -= 8;
      reasons.push("Unit is more than 3 years old.");
    }
  }

  if (unit?.lastMaintenanceDate) {
    const lastMaintenanceDate = parseDateSafe(unit.lastMaintenanceDate);
    const monthsSinceMaintenance = monthsBetween(lastMaintenanceDate, now);
    if (monthsSinceMaintenance >= 12) {
      score -= 10;
      reasons.push("Last maintenance date is over 12 months old.");
    } else if (monthsSinceMaintenance >= 6) {
      score -= 5;
      reasons.push("Last maintenance date is over 6 months old.");
    }
  }

  if (placementProfile.risk > 0) {
    score -= Math.round(placementProfile.risk * 0.6);
    reasons.push("Installation placement adds lifecycle risk.");
  }

  const openRequests = requests.filter(
    (request) =>
      ["submitted", "reviewed", "assigned"].includes(
        String(request.status || "").toLowerCase()
      )
  );
  const completedTasks = tasks.filter(
    (task) => String(task.status || "").toLowerCase() === "completed"
  );
  const incompleteTasks = tasks.filter(
    (task) => String(task.status || "").toLowerCase() !== "completed"
  );

  if (openRequests.length > 0) {
    score -= openRequests.length * 10;
    reasons.push(`${openRequests.length} open request${openRequests.length > 1 ? "s" : ""}.`);
  }

  if (incompleteTasks.length > 0) {
    score -= incompleteTasks.length * 8;
    reasons.push(`${incompleteTasks.length} unfinished technician task${incompleteTasks.length > 1 ? "s" : ""}.`);
  }

  if (completedTasks.length >= 4) {
    score -= 12;
    reasons.push("Multiple past repair/maintenance activities recorded.");
  } else if (completedTasks.length >= 2) {
    score -= 6;
    reasons.push("Repeated service history found.");
  }

  if (warrantyRepairs.length >= 2) {
    score -= Math.min(warrantyRepairs.length * 4, 12);
    reasons.push("Repeated warranty repair history found.");
  }

  if (warrantyStatus === "under_review") {
    reasons.push("A warranty claim is currently under review.");
  } else if (warrantyStatus === "approved") {
    reasons.push("An approved warranty repair is awaiting completion.");
  }

  const severeRequestCount = requests.filter((request) =>
    containsSevereKeywords(`${request.issueType} ${request.issueDescription}`)
  ).length;

  const severeTaskCount = tasks.filter((task) =>
    containsSevereKeywords(`${task.title} ${task.description} ${task.completionNotes}`)
  ).length;

  const severeCount = severeRequestCount + severeTaskCount;
  if (severeCount > 0) {
    score -= Math.min(severeCount * 8, 24);
    reasons.push("Severe issue keywords detected in service history.");
  }

  const latestRelevantDate = [
    ...requests.map((item) => parseDateSafe(item.updatedAt || item.createdAt)),
    ...tasks.map((item) =>
      parseDateSafe(item.completedAt || item.updatedAt || item.createdAt)
    ),
  ]
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  if (!latestRelevantDate && installationDate) {
    const idleMonths = monthsBetween(installationDate, now);
    if (idleMonths >= 12) {
      score -= 10;
      reasons.push("No recent maintenance history recorded.");
    }
  } else if (latestRelevantDate) {
    const monthsSinceLastService = monthsBetween(latestRelevantDate, now);
    if (monthsSinceLastService >= 12) {
      score -= 12;
      reasons.push("Last recorded maintenance/service is over 12 months old.");
    } else if (monthsSinceLastService >= 6) {
      score -= 6;
      reasons.push("Last recorded maintenance/service is over 6 months old.");
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const label = getHealthLabel(finalScore);

  return {
    score: finalScore,
    label,
    color: getHealthColor(finalScore),
    reasons,
    recommendation: buildHealthRecommendation(finalScore, reasons, warrantyStatus),
    warrantyStatus,
    placementRisk: placementProfile.risk,
    placementFactors: placementProfile.factors,
    aiPrediction: buildAiLifecyclePrediction({
      unit,
      requests,
      tasks,
      score: finalScore,
      reasons,
      placementProfile,
    }),
  };
}

export function buildUnitHealthMap(units = [], requests = [], tasks = []) {
  const map = {};

  units.forEach((unit) => {
    const relatedRequests = requests.filter(
      (request) =>
        String(request.unitId || "") === String(unit.id) ||
        String(request.unitName || "").toLowerCase() ===
          String(unit.unitName || "").toLowerCase()
    );

    const relatedRequestIds = new Set(
      relatedRequests.map((request) => String(request.id))
    );

    const relatedTasks = tasks.filter(
      (task) =>
        String(task.unitId || "") === String(unit.id) ||
        String(task.unitName || "").toLowerCase() ===
          String(unit.unitName || "").toLowerCase() ||
        relatedRequestIds.has(String(task.requestId || ""))
    );

    map[String(unit.id)] = calculateUnitHealthScore({
      unit,
      requests: relatedRequests,
      tasks: relatedTasks,
    });
  });

  return map;
}
