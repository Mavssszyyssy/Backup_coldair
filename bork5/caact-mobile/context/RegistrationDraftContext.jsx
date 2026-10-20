import { createContext, useCallback, useContext, useMemo, useState } from "react";

const RegistrationDraftContext = createContext(null);
const createInitialDraft = () => ({
  legalConsent: {},
  email: "",
  emailVerified: false,
  registrationVerificationToken: "",
  name_first: "",
  name_last: "",
  suffix: "",
  alias: "",
  password: "",
  confirmPassword: "",
  address: {},
});

export function RegistrationDraftProvider({ children }) {
  const [draft, setDraft] = useState(createInitialDraft);

  const updateDraft = useCallback((changes) => setDraft((previous) => ({ ...previous, ...changes })), []);
  const resetDraft = useCallback(() => setDraft(createInitialDraft()), []);
  const value = useMemo(() => ({ draft, updateDraft, resetDraft }), [draft, updateDraft, resetDraft]);
  return <RegistrationDraftContext.Provider value={value}>{children}</RegistrationDraftContext.Provider>;
}

export function useRegistrationDraft() {
  const context = useContext(RegistrationDraftContext);
  if (!context) throw new Error("Registration screens must be inside RegistrationDraftProvider.");
  return context;
}
