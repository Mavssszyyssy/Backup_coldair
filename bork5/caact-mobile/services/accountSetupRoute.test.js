import { requiredSetupRoute } from './accountSetupRoute';
test('technicians replace their first-login password and then must verify an authenticator', () => {
  expect(requiredSetupRoute({ role: 'technician', isFirstLogin: true })).toBe('/technician/oobe');
  expect(requiredSetupRoute({ role: 'technician', isFirstLogin: false, security: { totpEnabled: false } })).toBe('/technician/oobe/reset');
  expect(requiredSetupRoute({ role: 'technician', security: { totpResetRequired: true } })).toBe('/technician/oobe/reset');
  expect(requiredSetupRoute({ role: 'technician', security: { totpEnabled: true } })).toBeNull();
});
test('customer authenticator recovery and onboarding remain mandatory', () => {
  expect(requiredSetupRoute({ role: 'customer', customerOnboardedAt: '2026-01-01', security: { totpResetRequired: true } })).toBe('/customer/oobe/reset');
  expect(requiredSetupRoute({ role: 'customer', customerOnboardedAt: '2026-01-01', security: { totpEnabled: false } })).toBe('/customer/oobe/reset');
  expect(requiredSetupRoute({ role: 'customer' })).toBe('/customer/oobe');
});
