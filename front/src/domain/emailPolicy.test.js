import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiRequest } from '../config/api';
import {
  EMAIL_DOMAIN_NOT_ALLOWED_MESSAGE,
  clearEmailPolicyCache,
  extractEmailDomain,
  isValidEmailFormat,
  validateEmailForSubmission,
} from './emailPolicy';

vi.mock('../config/api', () => ({ apiRequest: vi.fn() }));

describe('email-domain policy', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    clearEmailPolicyCache();
  });

  test('normalizes domains and rejects malformed addresses', () => {
    expect(isValidEmailFormat('Person@GMAIL.COM')).toBe(true);
    expect(extractEmailDomain(' Person@GMAIL.COM ')).toBe('gmail.com');
    expect(isValidEmailFormat('a..b@gmail.com')).toBe(false);
    expect(isValidEmailFormat('person@gmail')).toBe(false);
  });

  test('uses the server-managed active whitelist', async () => {
    apiRequest.mockResolvedValue({ activeDomains: ['gmail.com', 'school.edu.ph'] });
    await expect(validateEmailForSubmission('student@school.edu.ph')).resolves.toBe('');
    await expect(validateEmailForSubmission('person@example.com')).resolves.toBe(EMAIL_DOMAIN_NOT_ALLOWED_MESSAGE);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});
