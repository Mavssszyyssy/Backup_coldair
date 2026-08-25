import AsyncStorage from "@react-native-async-storage/async-storage";

const PSGC_BASE_URL = "https://psgc.gitlab.io/api";
const CACHE_VERSION = "v2";
const NCR_REGION_CODE = "130000000";
const NCR_PROVINCE_CODE = `region:${NCR_REGION_CODE}`;

const FALLBACK_REGIONS = [
  { code: "010000000", name: "Ilocos Region", displayName: "Ilocos Region" },
  { code: "030000000", name: "Central Luzon", displayName: "Central Luzon" },
  { code: "040000000", name: "CALABARZON", displayName: "CALABARZON (Region IV-A)" },
  { code: NCR_REGION_CODE, name: "National Capital Region", displayName: "National Capital Region (NCR)" },
];

const FALLBACK_PROVINCES = {
  "010000000": ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"],
  "030000000": ["Bataan", "Bulacan", "Pampanga", "Tarlac"],
  "040000000": ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"],
  [NCR_REGION_CODE]: ["Metro Manila"],
};

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

async function readCache(key, fallback = []) {
  const parsed = safeParse(await AsyncStorage.getItem(key), fallback);
  return Array.isArray(parsed) ? parsed : fallback;
}

async function writeCache(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function loadList(cacheKey, endpoint, normalize, fallback = []) {
  const cached = await readCache(cacheKey);
  if (cached.length) return cached;

  try {
    const response = await fetch(`${PSGC_BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error(`PSGC request failed (${response.status}).`);
    const payload = await response.json();
    const items = Array.isArray(payload)
      ? payload
          .map(normalize)
          .filter((item) => item.code && item.name)
          .sort((left, right) => left.displayName.localeCompare(right.displayName))
      : [];
    if (items.length) {
      await writeCache(cacheKey, items);
      return items;
    }
  } catch {
    // Keep the form usable during a temporary PSGC outage.
  }

  return fallback;
}

const normalizeRegion = (item = {}) => ({
  code: String(item.code || ""),
  name: item.name || "",
  displayName: item.name || "",
});

const normalizeProvince = (item = {}) => ({
  code: String(item.code || ""),
  name: item.name || "",
  displayName: item.name || "",
  regionCode: String(item.regionCode || ""),
});

const normalizeLocality = (item = {}) => {
  const type = item.isCity ? "City" : item.isMunicipality ? "Municipality" : "";
  return {
    code: String(item.code || ""),
    name: item.name || "",
    displayName: [item.name, type].filter(Boolean).join(" - ") || item.name || "",
    provinceCode: String(item.provinceCode || ""),
    regionCode: String(item.regionCode || ""),
    isCity: Boolean(item.isCity),
    isMunicipality: Boolean(item.isMunicipality),
  };
};

const normalizeBarangay = (item = {}) => ({
  code: String(item.code || ""),
  name: item.name || "",
  displayName: item.name || "",
  cityCode: String(item.cityCode || ""),
  municipalityCode: String(item.municipalityCode || ""),
});

export async function getPhilippineRegions() {
  return loadList(
    `psgc_regions_${CACHE_VERSION}`,
    "/regions/",
    normalizeRegion,
    FALLBACK_REGIONS,
  );
}

export async function getProvincesByRegion(regionCode) {
  if (!regionCode) return [];
  if (String(regionCode) === NCR_REGION_CODE) {
    return [{
      code: NCR_PROVINCE_CODE,
      name: "Metro Manila",
      displayName: "Metro Manila",
      regionCode: NCR_REGION_CODE,
      isRegionLevel: true,
    }];
  }

  const fallback = (FALLBACK_PROVINCES[String(regionCode)] || []).map((name) => ({
    code: `fallback:${regionCode}:${name}`,
    name,
    displayName: name,
    regionCode: String(regionCode),
  }));
  return loadList(
    `psgc_provinces_${CACHE_VERSION}_${regionCode}`,
    `/regions/${encodeURIComponent(regionCode)}/provinces/`,
    normalizeProvince,
    fallback,
  );
}

export async function getLocalitiesByProvince(provinceCode, regionCode = "") {
  if (!provinceCode) return [];
  const regionLevel = String(provinceCode).startsWith("region:");
  const code = regionLevel ? String(provinceCode).slice(7) : String(provinceCode);
  if (code.startsWith("fallback:")) return [];
  const endpoint = regionLevel
    ? `/regions/${encodeURIComponent(code)}/cities-municipalities/`
    : `/provinces/${encodeURIComponent(code)}/cities-municipalities/`;
  return loadList(
    `psgc_localities_${CACHE_VERSION}_${provinceCode}_${regionCode}`,
    endpoint,
    normalizeLocality,
  );
}

// Kept for older callers. New address forms use getLocalitiesByProvince.
export async function getPhilippineLocalities() {
  return loadList(
    `psgc_all_localities_${CACHE_VERSION}`,
    "/cities-municipalities/",
    normalizeLocality,
  );
}

export async function getBarangaysByLocality(localityCode) {
  if (!localityCode || String(localityCode).startsWith("fallback:")) return [];
  return loadList(
    `psgc_barangays_${CACHE_VERSION}_${localityCode}`,
    `/cities-municipalities/${encodeURIComponent(localityCode)}/barangays/`,
    normalizeBarangay,
  );
}

const comparable = (value = "") => String(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\b(city|municipality|province|region|of|the)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const findNamedItem = (items, value) => {
  const needle = comparable(value);
  if (!needle) return null;
  return items.find((item) => comparable(item.name) === needle || comparable(item.displayName) === needle)
    || items.find((item) => comparable(item.name).includes(needle) || needle.includes(comparable(item.name)))
    || null;
};

const findRegionItem = (items, value) => {
  const normalized = comparable(value);
  const aliasCode = normalized.includes("ncr") || normalized.includes("national capital") || normalized.includes("metro manila")
    ? NCR_REGION_CODE
    : normalized.includes("iv a") || normalized.includes("calabarzon")
      ? "040000000"
      : normalized.includes("central luzon") || normalized === "iii"
        ? "030000000"
        : normalized.includes("ilocos") || normalized === "i"
          ? "010000000"
          : "";
  return (aliasCode && items.find((item) => item.code === aliasCode)) || findNamedItem(items, value);
};

export async function resolvePhilippineAddressSelection(address = {}) {
  const regions = await getPhilippineRegions();
  const region = findRegionItem(regions, address.region);
  if (!region) return { region: null, province: null, locality: null, barangay: null };

  const provinces = await getProvincesByRegion(region.code);
  const province = findNamedItem(provinces, address.province);
  if (!province) return { region, province: null, locality: null, barangay: null };

  const localities = await getLocalitiesByProvince(province.code, region.code);
  const locality = findNamedItem(localities, address.city);
  if (!locality) return { region, province, locality: null, barangay: null };

  const barangays = await getBarangaysByLocality(locality.code);
  const barangay = findNamedItem(barangays, address.barangay);
  return { region, province, locality, barangay };
}
