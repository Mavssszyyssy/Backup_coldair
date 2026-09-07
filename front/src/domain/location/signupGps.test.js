import { describe, it, expect, vi } from 'vitest';
import { captureSignupPosition, matchGpsAddress } from './signupGps';
const geolocation = { getCurrentPosition: (success) => success({ coords: { latitude: 14.5, longitude: 121, accuracy: 12 } }) };
describe('signup GPS capture', () => {
  it('matches provider labels to actual dropdown values', () => {
    expect(matchGpsAddress({ city: 'City of Pasay', state: 'National Capital Region', suburb: 'Barangay 142', road: 'Test Street' })).toMatchObject({ region: 'NCR', province: 'Metro Manila', city: 'Pasay City', barangay: 'Barangay 142' });
    expect(matchGpsAddress({ city: 'Unknown city' })).toBeNull();
  });
  it('keeps coordinates and explains missing lookup configuration', async () => {
    const fetchImpl = vi.fn();
    const result = await captureSignupPosition({ geolocation, apiKey: '', fetchImpl });
    expect(result.coordinates.latitude).toBe(14.5);
    expect(result.address).toBeNull();
    expect(result.message).toMatch(/select your address/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('keeps coordinates when lookup is rejected', async () => {
    const result = await captureSignupPosition({ geolocation, apiKey: 'fixture', fetchImpl: vi.fn().mockResolvedValue({ ok: false }) });
    expect(result.coordinates.longitude).toBe(121);
    expect(result.message).toMatch(/unavailable/i);
  });
  it.each([1, 2, 3])('reports location error %s instead of pretending it succeeded', async (code) => {
    await expect(captureSignupPosition({ geolocation: { getCurrentPosition: (_, reject) => reject({ code }) }, apiKey: '' })).rejects.toThrow(code === 1 ? /allow location/i : code === 3 ? /timed out/i : /could not be determined/i);
  });
});
