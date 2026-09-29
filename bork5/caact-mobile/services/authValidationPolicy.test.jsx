import {
  EMAIL_DOMAIN_NOT_ALLOWED_MESSAGE,
  passwordStrengthLabel,
  validateEmail,
  validatePasswordStrength,
} from '../utils/authValidation';

test('mobile registration uses active email domains case-insensitively', () => {
  expect(validateEmail('Person@GMAIL.COM', ['gmail.com'])).toBe('');
  expect(validateEmail('person@example.com', ['gmail.com'])).toBe(EMAIL_DOMAIN_NOT_ALLOWED_MESSAGE);
  expect(validateEmail('a..b@gmail.com', ['gmail.com'])).toBe('Enter a valid email address.');
});

test('mobile password score and label are capped at excellent 100', () => {
  expect(validatePasswordStrength('CorrectHorseBatteryStaple!29').score).toBe(100);
  expect(validatePasswordStrength('A-very-long-unpredictable-password!2026').score).toBeLessThanOrEqual(100);
  expect(passwordStrengthLabel(100)).toBe('Excellent');
});
