const LEGAL_VERSION = '2026-09-04';
const REQUIRED_POLICIES = ['app', 'service', 'warranty', 'privacy'];
function validateRegistrationConsent(consent) {
  if (!consent || consent.version !== LEGAL_VERSION || !REQUIRED_POLICIES.every(key => consent[key] === true)) {
    return 'Review and accept the current App, Service and Warranty Terms, and acknowledge the Data Privacy Notice before creating your account.';
  }
  return '';
}
function registrationConsentRecord(consent) {
  return { version: LEGAL_VERSION, acceptedAt: new Date(), ...Object.fromEntries(REQUIRED_POLICIES.map(key => [key, consent[key] === true])) };
}
module.exports = { LEGAL_VERSION, REQUIRED_POLICIES, validateRegistrationConsent, registrationConsentRecord };
