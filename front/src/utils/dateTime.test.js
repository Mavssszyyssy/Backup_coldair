import { expect, it } from 'vitest';
import { formatBusinessDate, formatBusinessDateTime } from './dateTime';

it('shows unambiguous Philippine business dates without shifting date-only values', () => {
  expect(formatBusinessDate('2026-10-27')).toBe('27 Oct 2026');
  expect(formatBusinessDate('2026-10-26T16:30:00Z')).toBe('27 Oct 2026');
  expect(formatBusinessDate('')).toBe('');
});

it('shows local time and timezone for an actual timestamp', () => {
  expect(formatBusinessDateTime('2026-10-26T16:30:00Z')).toMatch(/27 Oct 2026.*00:30.*GMT\+8/);
});
