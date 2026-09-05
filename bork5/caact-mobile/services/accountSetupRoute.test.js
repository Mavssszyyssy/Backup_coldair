import { requiredSetupRoute } from './accountSetupRoute';
test('unfinished technician setup cannot be bypassed after password change or by a direct link', () => {
  expect(requiredSetupRoute({ role: 'technician', isFirstLogin: false })).toBe('/technician/oobe');
  expect(requiredSetupRoute({ role: 'technician', isFirstLogin: true, technicianOnboardedAt: '2026-01-01' })).toBe('/technician/oobe');
  expect(requiredSetupRoute({ role: 'technician', technicianOnboardedAt: '2026-01-01' })).toBeNull();
});
test('recovery takes priority over completed setup for both mobile roles', () => {
  for (const role of ['customer', 'technician']) expect(requiredSetupRoute({ role, customerOnboardedAt: '2026-01-01', technicianOnboardedAt: '2026-01-01', security: { totpResetRequired: true } })).toBe(`/${role}/oobe/reset`);
});
