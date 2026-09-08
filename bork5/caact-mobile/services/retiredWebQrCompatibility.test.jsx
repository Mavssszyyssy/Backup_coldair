import { parseLookupTarget } from './qrLookupService';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

test.each([
  'AC_UNIT:CAACT-TEST-123',
  'QR_UNIT:QRU-TEST-123|SERIAL:CAACT-TEST-123|SKU:FIXTURE',
  'https://www.coldair-act.online/tech/field-registration?serial=CAACT-TEST-123&qr=AC_UNIT%3ACAACT-TEST-123',
])('mobile scanner still resolves inventory QR and legacy printed QR: %s', (payload) => {
  expect(parseLookupTarget(payload).serialNumber).toBe('CAACT-TEST-123');
  expect(parseLookupTarget(payload).lookupValue).toBe('CAACT-TEST-123');
});
