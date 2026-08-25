// services/qrLookupService.js
import { apiFetch } from "../constants/config";
import * as api from "./api";
import { getStoredToken } from "./api";
import { getAllUnits } from "./unitStorage";
import { getAllServiceRequests } from "./serviceRequestStorage";
import { getAllTasks } from "./taskStorage";
import { buildMaintenanceRecommendation } from "./maintenanceRecommendationService";

export function buildUnitQrCode(unit) {
  if (!unit) return "";
  return unit.qrCode || `QR_UNIT:${unit.qrUnitId || unit.id}|SERIAL:${unit.serialNumber || ""}|NAME:${unit.unitName || ""}`;
}

function parseQrJson(value) {
  if (!value.startsWith("{")) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseQrParts(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPartValue(parts, prefix) {
  const matched = parts.find((item) =>
    item.toUpperCase().startsWith(prefix.toUpperCase()),
  );
  return matched ? matched.slice(prefix.length).trim() : "";
}

export function parseLookupTarget(raw) {
  const value = String(raw || "").trim();
  if (!value) return { lookupValue: "", serialNumber: "", unitId: "", qrUnitId: "" };

  const json = parseQrJson(value);
  if (json) {
    const serialNumber = String(json.serialNumber || json.serial || "").trim();
    const qrUnitId = String(json.qrUnitId || json.qr_unit_id || "").trim();
    const unitId = String(json.unitId || json.unit || json.id || "").trim();
    return {
      lookupValue: serialNumber || qrUnitId || unitId,
      serialNumber,
      unitId,
      qrUnitId,
    };
  }

  const urlSerial = value.match(/[?&](?:serialNumber|serial)=([^&#]+)/i);
  if (urlSerial?.[1]) {
    const serialNumber = decodeURIComponent(urlSerial[1]).trim();
    return { lookupValue: serialNumber, serialNumber, unitId: "", qrUnitId: "" };
  }

  const pathSerial = value.match(/\/serial\/([^/?#]+)/i);
  if (pathSerial?.[1]) {
    const serialNumber = decodeURIComponent(pathSerial[1]).trim();
    return { lookupValue: serialNumber, serialNumber, unitId: "", qrUnitId: "" };
  }

  const upperValue = value.toUpperCase();
  const parts = parseQrParts(value);

  const acUnitSerial = getPartValue(parts, "AC_UNIT:");
  const explicitSerial = getPartValue(parts, "SERIAL:");
  const unitId = getPartValue(parts, "UNIT:");
  const qrUnitId = getPartValue(parts, "QR_UNIT:");
  const serialNumber = acUnitSerial || explicitSerial;

  if (serialNumber || qrUnitId || unitId) {
    return {
      lookupValue: serialNumber || qrUnitId || unitId,
      serialNumber,
      unitId,
      qrUnitId,
    };
  }

  if (upperValue.startsWith("AC_UNIT:")) {
    const serial = value.replace(/^AC_UNIT:/i, "").trim();
    return { lookupValue: serial, serialNumber: serial, unitId: "", qrUnitId: "" };
  }

  if (upperValue.startsWith("SERIAL:")) {
    const serial = value.replace(/^SERIAL:/i, "").trim();
    return { lookupValue: serial, serialNumber: serial, unitId: "", qrUnitId: "" };
  }

  if (upperValue.startsWith("QR_UNIT:")) {
    const qrUnitId = value.replace(/^QR_UNIT:/i, "").trim();
    return { lookupValue: qrUnitId, serialNumber: "", unitId: "", qrUnitId };
  }

  return { lookupValue: value, serialNumber: value, unitId: "", qrUnitId: "" };
}

function buildUnitFromProductSerial(product, serialUnit) {
  const serialNumber = serialUnit?.serialNumber || "";
  return {
    id: serialUnit?.qrUnitId || serialNumber,
    qrUnitId: serialUnit?.qrUnitId || "",
    unitName: [product?.name, product?.specs].filter(Boolean).join(" "),
    brand: product?.brand || "",
    model: [product?.specs, product?.sku].filter(Boolean).join(" / "),
    serialNumber,
    status: serialUnit?.status || "available",
    inventoryStatus: serialUnit?.status || "available",
    placementArea: serialUnit?.branch
      ? `${serialUnit.branch} branch inventory`
      : "Inventory",
    installationDate: "",
    lastMaintenanceDate: "",
    productId: product?.id || product?._id || "",
    productSku: product?.sku || "",
    productName: product?.name || "",
    category: product?.category || "",
    price: product?.price || 0,
    qrCode: serialUnit?.qrCode || "",
    orderFulfillmentStatus: "available_stock",
    orderFulfillmentLabel: "Available branch stock",
    orderFulfillment: {
      state: "available_stock",
      label: "Available branch stock",
      isAvailableStock: true,
      isOrderLinked: false,
      isRegistered: false,
      order: null,
    },
  };
}

async function lookupSerialInProductCatalog(rawValue, token) {
  const target = parseLookupTarget(rawValue);
  const serialNeedle = String(target.serialNumber || target.lookupValue || "")
    .trim()
    .toLowerCase();
  const rawNeedle = String(rawValue || "").trim().toLowerCase();
  if (!serialNeedle || !token) return null;

  const response = await apiFetch("/products", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  for (const product of products) {
    const serialUnit = (product.serialUnits || []).find((unit) => {
      const unitSerial = String(unit.serialNumber || "").trim().toLowerCase();
      const unitQrId = String(unit.qrUnitId || "").trim().toLowerCase();
      const unitQr = String(unit.qrCode || "").trim().toLowerCase();
      return (
        unitSerial === serialNeedle ||
        unitQrId === serialNeedle ||
        unitQr === rawNeedle ||
        unitQr.includes(`ac_unit:${serialNeedle}`)
      );
    });

    if (serialUnit) {
      return { unit: buildUnitFromProductSerial(product, serialUnit) };
    }
  }

  return null;
}

async function lookupBackendSerialUnit(rawValue) {
  const { serialNumber, qrUnitId, lookupValue } = parseLookupTarget(rawValue);
  const lookupKey = serialNumber || qrUnitId || lookupValue;
  if (!lookupKey) return { unit: null, error: "No AC unit identifier was found in the QR code." };

  const token = await getStoredToken();
  if (!token) {
    return {
      unit: null,
      error: "Technician session token is missing. Log in again before scanning.",
    };
  }

  try {
    const response = await apiFetch(
      `/products/serial/${encodeURIComponent(lookupKey)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 404) {
        const catalogResult = await lookupSerialInProductCatalog(rawValue, token);
        if (catalogResult?.unit) return catalogResult;
      }

      return {
        unit: null,
        status: response.status,
        serialNumber: lookupKey,
        error:
          data?.message ||
          `Backend rejected serial lookup (${response.status}).`,
      };
    }

    return data;
  } catch (error) {
    return {
      unit: null,
      serialNumber: lookupKey,
      error: error?.message || "Backend serial lookup failed.",
    };
  }
}

async function lookupBackendRegistrationContext(rawValue) {
  const { serialNumber } = parseLookupTarget(rawValue);
  if (!serialNumber) return null;

  const token = await getStoredToken();
  if (!token) return null;

  const result = await api.fetchRegistrationContext(token, serialNumber);
  if (!result.success) return null;

  return {
    unit: result.unit,
    tasks: result.task ? [result.task] : [],
  };
}

async function lookupBackendTechnicianHistory(rawValue) {
  const serialNumber = String(rawValue || "").trim();
  if (!serialNumber) return null;
  const token = await getStoredToken();
  if (!token) return null;
  const result = await api.fetchTechnicianUnitHistory(token, serialNumber);
  if (!result.success) return null;
  return {
    unit: result.unit,
    maintenanceHistory: result.maintenanceHistory || [],
    repairHistory: result.repairHistory || [],
    ampHistory: result.ampHistory || [],
    requests: [],
    tasks: [],
    recommendation: result.recommendation || null,
  };
}

export async function lookupUnitContext(rawValue) {
  const target = parseLookupTarget(rawValue);
  const value = target.lookupValue.toLowerCase();
  const serialValue = target.serialNumber.toLowerCase();
  const unitIdValue = target.unitId.toLowerCase();
  const qrUnitIdValue = String(target.qrUnitId || "").toLowerCase();

  if (target.serialNumber || target.qrUnitId) {
    const backendResult = await lookupBackendSerialUnit(rawValue);
    const resolvedSerial = backendResult?.unit?.serialNumber || target.serialNumber;
    const historyContext = await lookupBackendTechnicianHistory(resolvedSerial);
    if (historyContext?.unit) return historyContext;

    const registrationContext = await lookupBackendRegistrationContext(resolvedSerial);
    if (registrationContext?.unit) {
      return {
        unit: registrationContext.unit,
        requests: [],
        tasks: registrationContext.tasks,
        recommendation: buildMaintenanceRecommendation({
          unit: registrationContext.unit,
          requests: [],
          tasks: registrationContext.tasks,
        }),
      };
    }

    if (backendResult?.unit) {
      return {
        unit: backendResult.unit,
        requests: [],
        tasks: [],
        recommendation: buildMaintenanceRecommendation({
          unit: backendResult.unit,
          requests: [],
          tasks: [],
        }),
      };
    }
    if (backendResult?.error && backendResult?.status !== 404) {
      return {
        unit: null,
        requests: [],
        tasks: [],
        lookupError: backendResult.error,
        lookupStatus: backendResult.status || 0,
        lookupSerialNumber: backendResult.serialNumber || target.serialNumber || target.qrUnitId,
      };
    }
  }

  const [units, requests, tasks] = await Promise.all([
    getAllUnits(),
    getAllServiceRequests(),
    getAllTasks(),
  ]);

  const matchedUnit =
    units.find((unit) => String(unit.serialNumber || "").toLowerCase() === serialValue) ||
    units.find((unit) => String(unit.qrUnitId || "").toLowerCase() === qrUnitIdValue) ||
    units.find((unit) => String(unit.id || "").toLowerCase() === unitIdValue) ||
    units.find((unit) => String(unit.serialNumber || "").toLowerCase() === value) ||
    units.find((unit) => String(unit.id || "").toLowerCase() === value) ||
    units.find((unit) => String(unit.unitName || "").toLowerCase() === value);

  if (!matchedUnit) {
    const backendResult = await lookupBackendSerialUnit(rawValue);
    if (backendResult?.unit) {
      return {
        unit: backendResult.unit,
        requests: [],
        tasks: [],
        recommendation: buildMaintenanceRecommendation({
          unit: backendResult.unit,
          requests: [],
          tasks: [],
        }),
      };
    }

    return {
      unit: null,
      requests: [],
      tasks: [],
      lookupError: backendResult?.error || "",
      lookupStatus: backendResult?.status || 0,
      lookupSerialNumber: backendResult?.serialNumber || target.serialNumber || "",
    };
  }

  const relatedRequests = requests.filter(
    (request) =>
      String(request.unitId || "") === String(matchedUnit.id) ||
      String(request.unitName || "").toLowerCase() === String(matchedUnit.unitName || "").toLowerCase()
  );

  const relatedRequestIds = new Set(relatedRequests.map((request) => String(request.id)));

  const relatedTasks = tasks.filter(
    (task) =>
      String(task.unitId || "") === String(matchedUnit.id) ||
      String(task.unitName || "").toLowerCase() === String(matchedUnit.unitName || "").toLowerCase() ||
      relatedRequestIds.has(String(task.requestId || ""))
  );

  return {
    unit: matchedUnit,
    requests: relatedRequests,
    tasks: relatedTasks,
    recommendation: buildMaintenanceRecommendation({
      unit: matchedUnit,
      requests: relatedRequests,
      tasks: relatedTasks,
    }),
  };
}
