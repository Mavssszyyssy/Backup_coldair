import { LUZON_ADDRESS_DATA } from './luzonAddressData';

const normalize = (value) => String(value || '').toLowerCase().replace(/\b(city of|city|municipality of|municipality)\b/g, '').replace(/[^a-z0-9]/g, '');

export function matchGpsAddress(address = {}) {
  const cityNames = [address.city, address.municipality, address.town, address.village].filter(Boolean).map(normalize);
  const provinceNames = [address.province, address.county, address.state].filter(Boolean).map(normalize);
  let matches = LUZON_ADDRESS_DATA.flatMap(({ region, provinces }) => provinces.flatMap(({ province, cities }) =>
    cities.filter(({ city }) => cityNames.includes(normalize(city))).map((entry) => ({ region, province, ...entry }))));
  if (matches.length > 1) matches = matches.filter(({ province }) => provinceNames.includes(normalize(province)));
  if (matches.length !== 1) return null;
  const { region, province, city, barangays } = matches[0];
  const names = [address.suburb, address.neighbourhood, address.quarter, address.barangay].map(normalize);
  return { region, province, city, barangay: barangays.find((name) => names.includes(normalize(name))) || '', street: [address.house_number, address.road].filter(Boolean).join(' ') };
}

export async function captureSignupPosition({ geolocation = navigator.geolocation, fetchImpl = fetch, apiKey = import.meta.env.VITE_LOCATIONIQ_KEY || '' } = {}) {
  if (!geolocation) throw new Error('Location is unavailable in this browser. Enter your address manually.');
  const position = await new Promise((resolve, reject) => geolocation.getCurrentPosition(resolve, (error) => {
    const message = error.code === 1 ? 'Allow location access in your browser settings, then try again.'
      : error.code === 3 ? 'Location capture timed out. Try again or enter your address manually.'
        : 'Your location could not be determined. Try again or enter your address manually.';
    reject(new Error(message));
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }));
  const { latitude, longitude, accuracy } = position.coords;
  const result = { coordinates: { latitude, longitude, accuracy, timestamp: new Date().toISOString() }, source: 'gps', address: null,
    message: 'GPS position saved. Select your address below and confirm your house number and street.' };
  if (!apiKey) return result;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(`https://us1.locationiq.com/v1/reverse?key=${encodeURIComponent(apiKey)}&lat=${latitude}&lon=${longitude}&format=json`, { signal: controller.signal });
    if (!response.ok) throw new Error('Lookup failed');
    result.address = matchGpsAddress((await response.json()).address);
    result.message = result.address ? 'GPS position saved. Review the suggested address and complete any missing details.'
      : 'GPS position saved, but the address could not be matched to our service areas. Select your address manually.';
  } catch {
    result.message = 'GPS position saved, but automatic address lookup is unavailable. Select your address manually.';
  } finally { clearTimeout(timer); }
  return result;
}
