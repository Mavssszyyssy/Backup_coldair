import { canonicalizePhMobile, sanitizePhMobileInput, sanitizeLocalPhMobileInput, validatePhone } from './authValidation';

test('technician local input stops at 11 digits and still supports deletion and editing', () => {
  let value = '';
  for (const digit of '09123456789012') {
    value = sanitizeLocalPhMobileInput(value + digit, value);
    expect(value.length).toBeLessThanOrEqual(11);
  }
  expect(value).toBe('09123456789');
  value = sanitizeLocalPhMobileInput(value.slice(0, -1), value);
  expect(value).toBe('0912345678');
  expect(sanitizeLocalPhMobileInput(value + '0', value)).toBe('09123456780');
  expect(sanitizeLocalPhMobileInput('', value)).toBe('');
});

test.each(['+639123456789', '639123456789', '9123456789', '+63 912 345 6789', '(0912) 345-6789'])('technician input normalizes complete paste %s before limiting length', (input) => {
  expect(sanitizeLocalPhMobileInput(input)).toBe('09123456789');
});

test.each(['091234567890', '+6391234567890', 'abc09123456789', '09123456789 ext 1'])('technician input rejects excess or unsupported paste %s without altering the previous number', (input) => {
  expect(sanitizeLocalPhMobileInput(input)).toBe('');
  expect(sanitizeLocalPhMobileInput(input, '09123456789')).toBe('09123456789');
});

test('technician input limit does not bypass required, length, or prefix validation', () => {
  for (const input of ['', '09123', '08123456789']) {
    expect(validatePhone(sanitizeLocalPhMobileInput(input))).not.toBe('');
  }
});

test.each(['09123456789', '9123456789', '639123456789', '+639123456789', '+63 912 345 6789', '0912-345-6789', '(0912) 345 6789'])('preserves and accepts complete phone input %s', (input) => {
  const edited = sanitizePhMobileInput(input);
  expect(edited).toBe(input);
  expect(validatePhone(edited)).toBe('');
  expect(canonicalizePhMobile(edited)).toBe('09123456789');
});

test.each(['091234567890', '+6391234567890', '91234567890', '0912345678', '08123456789', '+659123456789', 'abc09123456789', '09123456789 ext 1'])('rejects invalid input without silently changing the number %s', (input) => {
  expect(sanitizePhMobileInput(input)).toBe(input);
  expect(validatePhone(sanitizePhMobileInput(input))).not.toBe('');
});
