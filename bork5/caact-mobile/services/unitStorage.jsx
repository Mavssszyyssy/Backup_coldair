// services/unitStorage.jsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "./api";

const STORAGE_KEY = "units_storage_v1";
export const SEEDED_CUSTOMER_EMAIL = "c@coldair-act.online";
export const SEEDED_CUSTOMER_UNIT_ID = "seed_customer_ac_unit_001";
export const SEEDED_SCANNER_UNIT_QR =
  "UNIT:seed_customer_ac_unit_001|SERIAL:CAACT-AC-2026-001|NAME:Living Room AC";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeUnit(unit = {}) {
  const installationEnvironment =
    unit.installationEnvironment || unit.placementType || "";
  const placementArea = unit.placementArea || unit.location || "";

  return {
    id: unit.id || `unit_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    userId: unit.userId || null,
    unitName: unit.unitName || "",
    brand: unit.brand || "",
    model: unit.model || "",
    serialNumber: unit.serialNumber || "",
    qrUnitId: unit.qrUnitId || "",
    serviceBranch: unit.serviceBranch || "",
    status: unit.status || "Active",
    installationDate: unit.installationDate || "",
    placementArea,
    installationEnvironment,
    usageLevel: unit.usageLevel || "Normal",
    ventilationQuality: unit.ventilationQuality || "Good",
    lastMaintenanceDate: unit.lastMaintenanceDate || "",
    notes: unit.notes || "",
    qrCode: unit.qrCode || "",
    amp: unit.amp || {},
    warranty: unit.warranty || {},
    warrantyStatus: unit.warrantyStatus || unit.warranty?.status || "pending_activation",
    warrantyExpirationDate: unit.warrantyExpirationDate || unit.warranty?.expirationDate || "",
    warrantyRecommendation: unit.warrantyRecommendation || "",
    serviceHistory: Array.isArray(unit.serviceHistory) ? unit.serviceHistory : [],
    nextIdealServiceDate: unit.nextIdealServiceDate || unit.amp?.nextIdealServiceDate || "",
    nextIdealServicePeriod: unit.nextIdealServicePeriod || unit.amp?.nextIdealServicePeriod || "",
    createdAt: unit.createdAt || new Date().toISOString(),
    updatedAt: unit.updatedAt || new Date().toISOString(),
  };
}

function mergeByIdOrSerial(existing = [], incoming = []) {
  const byKey = new Map();
  existing.map(normalizeUnit).forEach((unit) => {
    byKey.set(String(unit.serialNumber || unit.id), unit);
  });
  incoming.map(normalizeUnit).forEach((unit) => {
    byKey.set(String(unit.serialNumber || unit.id), unit);
  });
  return Array.from(byKey.values());
}

export async function getAllUnits() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed.map(normalizeUnit) : [];
}

export async function saveAllUnits(units = []) {
  const normalized = units.map(normalizeUnit);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function getUnitsByUser(userId) {
  try {
    const token = await api.getStoredToken();
    if (token) {
      const result = await api.fetchCustomerAmpUnits(token);
      if (result.success) {
        const backendUnits = result.units.map((unit) => normalizeUnit({ ...unit, userId }));
        const localUnits = await getAllUnits();
        const otherUsers = localUnits.filter(
          (unit) => String(unit.userId || "") !== String(userId || ""),
        );
        // Installed units are created by the technician completion flow.
        // Do not merge stale device-only units back into the customer record.
        await saveAllUnits([...backendUnits, ...otherUsers]);
        return backendUnits;
      }
    }
  } catch {
    // Offline fallback uses local unit cache.
  }

  const units = await getAllUnits();
  return units.filter(
    (unit) =>
      String(unit.userId) === String(userId) &&
      unit.id !== SEEDED_CUSTOMER_UNIT_ID,
  );
}

export async function ensureSeededCustomerUnit(user) {
  if (
    !user?.id ||
    String(user.email || "").toLowerCase() !== SEEDED_CUSTOMER_EMAIL
  ) {
    return null;
  }

  const units = await getAllUnits();
  const existing = units.find((unit) => unit.id === SEEDED_CUSTOMER_UNIT_ID);
  const seededUnit = normalizeUnit({
    id: SEEDED_CUSTOMER_UNIT_ID,
    userId: user.id,
    unitName: "Living Room AC",
    brand: "Cold Air ACT",
    model: "Inverter Split Type 1.5HP",
    serialNumber: "CAACT-AC-2026-001",
    status: "Active",
    installationDate: "2025-11-15",
    placementArea: "Living Room",
    installationEnvironment: "Indoor wall-mounted with good ventilation",
    usageLevel: "Normal",
    ventilationQuality: "Good",
    lastMaintenanceDate: "2026-03-20",
    notes: "Seeded debug AC unit for customer home health score display.",
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
  });

  if (existing) {
    const next = units.map((unit) =>
      unit.id === SEEDED_CUSTOMER_UNIT_ID
        ? normalizeUnit({ ...unit, ...seededUnit, userId: user.id })
        : unit
    );
    await saveAllUnits(next);
    return next.find((unit) => unit.id === SEEDED_CUSTOMER_UNIT_ID) || null;
  }

  await saveAllUnits([seededUnit, ...units]);
  return seededUnit;
}

export async function ensureSeededScannerUnit(userId = null) {
  const units = await getAllUnits();
  const existing = units.find((unit) => unit.id === SEEDED_CUSTOMER_UNIT_ID);
  const seededUnit = normalizeUnit({
    id: SEEDED_CUSTOMER_UNIT_ID,
    userId: userId || existing?.userId || null,
    unitName: "Living Room AC",
    brand: "Cold Air ACT",
    model: "Inverter Split Type 1.5HP",
    serialNumber: "CAACT-AC-2026-001",
    status: "Active",
    installationDate: "2025-11-15",
    placementArea: "Living Room",
    installationEnvironment: "Indoor wall-mounted with good ventilation",
    usageLevel: "Normal",
    ventilationQuality: "Good",
    lastMaintenanceDate: "2026-03-20",
    notes: "Seeded demo AC unit for scanner testing.",
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
  });

  if (existing) {
    const next = units.map((unit) =>
      unit.id === SEEDED_CUSTOMER_UNIT_ID
        ? normalizeUnit({ ...unit, ...seededUnit, userId: seededUnit.userId })
        : unit
    );
    await saveAllUnits(next);
    return next.find((unit) => unit.id === SEEDED_CUSTOMER_UNIT_ID) || null;
  }

  await saveAllUnits([seededUnit, ...units]);
  return seededUnit;
}

export async function addUnit(unit) {
  const units = await getAllUnits();
  const created = normalizeUnit(unit);
  await saveAllUnits([created, ...units]);
  return created;
}

export async function getUnitByCode(rawValue) {
  try {
    const token = await api.getStoredToken();
    if (token) {
      const result = await api.fetchCustomerAmpUnits(token);
      if (result.success) {
        const localUnits = await getAllUnits();
        await saveAllUnits(mergeByIdOrSerial(localUnits, result.units));
      }
    }
  } catch {
    // Keep local QR lookup available offline.
  }

  const value = String(rawValue || "").trim().toLowerCase();
  if (!value) return null;

  const unitIdMatch = value.match(/unit:([^|]+)/);
  const serialMatch = value.match(/serial:([^|]+)/);
  const lookupValue = String(unitIdMatch?.[1] || serialMatch?.[1] || value).trim().toLowerCase();
  const units = await getAllUnits();

  return (
    units.find((unit) => String(unit.id || "").toLowerCase() === lookupValue) ||
    units.find((unit) => String(unit.serialNumber || "").toLowerCase() === lookupValue) ||
    units.find((unit) => String(unit.unitName || "").toLowerCase() === lookupValue) ||
    null
  );
}

export async function claimUnitForUserByCode(rawValue, userId) {
  const matched = await getUnitByCode(rawValue);
  if (!matched) return { status: "not_found", unit: null };

  if (matched.userId && String(matched.userId) !== String(userId)) {
    return { status: "owned_by_other_user", unit: matched };
  }

  if (String(matched.userId) === String(userId)) {
    return { status: "already_owned", unit: matched };
  }

  const updated = await updateUnit({
    ...matched,
    userId,
  });

  return { status: "claimed", unit: updated };
}

export async function updateUnit(unit) {
  const units = await getAllUnits();
  const next = units.map((existing) =>
    String(existing.id) === String(unit.id)
      ? normalizeUnit({
          ...existing,
          ...unit,
          updatedAt: new Date().toISOString(),
        })
      : existing
  );
  await saveAllUnits(next);
  return next.find((existing) => String(existing.id) === String(unit.id)) || null;
}

export async function deleteUnit(unitId) {
  const units = await getAllUnits();
  const next = units.filter((unit) => String(unit.id) !== String(unitId));
  await saveAllUnits(next);
  return true;
}
