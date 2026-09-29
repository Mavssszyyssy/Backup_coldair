import { expect, test } from 'vitest';
import { calculatePasswordStrength, passwordStrengthLabel } from './passwordStrength';

test('registration password strength never exceeds 100', () => {
  expect(calculatePasswordStrength('CorrectHorseBatteryStaple!29')).toBe(100);
  expect(calculatePasswordStrength('A-very-long-unpredictable-password!2026')).toBeLessThanOrEqual(100);
});

test('registration password labels follow normalized score boundaries', () => {
  expect(passwordStrengthLabel(35)).toBe('Weak');
  expect(passwordStrengthLabel(60)).toBe('Moderate');
  expect(passwordStrengthLabel(80)).toBe('Strong');
  expect(passwordStrengthLabel(100)).toBe('Excellent');
});
