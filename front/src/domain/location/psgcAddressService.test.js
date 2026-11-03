import { afterEach, expect, it, vi } from 'vitest';
import { psgcRegions, psgcProvinces, psgcLocalities, psgcBarangays, matchingLocation } from './psgcAddressService';

afterEach(() => vi.unstubAllGlobals());

it('uses the same PSGC region, NCR and locality identity structure as mobile', async () => {
  const fetchMock = vi.fn(async (url) => ({
    ok: true,
    json: async () => url.endsWith('/regions/')
      ? [{ name: 'National Capital Region', code: '130000000' }]
      : url.includes('/cities-municipalities/') && url.endsWith('/barangays/')
        ? [{ name: 'Central Signal Village', code: '137607005' }]
        : [{ name: 'Taguig', code: '137607000' }],
  }));
  vi.stubGlobal('fetch', fetchMock);
  expect(await psgcRegions()).toContainEqual({ name: 'National Capital Region', code: '130000000' });
  expect(await psgcProvinces('130000000', 'National Capital Region'))
    .toEqual([{ name: 'Metro Manila', code: 'region:130000000' }]);
  expect(await psgcLocalities('region:130000000', '130000000', 'National Capital Region', 'Metro Manila'))
    .toContainEqual({ name: 'Taguig', code: '137607000' });
  expect(await psgcBarangays('137607000', 'National Capital Region', 'Metro Manila', 'Taguig'))
    .toContainEqual({ name: 'Central Signal Village', code: '137607005' });
  expect(fetchMock.mock.calls.some(([url]) => url.includes('/regions/130000000/cities-municipalities/'))).toBe(true);
  expect(matchingLocation([{ name: 'CALABARZON', code: '040000000' }], 'CALABARZON (Region IV-A)').code).toBe('040000000');
});
