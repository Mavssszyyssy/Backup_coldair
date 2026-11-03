import { getRegions, getProvincesByRegion, getCitiesByProvince, getBarangaysByCity } from './addressSelectors';

// The mobile address editor uses the same PSGC endpoints and identity codes.
// Keep the existing local lists only as an offline fallback for supported areas.
const BASE = 'https://psgc.gitlab.io/api';
const NCR = '130000000';
const requests = new Map();
const named = (names) => names.map((name) => ({ name, code: '' }));

const load = (path, fallback) => {
  if (!path) return Promise.resolve(fallback);
  if (!requests.has(path)) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    requests.set(path, Promise.resolve().then(() => fetch(`${BASE}${path}`, { signal: controller.signal }))
      .then((response) => {
        if (!response.ok) throw new Error(`Location lookup failed (${response.status})`);
        return response.json();
      })
      .then((items) => Array.isArray(items) && items.length
        ? items.map((item) => ({ name: String(item.name || ''), code: String(item.code || '') })).filter((item) => item.name && item.code)
        : fallback)
      .catch(() => {
        requests.delete(path);
        return fallback;
      })
      .finally(() => window.clearTimeout(timeout)));
  }
  return requests.get(path);
};

export const psgcRegions = () => load('/regions/', named(getRegions()));

export const psgcProvinces = (regionCode, regionName) => {
  if (regionCode === NCR) return Promise.resolve([{ name: 'Metro Manila', code: `region:${NCR}` }]);
  return load(regionCode ? `/regions/${encodeURIComponent(regionCode)}/provinces/` : '', named(getProvincesByRegion(regionName)));
};

export const psgcLocalities = (provinceCode, regionCode, regionName, provinceName) => {
  const regionLevel = String(provinceCode).startsWith('region:');
  const code = regionLevel ? String(provinceCode).slice(7) : provinceCode;
  const path = code && !String(code).startsWith('fallback:')
    ? `/${regionLevel ? 'regions' : 'provinces'}/${encodeURIComponent(code)}/cities-municipalities/`
    : '';
  return load(path, named(getCitiesByProvince(regionName, provinceName)));
};

export const psgcBarangays = (localityCode, regionName, provinceName, cityName) =>
  load(localityCode ? `/cities-municipalities/${encodeURIComponent(localityCode)}/barangays/` : '',
    named(getBarangaysByCity(regionName, provinceName, cityName)));

const comparable = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\b(city|municipality|province|region|of|the)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim();
export const matchingLocation = (items, name) => {
  const target = comparable(name);
  if (!target) return null;
  return items.find((item) => comparable(item.name) === target)
    || items.find((item) => comparable(item.name).includes(target) || target.includes(comparable(item.name)))
    || null;
};

export const resolveSavedAddressCodes = async (address) => {
  const region = matchingLocation(await psgcRegions(), address.region);
  const province = matchingLocation(await psgcProvinces(region?.code, address.region), address.province);
  const locality = matchingLocation(await psgcLocalities(province?.code, region?.code, address.region, address.province), address.city);
  const barangay = matchingLocation(await psgcBarangays(locality?.code, address.region, address.province, address.city), address.barangay);
  return {
    regionCode: region?.code || '', provinceCode: province?.code || '',
    municipalityCode: locality?.code || '', submunicipalityCode: barangay?.code || '',
  };
};
