import { canonicalizePhMobile, sanitizePhMobileInput, validatePhone } from './authValidation';

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
